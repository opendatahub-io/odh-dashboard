package api

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/cache"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes/k8smocks"
	"github.com/opendatahub-io/gen-ai/internal/integrations/maas/maasmocks"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
	"github.com/stretchr/testify/assert"
)

func newMaaSModelsTestApp(t *testing.T) *App {
	t.Helper()
	maasClientFactory := maasmocks.NewMockClientFactory()
	return &App{
		logger:                  slog.Default(),
		maasClientFactory:       maasClientFactory,
		kubernetesClientFactory: k8smocks.NewMockTokenClientFactory(),
		repositories:            repositories.NewRepositories(),
		memoryStore:             cache.NewMemoryStore(),
	}
}

func newMaaSModelsTestCtx(app *App, r *http.Request) *http.Request {
	maasClient := app.maasClientFactory.CreateClient("", "token_mock", false, nil)
	ctx := context.WithValue(r.Context(), constants.MaaSClientKey, maasClient)
	ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "test-namespace")
	ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{Token: "token_mock"})
	return r.WithContext(ctx)
}

func TestMaaSModelsHandler(t *testing.T) {
	app := newMaaSModelsTestApp(t)

	t.Run("should return all models successfully", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/v1/models", nil)
		assert.NoError(t, err)
		req = newMaaSModelsTestCtx(app, req)

		app.MaaSModelsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		defer rr.Result().Body.Close()
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)

		var response models.MaaSModelsResponse
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		// Verify mock returns 5 models
		assert.Equal(t, "list", response.Object)
		assert.Len(t, response.Data, 5)

		// Verify the structure of returned models
		firstModel := response.Data[0]
		assert.Equal(t, "llama-2-7b-chat", firstModel.ID)
		assert.Equal(t, "model", firstModel.Object)
		assert.Equal(t, "model-namespace", firstModel.OwnedBy)
		assert.True(t, firstModel.Ready)
		assert.Equal(t, "https://llama-2-7b-chat.apps.example.openshift.com/v1", firstModel.URL)
		assert.NotZero(t, firstModel.Created)
	})

	t.Run("should have correct response structure", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/v1/models", nil)
		assert.NoError(t, err)
		req = newMaaSModelsTestCtx(app, req)

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
		}
	})

	t.Run("should include models with different ready states", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/v1/models", nil)
		assert.NoError(t, err)
		req = newMaaSModelsTestCtx(app, req)

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

		assert.Greater(t, readyModels, 0, "Should have at least one ready model")
		assert.Greater(t, notReadyModels, 0, "Should have at least one not-ready model")
	})
}

func TestMaaSModelsHandler_MissingNamespace(t *testing.T) {
	app := newMaaSModelsTestApp(t)

	rr := httptest.NewRecorder()
	req, err := http.NewRequest(http.MethodGet, "/v1/models", nil)
	assert.NoError(t, err)

	app.MaaSModelsHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestMaaSModelsHandler_MissingIdentity(t *testing.T) {
	app := newMaaSModelsTestApp(t)

	rr := httptest.NewRecorder()
	req, err := http.NewRequest(http.MethodGet, "/v1/models", nil)
	assert.NoError(t, err)

	ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, "test-namespace")
	req = req.WithContext(ctx)

	app.MaaSModelsHandler(rr, req, nil)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestMaaSModelsHandler_EmptyToken(t *testing.T) {
	app := newMaaSModelsTestApp(t)

	rr := httptest.NewRecorder()
	req, err := http.NewRequest(http.MethodGet, "/v1/models", nil)
	assert.NoError(t, err)

	ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, "test-namespace")
	ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{Token: ""})
	req = req.WithContext(ctx)

	app.MaaSModelsHandler(rr, req, nil)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestMaaSModelsHandler_ForwardsUserToken(t *testing.T) {
	app := newMaaSModelsTestApp(t)

	rr := httptest.NewRecorder()
	req, err := http.NewRequest(http.MethodGet, "/v1/models", nil)
	assert.NoError(t, err)

	mockClient := maasmocks.NewMockMaaSClient()
	ctx := context.WithValue(req.Context(), constants.MaaSClientKey, mockClient)
	ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "test-namespace")
	ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{Token: "my-oidc-token"})
	req = req.WithContext(ctx)

	app.MaaSModelsHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "my-oidc-token", mockClient.LastAuthToken,
		"handler must forward identity.Token to ListModels")
}

func TestMaaSModelsHandler_IncludesSubscriptions(t *testing.T) {
	app := newMaaSModelsTestApp(t)

	rr := httptest.NewRecorder()
	req, err := http.NewRequest(http.MethodGet, "/v1/models", nil)
	assert.NoError(t, err)
	req = newMaaSModelsTestCtx(app, req)

	app.MaaSModelsHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	defer rr.Result().Body.Close()
	body, err := io.ReadAll(rr.Result().Body)
	assert.NoError(t, err)

	var response models.MaaSModelsResponse
	err = json.Unmarshal(body, &response)
	assert.NoError(t, err)

	// First model (llama-2-7b-chat) should have 2 subscriptions
	firstModel := response.Data[0]
	assert.Equal(t, "llama-2-7b-chat", firstModel.ID)
	assert.NotNil(t, firstModel.Subscriptions)
	assert.Len(t, firstModel.Subscriptions, 2)
	assert.Equal(t, "basic-subscription", firstModel.Subscriptions[0].Name)
	assert.Equal(t, "Basic Tier", firstModel.Subscriptions[0].DisplayName)
	assert.Equal(t, "premium-subscription", firstModel.Subscriptions[1].Name)
	assert.Equal(t, "Premium Tier", firstModel.Subscriptions[1].DisplayName)
	assert.Equal(t, "Premium subscription with higher rate limits", firstModel.Subscriptions[1].Description)

	// Second model (llama-2-13b-chat) should have 1 subscription
	secondModel := response.Data[1]
	assert.Len(t, secondModel.Subscriptions, 1)
	assert.Equal(t, "premium-subscription", secondModel.Subscriptions[0].Name)
}
