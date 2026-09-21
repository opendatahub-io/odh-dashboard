package api

import (
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
