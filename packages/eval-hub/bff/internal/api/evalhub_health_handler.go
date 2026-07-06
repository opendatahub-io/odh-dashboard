package api

import (
	"context"
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/eval-hub/bff/internal/constants"
)

// EvalHubHealthStatus describes the three possible states returned by the health endpoint.
//
//   - "healthy"             — Service URL resolved (via ConfigMap or CR), service responded.
//   - "service-unreachable" — URL resolved but the EvalHub service did not respond.
//   - "cr-not-found"        — No EvalHub service discoverable in the given or dashboard
//     namespace; the operator has not been configured.
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

// EvalHubServiceHealthHandler performs per-request service discovery using the caller's
// bearer token and pings the discovered EvalHub service. It accepts an optional ?namespace=
// query parameter; when provided, the handler resolves the service URL via ConfigMap/CR
// discovery in that namespace before falling back to app.dashboardNamespace. It always
// returns HTTP 200 with one of the three EvalHubHealthStatus values so the frontend always
// reaches a loaded state.
//
// Priority:
//  1. MockEvalHubClient=true — return healthy immediately (dev/test mode, no K8s call).
//  2. EVAL_HUB_URL env override — skip CR discovery, ping the override URL directly.
//  3. ?namespace= provided — ConfigMap/CR discovery in the given namespace, then fallback
//     to app.dashboardNamespace.
//  4. No namespace — CR discovery in app.dashboardNamespace only.
func (app *App) EvalHubServiceHealthHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	// Optionally inject namespace into context so evalHubServiceURL can use ConfigMap discovery.
	if ns := r.URL.Query().Get(string(constants.NamespaceHeaderParameterKey)); ns != "" {
		if !validNamespaceRE.MatchString(ns) {
			app.badRequestResponse(w, r, fmt.Errorf("invalid namespace %q: must be a valid RFC 1123 DNS label", ns))
			return
		}
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, ns)
	}

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
