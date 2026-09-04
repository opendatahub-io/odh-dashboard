package api

import (
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/eval-hub/bff/internal/constants"
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

func TestCloneCollectionHandler(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	body := evalhub.CloneCollectionRequest{
		Name: "My Cloned Suite",
	}

	result, response, err := setupApiTestWithEvalHub[CollectionEnvelope](
		http.MethodPost,
		ApiPathPrefix+"/evaluations/collections/collection-001/clones?namespace=test-ns",
		body, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, response.StatusCode)
	assert.Equal(t, "collection-001-clone", result.Data.Resource.ID)
	assert.Equal(t, "My Cloned Suite", result.Data.Name)
}

func TestCloneCollectionHandlerEmptyBody(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	result, response, err := setupApiTestWithEvalHub[CollectionEnvelope](
		http.MethodPost,
		ApiPathPrefix+"/evaluations/collections/collection-001/clones?namespace=test-ns",
		nil, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, response.StatusCode)
	assert.Equal(t, "collection-001-clone", result.Data.Resource.ID)
	assert.Equal(t, "Open LLM Leaderboard v2", result.Data.Name)
}

func TestCloneCollectionHandlerEmptyChunkedBody(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()
	server := httptest.NewServer(newTestAppWithEvalHub(nil, mockClient).Routes())
	defer server.Close()

	req, err := http.NewRequest(
		http.MethodPost,
		server.URL+ApiPathPrefix+"/evaluations/collections/collection-001/clones?namespace=test-ns",
		io.NopCloser(http.NoBody),
	)
	require.NoError(t, err)
	req.Header.Set(constants.KubeflowUserIDHeader, identity.UserID)
	req.TransferEncoding = []string{"chunked"}

	response, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer response.Body.Close()

	assert.Equal(t, http.StatusCreated, response.StatusCode)
}

func TestCloneCollectionHandlerInvalidBenchmarkID(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}

	for _, tc := range []struct {
		name       string
		benchmarks []evalhub.CollectionBenchmark
	}{
		{name: "empty", benchmarks: []evalhub.CollectionBenchmark{{ID: ""}}},
		{name: "whitespace-only", benchmarks: []evalhub.CollectionBenchmark{{ID: " \t"}}},
		{name: "invalid ID after valid ID", benchmarks: []evalhub.CollectionBenchmark{{ID: "benchmark-001"}, {ID: " "}}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			body := evalhub.CloneCollectionRequest{
				Name:       "Clone",
				Benchmarks: tc.benchmarks,
			}

			_, response, err := setupApiTestWithEvalHub[HTTPError](
				http.MethodPost,
				ApiPathPrefix+"/evaluations/collections/collection-001/clones?namespace=test-ns",
				body, nil, identity, &erroringEHClient{},
			)

			require.NoError(t, err)
			assert.Equal(t, http.StatusBadRequest, response.StatusCode)
		})
	}
}

func TestCloneCollectionHandlerNotFound(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	body := evalhub.CloneCollectionRequest{Name: "Clone"}

	_, response, err := setupApiTestWithEvalHub[HTTPError](
		http.MethodPost,
		ApiPathPrefix+"/evaluations/collections/nonexistent/clones?namespace=test-ns",
		body, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, response.StatusCode)
}

func TestCloneCollectionHandlerServerError(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}

	body := evalhub.CloneCollectionRequest{Name: "Clone"}

	_, response, err := setupApiTestWithEvalHub[HTTPError](
		http.MethodPost,
		ApiPathPrefix+"/evaluations/collections/any/clones?namespace=test-ns",
		body, nil, identity, &erroringEHClient{},
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusInternalServerError, response.StatusCode)
}
