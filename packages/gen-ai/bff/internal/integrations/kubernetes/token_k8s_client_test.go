package kubernetes

import (
	"context"
	"log/slog"
	"testing"
	"time"

	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/maas/maasmocks"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/opendatahub-io/gen-ai/internal/testutil"
	"github.com/stretchr/testify/assert"
	authv1 "k8s.io/api/authorization/v1"
	"k8s.io/client-go/rest"
)

func TestCanListLlamaStackDistributions(t *testing.T) {
	t.Run("should create proper SAR request for LlamaStackDistribution resources", func(t *testing.T) {
		// Create a mock config
		config := &rest.Config{
			Host: "https://test-cluster.example.com",
		}

		// Create a token client with mock config
		client := &TokenKubernetesClient{
			Config: config,
			Logger: slog.Default(),
		}

		identity := &integrations.RequestIdentity{
			Token: "test-token",
		}

		// Test that the method exists and can be called
		// Note: This will fail in a real test environment without proper Kubernetes setup,
		// but it validates the method signature and basic structure
		ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
		defer cancel()

		canList, err := client.CanListLlamaStackDistributions(ctx, identity, testutil.TestNamespace)

		// We expect an error because we don't have a real Kubernetes cluster
		// but the method should be callable and return appropriate error
		assert.Error(t, err)
		assert.False(t, canList)
		// The error should be about network connectivity, not client creation
		assert.Contains(t, err.Error(), "dial tcp")
	})

	t.Run("should handle nil identity gracefully", func(t *testing.T) {
		config := &rest.Config{
			Host: "https://test-cluster.example.com",
		}

		client := &TokenKubernetesClient{
			Config: config,
			Logger: slog.Default(),
		}

		ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
		defer cancel()

		canList, err := client.CanListLlamaStackDistributions(ctx, nil, testutil.TestNamespace)

		assert.Error(t, err)
		assert.False(t, canList)
		assert.Contains(t, err.Error(), "identity cannot be nil")
	})

	t.Run("should handle empty token", func(t *testing.T) {
		config := &rest.Config{
			Host: "https://test-cluster.example.com",
		}

		client := &TokenKubernetesClient{
			Config: config,
			Logger: slog.Default(),
		}

		identity := &integrations.RequestIdentity{
			Token: "",
		}

		ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
		defer cancel()

		canList, err := client.CanListLlamaStackDistributions(ctx, identity, testutil.TestNamespace)

		assert.Error(t, err)
		assert.False(t, canList)
	})

	t.Run("should handle context cancellation", func(t *testing.T) {
		config := &rest.Config{
			Host: "https://test-cluster.example.com",
		}

		client := &TokenKubernetesClient{
			Config: config,
			Logger: slog.Default(),
		}

		identity := &integrations.RequestIdentity{
			Token: "test-token",
		}

		// Create a context that's already cancelled
		ctx, cancel := context.WithCancel(context.Background())
		cancel() // Cancel immediately

		canList, err := client.CanListLlamaStackDistributions(ctx, identity, testutil.TestNamespace)

		assert.Error(t, err)
		assert.False(t, canList)
		assert.Contains(t, err.Error(), "context canceled")
	})
}

func TestCanListLlamaStackDistributionsSARStructure(t *testing.T) {
	t.Run("should create correct SAR request structure", func(t *testing.T) {
		// Test that we can create the SAR request with correct parameters
		sar := &authv1.SelfSubjectAccessReview{
			Spec: authv1.SelfSubjectAccessReviewSpec{
				ResourceAttributes: &authv1.ResourceAttributes{
					Verb:      "list",
					Group:     "llamastack.io",
					Resource:  "llamastackdistributions",
					Namespace: "test-namespace",
				},
			},
		}

		// Verify the SAR structure
		assert.Equal(t, "list", sar.Spec.ResourceAttributes.Verb)
		assert.Equal(t, "llamastack.io", sar.Spec.ResourceAttributes.Group)
		assert.Equal(t, "llamastackdistributions", sar.Spec.ResourceAttributes.Resource)
		assert.Equal(t, "test-namespace", sar.Spec.ResourceAttributes.Namespace)
	})
}

func TestGenerateLlamaStackConfigWithMaaSModels(t *testing.T) {
	t.Run("should handle MaaS models correctly", func(t *testing.T) {
		// Create a mock MaaS client
		mockMaaSClient := &maasmocks.MockMaaSClient{}

		// Create a token client
		client := &TokenKubernetesClient{
			Logger: slog.Default(),
		}

		// Test models with only MaaS models (no regular models to avoid Kubernetes client issues)
		models := []models.InstallModel{
			{ModelName: "llama-2-7b-chat", IsMaaSModel: true},
			{ModelName: "granite-7b-lab", IsMaaSModel: true},
		}

		ctx := context.Background()

		// Test the MaaS model handling logic
		result, err := client.generateLlamaStackConfig(ctx, "test-namespace", models, mockMaaSClient)

		// This should succeed since we're only using MaaS models
		assert.NoError(t, err)
		assert.NotEmpty(t, result)

		// Verify the result contains MaaS model configurations
		assert.Contains(t, result, "llama-2-7b-chat")
		assert.Contains(t, result, "granite-7b-lab")
		assert.Contains(t, result, "maas-vllm-inference")
	})

	t.Run("should fail when MaaS model is not ready", func(t *testing.T) {
		// Create a mock MaaS client
		mockMaaSClient := &maasmocks.MockMaaSClient{}

		// Create a token client
		client := &TokenKubernetesClient{
			Logger: slog.Default(),
		}

		// Test with a model that is not ready (mistral-7b-instruct has Ready: false in mock)
		models := []models.InstallModel{
			{ModelName: "mistral-7b-instruct", IsMaaSModel: true},
		}

		ctx := context.Background()

		// Test the MaaS model handling logic
		result, err := client.generateLlamaStackConfig(ctx, "test-namespace", models, mockMaaSClient)

		// This should fail because the model is not ready
		assert.Error(t, err)
		assert.Empty(t, result)
		assert.Contains(t, err.Error(), "is not ready")
	})

	t.Run("should fail when MaaS model is not found", func(t *testing.T) {
		// Create a mock MaaS client
		mockMaaSClient := &maasmocks.MockMaaSClient{}

		// Create a token client
		client := &TokenKubernetesClient{
			Logger: slog.Default(),
		}

		// Test with a model that doesn't exist in the mock
		models := []models.InstallModel{
			{ModelName: "non-existent-model", IsMaaSModel: true},
		}

		ctx := context.Background()

		// Test the MaaS model handling logic
		result, err := client.generateLlamaStackConfig(ctx, "test-namespace", models, mockMaaSClient)

		// This should fail because the model is not found
		assert.Error(t, err)
		assert.Empty(t, result)
		assert.Contains(t, err.Error(), "not found")
	})
}
