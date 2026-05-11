package kubernetes

import (
	"context"

	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
)

// ClientsetInterface wraps kubernetes.Interface for testing
type ClientsetInterface interface {
	kubernetes.Interface
}

// DynamicClientInterface wraps dynamic.Interface for testing
type DynamicClientInterface interface {
	dynamic.Interface
}

// K8sClientInterface defines the contract for Kubernetes operations
//
// Security: Identity parameter is REQUIRED for all operations (non-nil).
// Nil identity is rejected to prevent privilege escalation and ensure RBAC enforcement.
//
// Identity parameter behavior by implementation:
//   - K8sInternalClient (internal auth): Creates impersonated clients scoped to user's RBAC permissions.
//     All operations enforce the user's permissions via Kubernetes impersonation.
//   - K8sTokenClient (user_token auth): Ignores identity parameter - client is already scoped to
//     user token via tokenRoundTripper. Identity parameter exists for interface compatibility.
//
// Always pass identity from request context for user-initiated operations.
// For system operations, create an explicit system identity with appropriate service account.
type K8sClientInterface interface {
	// Generic resource operations (identity-aware for RBAC enforcement)
	// Identity must be non-nil - nil identity returns an error
	ListResources(ctx context.Context, identity *RequestIdentity, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error)
	GetResource(ctx context.Context, identity *RequestIdentity, gvr schema.GroupVersionResource, namespace, name string) (*unstructured.Unstructured, error)
	CreateResource(ctx context.Context, identity *RequestIdentity, gvr schema.GroupVersionResource, namespace string, obj *unstructured.Unstructured) (*unstructured.Unstructured, error)

	// Convenience methods for common resources
	GetNamespaces(ctx context.Context, identity *RequestIdentity) ([]v1.Namespace, error)
	GetPods(ctx context.Context, identity *RequestIdentity, namespace string) (*v1.PodList, error)
	GetSecrets(ctx context.Context, identity *RequestIdentity, namespace string) ([]v1.Secret, error)
	GetSecret(ctx context.Context, identity *RequestIdentity, namespace, secretName string) (*v1.Secret, error)

	// User identity and permissions
	GetUser(ctx context.Context, identity *RequestIdentity) (string, error)
	IsClusterAdmin(ctx context.Context, identity *RequestIdentity) (bool, error)

	// Generic RBAC check - checks if identity can perform verb on resource in namespace
	CanAccessResource(ctx context.Context, identity *RequestIdentity, namespace, verb, group, resource, name string) (bool, error)

	// DiscoverResourceGVR discovers the preferred API version for a custom resource
	// by trying known versions in preference order (newer to older).
	// Uses namespace-scoped queries to respect RBAC permissions.
	// Returns the first working GroupVersionResource or an error if none are available.
	DiscoverResourceGVR(ctx context.Context, identity *RequestIdentity, group, resource, namespace string, knownVersions []string) (schema.GroupVersionResource, error)
}

// DefaultK8sClientConfig for creating a K8s client based on auth method
type DefaultK8sClientConfig struct {
	AuthMethod   string
	GetAuthToken func(ctx context.Context) (string, error)
}

// NewDefaultK8sClient creates a client based on auth method.
// Returns an error if client initialization fails.
func NewDefaultK8sClient(cfg DefaultK8sClientConfig) (K8sClientInterface, error) {
	if cfg.AuthMethod == "user_token" {
		return NewDefaultK8sTokenClient(DefaultK8sTokenClientConfig{
			GetAuthToken: cfg.GetAuthToken,
		})
	}
	return NewDefaultK8sInternalClient(DefaultK8sInternalClientConfig{})
}
