package api

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	kservev1beta1 "github.com/kserve/kserve/pkg/apis/serving/v1beta1"
	. "github.com/onsi/ginkgo/v2"
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

var _ = Describe("LlamaStackModelsHandler", func() {
	var app App

	BeforeEach(func() {
		llamaStackClientFactory := lsmocks.NewMockClientFactory()
		app = App{
			config: config.EnvConfig{
				Port: 4000,
			},
			llamaStackClientFactory: llamaStackClientFactory,
			repositories:            repositories.NewRepositories(),
		}
	})

	It("should return all models successfully", func() {
		t := GinkgoT()
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/models?namespace="+testutil.TestNamespace, nil)
		assert.NoError(t, err)

		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
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

		models := response.Data.([]interface{})
		assert.Greater(t, len(models), 0, "should have at least one model")
	})

	It("should have correct response structure", func() {
		t := GinkgoT()
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/models?namespace="+testutil.TestNamespace, nil)
		assert.NoError(t, err)

		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		app.LlamaStackModelsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		assert.Contains(t, response, "data")

		dataField := response["data"].([]interface{})
		assert.Greater(t, len(dataField), 0)

		firstModel := dataField[0].(map[string]interface{})
		assert.Contains(t, firstModel, "id")
		assert.Contains(t, firstModel, "object")
		assert.Contains(t, firstModel, "created")
		assert.Contains(t, firstModel, "owned_by")

		assert.Equal(t, "model", firstModel["object"])
		assert.Equal(t, "llama_stack", firstModel["owned_by"])
	})
})

var _ = Describe("LlamaStackModelsHandlerWithFilteredKeywords", func() {
	var app App

	BeforeEach(func() {
		llamaStackClientFactory := lsmocks.NewMockClientFactory()
		app = App{
			config: config.EnvConfig{
				Port:                  4000,
				FilteredModelKeywords: []string{"embedding"},
			},
			llamaStackClientFactory: llamaStackClientFactory,
			repositories:            repositories.NewRepositories(),
		}
	})

	It("should filter models by keyword", func() {
		t := GinkgoT()
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/models?namespace="+testutil.TestNamespace, nil)
		assert.NoError(t, err)

		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
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

		models := response.Data.([]interface{})
		for _, m := range models {
			model := m.(map[string]interface{})
			id := model["id"].(string)
			assert.NotContains(t, id, "embedding", "filtered keyword should not appear in model id")
		}
	})
})

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
