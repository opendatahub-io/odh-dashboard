package handlers

import (
	"context"
	"fmt"
	"log/slog"
	"net/url"
	"strings"

	"github.com/kubeflow/hub/ui/bff/internal/api"
	"github.com/kubeflow/hub/ui/bff/internal/integrations/bffclient"
	"github.com/kubeflow/hub/ui/bff/internal/models"
)

// mlflowMCPServerEnvelope mirrors the {"data": {...}} envelope the MLflow BFF
// wraps its MCP Registry responses in (see packages/mlflow/bff/internal/api/mcp_registry_handler.go).
// Only the fields this lookup needs are declared.
type mlflowMCPServerEnvelope struct {
	Data struct {
		Name        string `json:"name"`
		DisplayName string `json:"display_name"`
	} `json:"data"`
}

// enrichMcpDeploymentsWithRegistryDisplayNames resolves RegistryServerDisplayName,
// via an inter-BFF call to the MLflow BFF (see docs/inter-bff-communication.md), for
// every deployment created from the MCP Registry (RegistryServer set). It's best-effort:
// lookup failures are logged and left empty rather than failing the whole list/get request,
// since the frontend can fall back to displaying the raw RegistryServer name.
func enrichMcpDeploymentsWithRegistryDisplayNames(ctx context.Context, app *api.App, deployments []models.McpDeployment) {
	client := bffclient.ClientForRequest(ctx, app.BFFClientFactory(), bffclient.BFFTargetMLflow)
	if client == nil {
		return
	}

	// Multiple deployments commonly point at the same registry server; avoid
	// making the same inter-BFF call more than once per request. Keyed on
	// namespace+RegistryServer (not RegistryServer alone): the lookup is scoped to
	// deployment.Namespace via ?workspace=, so two deployments sharing a
	// RegistryServer name across different namespaces must not share a cache entry.
	cache := make(map[string]string)
	for i := range deployments {
		deployment := &deployments[i]
		if deployment.RegistryServer == "" {
			continue
		}
		cacheKey := deployment.Namespace + "|" + deployment.RegistryServer
		displayName, ok := cache[cacheKey]
		if !ok {
			displayName = resolveMcpRegistryServerDisplayName(ctx, app.Logger(), client, deployment.Namespace, deployment.RegistryServer)
			cache[cacheKey] = displayName
		}
		deployment.RegistryServerDisplayName = displayName
	}
}

// enrichMcpDeploymentWithRegistryDisplayName is the single-item equivalent of
// enrichMcpDeploymentsWithRegistryDisplayNames, used by the "get" handler.
func enrichMcpDeploymentWithRegistryDisplayName(ctx context.Context, app *api.App, deployment *models.McpDeployment) {
	if deployment == nil || deployment.RegistryServer == "" {
		return
	}
	client := bffclient.ClientForRequest(ctx, app.BFFClientFactory(), bffclient.BFFTargetMLflow)
	if client == nil {
		return
	}
	deployment.RegistryServerDisplayName = resolveMcpRegistryServerDisplayName(ctx, app.Logger(), client, deployment.Namespace, deployment.RegistryServer)
}

// resolveMcpRegistryServerDisplayName calls GET /mcp-registry/servers/:name on the MLflow BFF.
func resolveMcpRegistryServerDisplayName(ctx context.Context, logger *slog.Logger, client bffclient.BFFClientInterface, namespace string, registryServer string) string {
	segment, err := mcpRegistryServerNamePathSegment(registryServer)
	if err != nil {
		if logger != nil {
			logger.Debug("skipping MCP registry server display name lookup: invalid registryServer",
				slog.String("registryServer", registryServer), slog.Any("error", err))
		}
		return ""
	}
	path := fmt.Sprintf("/mcp-registry/servers/%s?workspace=%s", segment, url.QueryEscape(namespace))

	var envelope mlflowMCPServerEnvelope
	if err := client.Call(ctx, "GET", path, nil, &envelope); err != nil {
		if logger != nil {
			logger.Debug("failed to resolve MCP registry server display name from MLflow BFF",
				slog.String("registryServer", registryServer), slog.Any("error", err))
		}
		return ""
	}
	return envelope.Data.DisplayName
}

// mcpRegistryServerNamePathSegment escapes each "/"-separated part of an
// unvalidated MCP registry server name independently, preserving the "/" the
// MLflow BFF's catch-all route expects while still escaping unsafe characters.
// Rejects (rather than silently producing a malformed double-slash path for) a
// leading/trailing/doubled "/" in name, since RegistryServer is user-suppliable via the
// deployment create/update API and isn't otherwise validated before reaching this path.
func mcpRegistryServerNamePathSegment(name string) (string, error) {
	parts := strings.Split(name, "/")
	for i, p := range parts {
		if p == "" {
			return "", fmt.Errorf("invalid MCP registry server name %q: empty path segment", name)
		}
		escaped := url.PathEscape(p)
		// url.PathEscape leaves "." and ".." untouched, which would otherwise act as
		// path-traversal dot-segments once rejoined with "/"; force-encode them.
		if escaped == "." || escaped == ".." {
			escaped = strings.ReplaceAll(escaped, ".", "%2E")
		}
		parts[i] = escaped
	}
	return strings.Join(parts, "/"), nil
}
