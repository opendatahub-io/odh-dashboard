package api

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub"
	ehmocks "github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub/ehmocks"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetCollectionHandler(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	result, response, err := setupApiTestWithEvalHub[CollectionEnvelope](
		http.MethodGet,
		ApiPathPrefix+"/evaluations/collections/collection-001?namespace=test-ns",
		nil, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.Equal(t, "collection-001", result.Data.Resource.ID)
	assert.Equal(t, "Open LLM Leaderboard v2", result.Data.Name)
}

func TestCollectionsHandlerForwardsScopeAndSort(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	result, response, err := setupApiTestWithEvalHub[CollectionsEnvelope](
		http.MethodGet,
		ApiPathPrefix+"/evaluations/collections?namespace=test-ns&scope=curated&sort_by=curation_order&domains=agent_tools&industries=healthcare&ai_entities=agent&limit=4&offset=2",
		nil, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.NotNil(t, mockClient.LastListCollectionsParams)
	assert.Equal(t, "test-ns", mockClient.LastListCollectionsParams.Namespace)
	assert.Equal(t, "curated", mockClient.LastListCollectionsParams.Scope)
	assert.Equal(t, "curation_order", mockClient.LastListCollectionsParams.SortBy)
	assert.Equal(t, "agent_tools", mockClient.LastListCollectionsParams.Domains)
	assert.Equal(t, "healthcare", mockClient.LastListCollectionsParams.Industries)
	assert.Equal(t, "agent", mockClient.LastListCollectionsParams.AIEntities)
	assert.Equal(t, 4, mockClient.LastListCollectionsParams.Limit)
	assert.Equal(t, 2, mockClient.LastListCollectionsParams.Offset)
	assert.NotNil(t, result.Data.Items)
}

func TestCollectionsHandlerRejectsInvalidSort(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	result, response, err := setupApiTestWithEvalHub[HTTPError](
		http.MethodGet,
		ApiPathPrefix+"/evaluations/collections?namespace=test-ns&sort_by=created_at",
		nil, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, response.StatusCode)
	assert.Contains(t, result.Error.Message, "invalid sort_by parameter")
}

// Verify that a percent-encoded slash (%2F) in the ID is decoded and the
// handler calls GetCollection with the literal "col/special" ID.
func TestGetCollectionHandlerEncodedSlashID(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()
	mockClient.SetCollection("col/special", &evalhub.Collection{
		Resource: evalhub.CollectionResource{ID: "col/special"},
		Name:     "Slash Collection",
	})

	result, response, err := setupApiTestWithEvalHub[CollectionEnvelope](
		http.MethodGet,
		ApiPathPrefix+"/evaluations/collections/col%2Fspecial?namespace=test-ns",
		nil, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.Equal(t, "col/special", result.Data.Resource.ID)
	assert.Equal(t, "Slash Collection", result.Data.Name)
}

func TestGetCollectionHandlerServerError(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}

	_, response, err := setupApiTestWithEvalHub[HTTPError](
		http.MethodGet,
		ApiPathPrefix+"/evaluations/collections/any?namespace=test-ns",
		nil, nil, identity, &erroringEHClient{},
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusInternalServerError, response.StatusCode)
}

func TestGetCollectionHandlerNotFound(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	_, response, err := setupApiTestWithEvalHub[HTTPError](
		http.MethodGet,
		ApiPathPrefix+"/evaluations/collections/nonexistent-collection?namespace=test-ns",
		nil, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, response.StatusCode)
}

func TestPatchCollectionHandler(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()
	operations := []evalhub.CollectionPatchOperation{{
		Op: "replace", Path: "/name", Value: json.RawMessage(`"Updated suite"`),
	}}

	result, response, err := setupApiTestWithEvalHub[CollectionEnvelope](
		http.MethodPatch,
		ApiPathPrefix+"/evaluations/collections/collection-001?namespace=test-ns",
		operations, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.Equal(t, "Updated suite", result.Data.Name)

	getResult, getResponse, err := setupApiTestWithEvalHub[CollectionEnvelope](
		http.MethodGet,
		ApiPathPrefix+"/evaluations/collections/collection-001?namespace=test-ns",
		nil, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, getResponse.StatusCode)
	assert.Equal(t, "Updated suite", getResult.Data.Name)
}

func TestPatchCollectionHandlerBadRequest(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	_, response, err := setupApiTestWithEvalHub[HTTPError](
		http.MethodPatch,
		ApiPathPrefix+"/evaluations/collections/collection-001?namespace=test-ns",
		map[string]string{"op": "replace"}, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, response.StatusCode)
}

func TestPatchCollectionHandlerRejectsInvalidOperations(t *testing.T) {
	tests := []struct {
		name       string
		operations any
		message    string
	}{
		{
			name:       "empty operations",
			operations: json.RawMessage("null"),
			message:    "at least one patch operation is required",
		},
		{
			name: "invalid operation",
			operations: []evalhub.CollectionPatchOperation{{
				Op: "copy", Path: "/name", Value: json.RawMessage(`"Updated suite"`),
			}},
			message: "op must be add, replace, or remove",
		},
		{
			name: "missing path",
			operations: []evalhub.CollectionPatchOperation{{
				Op: "replace", Value: json.RawMessage(`"Updated suite"`),
			}},
			message: "path is required",
		},
		{
			name: "missing value",
			operations: []evalhub.CollectionPatchOperation{{
				Op: "replace", Path: "/name",
			}},
			message: "value is required for replace",
		},
		{
			name: "value supplied for remove",
			operations: []evalhub.CollectionPatchOperation{{
				Op: "remove", Path: "/name", Value: json.RawMessage(`"Updated suite"`),
			}},
			message: "value is not allowed for remove",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
			mockClient := ehmocks.NewMockEvalHubClient()

			result, response, err := setupApiTestWithEvalHub[HTTPError](
				http.MethodPatch,
				ApiPathPrefix+"/evaluations/collections/collection-001?namespace=test-ns",
				tt.operations, nil, identity, mockClient,
			)

			require.NoError(t, err)
			assert.Equal(t, http.StatusBadRequest, response.StatusCode)
			assert.Contains(t, result.Error.Message, tt.message)
		})
	}
}

func TestPatchCollectionHandlerServerError(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	operations := []evalhub.CollectionPatchOperation{{
		Op: "replace", Path: "/name", Value: json.RawMessage(`"Updated suite"`),
	}}

	_, response, err := setupApiTestWithEvalHub[HTTPError](
		http.MethodPatch,
		ApiPathPrefix+"/evaluations/collections/collection-001?namespace=test-ns",
		operations, nil, identity, &erroringEHClient{},
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusInternalServerError, response.StatusCode)
}

func TestDeleteCollectionHandler(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	body, response, err := setupApiTestWithEvalHubRaw(
		http.MethodDelete,
		ApiPathPrefix+"/evaluations/collections/collection-001?namespace=test-ns",
		nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Empty(t, body)
	assert.Equal(t, http.StatusNoContent, response.StatusCode)

	_, getResponse, err := setupApiTestWithEvalHub[CollectionEnvelope](
		http.MethodGet,
		ApiPathPrefix+"/evaluations/collections/collection-001?namespace=test-ns",
		nil, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, getResponse.StatusCode)
}

func TestDeleteCollectionHandlerServerError(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}

	_, response, err := setupApiTestWithEvalHubRaw(
		http.MethodDelete,
		ApiPathPrefix+"/evaluations/collections/collection-001?namespace=test-ns",
		nil, identity, &erroringEHClient{},
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusInternalServerError, response.StatusCode)
}
