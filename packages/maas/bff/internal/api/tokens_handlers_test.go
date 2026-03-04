package api

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/opendatahub-io/maas-library/bff/internal/config"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestIssueTokenHandler(t *testing.T) {
	app := &App{
		config: config.EnvConfig{
			Port: 4000,
		},
	}

	t.Run("should issue token with default TTL when no body provided", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodPost, "/api/v1/tokens", nil)
		require.NoError(t, err)

		app.IssueTokenHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		defer rr.Result().Body.Close()
		body, err := io.ReadAll(rr.Result().Body)
		require.NoError(t, err)

		var response Envelope[models.TokenResponse, None]
		err = json.Unmarshal(body, &response)
		require.NoError(t, err)

		assert.NotEmpty(t, response.Data.Token)
		assert.NotZero(t, response.Data.ExpiresAt)
		// Token should look like a JWT (three parts separated by dots)
		parts := strings.Split(response.Data.Token, ".")
		assert.Len(t, parts, 3)
	})

	t.Run("should issue token with custom TTL", func(t *testing.T) {
		tokenRequest := models.TokenRequest{Expiration: "2h"}
		requestBody, err := json.Marshal(tokenRequest)
		require.NoError(t, err)

		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodPost, "/api/v1/tokens", bytes.NewBuffer(requestBody))
		require.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		app.IssueTokenHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		defer rr.Result().Body.Close()
		body, err := io.ReadAll(rr.Result().Body)
		require.NoError(t, err)

		var response Envelope[models.TokenResponse, None]
		err = json.Unmarshal(body, &response)
		require.NoError(t, err)

		assert.NotEmpty(t, response.Data.Token)
		assert.NotZero(t, response.Data.ExpiresAt)
	})

	t.Run("should return error for invalid TTL format", func(t *testing.T) {
		tokenRequest := models.TokenRequest{Expiration: "invalid"}
		requestBody, err := json.Marshal(tokenRequest)
		require.NoError(t, err)

		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodPost, "/api/v1/tokens", bytes.NewBuffer(requestBody))
		require.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		app.IssueTokenHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("should return error for invalid JSON", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodPost, "/api/v1/tokens", strings.NewReader("invalid json"))
		require.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		app.IssueTokenHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("should have correct response structure", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodPost, "/api/v1/tokens", nil)
		require.NoError(t, err)

		app.IssueTokenHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)
		assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

		defer rr.Result().Body.Close()
		body, err := io.ReadAll(rr.Result().Body)
		require.NoError(t, err)

		// Verify JSON structure has "data" wrapper
		var rawResponse map[string]interface{}
		err = json.Unmarshal(body, &rawResponse)
		require.NoError(t, err)

		data, ok := rawResponse["data"].(map[string]interface{})
		require.True(t, ok, "Response should have 'data' wrapper")
		assert.Contains(t, data, "token")
		assert.Contains(t, data, "expiresAt")
	})
}

func TestRevokeAllTokensHandler(t *testing.T) {
	app := &App{
		config: config.EnvConfig{
			Port: 4000,
		},
	}

	t.Run("should revoke all tokens successfully", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodDelete, "/api/v1/tokens", nil)
		require.NoError(t, err)

		app.RevokeAllTokensHandler(rr, req, nil)

		assert.Equal(t, http.StatusNoContent, rr.Code)

		// Verify no content in response body
		defer rr.Result().Body.Close()
		body, err := io.ReadAll(rr.Result().Body)
		require.NoError(t, err)
		assert.Empty(t, body)
	})

	t.Run("should not set content-type header for 204 response", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodDelete, "/api/v1/tokens", nil)
		require.NoError(t, err)

		app.RevokeAllTokensHandler(rr, req, nil)

		assert.Equal(t, http.StatusNoContent, rr.Code)
		// 204 responses should not have content-type
		assert.Empty(t, rr.Header().Get("Content-Type"))
	})
}

func TestGenerateMockToken(t *testing.T) {
	t.Run("should generate valid JWT-like token", func(t *testing.T) {
		token, err := generateMockToken()
		require.NoError(t, err)

		// Token should have three parts separated by dots (JWT format)
		parts := strings.Split(token, ".")
		assert.Len(t, parts, 3)

		// Header should be the standard RS256/JWT header
		assert.Equal(t, "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9", parts[0])
	})

	t.Run("should generate unique tokens", func(t *testing.T) {
		token1, err := generateMockToken()
		require.NoError(t, err)

		token2, err := generateMockToken()
		require.NoError(t, err)

		assert.NotEqual(t, token1, token2)
	})
}
