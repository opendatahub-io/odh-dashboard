package api

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes/k8smocks"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack/lsmocks"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLSDSafetyConfigHandler(t *testing.T) {
	// Setup test environment
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))

	testEnvState, ctrlClient, err := k8smocks.SetupEnvTest(k8smocks.TestEnvInput{
		Users:  k8smocks.DefaultTestUsers,
		Logger: logger,
		Ctx:    ctx,
		Cancel: cancel,
	})
	require.NoError(t, err)
	defer k8smocks.TeardownEnvTest(t, testEnvState)

	// Create mock factory
	k8sFactory, err := k8smocks.NewTokenClientFactory(ctrlClient, testEnvState.Env.Config, logger)
	require.NoError(t, err)

	// Create test app with real mock infrastructure
	llamaStackClientFactory := lsmocks.NewMockClientFactory()
	app := App{
		config: config.EnvConfig{
			Port: 4000,
		},
		logger:                  logger,
		kubernetesClientFactory: k8sFactory,
		llamaStackClientFactory: llamaStackClientFactory,
		repositories:            repositories.NewRepositories(),
	}

	t.Run("should return 200 with safety config when config is found", func(t *testing.T) {
		// Create request with proper context
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/lsd/safety?namespace=mock-test-namespace-1", nil)
		assert.NoError(t, err)

		// Add namespace and identity to context
		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace-1")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.LSDSafetyConfigHandler(rr, req, nil)

		rs := rr.Result()
		defer func() { _ = rs.Body.Close() }()

		body, err := io.ReadAll(rs.Body)
		assert.NoError(t, err)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response SafetyConfigEnvelope
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		// Verify the response structure
		assert.NotNil(t, response.Data.GuardrailModels)
		assert.Len(t, response.Data.GuardrailModels, 1, "Should have 1 guardrail model from mock")

		// Verify the guardrail model details
		guardrailModel := response.Data.GuardrailModels[0]
		assert.Equal(t, "llama-guard-3", guardrailModel.ModelName)
		assert.Equal(t, "trustyai_input", guardrailModel.InputShieldID)
		assert.Equal(t, "trustyai_output", guardrailModel.OutputShieldID)
	})

	t.Run("should return 400 when namespace is missing from context", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/lsd/safety", nil)
		assert.NoError(t, err)

		// Don't add namespace to context
		rr := httptest.NewRecorder()

		app.LSDSafetyConfigHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		errorData, exists := response["error"]
		assert.True(t, exists, "Response should contain 'error' field")

		errorMap, ok := errorData.(map[string]interface{})
		assert.True(t, ok, "Error should be a map")

		assert.Equal(t, "400", errorMap["code"])
		assert.Contains(t, errorMap["message"], "missing namespace in the context")
	})

	t.Run("should return 401 when RequestIdentity is missing from context", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/lsd/safety?namespace=mock-test-namespace-1", nil)
		assert.NoError(t, err)

		// Add namespace to context but no RequestIdentity
		ctx := context.WithValue(context.Background(), constants.NamespaceQueryParameterKey, "mock-test-namespace-1")
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.LSDSafetyConfigHandler(rr, req, nil)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		errorData, exists := response["error"]
		assert.True(t, exists, "Response should contain 'error' field")

		errorMap, ok := errorData.(map[string]interface{})
		assert.True(t, ok, "Error should be a map")

		assert.Equal(t, "401", errorMap["code"])
		assert.Contains(t, errorMap["message"], "missing RequestIdentity in context")
	})

	t.Run("should return correct JSON structure for safety config", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/lsd/safety?namespace=test-namespace", nil)
		assert.NoError(t, err)

		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "test-namespace")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.LSDSafetyConfigHandler(rr, req, nil)

		rs := rr.Result()
		defer func() { _ = rs.Body.Close() }()

		body, err := io.ReadAll(rs.Body)
		assert.NoError(t, err)

		assert.Equal(t, http.StatusOK, rr.Code)

		// Verify JSON structure using raw map
		var rawResponse map[string]interface{}
		err = json.Unmarshal(body, &rawResponse)
		assert.NoError(t, err)

		// Verify 'data' field exists
		data, exists := rawResponse["data"]
		assert.True(t, exists, "Response should contain 'data' field")

		dataMap, ok := data.(map[string]interface{})
		assert.True(t, ok, "Data should be a map")

		// Verify 'guardrail_models' field
		guardrailModels, exists := dataMap["guardrail_models"]
		assert.True(t, exists, "Data should contain 'guardrail_models' field")

		modelsArray, ok := guardrailModels.([]interface{})
		assert.True(t, ok, "guardrail_models should be an array")
		assert.Greater(t, len(modelsArray), 0, "guardrail_models should not be empty")

		// Verify first model structure
		firstModel, ok := modelsArray[0].(map[string]interface{})
		assert.True(t, ok, "Model should be a map")
		assert.Contains(t, firstModel, "model_name")
		assert.Contains(t, firstModel, "input_shield_id")
		assert.Contains(t, firstModel, "output_shield_id")
	})

	t.Run("should work with different namespaces", func(t *testing.T) {
		testNamespaces := []string{
			"mock-test-namespace-1",
			"mock-test-namespace-2",
			"production-namespace",
			"dev-namespace",
		}

		for _, namespace := range testNamespaces {
			t.Run("namespace_"+namespace, func(t *testing.T) {
				req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/lsd/safety?namespace="+namespace, nil)
				assert.NoError(t, err)

				ctx := context.Background()
				ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, namespace)
				ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
					Token: "FAKE_BEARER_TOKEN",
				})
				req = req.WithContext(ctx)

				rr := httptest.NewRecorder()

				app.LSDSafetyConfigHandler(rr, req, nil)

				assert.Equal(t, http.StatusOK, rr.Code, "Should return 200 for namespace: %s", namespace)

				var response SafetyConfigEnvelope
				err = json.Unmarshal(rr.Body.Bytes(), &response)
				assert.NoError(t, err)

				// Mock returns same config for all namespaces
				assert.Len(t, response.Data.GuardrailModels, 1)
			})
		}
	})

	t.Run("should return proper content type header", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/lsd/safety?namespace=test", nil)
		assert.NoError(t, err)

		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "test")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.LSDSafetyConfigHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))
	})

}

func TestSafetyConfigEnvelope(t *testing.T) {
	t.Run("should serialize correctly to JSON", func(t *testing.T) {
		envelope := SafetyConfigEnvelope{
			Data: models.SafetyConfigResponse{
				GuardrailModels: []models.GuardrailModelConfig{
					{
						ModelName:      "test-model",
						InputShieldID:  "input_shield",
						OutputShieldID: "output_shield",
					},
				},
			},
		}

		jsonBytes, err := json.Marshal(envelope)
		assert.NoError(t, err)

		var decoded map[string]interface{}
		err = json.Unmarshal(jsonBytes, &decoded)
		assert.NoError(t, err)

		data, exists := decoded["data"]
		assert.True(t, exists)

		dataMap, ok := data.(map[string]interface{})
		assert.True(t, ok)

		guardrailModels, ok := dataMap["guardrail_models"].([]interface{})
		assert.True(t, ok)
		assert.Len(t, guardrailModels, 1)

		model, ok := guardrailModels[0].(map[string]interface{})
		assert.True(t, ok)
		assert.Equal(t, "test-model", model["model_name"])
		assert.Equal(t, "input_shield", model["input_shield_id"])
		assert.Equal(t, "output_shield", model["output_shield_id"])
	})

	t.Run("should handle empty guardrail models", func(t *testing.T) {
		envelope := SafetyConfigEnvelope{
			Data: models.SafetyConfigResponse{
				GuardrailModels: []models.GuardrailModelConfig{},
			},
		}

		jsonBytes, err := json.Marshal(envelope)
		assert.NoError(t, err)

		var decoded map[string]interface{}
		err = json.Unmarshal(jsonBytes, &decoded)
		assert.NoError(t, err)

		data := decoded["data"].(map[string]interface{})

		guardrailModels, ok := data["guardrail_models"].([]interface{})
		assert.True(t, ok)
		assert.Len(t, guardrailModels, 0)
	})

	t.Run("should handle multiple guardrail models", func(t *testing.T) {
		envelope := SafetyConfigEnvelope{
			Data: models.SafetyConfigResponse{
				GuardrailModels: []models.GuardrailModelConfig{
					{
						ModelName:      "model-1",
						InputShieldID:  "shield_1_input",
						OutputShieldID: "shield_1_output",
					},
					{
						ModelName:      "model-2",
						InputShieldID:  "shield_2_input",
						OutputShieldID: "shield_2_output",
					},
				},
			},
		}

		jsonBytes, err := json.Marshal(envelope)
		assert.NoError(t, err)

		var decoded map[string]interface{}
		err = json.Unmarshal(jsonBytes, &decoded)
		assert.NoError(t, err)

		data := decoded["data"].(map[string]interface{})
		guardrailModels, ok := data["guardrail_models"].([]interface{})
		assert.True(t, ok)
		assert.Len(t, guardrailModels, 2)

		// Verify first model
		model1 := guardrailModels[0].(map[string]interface{})
		assert.Equal(t, "model-1", model1["model_name"])

		// Verify second model
		model2 := guardrailModels[1].(map[string]interface{})
		assert.Equal(t, "model-2", model2["model_name"])
	})
}
