package auth

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/opendatahub-io/llama-stack-modular-ui/internal/config"
)

type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token"`
	Scope        string `json:"scope"`
}

type OAuthHandler struct {
	config config.EnvConfig
	client *http.Client
	logger *slog.Logger
}

func NewOAuthHandler(cfg config.EnvConfig, logger *slog.Logger) *OAuthHandler {
	return &OAuthHandler{
		config: cfg,
		client: &http.Client{
			Timeout: time.Second * 10,
		},
		logger: logger,
	}
}

// ExtractToken extracts the bearer token from the Authorization header
func ExtractToken(r *http.Request) (string, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return "", fmt.Errorf("no authorization header")
	}

	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		return "", fmt.Errorf("invalid authorization header format")
	}

	return parts[1], nil
}

// ValidateToken validates the token with the configured OAuth user info endpoint
func (h *OAuthHandler) ValidateToken(ctx context.Context, token string) error {
	// Use configurable user info endpoint, fallback to OpenShift default if not set
	userInfoEndpoint := h.config.OAuthUserInfoEndpoint
	if userInfoEndpoint == "" {
		userInfoEndpoint = h.config.OpenShiftApiServerUrl + "/apis/user.openshift.io/v1/users/~"
	}

	h.logger.Info("Validating token against user info endpoint",
		slog.String("endpoint", userInfoEndpoint))

	req, err := http.NewRequestWithContext(ctx, "GET", userInfoEndpoint, nil)
	if err != nil {
		h.logger.Error("Failed to create token validation request",
			slog.String("error", err.Error()),
			slog.String("endpoint", userInfoEndpoint))
		return fmt.Errorf("error creating validation request")
	}

	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := h.client.Do(req)
	if err != nil {
		h.logger.Error("Token validation request failed",
			slog.String("error", err.Error()),
			slog.String("endpoint", userInfoEndpoint))
		return fmt.Errorf("token validation failed")
	}
	defer func() {
		if err := resp.Body.Close(); err != nil {
			h.logger.Error("Failed to close response body", slog.String("error", err.Error()))
		}
	}()

	if resp.StatusCode != http.StatusOK {
		// Read response body for internal logging only, don't expose it
		body, _ := io.ReadAll(resp.Body)
		h.logger.Error("Token validation failed",
			slog.Int("status_code", resp.StatusCode),
			slog.String("endpoint", userInfoEndpoint),
			slog.Int("response_body_length", len(body)))

		// Return generic error message without exposing sensitive details
		return fmt.Errorf("token validation failed")
	}

	h.logger.Info("Token validation successful")
	return nil
}

// PropagateToken propagates the token to the backend service
func PropagateToken(token string, req *http.Request) {
	req.Header.Set("Authorization", "Bearer "+token)
}
