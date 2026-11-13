package api

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub"
	ehmocks "github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub/ehmocks"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func validCollectionGenerationRequest() evalhub.CreateCollectionGenerationRequest {
	return evalhub.CreateCollectionGenerationRequest{
		EvaluationGoal: "Assess reasoning and factual accuracy",
		Model:          evalhub.JobModel{Name: "generator", URL: "https://models.example.com/v1", Auth: &evalhub.ModelAuth{SecretRef: "model-credentials"}},
	}
}

type generationResponseOverrideClient struct {
	evalhub.EvalHubClientInterface
	generation *evalhub.CollectionGenerationResource
}

type unavailableCollectionGenerationClient struct{ erroringEHClient }

func (c unavailableCollectionGenerationClient) CreateCollectionGeneration(_ context.Context, _ string, _ evalhub.CreateCollectionGenerationRequest) (*evalhub.CollectionGenerationResource, error) {
	return nil, evalhub.NewServerUnavailableError("generation service is unavailable")
}

func (c generationResponseOverrideClient) GetCollectionGeneration(_ context.Context, _ string, _ string) (*evalhub.CollectionGenerationResource, error) {
	return c.generation, nil
}

type generationCreateResponseOverrideClient struct {
	evalhub.EvalHubClientInterface
	generation *evalhub.CollectionGenerationResource
}

func (c generationCreateResponseOverrideClient) CreateCollectionGeneration(_ context.Context, _ string, _ evalhub.CreateCollectionGenerationRequest) (*evalhub.CollectionGenerationResource, error) {
	return c.generation, nil
}

func TestCreateCollectionGenerationHandler(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()
	request := validCollectionGenerationRequest()

	result, response, err := setupApiTestWithEvalHub[CollectionGenerationEnvelope](
		http.MethodPost,
		ApiPathPrefix+collectionGenerationPath+"?namespace=test-ns",
		request, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusAccepted, response.StatusCode)
	assert.Equal(t, "generation-001", result.Data.Resource.ID)
	assert.Equal(t, "pending", result.Data.Status.State)
	assert.Equal(t, "test-ns", mockClient.LastCollectionGenerationNamespace)
	require.NotNil(t, mockClient.LastCollectionGenerationRequest)
	assert.Equal(t, request.EvaluationGoal, mockClient.LastCollectionGenerationRequest.EvaluationGoal)
	assert.Equal(t, "model-credentials", mockClient.LastCollectionGenerationRequest.Model.Auth.SecretRef)
	assert.Equal(t, PathPrefix+ApiPathPrefix+collectionGenerationPath+"/generation-001?namespace=test-ns", response.Header.Get("Location"))
}

func TestCreateCollectionGenerationHandlerRejectsInvalidRequest(t *testing.T) {
	maxBenchmarks := 51
	invalidRequests := []struct {
		name string
		body evalhub.CreateCollectionGenerationRequest
	}{
		{name: "blank goal", body: evalhub.CreateCollectionGenerationRequest{Model: evalhub.JobModel{Name: "generator", URL: "https://models.example.com/v1"}}},
		{name: "missing model name", body: evalhub.CreateCollectionGenerationRequest{EvaluationGoal: "goal", Model: evalhub.JobModel{URL: "https://models.example.com/v1"}}},
		{name: "missing model URL", body: evalhub.CreateCollectionGenerationRequest{EvaluationGoal: "goal", Model: evalhub.JobModel{Name: "generator"}}},
		{name: "maximum benchmark count", body: func() evalhub.CreateCollectionGenerationRequest {
			req := validCollectionGenerationRequest()
			req.MaxBenchmarks = &maxBenchmarks
			return req
		}()},
		{name: "invalid strictness", body: func() evalhub.CreateCollectionGenerationRequest {
			req := validCollectionGenerationRequest()
			req.Strictness = "careless"
			return req
		}()},
		{name: "invalid generation effort", body: func() evalhub.CreateCollectionGenerationRequest {
			req := validCollectionGenerationRequest()
			req.GenerationEffort = "extreme"
			return req
		}()},
	}

	for _, tc := range invalidRequests {
		t.Run(tc.name, func(t *testing.T) {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
			mockClient := ehmocks.NewMockEvalHubClient()
			_, response, err := setupApiTestWithEvalHub[HTTPError](
				http.MethodPost,
				ApiPathPrefix+collectionGenerationPath+"?namespace=test-ns",
				tc.body, nil, identity, mockClient,
			)

			require.NoError(t, err)
			assert.Equal(t, http.StatusBadRequest, response.StatusCode)
			assert.Nil(t, mockClient.LastCollectionGenerationRequest)
		})
	}
}

func TestCreateCollectionGenerationHandlerPreservesUnavailableStatus(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	_, response, err := setupApiTestWithEvalHub[HTTPError](
		http.MethodPost,
		ApiPathPrefix+collectionGenerationPath+"?namespace=test-ns",
		validCollectionGenerationRequest(), nil, identity, &unavailableCollectionGenerationClient{},
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusServiceUnavailable, response.StatusCode)
}

func TestCreateCollectionGenerationRejectsCrossTenantResource(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	request := validCollectionGenerationRequest()
	client := generationCreateResponseOverrideClient{generation: &evalhub.CollectionGenerationResource{
		Resource: evalhub.CollectionGenerationResourceMetadata{ID: "generation-001", Tenant: "other-ns", Owner: "user@example.com", CreatedAt: "2026-01-01T00:00:00Z", UpdatedAt: "2026-01-01T00:00:00Z"},
		Request:  evalhub.CollectionGenerationRequestSummary{EvaluationGoal: request.EvaluationGoal, Model: request.Model, MaxBenchmarks: 12, Strictness: "moderate", GenerationEffort: "standard"},
		Status:   evalhub.CollectionGenerationStatus{State: "pending"},
	}}
	_, response, err := setupApiTestWithEvalHub[HTTPError](
		http.MethodPost,
		ApiPathPrefix+collectionGenerationPath+"?namespace=test-ns",
		request, nil, identity, client,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusInternalServerError, response.StatusCode)
}

func TestCreateCollectionGenerationRejectsUnsafeResourceID(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	request := validCollectionGenerationRequest()
	client := generationCreateResponseOverrideClient{generation: &evalhub.CollectionGenerationResource{
		Resource: evalhub.CollectionGenerationResourceMetadata{ID: "../generation-001", Tenant: "test-ns", Owner: "user@example.com", CreatedAt: "2026-01-01T00:00:00Z", UpdatedAt: "2026-01-01T00:00:00Z"},
		Request:  evalhub.CollectionGenerationRequestSummary{EvaluationGoal: request.EvaluationGoal, Model: request.Model, MaxBenchmarks: 12, Strictness: "moderate", GenerationEffort: "standard"},
		Status:   evalhub.CollectionGenerationStatus{State: "pending"},
	}}
	_, response, err := setupApiTestWithEvalHub[HTTPError](
		http.MethodPost,
		ApiPathPrefix+collectionGenerationPath+"?namespace=test-ns",
		request, nil, identity, client,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusInternalServerError, response.StatusCode)
}

func TestGetCollectionGenerationRejectsMismatchedResourceID(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	request := validCollectionGenerationRequest()
	client := generationResponseOverrideClient{generation: &evalhub.CollectionGenerationResource{
		Resource: evalhub.CollectionGenerationResourceMetadata{ID: "another-generation", Tenant: "test-ns", Owner: "user@example.com", CreatedAt: "2026-01-01T00:00:00Z", UpdatedAt: "2026-01-01T00:00:00Z"},
		Request:  evalhub.CollectionGenerationRequestSummary{EvaluationGoal: request.EvaluationGoal, Model: request.Model, MaxBenchmarks: 12, Strictness: "moderate", GenerationEffort: "standard"},
		Status:   evalhub.CollectionGenerationStatus{State: "pending"},
	}}
	_, response, err := setupApiTestWithEvalHub[HTTPError](
		http.MethodGet,
		ApiPathPrefix+collectionGenerationPath+"/generation-001?namespace=test-ns",
		nil, nil, identity, client,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusInternalServerError, response.StatusCode)
}

func TestGetCollectionGenerationHandlerCompletedResult(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()
	request := validCollectionGenerationRequest()
	mockClient.SetCollectionGeneration("generation-001", &evalhub.CollectionGenerationResource{
		Resource: evalhub.CollectionGenerationResourceMetadata{
			ID: "generation-001", Tenant: "test-ns", Owner: "user@example.com",
			CreatedAt: "2026-01-01T00:00:00Z", UpdatedAt: "2026-01-01T00:01:00Z",
		},
		Request: evalhub.CollectionGenerationRequestSummary{
			EvaluationGoal: request.EvaluationGoal, Model: request.Model, MaxBenchmarks: 1,
			Strictness: "moderate", GenerationEffort: "standard",
		},
		Status: evalhub.CollectionGenerationStatus{State: "completed"},
		Result: json.RawMessage(`{"collection":{"name":"Reasoning","benchmarks":[{"id":"arc_challenge","provider_id":"lm_evaluation_harness"}]},"yaml":"name: Reasoning","rationale":"Selected for the goal","explanation":{"selected_benchmarks":[{"provider_id":"lm_evaluation_harness","id":"arc_challenge","reason":"Tests reasoning"}],"rejected_benchmarks":[]},"actions":[]}`),
	})

	result, response, err := setupApiTestWithEvalHub[CollectionGenerationEnvelope](
		http.MethodGet,
		ApiPathPrefix+collectionGenerationPath+"/generation-001?namespace=test-ns",
		nil, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.Equal(t, "completed", result.Data.Status.State)
	assert.Contains(t, string(result.Data.Result), "arc_challenge")
}

func TestCollectionGenerationRejectsCrossTenantAndSlashIDs(t *testing.T) {
	tests := []struct {
		name   string
		path   string
		status int
	}{
		{name: "cross tenant resource", path: ApiPathPrefix + collectionGenerationPath + "/generation-001?namespace=test-ns", status: http.StatusNotFound},
		{name: "encoded slash ID", path: ApiPathPrefix + collectionGenerationPath + "/generation%2F001?namespace=test-ns", status: http.StatusBadRequest},
		{name: "dot ID", path: ApiPathPrefix + collectionGenerationPath + "/%2E?namespace=test-ns", status: http.StatusBadRequest},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
			var client evalhub.EvalHubClientInterface = ehmocks.NewMockEvalHubClient()
			if tc.name == "cross tenant resource" {
				request := validCollectionGenerationRequest()
				client = generationResponseOverrideClient{generation: &evalhub.CollectionGenerationResource{
					Resource: evalhub.CollectionGenerationResourceMetadata{ID: "generation-001", Tenant: "other-ns", Owner: "user@example.com", CreatedAt: "2026-01-01T00:00:00Z", UpdatedAt: "2026-01-01T00:00:00Z"},
					Request:  evalhub.CollectionGenerationRequestSummary{EvaluationGoal: request.EvaluationGoal, Model: request.Model, MaxBenchmarks: 12, Strictness: "moderate", GenerationEffort: "standard"},
					Status:   evalhub.CollectionGenerationStatus{State: "pending"},
				}}
			}

			_, response, err := setupApiTestWithEvalHub[HTTPError](http.MethodGet, tc.path, nil, nil, identity, client)
			require.NoError(t, err)
			assert.Equal(t, tc.status, response.StatusCode)
		})
	}
}

func TestCollectionGenerationReservedRoutesDoNotFallThrough(t *testing.T) {
	tests := []struct {
		method string
		path   string
		status int
	}{
		{method: http.MethodGet, path: ApiPathPrefix + collectionGenerationPath + "?namespace=test-ns", status: http.StatusMethodNotAllowed},
		{method: http.MethodPatch, path: ApiPathPrefix + collectionGenerationPath + "/generation-001?namespace=test-ns", status: http.StatusMethodNotAllowed},
		{method: http.MethodDelete, path: ApiPathPrefix + collectionGenerationPath + "/generation-001?namespace=test-ns", status: http.StatusMethodNotAllowed},
		{method: http.MethodPost, path: ApiPathPrefix + collectionGenerationPath + "/generation-001?namespace=test-ns", status: http.StatusNotFound},
		{method: http.MethodPost, path: ApiPathPrefix + collectionGenerationPath + "/generation-001/clones?namespace=test-ns", status: http.StatusNotFound},
	}

	for _, tc := range tests {
		t.Run(tc.method+" "+tc.path, func(t *testing.T) {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
			_, response, err := setupApiTestWithEvalHub[HTTPError](tc.method, tc.path, nil, nil, identity, ehmocks.NewMockEvalHubClient())
			require.NoError(t, err)
			assert.Equal(t, tc.status, response.StatusCode)
		})
	}
}
