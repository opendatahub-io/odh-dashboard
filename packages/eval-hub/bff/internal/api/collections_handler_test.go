package api

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
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

func TestCreateCollectionHandler(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()
	body := evalhub.CreateCollectionRequest{
		Name:        "My New Suite",
		Description: "A custom suite",
		Domains:     []string{"safety"},
		AIEntities:  []string{"model"},
		Benchmarks:  []evalhub.CollectionBenchmark{{ID: "benchmark-001"}},
	}

	result, response, err := setupApiTestWithEvalHub[CollectionEnvelope](
		http.MethodPost,
		ApiPathPrefix+"/evaluations/collections?namespace=test-ns",
		body, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, response.StatusCode)
	assert.Equal(t, "created-collection", result.Data.Resource.ID)
	assert.Equal(t, "My New Suite", result.Data.Name)
	assert.Equal(t, "model", result.Data.Category)
	assert.Equal(t, []string{"safety"}, result.Data.Domains)
	assert.Equal(t, []string{"model"}, result.Data.AIEntities)
	assert.Len(t, result.Data.Benchmarks, 1)
}

func TestCreateCollectionHandlerPreservesCategory(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()
	body := evalhub.CreateCollectionRequest{
		Name:       "My New Suite",
		Category:   "  Safety \t",
		AIEntities: []string{"model"},
		Benchmarks: []evalhub.CollectionBenchmark{{ID: "benchmark-001"}},
	}

	result, response, err := setupApiTestWithEvalHub[CollectionEnvelope](
		http.MethodPost,
		ApiPathPrefix+"/evaluations/collections?namespace=test-ns",
		body, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, response.StatusCode)
	assert.Equal(t, "Safety", result.Data.Category)
}

func TestCreateCollectionHandlerFallsBackForWhitespaceCategory(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	body := evalhub.CreateCollectionRequest{
		Name:       "My New Suite",
		Category:   " \t\n",
		AIEntities: []string{"model"},
		Benchmarks: []evalhub.CollectionBenchmark{{ID: "benchmark-001"}},
	}

	result, response, err := setupApiTestWithEvalHub[CollectionEnvelope](
		http.MethodPost,
		ApiPathPrefix+"/evaluations/collections?namespace=test-ns",
		body, nil, identity, ehmocks.NewMockEvalHubClient(),
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, response.StatusCode)
	assert.Equal(t, "model", result.Data.Category)
}

func TestCreateCollectionHandlerRequiresNameAndBenchmark(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}

	for _, tc := range []struct {
		name string
		body evalhub.CreateCollectionRequest
	}{
		{name: "missing name", body: evalhub.CreateCollectionRequest{Benchmarks: []evalhub.CollectionBenchmark{{ID: "benchmark-001"}}}},
		{name: "blank name", body: evalhub.CreateCollectionRequest{Name: " \t", Benchmarks: []evalhub.CollectionBenchmark{{ID: "benchmark-001"}}}},
		{name: "missing benchmark", body: evalhub.CreateCollectionRequest{Name: "Suite"}},
		{name: "blank benchmark id", body: evalhub.CreateCollectionRequest{Name: "Suite", Benchmarks: []evalhub.CollectionBenchmark{{ID: " \t"}}}},
		{name: "negative benchmark weight", body: evalhub.CreateCollectionRequest{Name: "Suite", Benchmarks: []evalhub.CollectionBenchmark{{ID: "benchmark-001", Weight: -0.1}}}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			_, response, err := setupApiTestWithEvalHub[HTTPError](
				http.MethodPost,
				ApiPathPrefix+"/evaluations/collections?namespace=test-ns",
				tc.body, nil, identity, ehmocks.NewMockEvalHubClient(),
			)

			require.NoError(t, err)
			assert.Equal(t, http.StatusBadRequest, response.StatusCode)
		})
	}
}

func TestCreateCollectionHandlerRejectsMalformedBody(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}

	for _, tc := range []struct {
		name string
		body string
	}{
		{name: "empty body", body: ""},
		{name: "malformed json", body: `{"name":`},
		{name: "null body", body: "null"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(
				http.MethodPost,
				ApiPathPrefix+"/evaluations/collections?namespace=test-ns",
				strings.NewReader(tc.body),
			)
			req.Header.Set(constants.KubeflowUserIDHeader, identity.UserID)
			rr := httptest.NewRecorder()
			newTestAppWithEvalHub(nil, &erroringEHClient{}).Routes().ServeHTTP(rr, req)

			assert.Equal(t, http.StatusBadRequest, rr.Code)
		})
	}
}

type createCollectionTestClient struct {
	evalhub.EvalHubClientInterface
	collection *evalhub.Collection
	err        error
}

func (c *createCollectionTestClient) CreateCollection(_ context.Context, _ string, _ evalhub.CreateCollectionRequest) (*evalhub.Collection, error) {
	return c.collection, c.err
}

func TestCreateCollectionHandlerUpstreamFailures(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	body := evalhub.CreateCollectionRequest{
		Name:       "Suite",
		Benchmarks: []evalhub.CollectionBenchmark{{ID: "benchmark-001"}},
	}

	for _, tc := range []struct {
		name       string
		collection *evalhub.Collection
		err        error
	}{
		{name: "upstream error", err: errors.New("upstream unavailable")},
		{name: "empty response", collection: nil},
		{name: "missing collection id", collection: &evalhub.Collection{Name: "Suite"}},
		{name: "missing collection name", collection: &evalhub.Collection{Resource: evalhub.CollectionResource{ID: "created-collection"}}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			_, response, err := setupApiTestWithEvalHub[HTTPError](
				http.MethodPost,
				ApiPathPrefix+"/evaluations/collections?namespace=test-ns",
				body, nil, identity, &createCollectionTestClient{
					collection: tc.collection,
					err:        tc.err,
				},
			)

			require.NoError(t, err)
			assert.Equal(t, http.StatusInternalServerError, response.StatusCode)
		})
	}
}

func TestCloneCollectionHandler(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	domains := []string{"safety", "reasoning"}
	tasks := []string{"classification"}
	modalities := []string{"text"}
	industries := []string{"technology"}
	aiEntities := []string{"agent"}
	body := evalhub.CloneCollectionRequest{
		Name:        "My Cloned Suite",
		Description: "Custom collection settings",
		Category:    "Safety",
		Tags:        []string{"custom", "agent"},
		Domains:     &domains,
		Tasks:       &tasks,
		Modalities:  &modalities,
		Industries:  &industries,
		AIEntities:  &aiEntities,
		Custom: map[string]any{
			"source": "copy-suite",
		},
		PassCriteria: &evalhub.CollectionPassCriteria{Threshold: 0.8},
		Benchmarks: []evalhub.CollectionBenchmark{
			{
				ID:         "arc_challenge",
				ProviderID: "lm_evaluation_harness",
				Weight:     0.8,
				Parameters: map[string]any{"num_few_shot": 5},
			},
		},
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
	assert.Equal(t, "Custom collection settings", result.Data.Description)
	assert.Equal(t, "Safety", result.Data.Category)
	assert.Equal(t, []string{"custom", "agent"}, result.Data.Tags)
	assert.Equal(t, []string{"safety", "reasoning"}, result.Data.Domains)
	assert.Equal(t, []string{"classification"}, result.Data.Tasks)
	assert.Equal(t, []string{"text"}, result.Data.Modalities)
	assert.Equal(t, []string{"technology"}, result.Data.Industries)
	require.NotNil(t, result.Data.PassCriteria)
	assert.Equal(t, 0.8, result.Data.PassCriteria.Threshold)
	require.Len(t, result.Data.Benchmarks, 1)
	assert.Equal(t, "arc_challenge", result.Data.Benchmarks[0].ID)

	custom, err := json.Marshal(result.Data.Custom)
	require.NoError(t, err)
	assert.JSONEq(t, `{"source":"copy-suite"}`, string(custom))
	assert.Equal(t, []string{"agent"}, result.Data.AIEntities)
}

func TestCloneCollectionHandlerEncodedSlashID(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()
	mockClient.SetCollection("col/special", &evalhub.Collection{
		Resource: evalhub.CollectionResource{ID: "col/special"},
		Name:     "Slash Collection",
	})

	result, response, err := setupApiTestWithEvalHub[CollectionEnvelope](
		http.MethodPost,
		ApiPathPrefix+"/evaluations/collections/col%2Fspecial/clones?namespace=test-ns",
		evalhub.CloneCollectionRequest{Name: "Cloned Slash Collection"},
		nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, response.StatusCode)
	assert.Equal(t, "col/special-clone", result.Data.Resource.ID)
	assert.Equal(t, "Cloned Slash Collection", result.Data.Name)
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

func TestCloneCollectionHandlerExplicitlyEmptyMetadata(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()
	empty := []string{}
	body := evalhub.CloneCollectionRequest{
		Name:       "Cleared metadata",
		Domains:    &empty,
		Tasks:      &empty,
		Modalities: &empty,
		Industries: &empty,
		AIEntities: &empty,
	}

	result, response, err := setupApiTestWithEvalHub[CollectionEnvelope](
		http.MethodPost,
		ApiPathPrefix+"/evaluations/collections/collection-001/clones?namespace=test-ns",
		body, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, response.StatusCode)
	assert.Empty(t, result.Data.Domains)
	assert.Empty(t, result.Data.Tasks)
	assert.Empty(t, result.Data.Modalities)
	assert.Empty(t, result.Data.Industries)
	assert.Empty(t, result.Data.AIEntities)
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

func TestCloneCollectionHandlerNullBody(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}

	_, response, err := setupApiTestWithEvalHub[HTTPError](
		http.MethodPost,
		ApiPathPrefix+"/evaluations/collections/collection-001/clones?namespace=test-ns",
		json.RawMessage("null"), nil, identity, &erroringEHClient{},
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, response.StatusCode)
}

func TestCloneCollectionHandlerInvalidBenchmark(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}

	for _, tc := range []struct {
		name       string
		benchmarks []evalhub.CollectionBenchmark
	}{
		{name: "empty", benchmarks: []evalhub.CollectionBenchmark{{ID: ""}}},
		{name: "whitespace-only", benchmarks: []evalhub.CollectionBenchmark{{ID: " \t"}}},
		{name: "invalid ID after valid ID", benchmarks: []evalhub.CollectionBenchmark{{ID: "benchmark-001"}, {ID: " "}}},
		{name: "negative weight", benchmarks: []evalhub.CollectionBenchmark{{ID: "benchmark-001", Weight: -0.1}}},
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
