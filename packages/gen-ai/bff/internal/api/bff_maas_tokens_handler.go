package api

import (
	"fmt"
	"net/http"
	"time"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// BFFMaaSIssueTokenHandler handles POST /bff/maas/tokens
// Calls the MaaS BFF POST /api-keys endpoint to create an ephemeral OpenAI-compatible
// API key for use in gen-ai playground sessions.
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
	// Use r.ContentLength != 0 instead of > 0 to handle chunked transfer encoding
	// where ContentLength is -1 (common with K8s proxies and Envoy)
	if r.Body != nil && r.ContentLength != 0 {
		if err := app.ReadJSON(w, r, &tokenRequest); err != nil {
			app.badRequestResponse(w, r, err)
			return
		}
	}

	// Build the MaaS BFF API key request.
	// Auto-generate a name if the caller did not provide one.
	name := tokenRequest.Name
	if name == "" {
		name = fmt.Sprintf("gen-ai-%d", time.Now().Unix())
	}

	apiKeyReq := models.MaaSBFFAPIKeyRequest{
		Name:         name,
		Description:  tokenRequest.Description,
		ExpiresIn:    tokenRequest.ExpiresIn,
		Subscription: tokenRequest.Subscription,
		Ephemeral:    true, // always ephemeral for gen-ai playground keys
	}

	// MaaS BFF expects requests in a mod-arch envelope: {"data": {...}}
	reqEnvelope := Envelope[models.MaaSBFFAPIKeyRequest, None]{Data: apiKeyReq}

	var bffResponse models.MaaSBFFAPIKeyResponse
	if err := maasClient.Call(ctx, "POST", "/api-keys", reqEnvelope, &bffResponse); err != nil {
		app.handleBFFClientError(w, r, err)
		return
	}

	responseEnvelope := Envelope[models.MaaSBFFAPIKeyCreateData, None]{
		Data: bffResponse.Data,
	}

	if err := app.WriteJSON(w, http.StatusCreated, responseEnvelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
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
