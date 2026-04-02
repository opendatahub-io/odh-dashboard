package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
)

// EvalHubHealthStatus describes the three possible states returned by the health endpoint.
//
//   - "healthy"             — CR found in dashboard namespace, service responded to ping.
//   - "service-unreachable" — CR found (URL known) but the EvalHub service did not respond.
//   - "cr-not-found"        — No EvalHub CR exists in the dashboard namespace; the operator
//     has not been configured.
type EvalHubHealthStatus = string

const (
	EvalHubHealthStatusHealthy            EvalHubHealthStatus = "healthy"
	EvalHubHealthStatusServiceUnreachable EvalHubHealthStatus = "service-unreachable"
	EvalHubHealthStatusCRNotFound         EvalHubHealthStatus = "cr-not-found"
)

// EvalHubServiceHealth is the BFF-level health response.
// It always returns HTTP 200 so the frontend can reliably reach a loaded state.
// Available indicates whether the EvalHub service is actually reachable and ready.
type EvalHubServiceHealth struct {
	Status    EvalHubHealthStatus `json:"status"`
	Available bool                `json:"available"`
}

type EvalHubServiceHealthEnvelope Envelope[EvalHubServiceHealth, None]

// EvalHubServiceHealthHandler performs per-request CR discovery in the dashboard namespace
// using the caller's bearer token and then pings the discovered EvalHub service. It always
// returns HTTP 200 with one of the three EvalHubHealthStatus values so the frontend always
// reaches a loaded state.
//
// Priority:
//  1. MockEvalHubClient=true — return healthy immediately (dev/test mode, no K8s call).
//  2. EVAL_HUB_URL env override — skip CR discovery, ping the override URL directly.
//  3. CR discovery — list evalhubs.trustyai.opendatahub.io in app.dashboardNamespace via
//     the caller's bearer token; if no CR found → cr-not-found; if found, ping status.url.
func (app *App) EvalHubServiceHealthHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	writeHealth := func(status EvalHubHealthStatus, available bool) {
		envelope := EvalHubServiceHealthEnvelope{Data: EvalHubServiceHealth{Status: status, Available: available}}
		if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
			// Headers may already be partially written; log rather than attempt a second write.
			app.logger.Error("failed to write health response", "error", err)
		}
	}

	if app.config.MockEvalHubClient {
		writeHealth(EvalHubHealthStatusHealthy, true)
		return
	}

	serviceURL, authToken, crNotFound, err := app.evalHubServiceURL(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	if crNotFound {
		writeHealth(EvalHubHealthStatusCRNotFound, false)
		return
	}

	ehClient := app.evalHubClientFactory.CreateClient(serviceURL, authToken, app.config.InsecureSkipVerify, app.rootCAs, "/api/v1")
	if _, err := ehClient.HealthCheck(ctx); err != nil {
		writeHealth(EvalHubHealthStatusServiceUnreachable, false)
		return
	}

	writeHealth(EvalHubHealthStatusHealthy, true)
}
