package api

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/auth"
	helper "github.com/opendatahub-io/llama-stack-modular-ui/internal/helpers"
)

type OAuthCallbackRequest struct {
	Code  string `json:"code"`
	State string `json:"state"`
}

type OAuthStateResponse struct {
	State string `json:"state"`
}

// In-memory store for OAuth state values
var (
	oauthStates = make(map[string]time.Time)
	statesMutex sync.RWMutex
)

func (app *App) HandleOAuthCallback(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	logger := helper.GetContextLoggerFromReq(r)

	var req OAuthCallbackRequest
	err := app.ReadJSON(w, r, &req)
	if err != nil {
		logger.Error("Failed to parse OAuth callback request", slog.String("error", err.Error()))
		app.badRequestResponse(w, r, fmt.Errorf("invalid request format"))
		return
	}

	// Validate state parameter for CSRF protection
	if !app.validateOAuthState(req.State) {
		logger.Error("OAuth state validation failed", slog.String("state", req.State))
		app.badRequestResponse(w, r, fmt.Errorf("invalid request"))
		return
	}

	// Exchange code for token
	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("code", req.Code)
	data.Set("client_id", app.config.OAuthClientID)
	data.Set("client_secret", app.config.OAuthClientSecret)
	data.Set("redirect_uri", app.config.OAuthRedirectURI)

	tokenURL := fmt.Sprintf("%s/oauth/token", app.config.OAuthServerURL)
	tokenReq, err := http.NewRequest("POST", tokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		logger.Error("Failed to create token request", slog.String("error", err.Error()))
		app.serverErrorResponse(w, r, fmt.Errorf("authentication failed"))
		return
	}

	tokenReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	// Use HTTP client with reasonable timeout
	client := &http.Client{
		Timeout: 15 * time.Second, // Reduced from 30s for better responsiveness
	}

	resp, err := client.Do(tokenReq)
	if err != nil {
		logger.Error("OAuth token exchange request failed", slog.String("error", err.Error()), slog.String("url", tokenURL))
		app.serverErrorResponse(w, r, fmt.Errorf("authentication failed"))
		return
	}
	defer func() {
		if err := resp.Body.Close(); err != nil {
			logger.Error("Failed to close response body", slog.String("error", err.Error()))
		}
	}()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		logger.Error("OAuth token exchange failed",
			slog.Int("status_code", resp.StatusCode),
			slog.String("response_body", string(body)),
			slog.String("token_url", tokenURL))
		app.serverErrorResponse(w, r, fmt.Errorf("authentication failed"))
		return
	}

	var tokenResponse auth.TokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResponse); err != nil {
		logger.Error("Failed to decode token response", slog.String("error", err.Error()))
		app.serverErrorResponse(w, r, fmt.Errorf("authentication failed"))
		return
	}

	logger.Info("OAuth token exchange successful")

	// Return the token to the frontend
	err = app.WriteJSON(w, http.StatusOK, tokenResponse, nil)
	if err != nil {
		logger.Error("Failed to write token response", slog.String("error", err.Error()))
		app.serverErrorResponse(w, r, fmt.Errorf("authentication failed"))
	}
}

// HandleOAuthState generates and returns a new OAuth state parameter
func (app *App) HandleOAuthState(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	logger := helper.GetContextLoggerFromReq(r)

	state, err := app.generateOAuthState()
	if err != nil {
		logger.Error("Failed to generate OAuth state", slog.String("error", err.Error()))
		app.serverErrorResponse(w, r, fmt.Errorf("failed to generate OAuth state"))
		return
	}

	response := OAuthStateResponse{State: state}
	err = app.WriteJSON(w, http.StatusOK, response, nil)
	if err != nil {
		logger.Error("Failed to write OAuth state response", slog.String("error", err.Error()))
		app.serverErrorResponse(w, r, fmt.Errorf("failed to generate OAuth state"))
	}
}

// generateOAuthState creates a cryptographically secure random state parameter
func (app *App) generateOAuthState() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	state := base64.URLEncoding.EncodeToString(bytes)

	// Store state with expiration time (10 minutes)
	statesMutex.Lock()
	oauthStates[state] = time.Now().Add(10 * time.Minute)
	statesMutex.Unlock()

	// Clean up expired states
	go app.cleanupExpiredStates()

	return state, nil
}

// validateOAuthState validates the OAuth state parameter to prevent CSRF attacks
func (app *App) validateOAuthState(state string) bool {
	if state == "" {
		return false
	}

	statesMutex.RLock()
	expiry, exists := oauthStates[state]
	statesMutex.RUnlock()

	if !exists {
		return false
	}

	// Check if state has expired
	if time.Now().After(expiry) {
		// Remove expired state
		statesMutex.Lock()
		delete(oauthStates, state)
		statesMutex.Unlock()
		return false
	}

	// Remove used state to prevent replay attacks
	statesMutex.Lock()
	delete(oauthStates, state)
	statesMutex.Unlock()

	return true
}

// cleanupExpiredStates removes expired OAuth state parameters
func (app *App) cleanupExpiredStates() {
	statesMutex.Lock()
	defer statesMutex.Unlock()

	now := time.Now()
	for state, expiry := range oauthStates {
		if now.After(expiry) {
			delete(oauthStates, state)
		}
	}
}
