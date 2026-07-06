package mlflowmocks

import (
	"context"
	"fmt"
	"time"

	"github.com/opendatahub-io/mlflow-go/mlflow/promptregistry"
	"github.com/opendatahub-io/mlflow-go/mlflow/tracking"
	"github.com/opendatahub-io/mlflow/bff/internal/integrations/mlflow"
)

// staticExperiments returns the comprehensive set of mock experiments.
// Kept as a function so each call gets fresh timestamps relative to "now".
func staticExperiments() []tracking.Experiment {
	now := time.Now()
	return []tracking.Experiment{
		{
			ID:               "0",
			Name:             "env-static-mock",
			ArtifactLocation: "mlflow-artifacts:/0",
			LifecycleStage:   "active",
			Tags:             map[string]string{"source": "static-mock", "description": "Identifies this as the fully-mocked (in-memory) environment"},
			CreationTime:     now.Add(-30 * 24 * time.Hour),
			LastUpdateTime:   now.Add(-7 * 24 * time.Hour),
		},
		{
			ID:               "1",
			Name:             "fraud-detection-classifier",
			ArtifactLocation: "mlflow-artifacts:/1",
			LifecycleStage:   "active",
			Tags:             map[string]string{"team": "ml-platform", "project": "fraud-detection", "priority": "high"},
			CreationTime:     now.Add(-14 * 24 * time.Hour),
			LastUpdateTime:   now.Add(-1 * time.Hour),
		},
		{
			ID:               "2",
			Name:             "demand-forecasting-regression",
			ArtifactLocation: "mlflow-artifacts:/2",
			LifecycleStage:   "active",
			Tags:             map[string]string{"team": "data-science", "project": "supply-chain"},
			CreationTime:     now.Add(-10 * 24 * time.Hour),
			LastUpdateTime:   now.Add(-3 * time.Hour),
		},
		{
			ID:               "3",
			Name:             "sentiment-analysis-nlp",
			ArtifactLocation: "mlflow-artifacts:/3",
			LifecycleStage:   "active",
			Tags:             map[string]string{"team": "nlp", "project": "customer-feedback", "framework": "transformers"},
			CreationTime:     now.Add(-7 * 24 * time.Hour),
			LastUpdateTime:   now.Add(-30 * time.Minute),
		},
		{
			ID:               "4",
			Name:             "image-classification-cnn",
			ArtifactLocation: "mlflow-artifacts:/4",
			LifecycleStage:   "active",
			Tags:             map[string]string{"team": "computer-vision", "project": "product-catalog"},
			CreationTime:     now.Add(-5 * 24 * time.Hour),
			LastUpdateTime:   now.Add(-2 * time.Hour),
		},
	}
}

func staticPrompts() []promptregistry.Prompt {
	now := time.Now()
	return []promptregistry.Prompt{
		{Name: "vet-appointment-dora", Description: "Schedule a veterinary appointment for Dora", LatestVersion: 1, Tags: map[string]string{"pet": "dora", "category": "health"}, CreationTimestamp: now.Add(-14 * 24 * time.Hour)},
		{Name: "pet-health-bella", Description: "Pet health check for Bella", LatestVersion: 1, Tags: map[string]string{"pet": "bella"}, CreationTimestamp: now.Add(-10 * 24 * time.Hour)},
		{Name: "medication-reminder-ellie", Description: "Medication reminder prompt", LatestVersion: 1, Tags: map[string]string{"pet": "ellie"}, CreationTimestamp: now.Add(-7 * 24 * time.Hour)},
		{Name: "pet-adoption-letter", Description: "Generate pet adoption letters", LatestVersion: 1, Tags: map[string]string{"category": "adoption"}, CreationTimestamp: now.Add(-5 * 24 * time.Hour)},
	}
}

func staticPromptVersion(name string) *promptregistry.PromptVersion {
	now := time.Now()
	return &promptregistry.PromptVersion{
		Name:          name,
		Version:       1,
		Template:      fmt.Sprintf("Hello {{name}}, this is the %s prompt.", name),
		CommitMessage: "initial version",
		CreatedAt:     now.Add(-14 * 24 * time.Hour),
		UpdatedAt:     now.Add(-14 * 24 * time.Hour),
	}
}

// StaticMockClient implements ClientInterface with hardcoded data.
// Used for contract tests and fully-mocked dev mode so no real MLflow server
// (and therefore no uv/Python) is required.
type StaticMockClient struct{}

func (c *StaticMockClient) SearchExperiments(_ context.Context, _ ...tracking.SearchExperimentsOption) (*tracking.ExperimentList, error) {
	return &tracking.ExperimentList{Experiments: staticExperiments()}, nil
}

func (c *StaticMockClient) ListPrompts(_ context.Context, _ ...promptregistry.ListPromptsOption) (*promptregistry.PromptList, error) {
	return &promptregistry.PromptList{Prompts: staticPrompts()}, nil
}

func (c *StaticMockClient) RegisterPrompt(_ context.Context, name, template string, _ ...promptregistry.RegisterOption) (*promptregistry.PromptVersion, error) {
	now := time.Now()
	return &promptregistry.PromptVersion{
		Name: name, Version: 1, Template: template,
		CreatedAt: now, UpdatedAt: now,
	}, nil
}

func (c *StaticMockClient) RegisterChatPrompt(_ context.Context, name string, messages []promptregistry.ChatMessage, _ ...promptregistry.RegisterOption) (*promptregistry.PromptVersion, error) {
	now := time.Now()
	return &promptregistry.PromptVersion{
		Name: name, Version: 1, Messages: messages,
		CreatedAt: now, UpdatedAt: now,
	}, nil
}

func (c *StaticMockClient) LoadPrompt(_ context.Context, name string, _ ...promptregistry.LoadOption) (*promptregistry.PromptVersion, error) {
	return staticPromptVersion(name), nil
}

func (c *StaticMockClient) ListPromptVersions(_ context.Context, _ string, _ ...promptregistry.ListVersionsOption) (*promptregistry.PromptVersionList, error) {
	now := time.Now()
	return &promptregistry.PromptVersionList{
		Versions: []promptregistry.PromptVersion{
			{Version: 1, CommitMessage: "initial version", CreatedAt: now.Add(-14 * 24 * time.Hour), UpdatedAt: now.Add(-14 * 24 * time.Hour)},
		},
	}, nil
}

func (c *StaticMockClient) DeletePrompt(_ context.Context, _ string) error { return nil }

func (c *StaticMockClient) DeletePromptVersion(_ context.Context, _ string, _ int) error { return nil }

// StaticMockClientFactory returns a StaticMockClient for every request.
// Token and namespace are ignored since there is no real server.
type StaticMockClientFactory struct{}

// NewStaticMockClientFactory creates a factory that returns in-memory mock data.
func NewStaticMockClientFactory() mlflow.MLflowClientFactory {
	return &StaticMockClientFactory{}
}

// GetClient returns a StaticMockClient.
func (f *StaticMockClientFactory) GetClient(_ context.Context, _, _ string) (mlflow.ClientInterface, error) {
	return &StaticMockClient{}, nil
}
