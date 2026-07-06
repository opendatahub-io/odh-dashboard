package api

import (
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// MaaSIssueTokenHandler handles POST /api/v1/maas/tokens.
// Uses inter-BFF communication to call MaaS BFF POST /api/v1/api-keys.
// Auto-generates ephemeral key name and always sets ephemeral: true.
//
// Note: namespace query parameter is required by OpenAPI spec and validated by AttachNamespace
// middleware for consistency with other endpoints, but is not forwarded to MaaS BFF because
// the upstream /api-keys endpoint does not currently support multi-tenant key issuance.
func (app *App) MaaSIssueTokenHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	// Get MaaS BFF client from context (set by AttachBFFMaaSClient middleware)
	// Check infrastructure prerequisites before parsing request body to avoid
	// 400 (malformed JSON) masking 503 (BFF unavailable)
	maasClient := bffclient.GetClient(ctx, bffclient.BFFTargetMaaS)
	if maasClient == nil {
		app.maasBFFUnavailableResponse(w, r)
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

	// Validate required fields (trim whitespace to catch whitespace-only values)
	subscription := strings.TrimSpace(tokenRequest.Subscription)
	if subscription == "" {
		app.badRequestResponse(w, r, fmt.Errorf("subscription is required"))
		return
	}

	// Validate expiresIn pattern and maximum value (per OpenAPI spec: ^[0-9]+(m|h)$, max 1h)
	// Default to 1h if not provided
	expiresIn := strings.TrimSpace(tokenRequest.ExpiresIn)
	if expiresIn == "" {
		expiresIn = "1h"
	} else {
		// Check pattern: must be digits followed by 'm' or 'h'
		validPattern := regexp.MustCompile(`^[0-9]+(m|h)$`)
		if !validPattern.MatchString(expiresIn) {
			app.badRequestResponse(w, r, fmt.Errorf("expiresIn must match pattern ^[0-9]+(m|h)$ (e.g., '30m', '1h'), got %q", expiresIn))
			return
		}

		// Parse and validate maximum (1h = 60 minutes)
		unit := expiresIn[len(expiresIn)-1]
		valueStr := expiresIn[:len(expiresIn)-1]
		value, _ := strconv.Atoi(valueStr) // regex already validated this is a number

		var minutes int
		if unit == 'h' {
			minutes = value * 60
		} else {
			minutes = value
		}

		if minutes > 60 {
			app.badRequestResponse(w, r, fmt.Errorf("expiresIn must not exceed 1h for ephemeral keys, got %q (%d minutes)", expiresIn, minutes))
			return
		}
	}

	// Auto-generate ephemeral key name if not provided
	keyName := tokenRequest.Name
	if keyName == "" {
		keyName = fmt.Sprintf("genai-ephemeral-%d", time.Now().Unix())
	}

	// Build MaaS BFF API key request (envelope wrapper per OpenAPI spec)
	bffRequest := models.MaaSBFFAPIKeyRequest{
		Data: models.MaaSBFFAPIKeyRequestData{
			Name:         keyName,
			Description:  tokenRequest.Description,
			ExpiresIn:    expiresIn,    // Use validated value (defaults to "1h" if not provided)
			Subscription: subscription, // Use trimmed value
			Ephemeral:    true,         // Always ephemeral for playground sessions
		},
	}

	// Call MaaS BFF to create API key
	// Per MaaS BFF OpenAPI spec, POST /api/v1/api-keys returns an envelope wrapper:
	// {"data": {"key": "...", "keyPrefix": "...", "id": "...", "expiresAt": "...", ...}}
	var bffResponse models.MaaSBFFAPIKeyResponse
	err := maasClient.Call(ctx, "POST", "/api-keys", bffRequest, &bffResponse)
	if err != nil {
		app.handleBFFClientError(w, r, err)
		return
	}

	// Validate that MaaS BFF returned a non-empty key
	if bffResponse.Data.Key == "" {
		app.serverErrorResponse(w, r, fmt.Errorf("MaaS BFF returned empty key in response"))
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
