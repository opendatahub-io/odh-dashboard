package api

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient/bffmocks"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/stretchr/testify/assert"
)

func TestBFFMaaSIssueTokenHandler(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))

	// Create test app with mock BFF client factory
	bffClientFactory := bffmocks.NewMockClientFactory(logger)
	app := App{
		config: config.EnvConfig{
			Port: 4000,
		},
		bffClientFactory: bffClientFactory,
	}

	t.Run("should issue token via BFF client with default TTL", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/bff/maas/tokens", nil)
		assert.NoError(t, err)

		// Simulate AttachBFFMaaSClient middleware by adding client to context
		maasClient := bffClientFactory.CreateClient(bffclient.BFFTargetMaaS, "test-token")
		ctx := context.WithValue(req.Context(), constants.BFFClientKey(constants.BFFTarget("maas")), maasClient)
		req = req.WithContext(ctx)

		app.BFFMaaSIssueTokenHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		defer rr.Result().Body.Close()
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)

		var responseEnvelope Envelope[models.MaaSTokenResponse, None]
		err = json.Unmarshal(body, &responseEnvelope)
		assert.NoError(t, err)
		assert.NotEmpty(t, responseEnvelope.Data.Token)
		assert.NotEmpty(t, responseEnvelope.Data.ExpiresAt)
	})

	t.Run("should issue token with custom TTL", func(t *testing.T) {
		tokenRequest := models.MaaSTokenRequest{TTL: "2h"}
		requestBody, err := json.Marshal(tokenRequest)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/bff/maas/tokens", bytes.NewBuffer(requestBody))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		// Simulate AttachBFFMaaSClient middleware
		maasClient := bffClientFactory.CreateClient(bffclient.BFFTargetMaaS, "test-token")
		ctx := context.WithValue(req.Context(), constants.BFFClientKey(constants.BFFTarget("maas")), maasClient)
		req = req.WithContext(ctx)

		app.BFFMaaSIssueTokenHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)
	})

	t.Run("should return 503 when BFF client is nil", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/bff/maas/tokens", nil)
		assert.NoError(t, err)

		// Don't add client to context (simulating unavailable MaaS BFF)
		app.BFFMaaSIssueTokenHandler(rr, req, nil)

		assert.Equal(t, http.StatusServiceUnavailable, rr.Code)

		defer rr.Result().Body.Close()
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		assert.Contains(t, string(body), "service_unavailable")
	})

	t.Run("should return error for invalid JSON", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/bff/maas/tokens", strings.NewReader("invalid json"))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		// Simulate AttachBFFMaaSClient middleware
		maasClient := bffClientFactory.CreateClient(bffclient.BFFTargetMaaS, "test-token")
		ctx := context.WithValue(req.Context(), constants.BFFClientKey(constants.BFFTarget("maas")), maasClient)
		req = req.WithContext(ctx)

		app.BFFMaaSIssueTokenHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})
}

func TestBFFMaaSRevokeAllTokensHandler(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))

	// Create test app with mock BFF client factory
	bffClientFactory := bffmocks.NewMockClientFactory(logger)
	app := App{
		config: config.EnvConfig{
			Port: 4000,
		},
		bffClientFactory: bffClientFactory,
	}

	t.Run("should revoke all tokens via BFF client", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodDelete, "/gen-ai/api/v1/bff/maas/tokens", nil)
		assert.NoError(t, err)

		// Simulate AttachBFFMaaSClient middleware
		maasClient := bffClientFactory.CreateClient(bffclient.BFFTargetMaaS, "test-token")
		ctx := context.WithValue(req.Context(), constants.BFFClientKey(constants.BFFTarget("maas")), maasClient)
		req = req.WithContext(ctx)

		app.BFFMaaSRevokeAllTokensHandler(rr, req, nil)

		assert.Equal(t, http.StatusNoContent, rr.Code)

		// Verify no content in response body
		defer rr.Result().Body.Close()
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		assert.Empty(t, body)
	})

	t.Run("should return 503 when BFF client is nil", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodDelete, "/gen-ai/api/v1/bff/maas/tokens", nil)
		assert.NoError(t, err)

		// Don't add client to context (simulating unavailable MaaS BFF)
		app.BFFMaaSRevokeAllTokensHandler(rr, req, nil)

		assert.Equal(t, http.StatusServiceUnavailable, rr.Code)
	})
}

func TestHandleBFFClientError(t *testing.T) {
	app := App{
		config: config.EnvConfig{
			Port: 4000,
		},
	}

	tests := []struct {
		name           string
		err            error
		expectedStatus int
		expectedCode   string
	}{
		{
			name:           "ConnectionError",
			err:            bffclient.NewConnectionError(bffclient.BFFTargetMaaS, "connection refused"),
			expectedStatus: http.StatusServiceUnavailable,
			expectedCode:   bffclient.ErrCodeConnectionFailed,
		},
		{
			name:           "UnauthorizedError",
			err:            bffclient.NewUnauthorizedError(bffclient.BFFTargetMaaS, "invalid token"),
			expectedStatus: http.StatusUnauthorized,
			expectedCode:   bffclient.ErrCodeUnauthorized,
		},
		{
			name:           "NotFoundError",
			err:            bffclient.NewNotFoundError(bffclient.BFFTargetMaaS, "endpoint not found"),
			expectedStatus: http.StatusNotFound,
			expectedCode:   bffclient.ErrCodeNotFound,
		},
		{
			name:           "ServerUnavailableError",
			err:            bffclient.NewServerUnavailableError(bffclient.BFFTargetMaaS),
			expectedStatus: http.StatusServiceUnavailable,
			expectedCode:   bffclient.ErrCodeServerUnavailable,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rr := httptest.NewRecorder()
			req, _ := http.NewRequest(http.MethodGet, "/test", nil)

			app.handleBFFClientError(rr, req, tt.err)

			assert.Equal(t, tt.expectedStatus, rr.Code)

			defer rr.Result().Body.Close()
			body, _ := io.ReadAll(rr.Result().Body)
			assert.Contains(t, string(body), tt.expectedCode)
		})
	}
}
