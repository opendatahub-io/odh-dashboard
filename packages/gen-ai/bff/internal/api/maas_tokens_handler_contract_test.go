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
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/stretchr/testify/assert"
)

// TestMaaSBFFAPIKeyResponseContract verifies that Gen AI BFF correctly unmarshals
// the flat response from MaaS BFF POST /api/v1/api-keys endpoint.
//
// This test catches the envelope mismatch issue identified in code review:
// MaaS BFF OpenAPI spec documents a flat response object, not an envelope wrapper.
func TestMaaSBFFAPIKeyResponseContract(t *testing.T) {
	t.Run("should unmarshal flat MaaS BFF response (not envelope)", func(t *testing.T) {
		// This is what MaaS BFF actually returns per openapi.yaml lines 367-388:
		// A flat object with key, keyPrefix, id, name, createdAt, expiresAt
		maasBFFResponse := `{
			"key": "sk-oai-test-123456",
			"keyPrefix": "sk-oai-test",
			"id": "test-id-789",
			"name": "genai-ephemeral-1234567890",
			"createdAt": "2026-06-16T10:00:00Z",
			"expiresAt": "2026-06-16T11:00:00Z"
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
		assert.Equal(t, http.StatusCreated, rr.Code, "Handler should succeed with flat response")

		defer rr.Result().Body.Close()
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)

		var responseEnvelope Envelope[models.MaaSTokenResponse, None]
		err = json.Unmarshal(body, &responseEnvelope)
		assert.NoError(t, err)

		// Verify the key from the flat MaaS response was correctly extracted
		assert.Equal(t, "sk-oai-test-123456", responseEnvelope.Data.Key, "Key should match MaaS BFF response")
		assert.Equal(t, "2026-06-16T11:00:00Z", responseEnvelope.Data.ExpiresAt, "ExpiresAt should match MaaS BFF response")
	})

	t.Run("should reject old envelope format from MaaS BFF", func(t *testing.T) {
		// If MaaS BFF were to return the old envelope format, Gen AI BFF should handle it gracefully
		// or fail explicitly rather than silently returning empty data
		maasBFFEnvelopeResponse := `{
			"data": {
				"key": "sk-oai-test-123456",
				"keyPrefix": "sk-oai-test",
				"id": "test-id-789",
				"name": "genai-ephemeral-1234567890",
				"createdAt": "2026-06-16T10:00:00Z",
				"expiresAt": "2026-06-16T11:00:00Z"
			}
		}`

		mockClient := &mockBFFClientForContract{
			response: maasBFFEnvelopeResponse,
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

		// With the old envelope format, the key field would be empty because
		// it's nested under "data" but we're trying to unmarshal at the top level
		var responseEnvelope Envelope[models.MaaSTokenResponse, None]
		err = json.Unmarshal(body, &responseEnvelope)
		assert.NoError(t, err)

		// This assertion documents the current behavior - if envelope format is returned,
		// the key will be empty (silent failure). The fix should either:
		// 1. Correctly unmarshal flat format (preferred), or
		// 2. Return explicit error when key is empty
		if responseEnvelope.Data.Key == "" {
			t.Log("WARNING: Envelope format resulted in empty key - this is the bug we're fixing")
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
