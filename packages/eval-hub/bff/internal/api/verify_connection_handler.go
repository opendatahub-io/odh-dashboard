package api

import (
	"fmt"
	"log/slog"
	"net/http"
	"net/url"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/connectionprobe"
	"github.com/opendatahub-io/eval-hub/bff/internal/models"
)

// sanitizeURL strips userinfo and query parameters from a URL for safe logging.
func sanitizeURL(raw string) string {
	u, err := url.Parse(raw)
	if err != nil {
		return "<invalid-url>"
	}
	u.User = nil
	u.RawQuery = ""
	u.Fragment = ""
	return u.String()
}

type VerifyConnectionEnvelope = Envelope[models.VerifyConnectionResponse, None]

// VerifyConnectionHandler handles POST /api/v1/evaluations/verify-connection
func (app *App) VerifyConnectionHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	var req models.VerifyConnectionRequest
	if err := app.ReadJSON(w, r, &req); err != nil {
		app.logger.Warn("verify-connection: malformed request body", "error", err)
		app.badRequestResponse(w, r, err)
		return
	}

	if req.BaseURL == "" {
		app.logger.Warn("verify-connection: missing base_url")
		app.badRequestResponse(w, r, fmt.Errorf("base_url is required"))
		return
	}
	if req.SourceType == "" {
		app.logger.Warn("verify-connection: missing source_type")
		app.badRequestResponse(w, r, fmt.Errorf("source_type is required"))
		return
	}

	validSourceTypes := map[string]bool{
		"model":       true,
		"agent":       true,
		"prerecorded": true,
	}
	if !validSourceTypes[req.SourceType] {
		app.logger.Warn("verify-connection: invalid source_type", slog.String("source_type", req.SourceType))
		app.badRequestResponse(w, r, fmt.Errorf("invalid source_type: %s (must be model, agent, or prerecorded)", req.SourceType))
		return
	}

	app.logger.Info("verify-connection: probing endpoint",
		slog.String("source_type", req.SourceType),
		slog.String("base_url", sanitizeURL(req.BaseURL)),
		slog.Bool("has_secret", req.SecretValue != ""),
		slog.String("model_id", req.ModelID),
	)

	client, err := connectionprobe.NewConnectionProbeClient(
		app.logger,
		req.BaseURL,
		req.SecretValue,
		req.SourceType,
		&connectionprobe.ClientOptions{
			AllowHTTP:           app.config.DevMode || app.config.InsecureSkipVerify,
			SkipSSRFValidation:  app.config.DevMode,
			SkipTLSVerification: app.config.InsecureSkipVerify,
			RootCAs:             app.rootCAs,
		},
	)
	if err != nil {
		if probeErr, ok := err.(*connectionprobe.ConnectionProbeError); ok {
			app.logger.Warn("verify-connection: client creation failed",
				slog.String("code", probeErr.Code),
				slog.String("message", probeErr.Message),
			)
			httpError := &HTTPError{
				StatusCode: probeErr.StatusCode,
				Error:      ErrorPayload{Code: probeErr.Code, Message: probeErr.Message},
			}
			app.errorResponse(w, r, httpError)
			return
		}
		app.logger.Error("verify-connection: unexpected client error", "error", err)
		app.serverErrorResponse(w, r, err)
		return
	}

	response, err := client.Probe(ctx, req)
	if err != nil {
		if probeErr, ok := err.(*connectionprobe.ConnectionProbeError); ok {
			app.logger.Warn("verify-connection: probe failed",
				slog.String("code", probeErr.Code),
				slog.String("base_url", sanitizeURL(req.BaseURL)),
			)
			httpError := &HTTPError{
				StatusCode: probeErr.StatusCode,
				Error:      ErrorPayload{Code: probeErr.Code, Message: probeErr.Message},
			}
			app.errorResponse(w, r, httpError)
			return
		}
		app.logger.Error("verify-connection: unexpected probe error", "error", err)
		app.serverErrorResponse(w, r, err)
		return
	}

	app.logger.Info("verify-connection: probe succeeded",
		slog.String("base_url", sanitizeURL(req.BaseURL)),
		slog.Int("response_time_ms", response.ResponseTime),
	)

	envelope := VerifyConnectionEnvelope{
		Data: *response,
	}
	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
