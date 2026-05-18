package api

import (
	"fmt"
	"net/http"
	"time"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// MaaSIssueTokenHandler handles POST /api/v1/maas/tokens.
// Uses inter-BFF communication to call MaaS BFF POST /api/v1/api-keys.
// Auto-generates ephemeral key name and always sets ephemeral: true.
func (app *App) MaaSIssueTokenHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

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

	// Get MaaS BFF client from context (set by AttachBFFMaaSClient middleware)
	maasClient := bffclient.GetClient(ctx, bffclient.BFFTargetMaaS)
	if maasClient == nil {
		app.maasBFFUnavailableResponse(w, r)
		return
	}

	// Validate required fields
	if tokenRequest.Subscription == "" {
		app.badRequestResponse(w, r, fmt.Errorf("subscription is required"))
		return
	}

	// Auto-generate ephemeral key name if not provided
	keyName := tokenRequest.Name
	if keyName == "" {
		keyName = fmt.Sprintf("genai-ephemeral-%d", time.Now().Unix())
	}

	// Build MaaS BFF API key request envelope
	// MaaS BFF expects: {"data": {"name": "...", "subscription": "...", "ephemeral": true}}
	bffRequest := models.MaaSBFFAPIKeyRequest{
		Data: models.MaaSBFFAPIKeyRequestData{
			Name:         keyName,
			Description:  tokenRequest.Description,
			Subscription: tokenRequest.Subscription,
			Ephemeral:    true, // Always ephemeral for playground sessions
		},
	}

	// Call MaaS BFF to create API key
	// MaaS BFF returns response wrapped in envelope: {"data": {"key": "...", "expiresAt": "...", ...}}
	var bffResponse models.MaaSBFFAPIKeyResponse
	err := maasClient.Call(ctx, "POST", "/api/v1/api-keys", bffRequest, &bffResponse)
	if err != nil {
		app.handleBFFClientError(w, r, err)
		return
	}

	// Map MaaS BFF response to Gen AI format
	genAIResponse := models.MaaSTokenResponse{
		Key: bffResponse.Data.Key,
	}

	// Map expiresAt from pointer to string
	if bffResponse.Data.ExpiresAt != nil {
		genAIResponse.ExpiresAt = *bffResponse.Data.ExpiresAt
	}

	// Return response in Gen AI envelope format
	tokenResponseEnvelope := Envelope[models.MaaSTokenResponse, None]{
		Data: genAIResponse,
	}

	err = app.WriteJSON(w, http.StatusCreated, tokenResponseEnvelope, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
