package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
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

func validGenerationResultPayload() map[string]any {
	return map[string]any{
		"collection": map[string]any{
			"name":     "Reasoning",
			"category": "General",
			"benchmarks": []any{
				map[string]any{"id": "arc_challenge", "provider_id": "lm_evaluation_harness"},
			},
		},
		"yaml":      "name: Reasoning",
		"rationale": "Selected for the evaluation goal",
		"explanation": map[string]any{
			"selected_benchmarks": []any{
				map[string]any{"provider_id": "lm_evaluation_harness", "id": "arc_challenge", "reason": "Tests reasoning"},
			},
			"rejected_benchmarks": []any{},
		},
		"actions": []any{
			map[string]any{"name": "search_benchmarks", "outcome": "success", "summary": "Searched the benchmark catalog"},
		},
	}
}

type generationResponseOverrideClient struct {
	evalhub.EvalHubClientInterface
	generation *evalhub.CollectionGenerationResource
}

type collectionGenerationStatusErrorClient struct {
	evalhub.EvalHubClientInterface
	err error
}

func (c collectionGenerationStatusErrorClient) CreateCollectionGeneration(_ context.Context, _ string, _ evalhub.CreateCollectionGenerationRequest) (*evalhub.CollectionGenerationResource, error) {
	return nil, c.err
}

func (c collectionGenerationStatusErrorClient) GetCollectionGeneration(_ context.Context, _ string, _ string) (*evalhub.CollectionGenerationResource, error) {
	return nil, c.err
}

func (c collectionGenerationStatusErrorClient) DeleteCollectionGeneration(_ context.Context, _ string, _ string) error {
	return c.err
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

func TestCreateCollectionGenerationHandlerRejectsCollectionMetadataFields(t *testing.T) {
	for _, tc := range []struct {
		name string
		body string
	}{
		{name: "collection name", body: `{"evaluation_goal":"Assess reasoning","model":{"name":"generator","url":"https://models.example.com/v1"},"collection_name":"Reasoning suite"}`},
		{name: "collection description", body: `{"evaluation_goal":"Assess reasoning","model":{"name":"generator","url":"https://models.example.com/v1"},"collection_description":"For reasoning"}`},
	} {
		t.Run(tc.name, func(t *testing.T) {
			mockClient := ehmocks.NewMockEvalHubClient()
			request := httptest.NewRequest(http.MethodPost, ApiPathPrefix+collectionGenerationPath+"?namespace=test-ns", strings.NewReader(tc.body))
			request.Header.Set("kubeflow-userid", "user@example.com")
			response := httptest.NewRecorder()
			newTestAppWithEvalHub(nil, mockClient).Routes().ServeHTTP(response, request)

			assert.Equal(t, http.StatusBadRequest, response.Code)
			assert.Nil(t, mockClient.LastCollectionGenerationRequest)
		})
	}
}

func TestCreateCollectionGenerationHandlerRejectsInvalidRequest(t *testing.T) {
	maxBenchmarks := 101
	invalidRequests := []struct {
		name string
		body evalhub.CreateCollectionGenerationRequest
	}{
		{name: "blank goal", body: evalhub.CreateCollectionGenerationRequest{Model: evalhub.JobModel{Name: "generator", URL: "https://models.example.com/v1"}}},
		{name: "goal exceeds durable limit", body: func() evalhub.CreateCollectionGenerationRequest {
			req := validCollectionGenerationRequest()
			req.EvaluationGoal = strings.Repeat("a", 10001)
			return req
		}()},
		{name: "missing model name", body: evalhub.CreateCollectionGenerationRequest{EvaluationGoal: "goal", Model: evalhub.JobModel{URL: "https://models.example.com/v1"}}},
		{name: "missing model URL", body: evalhub.CreateCollectionGenerationRequest{EvaluationGoal: "goal", Model: evalhub.JobModel{Name: "generator"}}},
		{name: "unsupported model URL scheme", body: func() evalhub.CreateCollectionGenerationRequest {
			req := validCollectionGenerationRequest()
			req.Model.URL = "ftp://models.example.com/v1"
			return req
		}()},
		{name: "model URL without host", body: func() evalhub.CreateCollectionGenerationRequest {
			req := validCollectionGenerationRequest()
			req.Model.URL = "https:///v1"
			return req
		}()},
		{name: "model URL with embedded credentials", body: func() evalhub.CreateCollectionGenerationRequest {
			req := validCollectionGenerationRequest()
			req.Model.URL = "https://user:password@models.example.com/v1"
			return req
		}()},
		{name: "external HTTP model URL in production", body: func() evalhub.CreateCollectionGenerationRequest {
			req := validCollectionGenerationRequest()
			req.Model.URL = "http://models.example.com/v1"
			return req
		}()},
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

func TestCreateCollectionGenerationHandlerAcceptsDurableLimits(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	request := validCollectionGenerationRequest()
	request.EvaluationGoal = strings.Repeat("a", 10000)
	maxBenchmarks := 100
	request.MaxBenchmarks = &maxBenchmarks

	result, response, err := setupApiTestWithEvalHub[CollectionGenerationEnvelope](
		http.MethodPost,
		ApiPathPrefix+collectionGenerationPath+"?namespace=test-ns",
		request, nil, identity, ehmocks.NewMockEvalHubClient(),
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusAccepted, response.StatusCode)
	assert.Len(t, result.Data.Request.EvaluationGoal, 10000)
	assert.Equal(t, 100, result.Data.Request.MaxBenchmarks)
}

func TestCreateCollectionGenerationHandlerAcceptsInternalHTTPModelURL(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	request := validCollectionGenerationRequest()
	request.Model.URL = "http://model.test-ns.svc.cluster.local:8080/v1"

	result, response, err := setupApiTestWithEvalHub[CollectionGenerationEnvelope](
		http.MethodPost,
		ApiPathPrefix+collectionGenerationPath+"?namespace=test-ns",
		request, nil, identity, ehmocks.NewMockEvalHubClient(),
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusAccepted, response.StatusCode)
	assert.Equal(t, request.Model.URL, result.Data.Request.Model.URL)
}

func TestCollectionGenerationHandlersPreserveUpstreamOutageStatuses(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	routes := []struct {
		name   string
		method string
		path   string
		body   any
	}{
		{name: "create", method: http.MethodPost, path: ApiPathPrefix + collectionGenerationPath + "?namespace=test-ns", body: validCollectionGenerationRequest()},
		{name: "get", method: http.MethodGet, path: ApiPathPrefix + collectionGenerationPath + "/generation-001?namespace=test-ns"},
		{name: "delete", method: http.MethodDelete, path: ApiPathPrefix + collectionGenerationPath + "/generation-001?namespace=test-ns"},
	}
	outages := []struct {
		name       string
		statusCode int
		clientErr  error
	}{
		{name: "upstream connection failure", statusCode: http.StatusBadGateway, clientErr: evalhub.NewConnectionError("generation service could not be reached")},
		{name: "upstream unavailable", statusCode: http.StatusServiceUnavailable, clientErr: evalhub.NewServerUnavailableError("generation service is unavailable")},
	}

	for _, route := range routes {
		for _, outage := range outages {
			t.Run(route.name+"/"+outage.name, func(t *testing.T) {
				client := collectionGenerationStatusErrorClient{
					EvalHubClientInterface: ehmocks.NewMockEvalHubClient(),
					err:                    outage.clientErr,
				}
				_, response, err := setupApiTestWithEvalHub[HTTPError](
					route.method,
					route.path,
					route.body, nil, identity, client,
				)

				require.NoError(t, err)
				assert.Equal(t, outage.statusCode, response.StatusCode)
			})
		}
	}
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
			EvaluationGoal: request.EvaluationGoal, Model: request.Model, MaxBenchmarks: 100,
			Strictness: "moderate", GenerationEffort: "standard",
		},
		Status: evalhub.CollectionGenerationStatus{State: "completed"},
		Result: json.RawMessage(`{"collection":{"name":"Reasoning","category":"General","benchmarks":[{"id":"arc_challenge","provider_id":"lm_evaluation_harness"}]},"yaml":"name: Reasoning","rationale":"Selected for the goal","explanation":{"selected_benchmarks":[{"provider_id":"lm_evaluation_harness","id":"arc_challenge","reason":"Tests reasoning"}],"rejected_benchmarks":[]},"actions":[{"name":"search_benchmarks","outcome":"success","summary":"Searched the benchmark catalog"}]}`),
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

func TestGetCollectionGenerationRejectsMalformedCompletedResult(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	request := validCollectionGenerationRequest()
	invalidResults := []struct {
		name   string
		result json.RawMessage
		mutate func(map[string]any)
	}{
		{name: "invalid JSON", result: json.RawMessage(`{"collection":`)},
		{name: "missing collection name", mutate: func(result map[string]any) {
			delete(result["collection"].(map[string]any), "name")
		}},
		{name: "collection name contains only whitespace", mutate: func(result map[string]any) {
			result["collection"].(map[string]any)["name"] = "  \t"
		}},
		{name: "collection category and domains are missing", mutate: func(result map[string]any) {
			delete(result["collection"].(map[string]any), "category")
		}},
		{name: "benchmarks are not an array", mutate: func(result map[string]any) {
			result["collection"].(map[string]any)["benchmarks"] = map[string]any{}
		}},
		{name: "benchmarks are empty", mutate: func(result map[string]any) {
			result["collection"].(map[string]any)["benchmarks"] = []any{}
		}},
		{name: "benchmark entry is null", mutate: func(result map[string]any) {
			result["collection"].(map[string]any)["benchmarks"] = []any{nil}
		}},
		{name: "benchmark is missing its required id", mutate: func(result map[string]any) {
			result["collection"].(map[string]any)["benchmarks"] = []any{map[string]any{"provider_id": "provider"}}
		}},
		{name: "benchmark has a negative weight", mutate: func(result map[string]any) {
			result["collection"].(map[string]any)["benchmarks"] = []any{map[string]any{"id": "arc_challenge", "weight": -0.1}}
		}},
		{name: "missing YAML serialization", mutate: func(result map[string]any) {
			delete(result, "yaml")
		}},
		{name: "missing rationale", mutate: func(result map[string]any) {
			delete(result, "rationale")
		}},
		{name: "missing selected explanation id", mutate: func(result map[string]any) {
			delete(result["explanation"].(map[string]any)["selected_benchmarks"].([]any)[0].(map[string]any), "id")
		}},
		{name: "explanation reason is too long", mutate: func(result map[string]any) {
			result["explanation"].(map[string]any)["selected_benchmarks"].([]any)[0].(map[string]any)["reason"] = strings.Repeat("a", 301)
		}},
		{name: "rejected explanations are missing", mutate: func(result map[string]any) {
			delete(result["explanation"].(map[string]any), "rejected_benchmarks")
		}},
		{name: "missing actions", mutate: func(result map[string]any) {
			delete(result, "actions")
		}},
		{name: "action is missing its outcome", mutate: func(result map[string]any) {
			delete(result["actions"].([]any)[0].(map[string]any), "outcome")
		}},
		{name: "action has an unsupported outcome", mutate: func(result map[string]any) {
			result["actions"].([]any)[0].(map[string]any)["outcome"] = "skipped"
		}},
		{name: "unexpected result property", mutate: func(result map[string]any) {
			result["debug"] = true
		}},
	}

	for _, tc := range invalidResults {
		t.Run(tc.name, func(t *testing.T) {
			resultJSON := tc.result
			if tc.mutate != nil {
				result := validGenerationResultPayload()
				tc.mutate(result)
				var err error
				resultJSON, err = json.Marshal(result)
				require.NoError(t, err)
			}
			client := generationResponseOverrideClient{generation: &evalhub.CollectionGenerationResource{
				Resource: evalhub.CollectionGenerationResourceMetadata{ID: "generation-001", Tenant: "test-ns", Owner: "user@example.com", CreatedAt: "2026-01-01T00:00:00Z", UpdatedAt: "2026-01-01T00:01:00Z"},
				Request:  evalhub.CollectionGenerationRequestSummary{EvaluationGoal: request.EvaluationGoal, Model: request.Model, MaxBenchmarks: 12, Strictness: "moderate", GenerationEffort: "standard"},
				Status:   evalhub.CollectionGenerationStatus{State: "completed"},
				Result:   resultJSON,
			}}
			_, response, err := setupApiTestWithEvalHub[HTTPError](
				http.MethodGet,
				ApiPathPrefix+collectionGenerationPath+"/generation-001?namespace=test-ns",
				nil, nil, identity, client,
			)

			require.NoError(t, err)
			assert.Equal(t, http.StatusInternalServerError, response.StatusCode)
		})
	}
}

func TestGetCollectionGenerationRejectsMalformedFailedStatusError(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	request := validCollectionGenerationRequest()
	invalidErrors := []struct {
		name  string
		error json.RawMessage
	}{
		{name: "error is not an object", error: json.RawMessage(`[]`)},
		{name: "missing message", error: json.RawMessage(`{"code":"model_failed"}`)},
		{name: "message is not a string", error: json.RawMessage(`{"message":42}`)},
		{name: "blank message", error: json.RawMessage(`{"message":"  "}`)},
	}

	for _, tc := range invalidErrors {
		t.Run(tc.name, func(t *testing.T) {
			client := generationResponseOverrideClient{generation: &evalhub.CollectionGenerationResource{
				Resource: evalhub.CollectionGenerationResourceMetadata{ID: "generation-001", Tenant: "test-ns", Owner: "user@example.com", CreatedAt: "2026-01-01T00:00:00Z", UpdatedAt: "2026-01-01T00:01:00Z"},
				Request:  evalhub.CollectionGenerationRequestSummary{EvaluationGoal: request.EvaluationGoal, Model: request.Model, MaxBenchmarks: 12, Strictness: "moderate", GenerationEffort: "standard"},
				Status:   evalhub.CollectionGenerationStatus{State: "failed", Error: tc.error},
			}}
			_, response, err := setupApiTestWithEvalHub[HTTPError](
				http.MethodGet,
				ApiPathPrefix+collectionGenerationPath+"/generation-001?namespace=test-ns",
				nil, nil, identity, client,
			)

			require.NoError(t, err)
			assert.Equal(t, http.StatusInternalServerError, response.StatusCode)
		})
	}
}

func TestGetCollectionGenerationAcceptsFailedStatusWithMessage(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	request := validCollectionGenerationRequest()
	client := generationResponseOverrideClient{generation: &evalhub.CollectionGenerationResource{
		Resource: evalhub.CollectionGenerationResourceMetadata{ID: "generation-001", Tenant: "test-ns", Owner: "user@example.com", CreatedAt: "2026-01-01T00:00:00Z", UpdatedAt: "2026-01-01T00:01:00Z"},
		Request:  evalhub.CollectionGenerationRequestSummary{EvaluationGoal: request.EvaluationGoal, Model: request.Model, MaxBenchmarks: 12, Strictness: "moderate", GenerationEffort: "standard"},
		Status:   evalhub.CollectionGenerationStatus{State: "failed", Error: json.RawMessage(`{"code":"model_failed","message":"The model request failed."}`)},
	}}

	result, response, err := setupApiTestWithEvalHub[CollectionGenerationEnvelope](
		http.MethodGet,
		ApiPathPrefix+collectionGenerationPath+"/generation-001?namespace=test-ns",
		nil, nil, identity, client,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.Equal(t, "failed", result.Data.Status.State)
}

func TestGetCollectionGenerationRejectsBenchmarkLimitAboveDurableMaximum(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	request := validCollectionGenerationRequest()
	client := generationResponseOverrideClient{generation: &evalhub.CollectionGenerationResource{
		Resource: evalhub.CollectionGenerationResourceMetadata{ID: "generation-001", Tenant: "test-ns", Owner: "user@example.com", CreatedAt: "2026-01-01T00:00:00Z", UpdatedAt: "2026-01-01T00:00:00Z"},
		Request:  evalhub.CollectionGenerationRequestSummary{EvaluationGoal: request.EvaluationGoal, Model: request.Model, MaxBenchmarks: 101, Strictness: "moderate", GenerationEffort: "standard"},
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

func TestDeleteCollectionGenerationHandlerIsTenantScopedInMock(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()
	mockClient.SetCollectionGeneration("generation-001", &evalhub.CollectionGenerationResource{
		Resource: evalhub.CollectionGenerationResourceMetadata{
			ID: "generation-001", Tenant: "test-ns", Owner: "user@example.com",
			CreatedAt: "2026-01-01T00:00:00Z", UpdatedAt: "2026-01-01T00:00:00Z",
		},
		Request: evalhub.CollectionGenerationRequestSummary{
			EvaluationGoal: "Assess reasoning", Model: evalhub.JobModel{Name: "generator", URL: "https://models.example.com/v1"},
			MaxBenchmarks: 100, Strictness: "moderate", GenerationEffort: "standard",
		},
		Status: evalhub.CollectionGenerationStatus{State: "pending"},
	})

	_, wrongTenantResponse, err := setupApiTestWithEvalHub[HTTPError](
		http.MethodDelete,
		ApiPathPrefix+collectionGenerationPath+"/generation-001?namespace=other-ns",
		nil, nil, identity, mockClient,
	)
	require.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, wrongTenantResponse.StatusCode)
	assert.Empty(t, mockClient.LastDeletedCollectionGenerationID)

	_, visibleResponse, err := setupApiTestWithEvalHub[CollectionGenerationEnvelope](
		http.MethodGet,
		ApiPathPrefix+collectionGenerationPath+"/generation-001?namespace=test-ns",
		nil, nil, identity, mockClient,
	)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, visibleResponse.StatusCode)

	_, response, err := setupApiTestWithEvalHub[struct{}](
		http.MethodDelete,
		ApiPathPrefix+collectionGenerationPath+"/generation-001?namespace=test-ns",
		nil, nil, identity, mockClient,
	)
	require.NoError(t, err)
	assert.Equal(t, http.StatusNoContent, response.StatusCode)
	assert.Equal(t, "generation-001", mockClient.LastDeletedCollectionGenerationID)
	assert.Equal(t, "test-ns", mockClient.LastDeletedCollectionGenerationTenant)

	_, pollResponse, err := setupApiTestWithEvalHub[HTTPError](
		http.MethodGet,
		ApiPathPrefix+collectionGenerationPath+"/generation-001?namespace=test-ns",
		nil, nil, identity, mockClient,
	)
	require.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, pollResponse.StatusCode)

	_, repeatDeleteResponse, err := setupApiTestWithEvalHub[HTTPError](
		http.MethodDelete,
		ApiPathPrefix+collectionGenerationPath+"/generation-001?namespace=test-ns",
		nil, nil, identity, mockClient,
	)
	require.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, repeatDeleteResponse.StatusCode)
}

type generationDeleteErrorClient struct {
	evalhub.EvalHubClientInterface
	err error
}

func (c generationDeleteErrorClient) DeleteCollectionGeneration(_ context.Context, _ string, _ string) error {
	return c.err
}

func TestDeleteCollectionGenerationPreservesUpstreamNotFound(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	client := generationDeleteErrorClient{
		EvalHubClientInterface: ehmocks.NewMockEvalHubClient(),
		err:                    evalhub.NewNotFoundError("generation expired"),
	}
	result, response, err := setupApiTestWithEvalHub[HTTPError](
		http.MethodDelete,
		ApiPathPrefix+collectionGenerationPath+"/generation-expired?namespace=test-ns",
		nil, nil, identity, client,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, response.StatusCode)
	assert.Equal(t, evalhub.ErrCodeNotFound, result.Error.Code)
}

func TestDeleteCollectionGenerationRejectsUnknownMockResource(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	result, response, err := setupApiTestWithEvalHub[HTTPError](
		http.MethodDelete,
		ApiPathPrefix+collectionGenerationPath+"/generation-unknown?namespace=test-ns",
		nil, nil, identity, ehmocks.NewMockEvalHubClient(),
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, response.StatusCode)
	assert.Equal(t, evalhub.ErrCodeNotFound, result.Error.Code)
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
		{method: http.MethodDelete, path: ApiPathPrefix + collectionGenerationPath + "?namespace=test-ns", status: http.StatusMethodNotAllowed},
		{method: http.MethodDelete, path: ApiPathPrefix + collectionGenerationPath + "/generation-001/child?namespace=test-ns", status: http.StatusNotFound},
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
