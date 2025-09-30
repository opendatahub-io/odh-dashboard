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

func TestMaaSIssueTokenHandler(t *testing.T) {
	// Create test app with mock client
	maasClientFactory := maasmocks.NewMockClientFactory()
	app := App{
		config: config.EnvConfig{
			Port: 4000,
		},
		maasClientFactory: maasClientFactory,
		repositories:      repositories.NewRepositories(),
	}

	t.Run("should issue token with default TTL when no body provided", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/maas/tokens", nil)
		assert.NoError(t, err)

		// Simulate AttachMaaSClient middleware
		maasClient := app.maasClientFactory.CreateClient("", "")
		ctx := context.WithValue(req.Context(), constants.MaaSClientKey, maasClient)
		req = req.WithContext(ctx)

		app.MaaSIssueTokenHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		defer rr.Result().Body.Close()
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)

		var response models.MaaSTokenResponse
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		assert.NotEmpty(t, response.Token)
		assert.NotEmpty(t, response.ExpiresAt)
		assert.Contains(t, response.Token, "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9") // JWT header
	})

	t.Run("should issue token with custom TTL when provided", func(t *testing.T) {
		tokenRequest := models.MaaSTokenRequest{TTL: "2h"}
		requestBody, err := json.Marshal(tokenRequest)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/maas/tokens", bytes.NewBuffer(requestBody))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		// Simulate AttachMaaSClient middleware
		maasClient := app.maasClientFactory.CreateClient("", "")
		ctx := context.WithValue(req.Context(), constants.MaaSClientKey, maasClient)
		req = req.WithContext(ctx)

		app.MaaSIssueTokenHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		defer rr.Result().Body.Close()
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)

		var response models.MaaSTokenResponse
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		assert.NotEmpty(t, response.Token)
		assert.NotEmpty(t, response.ExpiresAt)
	})

	t.Run("should return error for invalid JSON", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/maas/tokens", strings.NewReader("invalid json"))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		// Simulate AttachMaaSClient middleware
		maasClient := app.maasClientFactory.CreateClient("", "")
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
		maasClient := app.maasClientFactory.CreateClient("", "")
		ctx := context.WithValue(req.Context(), constants.MaaSClientKey, maasClient)
		req = req.WithContext(ctx)

		app.MaaSIssueTokenHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)
		assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

		defer rr.Result().Body.Close()
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)

		var response models.MaaSTokenResponse
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		// Verify required fields are present
		assert.NotEmpty(t, response.Token, "Token should not be empty")
		assert.NotEmpty(t, response.ExpiresAt, "ExpiresAt should not be empty")
	})
}

func TestMaaSRevokeAllTokensHandler(t *testing.T) {
	// Create test app with mock client
	maasClientFactory := maasmocks.NewMockClientFactory()
	app := App{
		config: config.EnvConfig{
			Port: 4000,
		},
		maasClientFactory: maasClientFactory,
		repositories:      repositories.NewRepositories(),
	}

	t.Run("should revoke all tokens successfully", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodDelete, "/gen-ai/api/v1/maas/tokens", nil)
		assert.NoError(t, err)

		// Simulate AttachMaaSClient middleware
		maasClient := app.maasClientFactory.CreateClient("", "")
		ctx := context.WithValue(req.Context(), constants.MaaSClientKey, maasClient)
		req = req.WithContext(ctx)

		app.MaaSRevokeAllTokensHandler(rr, req, nil)

		assert.Equal(t, http.StatusNoContent, rr.Code)

		// Verify no content in response body
		defer rr.Result().Body.Close()
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		assert.Empty(t, body)
	})

	t.Run("should return correct status code and headers", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodDelete, "/gen-ai/api/v1/maas/tokens", nil)
		assert.NoError(t, err)

		// Simulate AttachMaaSClient middleware
		maasClient := app.maasClientFactory.CreateClient("", "")
		ctx := context.WithValue(req.Context(), constants.MaaSClientKey, maasClient)
		req = req.WithContext(ctx)

		app.MaaSRevokeAllTokensHandler(rr, req, nil)

		assert.Equal(t, http.StatusNoContent, rr.Code)

		// Verify no content-type header is set for 204 responses
		assert.Empty(t, rr.Header().Get("Content-Type"))
	})
}
