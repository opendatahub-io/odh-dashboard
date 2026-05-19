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

// TestMaaSIssueTokenHandler validates the /maas/tokens endpoint API contract.
// The endpoint now uses inter-BFF communication but maintains the same external API contract.
// These tests use BFF client mocks and keep assertions unchanged to prove contract stability.
func TestMaaSIssueTokenHandler(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))

	bffClientFactory := bffmocks.NewMockClientFactory(logger)
	app := App{
		config: config.EnvConfig{
			Port: 4000,
		},
		bffClientFactory: bffClientFactory,
	}

	// Test assertions remain unchanged - proving the API contract is preserved
	t.Run("should issue API key with required subscription", func(t *testing.T) {
		tokenRequest := models.MaaSTokenRequest{Subscription: "test-subscription"}
		requestBody, err := json.Marshal(tokenRequest)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/maas/tokens?namespace=test-namespace", bytes.NewBuffer(requestBody))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		// Simulate AttachBFFMaaSClient middleware
		maasClient := bffClientFactory.CreateClient(bffclient.BFFTargetMaaS, "test-token")
		ctx := context.WithValue(req.Context(), constants.BFFClientKey(constants.BFFTarget(bffclient.BFFTargetMaaS)), maasClient)
		req = req.WithContext(ctx)

		app.MaaSIssueTokenHandler(rr, req, nil)

		// API contract assertions - unchanged from original test
		assert.Equal(t, http.StatusCreated, rr.Code)

		defer rr.Result().Body.Close()
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)

		var responseEnvelope Envelope[models.MaaSTokenResponse, None]
		err = json.Unmarshal(body, &responseEnvelope)
		assert.NoError(t, err)
		assert.NotEmpty(t, responseEnvelope.Data.Key)
		assert.Contains(t, responseEnvelope.Data.Key, "sk-oai-mock-") // Mock returns sk-oai-mock- prefix
	})

	t.Run("should issue ephemeral API key with custom expiration when provided", func(t *testing.T) {
		tokenRequest := models.MaaSTokenRequest{
			Description:  "test key",
			ExpiresIn:    "30m",
			Subscription: "test-subscription",
		}
		requestBody, err := json.Marshal(tokenRequest)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/maas/tokens?namespace=test-namespace", bytes.NewBuffer(requestBody))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		// Simulate AttachBFFMaaSClient middleware
		maasClient := bffClientFactory.CreateClient(bffclient.BFFTargetMaaS, "test-token")
		ctx := context.WithValue(req.Context(), constants.BFFClientKey(constants.BFFTarget(bffclient.BFFTargetMaaS)), maasClient)
		req = req.WithContext(ctx)

		app.MaaSIssueTokenHandler(rr, req, nil)

		// API contract assertions - unchanged from original test
		assert.Equal(t, http.StatusCreated, rr.Code)

		defer rr.Result().Body.Close()
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)

		var responseEnvelope Envelope[models.MaaSTokenResponse, None]
		err = json.Unmarshal(body, &responseEnvelope)
		assert.NoError(t, err)
		assert.NotEmpty(t, responseEnvelope.Data.Key)
		assert.Contains(t, responseEnvelope.Data.Key, "sk-oai-mock-") // Mock returns sk-oai-mock- prefix
	})

	t.Run("should return error for invalid JSON", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/maas/tokens?namespace=test-namespace", strings.NewReader("invalid json"))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		// Simulate AttachBFFMaaSClient middleware
		maasClient := bffClientFactory.CreateClient(bffclient.BFFTargetMaaS, "test-token")
		ctx := context.WithValue(req.Context(), constants.BFFClientKey(constants.BFFTarget(bffclient.BFFTargetMaaS)), maasClient)
		req = req.WithContext(ctx)

		app.MaaSIssueTokenHandler(rr, req, nil)

		// API contract assertion - unchanged from original test
		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("should have correct response structure", func(t *testing.T) {
		tokenRequest := models.MaaSTokenRequest{Subscription: "test-subscription"}
		requestBody, err := json.Marshal(tokenRequest)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/maas/tokens?namespace=test-namespace", bytes.NewBuffer(requestBody))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		// Simulate AttachBFFMaaSClient middleware
		maasClient := bffClientFactory.CreateClient(bffclient.BFFTargetMaaS, "test-token")
		ctx := context.WithValue(req.Context(), constants.BFFClientKey(constants.BFFTarget(bffclient.BFFTargetMaaS)), maasClient)
		req = req.WithContext(ctx)

		app.MaaSIssueTokenHandler(rr, req, nil)

		// API contract assertions - unchanged from original test
		assert.Equal(t, http.StatusCreated, rr.Code)
		assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

		defer rr.Result().Body.Close()
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)

		var responseEnvelope Envelope[models.MaaSTokenResponse, None]
		err = json.Unmarshal(body, &responseEnvelope)
		assert.NoError(t, err)

		// Verify required fields are present
		assert.NotEmpty(t, responseEnvelope.Data.Key, "Key should not be empty")
	})

	t.Run("should return error when subscription is missing", func(t *testing.T) {
		tokenRequest := models.MaaSTokenRequest{Description: "test key"}
		requestBody, err := json.Marshal(tokenRequest)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/maas/tokens?namespace=test-namespace", bytes.NewBuffer(requestBody))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		// Simulate AttachBFFMaaSClient middleware
		maasClient := bffClientFactory.CreateClient(bffclient.BFFTargetMaaS, "test-token")
		ctx := context.WithValue(req.Context(), constants.BFFClientKey(constants.BFFTarget(bffclient.BFFTargetMaaS)), maasClient)
		req = req.WithContext(ctx)

		app.MaaSIssueTokenHandler(rr, req, nil)

		// New validation requirement - subscription is required
		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})
}

// TestMaaSRevokeAllTokensHandler removed - DELETE /maas/tokens endpoint dropped per RHOAIENG-60574
