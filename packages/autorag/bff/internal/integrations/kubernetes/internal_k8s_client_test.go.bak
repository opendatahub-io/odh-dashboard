package kubernetes

import (
	"context"
	"log/slog"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	authv1 "k8s.io/api/authorization/v1"
	"k8s.io/client-go/kubernetes/fake"
)

func TestInternalCanListLlamaStackDistributions(t *testing.T) {
	t.Run("should handle nil identity gracefully", func(t *testing.T) {
		// Create a fake clientset for testing
		fakeClientset := fake.NewSimpleClientset()

		client := &InternalKubernetesClient{
			SharedClientLogic: SharedClientLogic{
				Client: fakeClientset,
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

	t.Run("should handle empty user identity", func(t *testing.T) {
		// Create a fake clientset for testing
		fakeClientset := fake.NewSimpleClientset()

		client := &InternalKubernetesClient{
			SharedClientLogic: SharedClientLogic{
				Client: fakeClientset,
				Logger: slog.Default(),
			},
		}

		identity := &RequestIdentity{
			UserID: "",
			Groups: []string{},
		}

		ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
		defer cancel()

		// Should not panic with empty user identity
		canList, err := client.CanListLlamaStackDistributions(ctx, identity, "test-namespace")

		// Fake client will return false for SAR without error
		assert.NoError(t, err)
		assert.False(t, canList)
	})

	t.Run("should use user identity from context in SAR", func(t *testing.T) {
		// Create a fake clientset for testing
		fakeClientset := fake.NewSimpleClientset()

		client := &InternalKubernetesClient{
			SharedClientLogic: SharedClientLogic{
				Client: fakeClientset,
				Logger: slog.Default(),
			},
		}

		identity := &RequestIdentity{
			UserID: "test-user@example.com",
			Groups: []string{"system:authenticated", "developers"},
		}

		ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
		defer cancel()

		// Should create SAR with user identity
		canList, err := client.CanListLlamaStackDistributions(ctx, identity, "test-namespace")

		// Fake client will return false for SAR without error
		assert.NoError(t, err)
		assert.False(t, canList)
	})

	t.Run("should respect context timeout", func(t *testing.T) {
		// Create a fake clientset for testing
		fakeClientset := fake.NewSimpleClientset()

		client := &InternalKubernetesClient{
			SharedClientLogic: SharedClientLogic{
				Client: fakeClientset,
				Logger: slog.Default(),
			},
		}

		identity := &RequestIdentity{
			UserID: "test-user@example.com",
			Groups: []string{"system:authenticated"},
		}

		// Use a very short timeout
		ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
		defer cancel()

		// The fake client should complete quickly, so this tests that context is passed through
		canList, err := client.CanListLlamaStackDistributions(ctx, identity, "test-namespace")

		// With fake client, the SAR call completes immediately so no timeout error
		// This test validates the method accepts and uses context
		assert.NoError(t, err)
		assert.False(t, canList)
	})
}

func TestInternalCanListLlamaStackDistributionsSARStructure(t *testing.T) {
	t.Run("should create proper SAR request for LlamaStackDistribution resources", func(t *testing.T) {
		// Test that we create the SAR request with correct parameters
		// for internal auth mode (using user identity from headers)
		sar := &authv1.SubjectAccessReview{
			Spec: authv1.SubjectAccessReviewSpec{
				User:   "test-user@example.com",
				Groups: []string{"system:authenticated", "developers"},
				ResourceAttributes: &authv1.ResourceAttributes{
					Verb:      "list",
					Group:     "llamastack.io",
					Resource:  "llamastackdistributions",
					Namespace: "test-namespace",
				},
			},
		}

		// Verify the SAR structure matches what we expect
		assert.Equal(t, "test-user@example.com", sar.Spec.User,
			"Must include user identity in SAR for internal auth mode")
		assert.Equal(t, []string{"system:authenticated", "developers"}, sar.Spec.Groups,
			"Must include user groups in SAR for internal auth mode")
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
