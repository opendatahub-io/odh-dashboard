package api

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations/maas/maasmocks"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
	"github.com/stretchr/testify/assert"
)

// TODO: Update TestMaaSIssueTokenHandler for inter-BFF communication
// These tests need to be updated to use BFF client instead of direct MaaS client
// and test the new envelope request/response format.
func TestMaaSIssueTokenHandler(t *testing.T) {
	t.Skip("Tests need to be updated for inter-BFF communication (RHOAIENG-46233)")
	// Create test app with mock client
	maasClientFactory := maasmocks.NewMockClientFactory()
	app := App{
		config: config.EnvConfig{
			Port: 4000,
		},
		maasClientFactory: maasClientFactory,
		repositories:      repositories.NewRepositories(),
	}

	t.Run("should issue API key when no body provided", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/maas/tokens", nil)
		assert.NoError(t, err)

		// Simulate AttachMaaSClient middleware
		maasClient := app.maasClientFactory.CreateClient("", "token_mock", false, nil)
		ctx := context.WithValue(req.Context(), constants.MaaSClientKey, maasClient)
		req = req.WithContext(ctx)

		app.MaaSIssueTokenHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		defer rr.Result().Body.Close()
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)

		var responseEnvelope Envelope[models.MaaSTokenResponse, None]
		err = json.Unmarshal(body, &responseEnvelope)
		assert.NoError(t, err)
		assert.NotEmpty(t, responseEnvelope.Data.Key)
		assert.Contains(t, responseEnvelope.Data.Key, "sk-mock-")
	})

	t.Run("should issue ephemeral API key with custom expiration when provided", func(t *testing.T) {
		tokenRequest := models.MaaSTokenRequest{Description: "test key", ExpiresIn: "30m"}
		requestBody, err := json.Marshal(tokenRequest)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/maas/tokens", bytes.NewBuffer(requestBody))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		// Simulate AttachMaaSClient middleware
		maasClient := app.maasClientFactory.CreateClient("", "token_mock", false, nil)
		ctx := context.WithValue(req.Context(), constants.MaaSClientKey, maasClient)
		req = req.WithContext(ctx)

		app.MaaSIssueTokenHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		defer rr.Result().Body.Close()
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)

		var responseEnvelope Envelope[models.MaaSTokenResponse, None]
		err = json.Unmarshal(body, &responseEnvelope)
		assert.NoError(t, err)
		assert.NotEmpty(t, responseEnvelope.Data.Key)
		assert.Contains(t, responseEnvelope.Data.Key, "sk-mock-")
	})

	t.Run("should return error for invalid JSON", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/maas/tokens", strings.NewReader("invalid json"))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		// Simulate AttachMaaSClient middleware
		maasClient := app.maasClientFactory.CreateClient("", "token_mock", false, nil)
		ctx := context.WithValue(req.Context(), constants.MaaSClientKey, maasClient)
		req = req.WithContext(ctx)

		app.MaaSIssueTokenHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("should have correct response structure", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/maas/tokens", nil)
		assert.NoError(t, err)

		// Simulate AttachMaaSClient middleware
		maasClient := app.maasClientFactory.CreateClient("", "token_mock", false, nil)
		ctx := context.WithValue(req.Context(), constants.MaaSClientKey, maasClient)
		req = req.WithContext(ctx)

		app.MaaSIssueTokenHandler(rr, req, nil)

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
}

// TestMaaSRevokeAllTokensHandler removed - DELETE /maas/tokens endpoint dropped per RHOAIENG-60574
