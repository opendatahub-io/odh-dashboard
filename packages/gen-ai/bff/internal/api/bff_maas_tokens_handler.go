package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// BFFMaaSIssueTokenHandler handles POST /bff/maas/tokens
// This endpoint uses the BFF client to call the MaaS BFF for token issuance,
// enabling inter-BFF communication for playground session tokens.
func (app *App) BFFMaaSIssueTokenHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	// Get MaaS BFF client from context (set by AttachBFFClient middleware)
	maasClient := bffclient.GetClient(ctx, bffclient.BFFTargetMaaS)
	if maasClient == nil {
		app.errorResponse(w, r, &integrations.HTTPError{
			StatusCode: http.StatusServiceUnavailable,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "service_unavailable",
				Message: "MaaS BFF is not available",
			},
		})
		return
	}

	var tokenRequest models.MaaSTokenRequest

	// Only try to parse JSON if there's actually a body
	if r.ContentLength > 0 {
		if err := app.ReadJSON(w, r, &tokenRequest); err != nil {
			app.badRequestResponse(w, r, err)
			return
		}
	}
	// If no body, tokenRequest remains empty (TTL="") and MaaS BFF will use default

	// Call MaaS BFF to issue token
	var tokenResponse models.MaaSTokenResponse
	err := maasClient.Call(ctx, "POST", "/tokens", tokenRequest, &tokenResponse)
	if err != nil {
		app.handleBFFClientError(w, r, err)
		return
	}

	tokenResponseEnvelope := Envelope[models.MaaSTokenResponse, None]{
		Data: tokenResponse,
	}

	err = app.WriteJSON(w, http.StatusCreated, tokenResponseEnvelope, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// BFFMaaSRevokeAllTokensHandler handles DELETE /bff/maas/tokens
// This endpoint uses the BFF client to call the MaaS BFF to revoke all tokens.
func (app *App) BFFMaaSRevokeAllTokensHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	// Get MaaS BFF client from context (set by AttachBFFClient middleware)
	maasClient := bffclient.GetClient(ctx, bffclient.BFFTargetMaaS)
	if maasClient == nil {
		app.errorResponse(w, r, &integrations.HTTPError{
			StatusCode: http.StatusServiceUnavailable,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "service_unavailable",
				Message: "MaaS BFF is not available",
			},
		})
		return
	}

	// Call MaaS BFF to revoke all tokens
	err := maasClient.Call(ctx, "DELETE", "/tokens", nil, nil)
	if err != nil {
		app.handleBFFClientError(w, r, err)
		return
	}

	// Return 204 No Content for successful deletion
	w.WriteHeader(http.StatusNoContent)
}

// handleBFFClientError maps BFF client errors to appropriate HTTP responses
func (app *App) handleBFFClientError(w http.ResponseWriter, r *http.Request, err error) {
	if bffErr, ok := err.(*bffclient.BFFClientError); ok {
		statusCode := bffErr.StatusCode
		if statusCode == 0 {
			statusCode = http.StatusBadGateway
		}

		httpError := &integrations.HTTPError{
			StatusCode: statusCode,
			ErrorResponse: integrations.ErrorResponse{
				Code:    bffErr.Code,
				Message: bffErr.Message,
			},
		}
		app.errorResponse(w, r, httpError)
	} else {
		app.serverErrorResponse(w, r, err)
	}
}
