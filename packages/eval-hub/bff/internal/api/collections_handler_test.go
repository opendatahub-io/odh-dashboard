package api

import (
	"context"
	"encoding/json"
	"errors"
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

func TestCollectionsHandlerForwardsScopeAndSort(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	result, response, err := setupApiTestWithEvalHub[CollectionsEnvelope](
		http.MethodGet,
		ApiPathPrefix+"/evaluations/collections?namespace=test-ns&scope=curated&sort_by=curation_order&domains=agent_tools&industries=healthcare&evaluation_targets=agent&limit=4&offset=2",
		nil, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.NotNil(t, mockClient.LastListCollectionsParams)
	assert.Equal(t, "test-ns", mockClient.LastListCollectionsParams.Namespace)
	assert.Equal(t, "system", mockClient.LastListCollectionsParams.Scope)
	assert.Equal(t, "curation_order", mockClient.LastListCollectionsParams.SortBy)
	assert.Equal(t, "agent_tools", mockClient.LastListCollectionsParams.Domains)
	assert.Equal(t, "healthcare", mockClient.LastListCollectionsParams.Industries)
	assert.Equal(t, "agent", mockClient.LastListCollectionsParams.EvaluationTargets)
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

func TestPatchCollectionHandlerRejectsCollectionsThatHaveBeenRun(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()
	mockClient.SetCollection("collection-001", &evalhub.Collection{
		Resource: evalhub.CollectionResource{ID: "collection-001"},
		Name:     "Already run suite",
		Status:   &evalhub.CollectionStatus{RunCount: 1},
	})
	operations := []evalhub.CollectionPatchOperation{{
		Op: "replace", Path: "/name", Value: json.RawMessage(`"Updated suite"`),
	}}

	result, response, err := setupApiTestWithEvalHub[HTTPError](
		http.MethodPatch,
		ApiPathPrefix+"/evaluations/collections/collection-001?namespace=test-ns",
		operations, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusConflict, response.StatusCode)
	assert.Equal(t, "collection cannot be edited after it has been run", result.Error.Message)

	getResult, getResponse, err := setupApiTestWithEvalHub[CollectionEnvelope](
		http.MethodGet,
		ApiPathPrefix+"/evaluations/collections/collection-001?namespace=test-ns",
		nil, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, getResponse.StatusCode)
	assert.Equal(t, "Already run suite", getResult.Data.Name)
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

func TestPatchCollectionHandlerRejectsInvalidBenchmarkTestDataRefs(t *testing.T) {
	gitCollection := func() *evalhub.Collection {
		return &evalhub.Collection{
			Resource: evalhub.CollectionResource{ID: "collection-001"},
			Name:     "Suite with git test data",
			Benchmarks: []evalhub.CollectionBenchmark{{
				ID:         "mmlu",
				ProviderID: "lm_evaluation_harness",
				Weight:     1,
				TestDataRef: &evalhub.TestDataRef{Git: &evalhub.TestDataRefGit{
					URL: "https://github.com/example/data.git",
					Ref: "main",
				}},
			}},
		}
	}

	tests := []struct {
		name       string
		collection *evalhub.Collection
		operations []evalhub.CollectionPatchOperation
		message    string
	}{
		{
			name:       "whole benchmark replacement with embedded credentials",
			collection: gitCollection(),
			operations: []evalhub.CollectionPatchOperation{{
				Op:    "replace",
				Path:  "/benchmarks/0",
				Value: json.RawMessage(`{"id":"mmlu","weight":1,"test_data_ref":{"git":{"url":"https://user:pass@example.com/data.git","ref":"main"}}}`),
			}},
			message: "must not embed credentials",
		},
		{
			name:       "nested git url patch with embedded credentials",
			collection: gitCollection(),
			operations: []evalhub.CollectionPatchOperation{{
				Op:    "replace",
				Path:  "/benchmarks/0/test_data_ref/git/url",
				Value: json.RawMessage(`"https://user:pass@example.com/data.git"`),
			}},
			message: "must not embed credentials",
		},
		{
			name:       "appended benchmark with http url and secret reference",
			collection: gitCollection(),
			operations: []evalhub.CollectionPatchOperation{{
				Op:    "add",
				Path:  "/benchmarks/-",
				Value: json.RawMessage(`{"id":"hellaswag","weight":1,"test_data_ref":{"git":{"url":"http://example.com/data.git","ref":"main","secret_ref":"my-secret"}}}`),
			}},
			message: "must use https when a secret reference is provided",
		},
		{
			name:       "nested secret ref patch added to http url",
			collection: gitCollection(),
			operations: []evalhub.CollectionPatchOperation{{
				Op:    "replace",
				Path:  "/benchmarks/0/test_data_ref/git/url",
				Value: json.RawMessage(`"http://example.com/data.git"`),
			}, {
				Op:    "add",
				Path:  "/benchmarks/0/test_data_ref/git/secret_ref",
				Value: json.RawMessage(`"my-secret"`),
			}},
			message: "must use https when a secret reference is provided",
		},
		{
			name:       "patch that does not apply to current collection",
			collection: gitCollection(),
			operations: []evalhub.CollectionPatchOperation{{
				Op:   "remove",
				Path: "/benchmarks/9",
			}},
			message: "patch does not apply to the current collection",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
			mockClient := ehmocks.NewMockEvalHubClient()
			mockClient.SetCollection("collection-001", tt.collection)

			result, response, err := setupApiTestWithEvalHub[HTTPError](
				http.MethodPatch,
				ApiPathPrefix+"/evaluations/collections/collection-001?namespace=test-ns",
				tt.operations, nil, identity, mockClient,
			)

			require.NoError(t, err)
			assert.Equal(t, http.StatusBadRequest, response.StatusCode)
			assert.Contains(t, result.Error.Message, tt.message)

			getResult, getResponse, err := setupApiTestWithEvalHub[CollectionEnvelope](
				http.MethodGet,
				ApiPathPrefix+"/evaluations/collections/collection-001?namespace=test-ns",
				nil, nil, identity, mockClient,
			)

			require.NoError(t, err)
			assert.Equal(t, http.StatusOK, getResponse.StatusCode)
			assert.Equal(t, "https://github.com/example/data.git", getResult.Data.Benchmarks[0].TestDataRef.Git.URL)
		})
	}
}

func TestPatchCollectionHandlerAllowsValidBenchmarkTestDataRef(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()
	mockClient.SetCollection("collection-001", &evalhub.Collection{
		Resource: evalhub.CollectionResource{ID: "collection-001"},
		Name:     "Suite with git test data",
		Benchmarks: []evalhub.CollectionBenchmark{{
			ID:         "mmlu",
			ProviderID: "lm_evaluation_harness",
			Weight:     1,
			TestDataRef: &evalhub.TestDataRef{Git: &evalhub.TestDataRefGit{
				URL: "https://github.com/example/data.git",
				Ref: "main",
			}},
		}},
	})
	operations := []evalhub.CollectionPatchOperation{{
		Op:    "replace",
		Path:  "/benchmarks/0/test_data_ref",
		Value: json.RawMessage(`{"git":{"url":"https://github.com/example/data-v2.git","ref":"v2"}}`),
	}}

	result, response, err := setupApiTestWithEvalHub[CollectionEnvelope](
		http.MethodPatch,
		ApiPathPrefix+"/evaluations/collections/collection-001?namespace=test-ns",
		operations, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.Equal(t, "https://github.com/example/data-v2.git", result.Data.Benchmarks[0].TestDataRef.Git.URL)
	assert.Equal(t, "v2", result.Data.Benchmarks[0].TestDataRef.Git.Ref)
}

func TestValidatePatchedBenchmarksReplaysAgainstOriginalJSON(t *testing.T) {
	// Raw upstream JSON as a live EvalHub instance returns it: an explicit
	// zero weight (dropped by omitempty when re-marshaling the decoded
	// struct) and an unknown field inside a benchmark.
	currentJSON := json.RawMessage(`{
		"resource": {"id": "collection-001"},
		"name": "Suite",
		"benchmarks": [{
			"id": "mmlu",
			"provider_id": "lm_evaluation_harness",
			"weight": 0,
			"extra_upstream_field": "value",
			"test_data_ref": {"git": {"url": "https://github.com/example/data.git", "ref": "main"}}
		}]
	}`)
	current := &evalhub.Collection{
		Resource: evalhub.CollectionResource{ID: "collection-001"},
		Name:     "Suite",
		Benchmarks: []evalhub.CollectionBenchmark{{
			ID:         "mmlu",
			ProviderID: "lm_evaluation_harness",
			TestDataRef: &evalhub.TestDataRef{Git: &evalhub.TestDataRefGit{
				URL: "https://github.com/example/data.git",
				Ref: "main",
			}},
		}},
	}

	tests := []struct {
		name       string
		operations []evalhub.CollectionPatchOperation
	}{
		{
			name: "replacing a zero-value field present in the upstream JSON",
			operations: []evalhub.CollectionPatchOperation{{
				Op:    "replace",
				Path:  "/benchmarks/0/weight",
				Value: json.RawMessage(`2`),
			}},
		},
		{
			name: "replacing an unknown field inside a benchmark",
			operations: []evalhub.CollectionPatchOperation{{
				Op:    "replace",
				Path:  "/benchmarks/0/extra_upstream_field",
				Value: json.RawMessage(`"updated"`),
			}},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validatePatchedBenchmarks(currentJSON, current, tt.operations)
			require.NoError(t, err)
		})
	}
}

func TestValidatePatchedBenchmarksHandlesExplicitNullFields(t *testing.T) {
	// A null weight decodes to the zero value and is dropped by omitempty on
	// re-marshal, so the raw JSON is the only representation where the path
	// exists for replace and remove operations.
	currentJSON := json.RawMessage(`{
		"resource": {"id": "collection-001"},
		"name": "Suite",
		"benchmarks": [{
			"id": "mmlu",
			"provider_id": "lm_evaluation_harness",
			"weight": null
		}]
	}`)
	current := &evalhub.Collection{
		Resource: evalhub.CollectionResource{ID: "collection-001"},
		Name:     "Suite",
		Benchmarks: []evalhub.CollectionBenchmark{{
			ID:         "mmlu",
			ProviderID: "lm_evaluation_harness",
		}},
	}

	tests := []struct {
		name       string
		operations []evalhub.CollectionPatchOperation
	}{
		{
			name: "replacing an explicitly null field",
			operations: []evalhub.CollectionPatchOperation{{
				Op:    "replace",
				Path:  "/benchmarks/0/weight",
				Value: json.RawMessage(`2`),
			}},
		},
		{
			name: "removing an explicitly null field",
			operations: []evalhub.CollectionPatchOperation{{
				Op:   "remove",
				Path: "/benchmarks/0/weight",
			}},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validatePatchedBenchmarks(currentJSON, current, tt.operations)
			require.NoError(t, err)
		})
	}
}

func TestValidatePatchedBenchmarksNormalizesPathCase(t *testing.T) {
	// json-patch appends case-variant keys after the originals, and Go's
	// decoder resolves them onto the same struct fields via its
	// case-insensitive fallback, so variant paths must be tracked and
	// validated like their exact-case counterparts.
	currentJSON := json.RawMessage(`{
		"resource": {"id": "collection-001"},
		"name": "Suite",
		"benchmarks": [{
			"id": "mmlu",
			"test_data_ref": {"git": {"url": "https://github.com/example/valid.git", "ref": "main"}}
		}]
	}`)
	current := &evalhub.Collection{
		Resource: evalhub.CollectionResource{ID: "collection-001"},
		Name:     "Suite",
		Benchmarks: []evalhub.CollectionBenchmark{{
			ID: "mmlu",
			TestDataRef: &evalhub.TestDataRef{Git: &evalhub.TestDataRefGit{
				URL: "https://github.com/example/valid.git",
				Ref: "main",
			}},
		}},
	}

	tests := []struct {
		name       string
		operations []evalhub.CollectionPatchOperation
		wantErr    string
	}{
		{
			name: "case-variant whole-array path is validated",
			operations: []evalhub.CollectionPatchOperation{{
				Op:    "add",
				Path:  "/Benchmarks",
				Value: json.RawMessage(`[{"id":"arc","test_data_ref":{"git":{"url":"https://user:pass@example.com/data.git","ref":"main"}}}]`),
			}},
			wantErr: "must not embed credentials",
		},
		{
			name: "case-variant test_data_ref path is validated",
			operations: []evalhub.CollectionPatchOperation{{
				Op:    "add",
				Path:  "/benchmarks/0/Test_Data_Ref",
				Value: json.RawMessage(`{"git":{"url":"https://user:pass@example.com/data.git","ref":"main"}}`),
			}},
			wantErr: "must not embed credentials",
		},
		{
			name: "case-variant non-benchmark path is passed through",
			operations: []evalhub.CollectionPatchOperation{{
				Op:    "add",
				Path:  "/Name",
				Value: json.RawMessage(`"Renamed"`),
			}},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validatePatchedBenchmarks(currentJSON, current, tt.operations)
			if tt.wantErr == "" {
				require.NoError(t, err)
			} else {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.wantErr)
			}
		})
	}
}

func TestPatchCollectionHandlerValidatesOnlyWrittenBenchmarkRefs(t *testing.T) {
	newCollection := func(firstURL, secondURL string) *evalhub.Collection {
		return &evalhub.Collection{
			Resource: evalhub.CollectionResource{ID: "collection-001"},
			Name:     "Suite with git test data",
			Benchmarks: []evalhub.CollectionBenchmark{
				{
					ID:         "mmlu",
					ProviderID: "lm_evaluation_harness",
					Weight:     1,
					TestDataRef: &evalhub.TestDataRef{Git: &evalhub.TestDataRefGit{
						URL: firstURL,
						Ref: "main",
					}},
				},
				{
					ID:         "hellaswag",
					ProviderID: "lm_evaluation_harness",
					Weight:     1,
					TestDataRef: &evalhub.TestDataRef{Git: &evalhub.TestDataRefGit{
						URL: secondURL,
						Ref: "main",
					}},
				},
			},
		}
	}

	tests := []struct {
		name       string
		collection *evalhub.Collection
		operations []evalhub.CollectionPatchOperation
		status     int
		message    string
		verify     func(t *testing.T, result CollectionEnvelope)
	}{
		{
			name:       "editing one benchmark does not validate a legacy reference on another",
			collection: newCollection("https://user:pass@example.com/legacy.git", "https://github.com/example/valid.git"),
			operations: []evalhub.CollectionPatchOperation{{
				Op:    "replace",
				Path:  "/benchmarks/1/weight",
				Value: json.RawMessage(`2`),
			}},
			status: http.StatusOK,
			verify: func(t *testing.T, result CollectionEnvelope) {
				assert.Len(t, result.Data.Benchmarks, 2)
				assert.Equal(t, float64(2), result.Data.Benchmarks[1].Weight)
			},
		},
		{
			name:       "editing an unrelated field does not validate the same benchmark's legacy reference",
			collection: newCollection("https://user:pass@example.com/legacy.git", "https://github.com/example/valid.git"),
			operations: []evalhub.CollectionPatchOperation{{
				Op:    "replace",
				Path:  "/benchmarks/0/weight",
				Value: json.RawMessage(`2`),
			}},
			status: http.StatusOK,
			verify: func(t *testing.T, result CollectionEnvelope) {
				assert.Len(t, result.Data.Benchmarks, 2)
				assert.Equal(t, float64(2), result.Data.Benchmarks[0].Weight)
				assert.Equal(t, "https://user:pass@example.com/legacy.git", result.Data.Benchmarks[0].TestDataRef.Git.URL)
			},
		},
		{
			name:       "writing a valid reference after a removal succeeds",
			collection: newCollection("https://github.com/example/valid.git", "https://github.com/example/valid.git"),
			operations: []evalhub.CollectionPatchOperation{{
				Op:    "replace",
				Path:  "/benchmarks/1/test_data_ref",
				Value: json.RawMessage(`{"git":{"url":"https://github.com/example/data-v2.git","ref":"v2"}}`),
			}, {
				Op:   "remove",
				Path: "/benchmarks/0",
			}},
			status: http.StatusOK,
			verify: func(t *testing.T, result CollectionEnvelope) {
				assert.Len(t, result.Data.Benchmarks, 1)
				assert.Equal(t, "hellaswag", result.Data.Benchmarks[0].ID)
				assert.Equal(t, "https://github.com/example/data-v2.git", result.Data.Benchmarks[0].TestDataRef.Git.URL)
			},
		},
		{
			name:       "removing a benchmark shifts validation onto the written position",
			collection: newCollection("https://github.com/example/valid.git", "https://github.com/example/valid.git"),
			operations: []evalhub.CollectionPatchOperation{{
				Op:    "replace",
				Path:  "/benchmarks/1/test_data_ref",
				Value: json.RawMessage(`{"git":{"url":"https://user:pass@example.com/data.git","ref":"main"}}`),
			}, {
				Op:   "remove",
				Path: "/benchmarks/0",
			}},
			status:  http.StatusBadRequest,
			message: "must not embed credentials",
		},
		{
			name:       "inserting a benchmark validates the inserted position",
			collection: newCollection("https://user:pass@example.com/legacy.git", "https://github.com/example/valid.git"),
			operations: []evalhub.CollectionPatchOperation{{
				Op:    "add",
				Path:  "/benchmarks/0",
				Value: json.RawMessage(`{"id":"arc","weight":1,"test_data_ref":{"git":{"url":"https://user:pass@example.com/data.git","ref":"main"}}}`),
			}},
			status:  http.StatusBadRequest,
			message: "must not embed credentials",
		},
		{
			name:       "case-variant whole-array path is validated",
			collection: newCollection("https://github.com/example/valid.git", "https://github.com/example/valid.git"),
			operations: []evalhub.CollectionPatchOperation{{
				Op:    "add",
				Path:  "/Benchmarks",
				Value: json.RawMessage(`[{"id":"arc","weight":1,"test_data_ref":{"git":{"url":"https://user:pass@example.com/data.git","ref":"main"}}}]`),
			}},
			status:  http.StatusBadRequest,
			message: "must not embed credentials",
		},
		{
			name:       "case-variant test_data_ref path is validated",
			collection: newCollection("https://github.com/example/valid.git", "https://github.com/example/valid.git"),
			operations: []evalhub.CollectionPatchOperation{{
				Op:    "add",
				Path:  "/benchmarks/0/Test_Data_Ref",
				Value: json.RawMessage(`{"git":{"url":"https://user:pass@example.com/data.git","ref":"main"}}`),
			}},
			status:  http.StatusBadRequest,
			message: "must not embed credentials",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
			mockClient := ehmocks.NewMockEvalHubClient()
			mockClient.SetCollection("collection-001", tt.collection)

			if tt.status == http.StatusOK {
				result, response, err := setupApiTestWithEvalHub[CollectionEnvelope](
					http.MethodPatch,
					ApiPathPrefix+"/evaluations/collections/collection-001?namespace=test-ns",
					tt.operations, nil, identity, mockClient,
				)

				require.NoError(t, err)
				assert.Equal(t, http.StatusOK, response.StatusCode)
				tt.verify(t, result)
			} else {
				result, response, err := setupApiTestWithEvalHub[HTTPError](
					http.MethodPatch,
					ApiPathPrefix+"/evaluations/collections/collection-001?namespace=test-ns",
					tt.operations, nil, identity, mockClient,
				)

				require.NoError(t, err)
				assert.Equal(t, http.StatusBadRequest, response.StatusCode)
				assert.Contains(t, result.Error.Message, tt.message)

				getResult, getResponse, err := setupApiTestWithEvalHub[CollectionEnvelope](
					http.MethodGet,
					ApiPathPrefix+"/evaluations/collections/collection-001?namespace=test-ns",
					nil, nil, identity, mockClient,
				)

				require.NoError(t, err)
				assert.Equal(t, http.StatusOK, getResponse.StatusCode)
				assert.Equal(t, tt.collection.Benchmarks[0].TestDataRef.Git.URL, getResult.Data.Benchmarks[0].TestDataRef.Git.URL)
			}
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

func TestCreateCollectionHandler(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()
	body := evalhub.CreateCollectionRequest{
		Name:              "My New Suite",
		Description:       "A custom suite",
		Domains:           []string{"trustworthiness"},
		EvaluationTargets: []string{"model"},
		Benchmarks:        []evalhub.CollectionBenchmark{{ID: "benchmark-001"}},
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
	assert.Equal(t, "trustworthiness", result.Data.Category)
	assert.Equal(t, []string{"trustworthiness"}, result.Data.Domains)
	assert.Equal(t, []string{"model"}, result.Data.EvaluationTargets)
	assert.Len(t, result.Data.Benchmarks, 1)
}

func TestCreateCollectionHandlerPreservesCategory(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()
	body := evalhub.CreateCollectionRequest{
		Name:              "My New Suite",
		Category:          "  Safety \t",
		EvaluationTargets: []string{"model"},
		Benchmarks:        []evalhub.CollectionBenchmark{{ID: "benchmark-001"}},
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
		Name:              "My New Suite",
		Category:          " \t\n",
		Domains:           []string{"trustworthiness"},
		EvaluationTargets: []string{"model"},
		Benchmarks:        []evalhub.CollectionBenchmark{{ID: "benchmark-001"}},
	}

	result, response, err := setupApiTestWithEvalHub[CollectionEnvelope](
		http.MethodPost,
		ApiPathPrefix+"/evaluations/collections?namespace=test-ns",
		body, nil, identity, ehmocks.NewMockEvalHubClient(),
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, response.StatusCode)
	assert.Equal(t, "trustworthiness", result.Data.Category)
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
		{
			name: "test data ref with no variant",
			body: evalhub.CreateCollectionRequest{Name: "Suite", Benchmarks: []evalhub.CollectionBenchmark{{
				ID:          "benchmark-001",
				TestDataRef: &evalhub.TestDataRef{},
			}}},
		},
		{
			name: "test data ref with multiple variants",
			body: evalhub.CreateCollectionRequest{Name: "Suite", Benchmarks: []evalhub.CollectionBenchmark{{
				ID: "benchmark-001",
				TestDataRef: &evalhub.TestDataRef{
					S3: &evalhub.S3DataRef{Bucket: "bucket"},
					HF: &evalhub.TestDataRefHF{RepoID: "org/repo"},
				},
			}}},
		},
		{
			name: "git test data ref with embedded credentials",
			body: evalhub.CreateCollectionRequest{Name: "Suite", Benchmarks: []evalhub.CollectionBenchmark{{
				ID: "benchmark-001",
				TestDataRef: &evalhub.TestDataRef{
					Git: &evalhub.TestDataRefGit{URL: "https://user:pass@example.com/repo.git"},
				},
			}}},
		},
		{
			name: "git test data ref with secret over http",
			body: evalhub.CreateCollectionRequest{Name: "Suite", Benchmarks: []evalhub.CollectionBenchmark{{
				ID: "benchmark-001",
				TestDataRef: &evalhub.TestDataRef{
					Git: &evalhub.TestDataRefGit{URL: "http://example.com/repo.git", SecretRef: "my-secret"},
				},
			}}},
		},
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
				body, nil, identity, &createCollectionTestClient{collection: tc.collection, err: tc.err},
			)

			require.NoError(t, err)
			assert.Equal(t, http.StatusInternalServerError, response.StatusCode)
		})
	}
}

func TestCloneCollectionHandler(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	domains := []string{"trustworthiness", "knowledge_and_reasoning"}
	tasks := []string{"classification"}
	modalities := []string{"text"}
	industries := []string{"technology"}
	evaluationTargets := []string{"agent"}
	body := evalhub.CloneCollectionRequest{
		Name: "My Cloned Suite", Description: "Custom collection settings", Category: "Safety",
		Tags: []string{"custom", "agent"}, Domains: &domains, Tasks: &tasks, Modalities: &modalities,
		Industries: &industries, EvaluationTargets: &evaluationTargets, Custom: map[string]any{"source": "copy-suite"},
		PassCriteria: &evalhub.CollectionPassCriteria{Threshold: 0.8},
		Benchmarks:   []evalhub.CollectionBenchmark{{ID: "arc_challenge", ProviderID: "lm_evaluation_harness", Weight: 0.8, Parameters: map[string]any{"num_few_shot": 5}}},
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
	assert.Equal(t, []string{"trustworthiness", "knowledge_and_reasoning"}, result.Data.Domains)
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
	assert.Equal(t, []string{"agent"}, result.Data.EvaluationTargets)
}

func TestCloneCollectionHandlerEncodedSlashID(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()
	mockClient.SetCollection("col/special", &evalhub.Collection{Resource: evalhub.CollectionResource{ID: "col/special"}, Name: "Slash Collection"})

	result, response, err := setupApiTestWithEvalHub[CollectionEnvelope](
		http.MethodPost,
		ApiPathPrefix+"/evaluations/collections/col%2Fspecial/clones?namespace=test-ns",
		evalhub.CloneCollectionRequest{Name: "Cloned Slash Collection"}, nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, response.StatusCode)
	assert.Equal(t, "col/special-clone", result.Data.Resource.ID)
	assert.Equal(t, "Cloned Slash Collection", result.Data.Name)
}

func TestCloneCollectionHandlerEmptyBody(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	result, response, err := setupApiTestWithEvalHub[CollectionEnvelope](
		http.MethodPost,
		ApiPathPrefix+"/evaluations/collections/collection-001/clones?namespace=test-ns",
		nil, nil, identity, ehmocks.NewMockEvalHubClient(),
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
	body := evalhub.CloneCollectionRequest{Name: "Cleared metadata", Domains: &empty, Tasks: &empty, Modalities: &empty, Industries: &empty, EvaluationTargets: &empty}

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
	assert.Empty(t, result.Data.EvaluationTargets)
}

func TestCloneCollectionHandlerEmptyChunkedBody(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()
	server := httptest.NewServer(newTestAppWithEvalHub(nil, mockClient).Routes())
	defer server.Close()

	req, err := http.NewRequest(http.MethodPost, server.URL+ApiPathPrefix+"/evaluations/collections/collection-001/clones?namespace=test-ns", http.NoBody)
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
		{
			name: "test data ref with no variant",
			benchmarks: []evalhub.CollectionBenchmark{{
				ID:          "benchmark-001",
				TestDataRef: &evalhub.TestDataRef{},
			}},
		},
		{
			name: "git test data ref with non-http scheme",
			benchmarks: []evalhub.CollectionBenchmark{{
				ID: "benchmark-001",
				TestDataRef: &evalhub.TestDataRef{
					Git: &evalhub.TestDataRefGit{URL: "ssh://git@example.com/repo.git"},
				},
			}},
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			_, response, err := setupApiTestWithEvalHub[HTTPError](
				http.MethodPost,
				ApiPathPrefix+"/evaluations/collections/collection-001/clones?namespace=test-ns",
				evalhub.CloneCollectionRequest{Name: "Clone", Benchmarks: tc.benchmarks}, nil, identity, &erroringEHClient{},
			)
			require.NoError(t, err)
			assert.Equal(t, http.StatusBadRequest, response.StatusCode)
		})
	}
}

func TestCloneCollectionHandlerNotFound(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	_, response, err := setupApiTestWithEvalHub[HTTPError](
		http.MethodPost,
		ApiPathPrefix+"/evaluations/collections/nonexistent/clones?namespace=test-ns",
		evalhub.CloneCollectionRequest{Name: "Clone"}, nil, identity, ehmocks.NewMockEvalHubClient(),
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, response.StatusCode)
}

func TestCloneCollectionHandlerServerError(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	_, response, err := setupApiTestWithEvalHub[HTTPError](
		http.MethodPost,
		ApiPathPrefix+"/evaluations/collections/any/clones?namespace=test-ns",
		evalhub.CloneCollectionRequest{Name: "Clone"}, nil, identity, &erroringEHClient{},
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusInternalServerError, response.StatusCode)
}
