package api

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/eval-hub/bff/internal/constants"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/bffclient"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/bffclient/bffmocks"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/eval-hub/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetCatalogModelSecurityArtifactsHandler(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com", Token: "test-token"}

	result, response, err := setupApiTestWithBFFClient[models.CatalogSecurityArtifactListEnvelope](
		http.MethodGet,
		ApiPathPrefix+"/catalog/sources/sample-source/security_artifacts/granite-8b?namespace=kubeflow",
		identity,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	require.NotNil(t, result.Data)
	assert.Equal(t, int32(3), result.Data.Size)
	assert.Len(t, result.Data.Items, 3)
	assert.Equal(t, "metrics-artifact", result.Data.Items[0].ArtifactType)
	assert.NotNil(t, result.Data.Items[0].MetricsType)
	assert.Equal(t, "security-metrics", *result.Data.Items[0].MetricsType)
}

func TestGetCatalogModelSecurityArtifactsHandlerWithEncodedModelName(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com", Token: "test-token"}

	result, response, err := setupApiTestWithBFFClient[models.CatalogSecurityArtifactListEnvelope](
		http.MethodGet,
		ApiPathPrefix+"/catalog/sources/sample-source/security_artifacts/repo1%2Fgranite-8b-code-instruct?namespace=kubeflow",
		identity,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	require.NotNil(t, result.Data)
	assert.Len(t, result.Data.Items, 3)
}

func TestGetCatalogModelSecurityArtifactsHandlerUsesCatalogNamespaceForDiscovery(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com", Token: "test-token"}
	mockFactory := bffmocks.NewMockClientFactory(testLogger)
	client := mockFactory.CreateClient(bffclient.BFFTargetModelCatalog, "test-token").(*bffmocks.MockBFFClient)
	client.CallHandler = func(_ context.Context, method, path string, _ interface{}, response interface{}) error {
		assert.Equal(t, http.MethodGet, method)
		parsedURL, err := url.Parse(path)
		require.NoError(t, err)
		assert.Equal(t, "odh-model-registries", parsedURL.Query().Get("namespace"))
		assert.Empty(t, parsedURL.Query().Get("catalogNamespace"))
		result, ok := response.(*models.CatalogSecurityArtifactListEnvelope)
		require.True(t, ok)
		result.Data = &models.CatalogSecurityArtifactList{}
		return nil
	}

	_, response, err := setupApiTestWithBFFClientFactory[models.CatalogSecurityArtifactListEnvelope](
		http.MethodGet,
		ApiPathPrefix+"/catalog/sources/sample-source/security_artifacts/granite-8b?namespace=project-only&catalogNamespace=odh-model-registries",
		identity,
		mockFactory,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
}

func TestGetCatalogModelSecurityArtifactsHandlerRejectsInvalidCatalogDiscoveryNamespace(t *testing.T) {
	for _, tt := range []struct {
		name  string
		query string
	}{
		{name: "catalog namespace takes precedence", query: "namespace=valid-fallback&catalogNamespace=invalid_namespace"},
		{name: "namespace fallback", query: "namespace=invalid_namespace"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			mockFactory := bffmocks.NewMockClientFactory(testLogger)
			client := mockFactory.CreateClient(bffclient.BFFTargetModelCatalog, "test-token").(*bffmocks.MockBFFClient)
			client.CallHandler = func(_ context.Context, _, _ string, _ interface{}, _ interface{}) error {
				t.Fatal("upstream client should not be called for an invalid catalog discovery namespace")
				return nil
			}

			req := httptest.NewRequest(
				http.MethodGet,
				ApiPathPrefix+"/catalog/sources/sample-source/security_artifacts/granite-8b?"+tt.query,
				http.NoBody,
			)
			ctx := context.WithValue(req.Context(), constants.BFFClientKey(constants.BFFTarget(bffclient.BFFTargetModelCatalog)), client)
			req = req.WithContext(ctx)
			recorder := httptest.NewRecorder()
			app := &App{logger: testLogger}

			app.GetCatalogModelSecurityArtifactsHandler(recorder, req, httprouter.Params{
				{Key: CatalogSourceID, Value: "sample-source"},
				{Key: CatalogModelName, Value: "/granite-8b"},
			})

			assert.Equal(t, http.StatusBadRequest, recorder.Code)
		})
	}
}

func TestGetCatalogModelSecurityArtifactsHandlerEscapesSourceID(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com", Token: "test-token"}
	mockFactory := bffmocks.NewMockClientFactory(testLogger)
	client := mockFactory.CreateClient(bffclient.BFFTargetModelCatalog, "test-token").(*bffmocks.MockBFFClient)
	client.CallHandler = func(_ context.Context, _, path string, _ interface{}, response interface{}) error {
		parsedURL, err := url.Parse(path)
		require.NoError(t, err)
		assert.Equal(t, "/model_catalog/sources/source%20id/security_artifacts/granite-8b", parsedURL.EscapedPath())
		result, ok := response.(*models.CatalogSecurityArtifactListEnvelope)
		require.True(t, ok)
		result.Data = &models.CatalogSecurityArtifactList{}
		return nil
	}

	_, response, err := setupApiTestWithBFFClientFactory[models.CatalogSecurityArtifactListEnvelope](
		http.MethodGet,
		ApiPathPrefix+"/catalog/sources/source%20id/security_artifacts/granite-8b?namespace=kubeflow",
		identity,
		mockFactory,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
}

func TestGetCatalogModelSecurityArtifactsHandlerRejectsEmptyOrDotSegmentSourceID(t *testing.T) {
	for _, sourceID := range []string{"", ".", ".."} {
		t.Run(sourceID, func(t *testing.T) {
			mockFactory := bffmocks.NewMockClientFactory(testLogger)
			client := mockFactory.CreateClient(bffclient.BFFTargetModelCatalog, "test-token").(*bffmocks.MockBFFClient)
			client.CallHandler = func(_ context.Context, _, _ string, _ interface{}, _ interface{}) error {
				t.Fatal("upstream client should not be called for an empty or dot-segment source ID")
				return nil
			}

			req := httptest.NewRequest(http.MethodGet, ApiPathPrefix+"/catalog/sources/"+sourceID+"/security_artifacts/granite-8b", http.NoBody)
			ctx := context.WithValue(req.Context(), constants.BFFClientKey(constants.BFFTarget(bffclient.BFFTargetModelCatalog)), client)
			req = req.WithContext(ctx)
			recorder := httptest.NewRecorder()
			app := &App{logger: testLogger}

			app.GetCatalogModelSecurityArtifactsHandler(recorder, req, httprouter.Params{
				{Key: CatalogSourceID, Value: sourceID},
				{Key: CatalogModelName, Value: "/granite-8b"},
			})

			assert.Equal(t, http.StatusBadRequest, recorder.Code)
		})
	}
}

func TestGetCatalogModelSecurityArtifactsHandlerRejectsEmptyOrDotSegmentModelName(t *testing.T) {
	for _, modelName := range []string{"", ".", ".."} {
		t.Run(modelName, func(t *testing.T) {
			mockFactory := bffmocks.NewMockClientFactory(testLogger)
			client := mockFactory.CreateClient(bffclient.BFFTargetModelCatalog, "test-token").(*bffmocks.MockBFFClient)
			client.CallHandler = func(_ context.Context, _, _ string, _ interface{}, _ interface{}) error {
				t.Fatal("upstream client should not be called for an empty or dot-segment model name")
				return nil
			}

			req := httptest.NewRequest(http.MethodGet, ApiPathPrefix+"/catalog/sources/sample-source/security_artifacts/"+modelName, http.NoBody)
			ctx := context.WithValue(req.Context(), constants.BFFClientKey(constants.BFFTarget(bffclient.BFFTargetModelCatalog)), client)
			req = req.WithContext(ctx)
			recorder := httptest.NewRecorder()
			app := &App{logger: testLogger}

			app.GetCatalogModelSecurityArtifactsHandler(recorder, req, httprouter.Params{
				{Key: CatalogSourceID, Value: "sample-source"},
				{Key: CatalogModelName, Value: "/" + modelName},
			})

			assert.Equal(t, http.StatusBadRequest, recorder.Code)
		})
	}
}

func TestGetCatalogModelSecurityArtifactsHandlerMissingNamespace(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com", Token: "test-token"}

	_, response, err := setupApiTestWithBFFClient[HTTPError](
		http.MethodGet,
		ApiPathPrefix+"/catalog/sources/sample-source/security_artifacts/granite-8b",
		identity,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, response.StatusCode)
}

func TestGetCatalogModelSecurityArtifactsHandlerBFFError(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com", Token: "test-token"}

	mockFactory := bffmocks.NewMockClientFactory(testLogger)
	client := mockFactory.CreateClient(bffclient.BFFTargetModelCatalog, "test-token").(*bffmocks.MockBFFClient)
	client.CallHandler = func(_ context.Context, _, _ string, _ interface{}, _ interface{}) error {
		return bffclient.NewServerUnavailableError(bffclient.BFFTargetModelCatalog)
	}

	_, response, err := setupApiTestWithBFFClientFactory[HTTPError](
		http.MethodGet,
		ApiPathPrefix+"/catalog/sources/sample-source/security_artifacts/granite-8b?namespace=kubeflow",
		identity,
		mockFactory,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusServiceUnavailable, response.StatusCode)
}

func TestGetCatalogModelSecurityArtifactsHandlerNotFound(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com", Token: "test-token"}

	mockFactory := bffmocks.NewMockClientFactory(testLogger)
	client := mockFactory.CreateClient(bffclient.BFFTargetModelCatalog, "test-token").(*bffmocks.MockBFFClient)
	client.CallHandler = func(_ context.Context, _, _ string, _ interface{}, _ interface{}) error {
		return bffclient.NewNotFoundError(bffclient.BFFTargetModelCatalog, fmt.Sprintf("artifacts not found for model %s", "nonexistent"))
	}

	_, response, err := setupApiTestWithBFFClientFactory[HTTPError](
		http.MethodGet,
		ApiPathPrefix+"/catalog/sources/sample-source/security_artifacts/nonexistent?namespace=kubeflow",
		identity,
		mockFactory,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, response.StatusCode)
}
