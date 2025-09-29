package api

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations/maas/maasmocks"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
	"github.com/stretchr/testify/assert"
)

func TestMaaSModelsHandler(t *testing.T) {
	// Create test app with mock client
	maasClientFactory := maasmocks.NewMockClientFactory()
	app := App{
		config: config.EnvConfig{
			Port: 4000,
		},
		maasClientFactory: maasClientFactory,
		repositories:      repositories.NewRepositories(),
	}

	t.Run("should return all models successfully", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/v1/models", nil)
		assert.NoError(t, err)

		// Simulate AttachMaaSClient middleware: create client and add to context
		maasClient := app.maasClientFactory.CreateClient("", "")
		ctx := context.WithValue(req.Context(), constants.MaaSClientKey, maasClient)
		req = req.WithContext(ctx)

		app.MaaSModelsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		defer rr.Result().Body.Close()
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)

		var response models.MaaSModelsResponse
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		// Verify mock returns 4 models
		assert.Equal(t, "list", response.Object)
		assert.Len(t, response.Data, 4)

		// Verify the structure of returned models
		firstModel := response.Data[0]
		assert.Equal(t, "llama-2-7b-chat", firstModel.ID)
		assert.Equal(t, "model", firstModel.Object)
		assert.Equal(t, "model-namespace", firstModel.OwnedBy)
		assert.True(t, firstModel.Ready)
		assert.Equal(t, "http://llama-2-7b-chat.openshift-ai-inference-tier-premium.svc.cluster.local", firstModel.URL)
		assert.NotZero(t, firstModel.Created)
	})

	t.Run("should have correct response structure", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/v1/models", nil)
		assert.NoError(t, err)

		// Simulate AttachMaaSClient middleware
		maasClient := app.maasClientFactory.CreateClient("", "")
		ctx := context.WithValue(req.Context(), constants.MaaSClientKey, maasClient)
		req = req.WithContext(ctx)

		app.MaaSModelsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

		defer rr.Result().Body.Close()
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)

		var response models.MaaSModelsResponse
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		// Verify all models have required fields
		for _, model := range response.Data {
			assert.NotEmpty(t, model.ID)
			assert.Equal(t, "model", model.Object)
			assert.NotEmpty(t, model.OwnedBy)
			assert.NotEmpty(t, model.URL)
			assert.NotZero(t, model.Created)
			// Ready can be true or false, but should be set
		}
	})

	t.Run("should include models with different ready states", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/v1/models", nil)
		assert.NoError(t, err)

		// Simulate AttachMaaSClient middleware
		maasClient := app.maasClientFactory.CreateClient("", "")
		ctx := context.WithValue(req.Context(), constants.MaaSClientKey, maasClient)
		req = req.WithContext(ctx)

		app.MaaSModelsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		defer rr.Result().Body.Close()
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)

		var response models.MaaSModelsResponse
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		// Verify we have models with different ready states
		readyModels := 0
		notReadyModels := 0
		for _, model := range response.Data {
			if model.Ready {
				readyModels++
			} else {
				notReadyModels++
			}
		}

		// Based on our mock data, we should have both ready and not-ready models
		assert.Greater(t, readyModels, 0, "Should have at least one ready model")
		assert.Greater(t, notReadyModels, 0, "Should have at least one not-ready model")
	})
}
