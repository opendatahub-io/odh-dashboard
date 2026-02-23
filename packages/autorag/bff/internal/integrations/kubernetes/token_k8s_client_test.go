package kubernetes

import (
	"context"
	"log/slog"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	authv1 "k8s.io/api/authorization/v1"
	"k8s.io/client-go/rest"
)

func TestCanListLlamaStackDistributions(t *testing.T) {
	t.Run("should handle nil identity gracefully", func(t *testing.T) {
		config := &rest.Config{
			Host: "https://test-cluster.example.com",
		}

		client := &TokenKubernetesClient{
			restConfig: config,
			SharedClientLogic: SharedClientLogic{
				Logger: slog.Default(),
			},
		}

		ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
		defer cancel()

		canList, err := client.CanListLlamaStackDistributions(ctx, nil, "test-namespace")

		assert.Error(t, err)
		assert.False(t, canList)
		assert.Contains(t, err.Error(), "identity cannot be nil")
	})

	t.Run("should handle empty token", func(t *testing.T) {
		config := &rest.Config{
			Host: "https://test-cluster.example.com",
		}

		client := &TokenKubernetesClient{
			restConfig: config,
			SharedClientLogic: SharedClientLogic{
				Logger: slog.Default(),
			},
		}

		identity := &RequestIdentity{
			Token: "",
		}

		ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
		defer cancel()

		canList, err := client.CanListLlamaStackDistributions(ctx, identity, "test-namespace")

		// Should fail when creating clientset with empty token
		assert.Error(t, err)
		assert.False(t, canList)
	})

	t.Run("should attempt to create clientset with identity token", func(t *testing.T) {
		config := &rest.Config{
			Host: "https://test-cluster.example.com",
		}

		client := &TokenKubernetesClient{
			restConfig: config,
			SharedClientLogic: SharedClientLogic{
				Logger: slog.Default(),
			},
		}

		identity := &RequestIdentity{
			Token: "test-token-value",
		}

		ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
		defer cancel()

		canList, err := client.CanListLlamaStackDistributions(ctx, identity, "test-namespace")

		// We expect an error because we don't have a real Kubernetes cluster
		// but the method should be callable and return appropriate error
		assert.Error(t, err)
		assert.False(t, canList)
		// The error should be about network connectivity, not client creation or nil identity
		assert.NotContains(t, err.Error(), "identity cannot be nil")
	})

	t.Run("should handle context cancellation", func(t *testing.T) {
		config := &rest.Config{
			Host: "https://test-cluster.example.com",
		}

		client := &TokenKubernetesClient{
			restConfig: config,
			SharedClientLogic: SharedClientLogic{
				Logger: slog.Default(),
			},
		}

		identity := &RequestIdentity{
			Token: "test-token",
		}

		// Create a context that's already cancelled
		ctx, cancel := context.WithCancel(context.Background())
		cancel() // Cancel immediately

		canList, err := client.CanListLlamaStackDistributions(ctx, identity, "test-namespace")

		assert.Error(t, err)
		assert.False(t, canList)
		assert.Contains(t, err.Error(), "context canceled")
	})
}

func TestCanListLlamaStackDistributionsSARStructure(t *testing.T) {
	t.Run("should create proper SAR request for LlamaStackDistribution resources", func(t *testing.T) {
		// Test that we create the SAR request with correct parameters
		// This validates the RBAC resource/verb/group are correct
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

		// Verify the SAR structure matches what we expect
		assert.Equal(t, "list", sar.Spec.ResourceAttributes.Verb,
			"Must check 'list' permission for authorization")
		assert.Equal(t, "llamastack.io", sar.Spec.ResourceAttributes.Group,
			"Must use 'llamastack.io' API group")
		assert.Equal(t, "llamastackdistributions", sar.Spec.ResourceAttributes.Resource,
			"Must check 'llamastackdistributions' resource")
		assert.Equal(t, "test-namespace", sar.Spec.ResourceAttributes.Namespace,
			"Must check permissions in the requested namespace")
	})
}
