package handlers

import (
	"context"
	"fmt"
	"log/slog"
	"net/url"
	"time"

	"github.com/kubeflow/hub/ui/bff/internal/api"
	"github.com/kubeflow/hub/ui/bff/internal/constants"
	"github.com/kubeflow/hub/ui/bff/internal/integrations/bffclient"
	k8s "github.com/kubeflow/hub/ui/bff/internal/integrations/kubernetes"
	"github.com/kubeflow/hub/ui/bff/internal/models"
)

// registryAccessEndpointCascadeTimeout bounds the background cleanup goroutine so it can't
// run (or hold registry connections) indefinitely if the MLflow BFF hangs.
const registryAccessEndpointCascadeTimeout = 5 * time.Second

// maxAccessEndpointSearchPages bounds pagination as defense-in-depth alongside the timeout.
const maxAccessEndpointSearchPages = 10

type mlflowMCPAccessEndpoint struct {
	ID          string `json:"id"`
	EndpointURL string `json:"endpoint_url"`
}

type mlflowMCPAccessEndpointsEnvelope struct {
	Data struct {
		Endpoints     []mlflowMCPAccessEndpoint `json:"endpoints"`
		NextPageToken string                    `json:"next_page_token"`
	} `json:"data"`
}

// RegistryAccessEndpointCleanupStatus reports the outcome of the best-effort registry
// access endpoint cleanup so the frontend can warn the user when it didn't complete.
type RegistryAccessEndpointCleanupStatus string

const (
	// RegistryAccessEndpointCleanupSkipped means the deployment wasn't registry-sourced,
	// so there was no access endpoint to clean up.
	RegistryAccessEndpointCleanupSkipped RegistryAccessEndpointCleanupStatus = "skipped"
	// RegistryAccessEndpointCleanupSucceeded means any matching endpoint(s) were deleted
	// (or none existed to begin with -- both are a successful end state).
	RegistryAccessEndpointCleanupSucceeded RegistryAccessEndpointCleanupStatus = "succeeded"
	// RegistryAccessEndpointCleanupFailed means the registry couldn't be reached, or a
	// delete call failed, or cleanup couldn't be confirmed complete (page cap hit).
	RegistryAccessEndpointCleanupFailed RegistryAccessEndpointCleanupStatus = "failed"
)

// scheduleRegistryAccessEndpointCascadeDelete runs the best-effort registry access endpoint
// cleanup in the background, after the deployment delete response has already been sent.
// The request's identity is copied onto a detached context so inter-BFF auth forwarding
// still works; everything else about the original request (deadline, cancellation) is
// intentionally left behind so a slow/unavailable MLflow BFF can never delay -- or, worse,
// appear to fail -- the deployment deletion itself. Uses TrackBackgroundWork so a panic in
// the cascade can never crash the process, and Shutdown gets a bounded chance to let it
// finish instead of killing it mid-flight.
func scheduleRegistryAccessEndpointCascadeDelete(ctx context.Context, app *api.App, deployment models.McpDeployment) {
	if deployment.RegistryServer == "" {
		// Catalog-sourced deployment: never had a registry access endpoint, so there's
		// nothing to clean up -- skip scheduling background work entirely.
		return
	}

	detached := context.Background()
	if identity, ok := ctx.Value(constants.RequestIdentityKey).(*k8s.RequestIdentity); ok && identity != nil {
		detached = context.WithValue(detached, constants.RequestIdentityKey, identity)
	}

	app.TrackBackgroundWork(func() {
		if status := cascadeDeleteRegistryAccessEndpoint(detached, app, deployment); status == RegistryAccessEndpointCleanupFailed {
			if logger := app.Logger(); logger != nil {
				logger.Warn("registry access endpoint cleanup did not complete after deployment deletion; endpoint may need manual removal from the registry",
					slog.String("deployment", deployment.Name), slog.String("namespace", deployment.Namespace), slog.String("registryServer", deployment.RegistryServer))
			}
		}
	})
}

// cascadeDeleteRegistryAccessEndpoint best-effort deletes the registered access endpoint(s)
// for a deployment created from the MCP Registry, via an inter-BFF call to the MLflow BFF
// (see docs/inter-bff-communication.md). Always runs in the background (see
// scheduleRegistryAccessEndpointCascadeDelete): the K8s CR is already deleted by the time
// this runs, and the endpoint is only registry metadata, not cluster state, so it must never
// affect -- or be awaited by -- the deployment deletion response.
func cascadeDeleteRegistryAccessEndpoint(ctx context.Context, app *api.App, deployment models.McpDeployment) RegistryAccessEndpointCleanupStatus {
	if deployment.RegistryServer == "" {
		return RegistryAccessEndpointCleanupSkipped
	}

	ctx, cancel := context.WithTimeout(ctx, registryAccessEndpointCascadeTimeout)
	defer cancel()

	logger := app.Logger()
	client := bffclient.ClientForRequest(ctx, app.BFFClientFactory(), bffclient.BFFTargetMLflow)
	if client == nil {
		// No client means the MLflow BFF target isn't configured for this deployment (e.g.
		// missing BFF_MLFLOW_* env vars) -- distinct from a reachable-but-failing target, and
		// otherwise indistinguishable from every other failure mode without this log line.
		if logger != nil {
			logger.Warn("skipping registry access endpoint cleanup: MLflow BFF target is not configured",
				slog.String("deployment", deployment.Name), slog.String("registryServer", deployment.RegistryServer))
		}
		return RegistryAccessEndpointCleanupFailed
	}

	// Match by hostname only (not the full URL): a deployment's port/path can be edited
	// after it was created from the registry, but its K8s name+namespace -- and therefore
	// this hostname -- never change post-creation, so this stays correct even when the
	// registered endpoint_url's port/path has drifted from the deployment's current values.
	expectedHost := fmt.Sprintf("%s.%s.svc.cluster.local", deployment.Name, deployment.Namespace)

	registryServerSegment, err := mcpRegistryServerNamePathSegment(deployment.RegistryServer)
	if err != nil {
		if logger != nil {
			logger.Warn("skipping registry access endpoint cleanup: invalid registryServer",
				slog.String("deployment", deployment.Name), slog.String("registryServer", deployment.RegistryServer), slog.Any("error", err))
		}
		return RegistryAccessEndpointCleanupFailed
	}
	basePath := fmt.Sprintf("/mcp-registry/servers/%s/endpoints", registryServerSegment)
	// endpoint.ID goes in the path (url.PathEscape); workspace is a query param on the same
	// request, so it's url.QueryEscape'd instead -- the two aren't interchangeable.
	query := url.Values{"workspace": {deployment.Namespace}}

	var pageToken string
	var seen, deleted int
	var deleteFailed bool
	for page := 0; page < maxAccessEndpointSearchPages; page++ {
		if pageToken != "" {
			query.Set("page_token", pageToken)
		}

		var envelope mlflowMCPAccessEndpointsEnvelope
		if err := client.Call(ctx, "GET", basePath+"?"+query.Encode(), nil, &envelope); err != nil {
			if logger != nil {
				logger.Warn("failed to search MCP registry access endpoints during deployment deletion",
					slog.String("deployment", deployment.Name), slog.String("registryServer", deployment.RegistryServer), slog.Any("error", err))
			}
			return RegistryAccessEndpointCleanupFailed
		}

		seen += len(envelope.Data.Endpoints)
		for _, endpoint := range envelope.Data.Endpoints {
			if !accessEndpointHostMatches(endpoint.EndpointURL, expectedHost) {
				continue
			}
			deletePath := fmt.Sprintf("%s/%s?workspace=%s", basePath, url.PathEscape(endpoint.ID), url.QueryEscape(deployment.Namespace))
			if err := client.Call(ctx, "DELETE", deletePath, nil, nil); err != nil {
				if logger != nil {
					logger.Warn("failed to delete MCP registry access endpoint during deployment deletion",
						slog.String("deployment", deployment.Name), slog.String("endpointId", endpoint.ID), slog.Any("error", err))
				}
				// Keep trying the rest of this page (and subsequent pages) instead of
				// abandoning them: one endpoint failing to delete shouldn't leave siblings
				// that could have succeeded as stale metadata too.
				deleteFailed = true
				continue
			}
			deleted++
		}

		if envelope.Data.NextPageToken == "" {
			if deleteFailed {
				return RegistryAccessEndpointCleanupFailed
			}
			// Distinguish "found and deleted N" from "searched but nothing matched" -- the
			// latter looks identical to success but means either the endpoint was already
			// gone, or (if unexpected) the search scope/hostname match didn't line up with
			// what was actually registered at deploy time.
			if logger != nil {
				logger.Info("registry access endpoint cleanup search complete",
					slog.String("deployment", deployment.Name), slog.String("registryServer", deployment.RegistryServer),
					slog.Int("endpointsSeen", seen), slog.Int("endpointsDeleted", deleted))
			}
			return RegistryAccessEndpointCleanupSucceeded
		}
		pageToken = envelope.Data.NextPageToken
	}

	// Hit the page cap without confirming every page was seen -- can't be sure cleanup
	// is complete, so this must not be reported as a silent success.
	if logger != nil {
		logger.Warn("MCP registry access endpoint search exceeded max pages during deployment deletion",
			slog.String("deployment", deployment.Name), slog.String("registryServer", deployment.RegistryServer),
			slog.Int("endpointsSeen", seen), slog.Int("endpointsDeleted", deleted))
	}
	return RegistryAccessEndpointCleanupFailed
}

// accessEndpointHostMatches reports whether rawURL's host matches expectedHost exactly.
// An unparseable rawURL never matches (fails closed).
func accessEndpointHostMatches(rawURL, expectedHost string) bool {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return false
	}
	return parsed.Hostname() == expectedHost
}
