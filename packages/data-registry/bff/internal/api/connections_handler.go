package api

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/data-registry/bff/internal/constants"
	"github.com/opendatahub-io/data-registry/bff/internal/integrations/bffclient"
	"github.com/opendatahub-io/data-registry/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/data-registry/bff/internal/models"
	"github.com/opendatahub-io/data-registry/bff/internal/repositories"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/util/validation"
)

type ConnectionsEnvelope Envelope[[]models.ConnectionModel, *models.ConnectionsMetadata]

func (app *App) GetConnectionsHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	namespace := ps.ByName("namespace")
	if len(validation.IsDNS1123Label(namespace)) > 0 {
		app.badRequestResponse(w, r, fmt.Errorf("invalid project namespace"))
		return
	}
	ctx := r.Context()
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*kubernetes.RequestIdentity)
	if !ok || identity == nil || identity.Token == "" {
		app.unauthorizedResponse(w, r, fmt.Errorf("missing user identity"))
		return
	}

	source, outcome, reason, count := "secret", "error", "unconfigured", 0
	secretLookupOutcome, secretCount := "not_attempted", 0
	dchFallback := false
	start := time.Now()
	defer func() {
		// One structured event per lookup supports outcome/fallback rates, latency and counts.
		// Never log upstream bodies, credentials, tokens or arbitrary error messages.
		app.logger.Info("Connection lookup", "namespace", namespace, "source", source,
			"outcome", outcome, "reason", reason, "count", count,
			"secret_lookup_outcome", secretLookupOutcome, "secret_count", secretCount,
			"elapsed_ms", time.Since(start).Milliseconds())
	}()

	var envelope ConnectionsEnvelope
	if app.bffClientFactory != nil && app.bffClientFactory.IsTargetConfigured(bffclient.BFFTargetDCH) {
		source = "dch"
		client := app.bffClientFactory.CreateClient(bffclient.BFFTargetDCH, identity.Token)
		if client == nil {
			reason = "client_unavailable"
			dchFallback = true
		} else {
			timeout := time.Duration(app.config.BFFDCHTimeoutSeconds) * time.Second
			if timeout <= 0 {
				timeout = 5 * time.Second
			}
			dchCtx, cancel := context.WithTimeout(ctx, timeout)
			connections, metadata, err := app.repositories.Connection.GetDCHConnections(dchCtx, client, namespace, app.logger)
			cancel()
			if ctx.Err() != nil {
				reason = "request_canceled"
				return
			}
			if err == nil {
				envelope.Data, envelope.Metadata = connections, metadata
				reason = "success"
				// DCH remains the only selectable source, but saved RHOAI references still
				// need their current display details while DCH is active.
				var lookupErr error
				var rhaiConnections []models.ConnectionModel
				if app.kubernetesClientFactory == nil {
					lookupErr = fmt.Errorf("Kubernetes client factory is unavailable")
				} else {
					var kubeClient kubernetes.KubernetesClientInterface
					kubeClient, lookupErr = app.kubernetesClientFactory.GetClient(ctx)
					if lookupErr == nil {
						rhaiConnections, lookupErr = app.repositories.Connection.GetConnections(kubeClient, ctx, namespace)
					}
				}
				if lookupErr != nil {
					secretLookupOutcome = "error"
					app.logger.Warn("RHOAI connection display lookup failed", "namespace", namespace)
					if envelope.Metadata == nil {
						envelope.Metadata = &models.ConnectionsMetadata{}
					}
					envelope.Metadata.Warnings = append(envelope.Metadata.Warnings, models.ConnectionWarning{
						Code:    "RHAI_LOOKUP_FAILED",
						Message: "Some saved RHOAI connection details could not be loaded.",
					})
				} else {
					secretLookupOutcome = "success"
					secretCount = len(rhaiConnections)
					if secretCount > 0 {
						if envelope.Metadata == nil {
							envelope.Metadata = &models.ConnectionsMetadata{}
						}
						envelope.Metadata.RhaiConnections = rhaiConnections
					}
				}
			} else {
				var upstream *bffclient.BFFClientError
				reason = "integration_error"
				if errors.As(err, &upstream) {
					reason = upstream.Code
				}
				if !repositories.DCHFallbackAllowed(err) {
					switch {
					case upstream != nil && upstream.StatusCode == http.StatusUnauthorized:
						app.unauthorizedResponse(w, r, fmt.Errorf("DCH authentication failed"))
					case upstream != nil && upstream.StatusCode == http.StatusForbidden:
						app.forbiddenResponse(w, r, "DCH connection lookup denied")
					default:
						app.errorResponse(w, r, &HTTPError{StatusCode: http.StatusBadGateway, Error: ErrorPayload{
							Code: "502", Message: "Unable to load connections: the connection service returned an invalid response or rejected the request.",
						}})
					}
					return
				}
				dchFallback = true
			}
		}
	}

	if envelope.Data == nil {
		source = "secret"
		if app.kubernetesClientFactory == nil {
			secretLookupOutcome = "error"
			app.serverErrorResponse(w, r, fmt.Errorf("unable to load project connections"))
			return
		}
		client, err := app.kubernetesClientFactory.GetClient(ctx)
		if err == nil {
			envelope.Data, err = app.repositories.Connection.GetConnections(client, ctx, namespace)
		}
		if err != nil {
			secretLookupOutcome = "error"
			switch {
			case k8serrors.IsUnauthorized(err):
				app.unauthorizedResponse(w, r, fmt.Errorf("secret lookup authentication failed"))
			case k8serrors.IsForbidden(err):
				app.forbiddenResponse(w, r, "Secret connection lookup denied")
			default:
				app.serverErrorResponse(w, r, fmt.Errorf("unable to load project connections"))
			}
			return
		}
		secretLookupOutcome = "success"
		secretCount = len(envelope.Data)
	}
	if dchFallback {
		if envelope.Metadata == nil {
			envelope.Metadata = &models.ConnectionsMetadata{}
		}
		envelope.Metadata.Warnings = append(envelope.Metadata.Warnings, models.ConnectionWarning{
			Code:    "DCH_FALLBACK",
			Message: "Some connections could not be loaded. Showing available connections.",
		})
	}
	count = len(envelope.Data)
	outcome = "success"
	if source == "secret" && reason != "unconfigured" {
		outcome = "fallback"
	}
	if envelope.Metadata != nil && len(envelope.Metadata.Warnings) > 0 && !dchFallback {
		outcome = "partial"
	}
	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
