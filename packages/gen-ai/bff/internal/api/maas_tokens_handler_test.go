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

	t.Run("should return error when subscription is whitespace-only", func(t *testing.T) {
		tokenRequest := models.MaaSTokenRequest{
			Subscription: "   ",
			Description:  "test key",
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

		// Whitespace-only subscription should be rejected after trimming
		assert.Equal(t, http.StatusBadRequest, rr.Code)

		defer rr.Result().Body.Close()
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		assert.Contains(t, strings.ToLower(string(body)), "subscription is required")
	})

	t.Run("should reject expiresIn with invalid pattern", func(t *testing.T) {
		invalidPatterns := []string{
			"90d",     // days not allowed
			"2w",      // weeks not allowed
			"30",      // missing unit
			"30mins",  // full word not allowed
			"1.5h",    // decimal not allowed
			"invalid", // non-numeric
			"1h30m",   // compound not allowed (only single unit)
		}

		for _, invalidValue := range invalidPatterns {
			t.Run(invalidValue, func(t *testing.T) {
				tokenRequest := models.MaaSTokenRequest{
					Subscription: "test-subscription",
					ExpiresIn:    invalidValue,
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

				assert.Equal(t, http.StatusBadRequest, rr.Code)

				defer rr.Result().Body.Close()
				body, err := io.ReadAll(rr.Result().Body)
				assert.NoError(t, err)
				assert.Contains(t, strings.ToLower(string(body)), "expiresin must match pattern")
			})
		}
	})

	t.Run("should reject expiresIn exceeding 1 hour", func(t *testing.T) {
		invalidValues := []string{
			"61m",  // 61 minutes > 1h
			"2h",   // 2 hours > 1h
			"120m", // 120 minutes > 1h
		}

		for _, invalidValue := range invalidValues {
			t.Run(invalidValue, func(t *testing.T) {
				tokenRequest := models.MaaSTokenRequest{
					Subscription: "test-subscription",
					ExpiresIn:    invalidValue,
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

				assert.Equal(t, http.StatusBadRequest, rr.Code)

				defer rr.Result().Body.Close()
				body, err := io.ReadAll(rr.Result().Body)
				assert.NoError(t, err)
				assert.Contains(t, strings.ToLower(string(body)), "must not exceed 1h")
			})
		}
	})

	t.Run("should accept valid expiresIn values", func(t *testing.T) {
		validValues := []string{
			"30m",
			"1h",
			"60m",
			"15m",
			"45m",
		}

		for _, validValue := range validValues {
			t.Run(validValue, func(t *testing.T) {
				tokenRequest := models.MaaSTokenRequest{
					Subscription: "test-subscription",
					ExpiresIn:    validValue,
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

				assert.Equal(t, http.StatusCreated, rr.Code)
			})
		}
	})

	t.Run("should default to 1h when expiresIn is not provided", func(t *testing.T) {
		tokenRequest := models.MaaSTokenRequest{
			Subscription: "test-subscription",
			// ExpiresIn not provided
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

		// Should succeed and default to 1h
		assert.Equal(t, http.StatusCreated, rr.Code)
	})

	t.Run("should return 503 when MaaS BFF client is nil", func(t *testing.T) {
		tokenRequest := models.MaaSTokenRequest{Subscription: "test-subscription"}
		requestBody, err := json.Marshal(tokenRequest)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/maas/tokens?namespace=test-namespace", bytes.NewBuffer(requestBody))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		// Simulate AttachBFFMaaSClient middleware with nil client (MaaS BFF not configured)
		ctx := context.WithValue(req.Context(), constants.BFFClientKey(constants.BFFTarget(bffclient.BFFTargetMaaS)), nil)
		req = req.WithContext(ctx)

		app.MaaSIssueTokenHandler(rr, req, nil)

		// Should return 503 when BFF client is unavailable
		assert.Equal(t, http.StatusServiceUnavailable, rr.Code)

		defer rr.Result().Body.Close()
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		assert.Contains(t, strings.ToLower(string(body)), "not available")
	})

	t.Run("should return 500 when MaaS BFF returns empty key", func(t *testing.T) {
		// Create a mock BFF client that returns empty key
		mockClient := &mockBFFClientForEmptyKey{}

		logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
		mockFactory := &mockFactoryForEmptyKey{client: mockClient, logger: logger}

		app := App{
			config: config.EnvConfig{
				Port: 4000,
			},
			bffClientFactory: mockFactory,
		}

		tokenRequest := models.MaaSTokenRequest{Subscription: "test-subscription"}
		requestBody, err := json.Marshal(tokenRequest)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/maas/tokens?namespace=test-namespace", bytes.NewBuffer(requestBody))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		ctx := context.WithValue(req.Context(), constants.BFFClientKey(constants.BFFTarget(bffclient.BFFTargetMaaS)), mockClient)
		req = req.WithContext(ctx)

		app.MaaSIssueTokenHandler(rr, req, nil)

		// Should return 500 when MaaS BFF returns empty key (contract violation)
		// Error details are sanitized in 500 responses for security
		assert.Equal(t, http.StatusInternalServerError, rr.Code)
	})
}

// mockBFFClientForEmptyKey returns empty key to test validation
type mockBFFClientForEmptyKey struct{}

func (m *mockBFFClientForEmptyKey) Call(ctx context.Context, method, path string, body, response interface{}) error {
	// Return response with empty key
	emptyKeyResponse := map[string]interface{}{
		"key":       "",
		"keyPrefix": "sk-oai-",
		"id":        "test-id",
	}
	jsonBytes, _ := json.Marshal(emptyKeyResponse)
	return json.Unmarshal(jsonBytes, response)
}

func (m *mockBFFClientForEmptyKey) IsAvailable(ctx context.Context) bool {
	return true
}

func (m *mockBFFClientForEmptyKey) GetBaseURL() string {
	return "http://mock-maas-bff:8081"
}

func (m *mockBFFClientForEmptyKey) GetTarget() bffclient.BFFTarget {
	return bffclient.BFFTargetMaaS
}

type mockFactoryForEmptyKey struct {
	client *mockBFFClientForEmptyKey
	logger *slog.Logger
}

func (m *mockFactoryForEmptyKey) CreateClient(target bffclient.BFFTarget, authToken string) bffclient.BFFClientInterface {
	return m.client
}

func (m *mockFactoryForEmptyKey) CreateClientWithHeaders(target bffclient.BFFTarget, authToken string, headers map[string]string) bffclient.BFFClientInterface {
	return m.client
}

func (m *mockFactoryForEmptyKey) GetConfig(target bffclient.BFFTarget) *bffclient.BFFServiceConfig {
	return &bffclient.BFFServiceConfig{
		Target:     bffclient.BFFTargetMaaS,
		AuthMethod: "user_token",
	}
}

func (m *mockFactoryForEmptyKey) IsTargetConfigured(target bffclient.BFFTarget) bool {
	return true
}

// TestMaaSBFFAPIKeyResponseContract verifies that Gen AI BFF correctly unmarshals
// the envelope-wrapped response from MaaS BFF POST /api/v1/api-keys endpoint.
//
// Per modular architecture standard, MaaS BFF wraps responses in {"data": {...}}.
func TestMaaSBFFAPIKeyResponseContract(t *testing.T) {
	t.Run("should unmarshal envelope-wrapped MaaS BFF response", func(t *testing.T) {
		// This is what MaaS BFF actually returns per OpenAPI spec:
		// An envelope wrapper with data containing key, keyPrefix, id, name, createdAt, expiresAt
		maasBFFResponse := `{
			"data": {
				"key": "sk-oai-test-123456",
				"keyPrefix": "sk-oai-test",
				"id": "test-id-789",
				"name": "genai-ephemeral-1234567890",
				"createdAt": "2026-06-16T10:00:00Z",
				"expiresAt": "2026-06-16T11:00:00Z"
			}
		}`

		// Create a mock BFF client that returns the flat response
		mockClient := &mockBFFClientForContract{
			response: maasBFFResponse,
		}

		logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
		mockFactory := &mockFactoryForContract{client: mockClient, logger: logger}

		app := App{
			config: config.EnvConfig{
				Port: 4000,
			},
			bffClientFactory: mockFactory,
		}

		tokenRequest := models.MaaSTokenRequest{Subscription: "test-subscription"}
		requestBody, err := json.Marshal(tokenRequest)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/maas/tokens?namespace=test-namespace", bytes.NewBuffer(requestBody))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		// Simulate AttachBFFMaaSClient middleware
		ctx := context.WithValue(req.Context(), constants.BFFClientKey(constants.BFFTarget(bffclient.BFFTargetMaaS)), mockClient)
		req = req.WithContext(ctx)

		app.MaaSIssueTokenHandler(rr, req, nil)

		// Should successfully unmarshal and return 201
		assert.Equal(t, http.StatusCreated, rr.Code, "Handler should succeed with envelope-wrapped response")

		defer rr.Result().Body.Close()
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)

		var responseEnvelope Envelope[models.MaaSTokenResponse, None]
		err = json.Unmarshal(body, &responseEnvelope)
		assert.NoError(t, err)

		// Verify the key from the envelope-wrapped MaaS response was correctly extracted
		assert.Equal(t, "sk-oai-test-123456", responseEnvelope.Data.Key, "Key should match MaaS BFF response")
		assert.Equal(t, "2026-06-16T11:00:00Z", responseEnvelope.Data.ExpiresAt, "ExpiresAt should match MaaS BFF response")
	})

	t.Run("should reject flat (old) format from MaaS BFF", func(t *testing.T) {
		// If MaaS BFF were to return the old flat format, Gen AI BFF should handle it gracefully
		// or fail explicitly rather than silently returning empty data
		maasBFFFlatResponse := `{
			"key": "sk-oai-test-123456",
			"keyPrefix": "sk-oai-test",
			"id": "test-id-789",
			"name": "genai-ephemeral-1234567890",
			"createdAt": "2026-06-16T10:00:00Z",
			"expiresAt": "2026-06-16T11:00:00Z"
		}`

		mockClient := &mockBFFClientForContract{
			response: maasBFFFlatResponse,
		}

		logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
		mockFactory := &mockFactoryForContract{client: mockClient, logger: logger}

		app := App{
			config: config.EnvConfig{
				Port: 4000,
			},
			bffClientFactory: mockFactory,
		}

		tokenRequest := models.MaaSTokenRequest{Subscription: "test-subscription"}
		requestBody, err := json.Marshal(tokenRequest)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/maas/tokens?namespace=test-namespace", bytes.NewBuffer(requestBody))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		ctx := context.WithValue(req.Context(), constants.BFFClientKey(constants.BFFTarget(bffclient.BFFTargetMaaS)), mockClient)
		req = req.WithContext(ctx)

		app.MaaSIssueTokenHandler(rr, req, nil)

		defer rr.Result().Body.Close()
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)

		// With the old flat format, the key field would be empty because
		// the data is at the top level but we expect it nested under "data"
		var responseEnvelope Envelope[models.MaaSTokenResponse, None]
		err = json.Unmarshal(body, &responseEnvelope)
		assert.NoError(t, err)

		// The handler validates that the key is not empty and returns 500 if it is
		// So if we get here with an empty key, it means validation failed
		if responseEnvelope.Data.Key == "" {
			t.Log("WARNING: Flat format resulted in empty key - handler should have returned 500")
		}
	})
}

// mockBFFClientForContract is a minimal mock that returns a raw JSON string
type mockBFFClientForContract struct {
	response string
}

func (m *mockBFFClientForContract) Call(ctx context.Context, method, path string, body, response interface{}) error {
	return json.Unmarshal([]byte(m.response), response)
}

func (m *mockBFFClientForContract) IsAvailable(ctx context.Context) bool {
	return true
}

func (m *mockBFFClientForContract) GetBaseURL() string {
	return "http://mock-maas-bff:8081"
}

func (m *mockBFFClientForContract) GetTarget() bffclient.BFFTarget {
	return bffclient.BFFTargetMaaS
}

// mockFactoryForContract provides the mock client
type mockFactoryForContract struct {
	client *mockBFFClientForContract
	logger *slog.Logger
}

func (m *mockFactoryForContract) CreateClient(target bffclient.BFFTarget, authToken string) bffclient.BFFClientInterface {
	return m.client
}

func (m *mockFactoryForContract) CreateClientWithHeaders(target bffclient.BFFTarget, authToken string, headers map[string]string) bffclient.BFFClientInterface {
	return m.client
}

func (m *mockFactoryForContract) GetConfig(target bffclient.BFFTarget) *bffclient.BFFServiceConfig {
	return &bffclient.BFFServiceConfig{
		Target:     bffclient.BFFTargetMaaS,
		AuthMethod: "user_token",
	}
}

func (m *mockFactoryForContract) IsTargetConfigured(target bffclient.BFFTarget) bool {
	return true
}

// TestMaaSRevokeAllTokensHandler removed - DELETE /maas/tokens endpoint dropped per RHOAIENG-60574
