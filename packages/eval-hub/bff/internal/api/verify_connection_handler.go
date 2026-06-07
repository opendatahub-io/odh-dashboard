package api

import (
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/connectionprobe"
	"github.com/opendatahub-io/eval-hub/bff/internal/models"
)

type VerifyConnectionEnvelope = Envelope[models.VerifyConnectionResponse, None]

// VerifyConnectionHandler handles POST /api/v1/evaluations/verify-connection
func (app *App) VerifyConnectionHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	var req models.VerifyConnectionRequest
	if err := app.ReadJSON(w, r, &req); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if req.BaseURL == "" {
		app.badRequestResponse(w, r, fmt.Errorf("base_url is required"))
		return
	}
	if req.SourceType == "" {
		app.badRequestResponse(w, r, fmt.Errorf("source_type is required"))
		return
	}

	validSourceTypes := map[string]bool{
		"model":       true,
		"agent":       true,
		"prerecorded": true,
	}
	if !validSourceTypes[req.SourceType] {
		app.badRequestResponse(w, r, fmt.Errorf("invalid source_type: %s (must be model, agent, or prerecorded)", req.SourceType))
		return
	}

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
			httpError := &HTTPError{
				StatusCode: probeErr.StatusCode,
				Error:      ErrorPayload{Code: probeErr.Code, Message: probeErr.Message},
			}
			app.errorResponse(w, r, httpError)
			return
		}
		app.serverErrorResponse(w, r, err)
		return
	}

	response, err := client.Probe(ctx, req)
	if err != nil {
		if probeErr, ok := err.(*connectionprobe.ConnectionProbeError); ok {
			httpError := &HTTPError{
				StatusCode: probeErr.StatusCode,
				Error:      ErrorPayload{Code: probeErr.Code, Message: probeErr.Message},
			}
			app.errorResponse(w, r, httpError)
			return
		}
		app.serverErrorResponse(w, r, err)
		return
	}

	envelope := VerifyConnectionEnvelope{
		Data: *response,
	}
	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
