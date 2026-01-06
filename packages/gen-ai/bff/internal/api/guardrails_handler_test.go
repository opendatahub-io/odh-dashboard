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

func TestGuardrailsStatusHandler(t *testing.T) {
	// Setup test environment
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))

	testEnv, ctrlClient, err := k8smocks.SetupEnvTest(k8smocks.TestEnvInput{
		Users:  k8smocks.DefaultTestUsers,
		Logger: logger,
		Ctx:    ctx,
		Cancel: cancel,
	})
	require.NoError(t, err)
	defer func() {
		if err := testEnv.Stop(); err != nil {
			t.Logf("Failed to stop test environment: %v", err)
		}
	}()

	// Create mock factory
	k8sFactory, err := k8smocks.NewTokenClientFactory(ctrlClient, testEnv.Config, logger)
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

	t.Run("should return 200 with guardrails status when status is found", func(t *testing.T) {
		// Create request with proper context
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/guardrails/status?namespace=mock-test-namespace-1", nil)
		assert.NoError(t, err)

		// Add namespace and identity to context
		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace-1")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.GuardrailsStatusHandler(rr, req, nil)

		rs := rr.Result()
		defer func() { _ = rs.Body.Close() }()

		body, err := io.ReadAll(rs.Body)
		assert.NoError(t, err)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response GuardrailsStatusEnvelope
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		// Verify the response structure
		assert.Equal(t, "Ready", response.Data.Phase)
		assert.NotNil(t, response.Data.Conditions)
		assert.Len(t, response.Data.Conditions, 5, "Should have 5 conditions from mock")

		// Verify first condition (Progressing)
		assert.Equal(t, "Progressing", response.Data.Conditions[0].Type)
		assert.Equal(t, "True", response.Data.Conditions[0].Status)
		assert.Equal(t, "ReconcileInit", response.Data.Conditions[0].Reason)
		assert.Equal(t, "Initializing GuardrailsOrchestrator resource", response.Data.Conditions[0].Message)

		// Verify second condition (InferenceServiceReady)
		assert.Equal(t, "InferenceServiceReady", response.Data.Conditions[1].Type)
		assert.Equal(t, "False", response.Data.Conditions[1].Status)
		assert.Equal(t, "InferenceServiceNotReady", response.Data.Conditions[1].Reason)

		// Verify third condition (DeploymentReady)
		assert.Equal(t, "DeploymentReady", response.Data.Conditions[2].Type)
		assert.Equal(t, "True", response.Data.Conditions[2].Status)
		assert.Equal(t, "DeploymentReady", response.Data.Conditions[2].Reason)

		// Verify fourth condition (RouteReady)
		assert.Equal(t, "RouteReady", response.Data.Conditions[3].Type)
		assert.Equal(t, "False", response.Data.Conditions[3].Status)
		assert.Equal(t, "RouteNotReady", response.Data.Conditions[3].Reason)

		// Verify fifth condition (ReconcileComplete)
		assert.Equal(t, "ReconcileComplete", response.Data.Conditions[4].Type)
		assert.Equal(t, "False", response.Data.Conditions[4].Status)
		assert.Equal(t, "ReconcileFailed", response.Data.Conditions[4].Reason)
	})

	t.Run("should return 400 when namespace is missing from context", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/guardrails/status", nil)
		assert.NoError(t, err)

		// Don't add namespace to context
		rr := httptest.NewRecorder()

		app.GuardrailsStatusHandler(rr, req, nil)

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
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/guardrails/status?namespace=mock-test-namespace-1", nil)
		assert.NoError(t, err)

		// Add namespace to context but no RequestIdentity
		ctx := context.WithValue(context.Background(), constants.NamespaceQueryParameterKey, "mock-test-namespace-1")
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.GuardrailsStatusHandler(rr, req, nil)

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

	t.Run("should return correct JSON structure for guardrails status", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/guardrails/status?namespace=test-namespace", nil)
		assert.NoError(t, err)

		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "test-namespace")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.GuardrailsStatusHandler(rr, req, nil)

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

		// Verify 'phase' field
		phase, exists := dataMap["phase"]
		assert.True(t, exists, "Data should contain 'phase' field")
		assert.Equal(t, "Ready", phase)

		// Verify 'conditions' field
		conditions, exists := dataMap["conditions"]
		assert.True(t, exists, "Data should contain 'conditions' field")

		conditionsArray, ok := conditions.([]interface{})
		assert.True(t, ok, "Conditions should be an array")
		assert.Greater(t, len(conditionsArray), 0, "Conditions should not be empty")

		// Verify first condition structure
		firstCondition, ok := conditionsArray[0].(map[string]interface{})
		assert.True(t, ok, "Condition should be a map")
		assert.Contains(t, firstCondition, "type")
		assert.Contains(t, firstCondition, "status")
		assert.Contains(t, firstCondition, "reason")
		assert.Contains(t, firstCondition, "message")
		assert.Contains(t, firstCondition, "lastTransitionTime")
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
				req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/guardrails/status?namespace="+namespace, nil)
				assert.NoError(t, err)

				ctx := context.Background()
				ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, namespace)
				ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
					Token: "FAKE_BEARER_TOKEN",
				})
				req = req.WithContext(ctx)

				rr := httptest.NewRecorder()

				app.GuardrailsStatusHandler(rr, req, nil)

				assert.Equal(t, http.StatusOK, rr.Code, "Should return 200 for namespace: %s", namespace)

				var response GuardrailsStatusEnvelope
				err = json.Unmarshal(rr.Body.Bytes(), &response)
				assert.NoError(t, err)

				// Mock returns same status for all namespaces
				assert.Equal(t, "Ready", response.Data.Phase)
			})
		}
	})

	t.Run("should return proper content type header", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/guardrails/status?namespace=test", nil)
		assert.NoError(t, err)

		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "test")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.GuardrailsStatusHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))
	})
}

func TestGuardrailsStatusEnvelope(t *testing.T) {
	t.Run("should serialize correctly to JSON", func(t *testing.T) {
		envelope := GuardrailsStatusEnvelope{
			Data: models.GuardrailsStatus{
				Phase: "Ready",
				Conditions: []models.GuardrailsCondition{
					{
						Type:               "TestCondition",
						Status:             "True",
						Reason:             "TestReason",
						Message:            "Test message",
						LastTransitionTime: "2025-01-01T00:00:00Z",
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

		assert.Equal(t, "Ready", dataMap["phase"])

		conditions, ok := dataMap["conditions"].([]interface{})
		assert.True(t, ok)
		assert.Len(t, conditions, 1)

		condition, ok := conditions[0].(map[string]interface{})
		assert.True(t, ok)
		assert.Equal(t, "TestCondition", condition["type"])
		assert.Equal(t, "True", condition["status"])
		assert.Equal(t, "TestReason", condition["reason"])
		assert.Equal(t, "Test message", condition["message"])
		assert.Equal(t, "2025-01-01T00:00:00Z", condition["lastTransitionTime"])
	})

	t.Run("should handle empty conditions", func(t *testing.T) {
		envelope := GuardrailsStatusEnvelope{
			Data: models.GuardrailsStatus{
				Phase:      "NotDeployed",
				Conditions: []models.GuardrailsCondition{},
			},
		}

		jsonBytes, err := json.Marshal(envelope)
		assert.NoError(t, err)

		var decoded map[string]interface{}
		err = json.Unmarshal(jsonBytes, &decoded)
		assert.NoError(t, err)

		data := decoded["data"].(map[string]interface{})
		assert.Equal(t, "NotDeployed", data["phase"])
	})
}
