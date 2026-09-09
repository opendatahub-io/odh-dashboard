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

func TestEvaluationJobsHandler(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	result, response, err := setupApiTestWithEvalHub[EvaluationJobsEnvelope](
		http.MethodGet,
		EvaluationJobsPath+"?namespace=test-ns",
		nil, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.Len(t, result.Data, 6)
	assert.Equal(t, "eval-job-001", result.Data[0].Resource.ID)
	assert.Equal(t, "running", result.Data[0].Status.State)
	assert.Equal(t, "gpt-4-turbo", result.Data[0].Model.Name)
}

func TestEvaluationJobsHandlerWithQueryParams(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	result, response, err := setupApiTestWithEvalHub[EvaluationJobsEnvelope](
		http.MethodGet,
		EvaluationJobsPath+"?namespace=test-ns&limit=10&offset=0&status=running&name=test&tags=safety",
		nil, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.Len(t, result.Data, 6)
}

func TestGetEvaluationJobHandler(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	result, response, err := setupApiTestWithEvalHub[EvaluationJobEnvelope](
		http.MethodGet,
		ApiPathPrefix+"/evaluations/jobs/eval-job-001?namespace=test-ns",
		nil, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.Equal(t, "eval-job-001", result.Data.Resource.ID)
	assert.Equal(t, "running", result.Data.Status.State)
}

func TestGetEvaluationJobHandlerNotInList(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	_, response, err := setupApiTestWithEvalHub[HTTPError](
		http.MethodGet,
		ApiPathPrefix+"/evaluations/jobs/nonexistent-job?namespace=test-ns",
		nil, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, response.StatusCode)
}

func TestCreateEvaluationJobHandlerWithCollectionBenchmarks(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()
	body := evalhub.CreateEvaluationJobRequest{
		Name: "Collection evaluation",
		Model: evalhub.JobModel{
			URL:  "http://model.example.test/v1",
			Name: "test-model",
		},
		Collection: &evalhub.JobCollectionID{
			ID: "collection-001-clone",
			Benchmarks: []evalhub.JobBenchmark{
				{
					ID:         "arc_challenge",
					ProviderID: "lm_evaluation_harness",
					Parameters: map[string]any{"num_few_shot": 5},
				},
			},
		},
	}

	result, response, err := setupApiTestWithEvalHub[CreateEvaluationJobEnvelope](
		http.MethodPost,
		EvaluationJobsPath+"?namespace=test-ns",
		body,
		nil,
		identity,
		mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, response.StatusCode)
	require.NotNil(t, result.Data.Collection)
	assert.Equal(t, "collection-001-clone", result.Data.Collection.ID)
	require.Len(t, result.Data.Collection.Benchmarks, 1)
	assert.Equal(t, "arc_challenge", result.Data.Collection.Benchmarks[0].ID)
	assert.Equal(t, "lm_evaluation_harness", result.Data.Collection.Benchmarks[0].ProviderID)
}

func TestCreateEvaluationJobHandlerRequiresBenchmarksOrCollection(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	baseRequest := evalhub.CreateEvaluationJobRequest{
		Name: "Collection evaluation",
		Model: evalhub.JobModel{
			URL:  "http://model.example.test/v1",
			Name: "test-model",
		},
	}

	for _, tc := range []struct {
		name string
		body evalhub.CreateEvaluationJobRequest
	}{
		{
			name: "missing benchmarks and collection",
			body: baseRequest,
		},
		{
			name: "collection with empty ID",
			body: evalhub.CreateEvaluationJobRequest{
				Name:       baseRequest.Name,
				Model:      baseRequest.Model,
				Collection: &evalhub.JobCollectionID{},
			},
		},
		{
			name: "collection with whitespace-only ID",
			body: evalhub.CreateEvaluationJobRequest{
				Name:       baseRequest.Name,
				Model:      baseRequest.Model,
				Collection: &evalhub.JobCollectionID{ID: " \t"},
			},
		},
		{
			name: "blank collection ID alongside benchmarks",
			body: evalhub.CreateEvaluationJobRequest{
				Name:       baseRequest.Name,
				Model:      baseRequest.Model,
				Benchmarks: []evalhub.JobBenchmark{{ID: "arc_challenge"}},
				Collection: &evalhub.JobCollectionID{},
			},
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			_, response, err := setupApiTestWithEvalHub[HTTPError](
				http.MethodPost,
				EvaluationJobsPath+"?namespace=test-ns",
				tc.body,
				nil,
				identity,
				&erroringEHClient{},
			)

			require.NoError(t, err)
			assert.Equal(t, http.StatusBadRequest, response.StatusCode)
		})
	}
}

func TestCancelEvaluationJobHandler(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	result, response, err := setupApiTestWithEvalHub[CancelEvaluationJobEnvelope](
		http.MethodDelete,
		ApiPathPrefix+"/evaluations/jobs/eval-job-001?namespace=test-ns",
		nil, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.Equal(t, "ok", result.Data)
}

func TestCancelEvaluationJobHandlerHardDelete(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	result, response, err := setupApiTestWithEvalHub[CancelEvaluationJobEnvelope](
		http.MethodDelete,
		ApiPathPrefix+"/evaluations/jobs/eval-job-001?namespace=test-ns&hard_delete=true",
		nil, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.Equal(t, "ok", result.Data)
}

func TestCancelEvaluationJobHandlerInvalidHardDelete(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	_, response, err := setupApiTestWithEvalHub[HTTPError](
		http.MethodDelete,
		ApiPathPrefix+"/evaluations/jobs/eval-job-001?namespace=test-ns&hard_delete=tru",
		nil, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, response.StatusCode)
}
