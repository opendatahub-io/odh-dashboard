package api

import (
	"context"
	"fmt"
	"net/http"
	"testing"

	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/bffclient"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/bffclient/bffmocks"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/eval-hub/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetCatalogModelQualityArtifactsHandler(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com", Token: "test-token"}

	result, response, err := setupApiTestWithBFFClient[models.CatalogQualityArtifactListEnvelope](
		http.MethodGet,
		ApiPathPrefix+"/catalog/sources/sample-source/quality_artifacts/granite-8b?namespace=kubeflow",
		identity,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	require.NotNil(t, result.Data)
	assert.Equal(t, int32(2), result.Data.Size)
	assert.Len(t, result.Data.Items, 2)
	assert.Equal(t, "metrics-artifact", result.Data.Items[0].ArtifactType)
	assert.NotNil(t, result.Data.Items[0].MetricsType)
	assert.Equal(t, "evaluation-metrics", *result.Data.Items[0].MetricsType)
	require.NotNil(t, result.Data.Items[0].CustomProperties)
	assert.Contains(t, string(*result.Data.Items[0].CustomProperties), "execution_context")
}

func TestGetCatalogModelQualityArtifactsHandlerWithEncodedModelName(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com", Token: "test-token"}

	result, response, err := setupApiTestWithBFFClient[models.CatalogQualityArtifactListEnvelope](
		http.MethodGet,
		ApiPathPrefix+"/catalog/sources/sample-source/quality_artifacts/repo1%2Fgranite-8b-code-instruct?namespace=kubeflow",
		identity,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	require.NotNil(t, result.Data)
	assert.Len(t, result.Data.Items, 2)
}

func TestGetCatalogModelQualityArtifactsHandlerAddsEvaluationFilter(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com", Token: "test-token"}
	mockFactory := bffmocks.NewMockClientFactory(testLogger)
	client := mockFactory.CreateClient(bffclient.BFFTargetModelCatalog, "test-token").(*bffmocks.MockBFFClient)

	client.CallHandler = func(_ context.Context, method, path string, _ interface{}, response interface{}) error {
		assert.Equal(t, http.MethodGet, method)
		assert.Contains(t, path, "/model_catalog/sources/sample-source/artifacts/granite-8b")
		assert.Contains(t, path, "artifactType=metrics-artifact")
		assert.Contains(t, path, "filterQuery=metricsType.string_value%3D%22evaluation-metrics%22")
		assert.Contains(t, path, "pageSize=1")
		assert.Contains(t, path, "nextPageToken=token-2")
		assert.Contains(t, path, "orderBy=created_at")
		assert.Contains(t, path, "sortOrder=desc")
		result, ok := response.(*models.CatalogQualityArtifactListEnvelope)
		require.True(t, ok)
		result.Data = &models.CatalogQualityArtifactList{}
		return nil
	}

	_, response, err := setupApiTestWithBFFClientFactory[models.CatalogQualityArtifactListEnvelope](
		http.MethodGet,
		ApiPathPrefix+"/catalog/sources/sample-source/quality_artifacts/granite-8b?pageSize=1&nextPageToken=token-2&orderBy=created_at&sortOrder=desc&namespace=kubeflow",
		identity,
		mockFactory,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
}

func TestGetCatalogModelQualityArtifactsHandlerBFFError(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com", Token: "test-token"}

	mockFactory := bffmocks.NewMockClientFactory(testLogger)
	client := mockFactory.CreateClient(bffclient.BFFTargetModelCatalog, "test-token").(*bffmocks.MockBFFClient)
	client.CallHandler = func(_ context.Context, _, _ string, _ interface{}, _ interface{}) error {
		return bffclient.NewServerUnavailableError(bffclient.BFFTargetModelCatalog)
	}

	_, response, err := setupApiTestWithBFFClientFactory[HTTPError](
		http.MethodGet,
		ApiPathPrefix+"/catalog/sources/sample-source/quality_artifacts/granite-8b?namespace=kubeflow",
		identity,
		mockFactory,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusServiceUnavailable, response.StatusCode)
}

func TestGetCatalogModelQualityArtifactsHandlerNotFound(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com", Token: "test-token"}

	mockFactory := bffmocks.NewMockClientFactory(testLogger)
	client := mockFactory.CreateClient(bffclient.BFFTargetModelCatalog, "test-token").(*bffmocks.MockBFFClient)
	client.CallHandler = func(_ context.Context, _, _ string, _ interface{}, _ interface{}) error {
		return bffclient.NewNotFoundError(
			bffclient.BFFTargetModelCatalog,
			fmt.Sprintf("artifacts not found for model %s", "nonexistent"),
		)
	}

	_, response, err := setupApiTestWithBFFClientFactory[HTTPError](
		http.MethodGet,
		ApiPathPrefix+"/catalog/sources/sample-source/quality_artifacts/nonexistent?namespace=kubeflow",
		identity,
		mockFactory,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, response.StatusCode)
}
