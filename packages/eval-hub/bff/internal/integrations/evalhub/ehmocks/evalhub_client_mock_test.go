package ehmocks

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gopkg.in/yaml.v3"
)

func TestMockEvalHubClient_GetCollectionGenerationReturnsCompletedFixture(t *testing.T) {
	client := NewMockEvalHubClient()
	generation, err := client.GetCollectionGeneration(context.Background(), completedGenerationID, completedGenerationTenant)
	require.NoError(t, err)
	require.NotNil(t, generation)
	assert.Equal(t, completedGenerationID, generation.Resource.ID)
	assert.Equal(t, completedGenerationTenant, generation.Resource.Tenant)
	assert.Equal(t, "completed", generation.Status.State)

	var result struct {
		Collection struct {
			Name       string                        `json:"name"`
			Category   string                        `json:"category"`
			Domains    []string                      `json:"domains"`
			Benchmarks []evalhub.CollectionBenchmark `json:"benchmarks"`
		} `json:"collection"`
		YAML        string `json:"yaml"`
		Rationale   string `json:"rationale"`
		Explanation struct {
			SelectedBenchmarks []struct {
				ProviderID string `json:"provider_id"`
				ID         string `json:"id"`
				Reason     string `json:"reason"`
			} `json:"selected_benchmarks"`
			RejectedBenchmarks []struct {
				ProviderID string `json:"provider_id"`
				ID         string `json:"id"`
				Reason     string `json:"reason"`
			} `json:"rejected_benchmarks"`
		} `json:"explanation"`
		Actions []struct {
			Name    string `json:"name"`
			Outcome string `json:"outcome"`
			Summary string `json:"summary"`
		} `json:"actions"`
	}
	require.True(t, json.Valid(generation.Result), "generation result must be valid JSON")
	require.NoError(t, json.Unmarshal(generation.Result, &result))

	assert.NotEmpty(t, result.Collection.Name)
	assert.NotEmpty(t, result.Collection.Category)
	assert.NotEmpty(t, result.Collection.Domains)
	assert.NotEmpty(t, result.YAML)
	var yamlCollection map[string]any
	require.NoError(t, yaml.Unmarshal([]byte(result.YAML), &yamlCollection))
	var proposal map[string]any
	require.NoError(t, json.Unmarshal(generation.Result, &proposal))
	assert.Equal(t, proposal["collection"], yamlCollection)
	assert.NotEmpty(t, result.Rationale)
	assert.Len(t, result.Collection.Benchmarks, 5)
	assert.Len(t, result.Explanation.SelectedBenchmarks, 5)
	assert.Len(t, result.Explanation.RejectedBenchmarks, 5)
	assert.NotEmpty(t, result.Actions)

	knownBenchmarks := make(map[string]map[string]bool)
	for _, provider := range mockProviders() {
		knownBenchmarks[provider.Resource.ID] = make(map[string]bool)
		for _, benchmark := range provider.Benchmarks {
			knownBenchmarks[provider.Resource.ID][benchmark.ID] = true
		}
	}
	for _, benchmark := range result.Collection.Benchmarks {
		assert.True(t, knownBenchmarks[benchmark.ProviderID][benchmark.ID], "selected benchmark must exist in mockProviders")
		assert.NotNil(t, benchmark.PrimaryScore, "selected benchmark should show its primary metric")
		assert.NotNil(t, benchmark.PassCriteria, "selected benchmark should show its recommended threshold")
	}
	for _, reason := range result.Explanation.SelectedBenchmarks {
		assert.True(t, knownBenchmarks[reason.ProviderID][reason.ID], "selected explanation must reference a mock benchmark")
		assert.NotEmpty(t, reason.Reason)
	}
	for _, reason := range result.Explanation.RejectedBenchmarks {
		assert.True(t, knownBenchmarks[reason.ProviderID][reason.ID], "rejected explanation must reference a mock benchmark")
		assert.NotEmpty(t, reason.Reason)
	}
}

func TestMockEvalHubClient_CreateCollectionGenerationCompletesOnPoll(t *testing.T) {
	client := NewMockEvalHubClient()
	generation, err := client.CreateCollectionGeneration(context.Background(), "test-ns", evalhub.CreateCollectionGenerationRequest{
		EvaluationGoal: "Assess reasoning and factual accuracy",
		Model:          evalhub.JobModel{Name: "my-model", URL: "https://models.example.com/v1"},
	})
	require.NoError(t, err)
	require.NotNil(t, generation)
	assert.Equal(t, "pending", generation.Status.State)
	assert.Empty(t, generation.Result)
	second, err := client.CreateCollectionGeneration(context.Background(), "other-ns", evalhub.CreateCollectionGenerationRequest{
		EvaluationGoal: "A different goal",
		Model:          evalhub.JobModel{Name: "my-model", URL: "https://models.example.com/v1"},
	})
	require.NoError(t, err)
	assert.NotEqual(t, generation.Resource.ID, second.Resource.ID)
	wrongTenant, err := client.GetCollectionGeneration(context.Background(), generation.Resource.ID, "other-ns")
	require.NoError(t, err)
	assert.Nil(t, wrongTenant)
	cancelledContext, cancel := context.WithCancel(context.Background())
	cancel()
	cancelled, err := client.GetCollectionGeneration(cancelledContext, generation.Resource.ID, "test-ns")
	require.ErrorIs(t, err, context.Canceled)
	assert.Nil(t, cancelled)

	completed, err := client.GetCollectionGeneration(context.Background(), generation.Resource.ID, "test-ns")
	require.NoError(t, err)
	require.NotNil(t, completed)
	assert.Equal(t, "pending", generation.Status.State)
	assert.Equal(t, generation.Resource.ID, completed.Resource.ID)
	assert.Equal(t, "test-ns", completed.Resource.Tenant)
	assert.Equal(t, generation.Request, completed.Request)
	assert.Equal(t, "completed", completed.Status.State)
	var result struct {
		Collection struct {
			Benchmarks []evalhub.CollectionBenchmark `json:"benchmarks"`
		} `json:"collection"`
	}
	require.NoError(t, json.Unmarshal(completed.Result, &result))
	assert.Len(t, result.Collection.Benchmarks, 5)

	polledAgain, err := client.GetCollectionGeneration(context.Background(), generation.Resource.ID, "test-ns")
	require.NoError(t, err)
	assert.Equal(t, "completed", polledAgain.Status.State)
	assert.JSONEq(t, string(completed.Result), string(polledAgain.Result))
}
