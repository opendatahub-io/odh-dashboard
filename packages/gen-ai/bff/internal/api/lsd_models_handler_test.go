package api

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	kservev1beta1 "github.com/kserve/kserve/pkg/apis/serving/v1beta1"
	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack/lsmocks"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
	"github.com/opendatahub-io/gen-ai/internal/testutil"
	"github.com/stretchr/testify/assert"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	duckv1 "knative.dev/pkg/apis/duck/v1"
)

func TestLlamaStackModelsHandler(t *testing.T) {
	// Create test app with mock client
	llamaStackClientFactory := lsmocks.NewMockClientFactory()
	app := App{
		config: config.EnvConfig{
			Port: 4000,
		},
		llamaStackClientFactory: llamaStackClientFactory,
		repositories:            repositories.NewRepositories(),
	}

	t.Run("should return all models successfully", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/models?namespace="+testutil.TestNamespace, nil)
		assert.NoError(t, err)

		// Simulate AttachLlamaStackClient middleware: create client and add to context
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		app.LlamaStackModelsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response ModelsResponse
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		// Verify mock returns 2 models
		models := response.Data.([]interface{})
		assert.Len(t, models, 2)
	})

	t.Run("should have correct response structure", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/models?namespace="+testutil.TestNamespace, nil)
		assert.NoError(t, err)

		// Simulate AttachLlamaStackClient middleware: create client and add to context
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		app.LlamaStackModelsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		// Parse as generic map to verify structure
		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		// Verify envelope structure
		assert.Contains(t, response, "data")

		dataField := response["data"].([]interface{})
		assert.Len(t, dataField, 2)

		// Verify first model structure (OpenAI Model format)
		firstModel := dataField[0].(map[string]interface{})
		assert.Contains(t, firstModel, "id")
		assert.Contains(t, firstModel, "object")
		assert.Contains(t, firstModel, "created")
		assert.Contains(t, firstModel, "owned_by")

		// Verify mock model values
		assert.Equal(t, "ollama/llama3.2:3b", firstModel["id"])
		assert.Equal(t, "model", firstModel["object"])
		assert.Equal(t, "llama_stack", firstModel["owned_by"])
	})

	t.Run("should use unified repository pattern", func(t *testing.T) {
		assert.NotNil(t, app.repositories)
		assert.NotNil(t, app.repositories.Models)

		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/models?namespace="+testutil.TestNamespace, nil)
		assert.NoError(t, err)

		// Simulate AttachLlamaStackClient middleware: create client and add to context
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		app.LlamaStackModelsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		// Verify response contains mock data
		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		models := response["data"].([]interface{})
		firstModel := models[0].(map[string]interface{})
		assert.Equal(t, "ollama/llama3.2:3b", firstModel["id"])
	})

	t.Run("should return no models for mock-test-namespace-3", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/models?namespace=mock-test-namespace-3", nil)
		assert.NoError(t, err)

		// Simulate AttachLlamaStackClient middleware: create client and add namespace to context
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace-3")
		req = req.WithContext(ctx)

		app.LlamaStackModelsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response ModelsResponse
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		// Verify mock returns no models for mock-test-namespace-3
		models := response.Data.([]interface{})
		assert.Len(t, models, 0, "Should return no models for mock-test-namespace-3 to show 'Add to playground' button for all AA models")
	})
}

func TestInferenceServiceStatusExtraction(t *testing.T) {
	// Test the status extraction logic directly
	t.Run("should return Running status when Ready condition is True", func(t *testing.T) {
		// Create a ready InferenceService
		readyISVC := &kservev1beta1.InferenceService{
			ObjectMeta: metav1.ObjectMeta{
				Name: "test-ready-model",
			},
			Status: kservev1beta1.InferenceServiceStatus{
				Status: duckv1.Status{
					Conditions: duckv1.Conditions{
						{
							Type:   "Ready",
							Status: "True",
						},
					},
				},
			},
		}

		// Test the status extraction directly
		status := kubernetes.ExtractStatusFromInferenceService(readyISVC)
		assert.Equal(t, "Running", status)
	})

	t.Run("should return Stop status when Ready condition is False", func(t *testing.T) {
		// Create a not-ready InferenceService
		notReadyISVC := &kservev1beta1.InferenceService{
			ObjectMeta: metav1.ObjectMeta{
				Name: "test-error-model",
			},
			Status: kservev1beta1.InferenceServiceStatus{
				Status: duckv1.Status{
					Conditions: duckv1.Conditions{
						{
							Type:   "Ready",
							Status: "False",
						},
					},
				},
			},
		}

		// Test the status extraction directly
		status := kubernetes.ExtractStatusFromInferenceService(notReadyISVC)
		assert.Equal(t, "Stop", status)
	})

	t.Run("should return Stop status when no Ready condition exists", func(t *testing.T) {
		// Create an InferenceService without Ready condition
		noReadyISVC := &kservev1beta1.InferenceService{
			ObjectMeta: metav1.ObjectMeta{
				Name: "test-no-ready-model",
			},
			Status: kservev1beta1.InferenceServiceStatus{
				Status: duckv1.Status{
					Conditions: duckv1.Conditions{
						{
							Type:   "PredictorReady",
							Status: "True",
						},
					},
				},
			},
		}

		// Test the status extraction directly
		status := kubernetes.ExtractStatusFromInferenceService(noReadyISVC)
		assert.Equal(t, "Stop", status)
	})

	t.Run("should return Stop status when no conditions exist", func(t *testing.T) {
		// Create an InferenceService with no conditions
		noConditionsISVC := &kservev1beta1.InferenceService{
			ObjectMeta: metav1.ObjectMeta{
				Name: "test-no-conditions-model",
			},
			Status: kservev1beta1.InferenceServiceStatus{
				Status: duckv1.Status{
					Conditions: duckv1.Conditions{},
				},
			},
		}

		// Test the status extraction directly
		status := kubernetes.ExtractStatusFromInferenceService(noConditionsISVC)
		assert.Equal(t, "Stop", status)
	})
}
