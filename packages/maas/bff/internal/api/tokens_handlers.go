package api

import (
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"time"

	"github.com/julienschmidt/httprouter"
	helper "github.com/opendatahub-io/maas-library/bff/internal/helpers"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

const (
	// DefaultTokenTTL is the default token time-to-live if not specified
	DefaultTokenTTL = 4 * time.Hour
)

// IssueTokenHandler handles POST /api/v1/tokens
// This endpoint issues ephemeral tokens for Gen-AI BFF playground sessions.
//
// STUB IMPLEMENTATION: Returns mock tokens. Real MaaS backend integration
// will be implemented in a future PR.
func (app *App) IssueTokenHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	logger := helper.GetContextLoggerFromReq(r)

	var tokenRequest models.TokenRequest

	// Only try to parse JSON if there's actually a body
	if r.ContentLength > 0 {
		if err := app.ReadJSON(w, r, &tokenRequest); err != nil {
			app.badRequestResponse(w, r, err)
			return
		}
	}

	// Parse TTL or use default
	ttl := DefaultTokenTTL
	if tokenRequest.Expiration != "" {
		parsedTTL, err := time.ParseDuration(tokenRequest.Expiration)
		if err != nil {
			app.badRequestResponse(w, r, err)
			return
		}
		ttl = parsedTTL
	}

	// Generate mock token
	// STUB: In real implementation, this would call the MaaS backend
	mockToken, err := generateMockToken()
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	expiresAt := time.Now().Add(ttl)

	logger.Debug("Issued mock token",
		"ttl", ttl.String(),
		"expiresAt", expiresAt.Unix(),
		"context", ctx,
	)

	response := Envelope[models.TokenResponse, None]{
		Data: models.TokenResponse{
			Token:     mockToken,
			ExpiresAt: expiresAt.Unix(),
		},
	}

	err = app.WriteJSON(w, http.StatusCreated, response, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// RevokeAllTokensHandler handles DELETE /api/v1/tokens
// This endpoint revokes all tokens for the current user.
//
// STUB IMPLEMENTATION: Returns 204 No Content. Real MaaS backend integration
// will be implemented in a future PR.
func (app *App) RevokeAllTokensHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	logger := helper.GetContextLoggerFromReq(r)

	// STUB: In real implementation, this would call the MaaS backend
	// to revoke all tokens for the user identified by RequestIdentity
	logger.Debug("Revoked all tokens (stub implementation)")

	// Return 204 No Content for successful deletion
	w.WriteHeader(http.StatusNoContent)
}

// generateMockToken creates a mock JWT-like token for testing
func generateMockToken() (string, error) {
	// Generate random bytes for the token payload
	randomBytes := make([]byte, 32)
	if _, err := rand.Read(randomBytes); err != nil {
		return "", err
	}

	// Create a mock JWT structure (header.payload.signature)
	// This is NOT a real JWT - just looks like one for testing
	header := "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9" // {"alg":"RS256","typ":"JWT"}
	payload := base64.RawURLEncoding.EncodeToString(randomBytes)
	signature := base64.RawURLEncoding.EncodeToString(randomBytes[:16])

	return header + "." + payload + "." + signature, nil
}

// attachTokenHandlers registers the token endpoints
func attachTokenHandlers(router *httprouter.Router, app *App) {
	router.POST("/api/v1/tokens", app.IssueTokenHandler)
	router.DELETE("/api/v1/tokens", app.RevokeAllTokensHandler)
}
