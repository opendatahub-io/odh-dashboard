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

// K8sClientInterface defines the contract for Kubernetes operations.
//
// Security: Identity is REQUIRED for all operations and must be stored in the context
// via ContextWithIdentity before calling any method. Missing identity is rejected to
// prevent privilege escalation and ensure RBAC enforcement.
//
// Identity behavior by implementation:
//   - K8sInternalClient: Creates impersonated clients scoped to user's RBAC permissions.
//   - K8sTokenClient: Uses token from identity for bearer authentication.
//
// Always inject identity into context via middleware (InjectRequestIdentity).
type K8sClientInterface interface {
	// Generic resource operations
	ListResources(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error)
	GetResource(ctx context.Context, gvr schema.GroupVersionResource, namespace, name string) (*unstructured.Unstructured, error)
	CreateResource(ctx context.Context, gvr schema.GroupVersionResource, namespace string, obj *unstructured.Unstructured) (*unstructured.Unstructured, error)

	// Common resource operations
	GetNamespaces(ctx context.Context) ([]v1.Namespace, error)
	GetPods(ctx context.Context, namespace string) (*v1.PodList, error)
	GetSecrets(ctx context.Context, namespace string) ([]v1.Secret, error)
	GetSecret(ctx context.Context, namespace, secretName string) (*v1.Secret, error)

	// User identity and permissions
	GetUser(ctx context.Context) (string, error)
	IsClusterAdmin(ctx context.Context) (bool, error)
	CanAccessResource(ctx context.Context, namespace, verb, group, resource, name string) (bool, error)

	// DiscoverResourceGVR discovers the preferred API version for a custom resource
	// by trying known versions in preference order (newer to older).
	// Returns the first working GroupVersionResource or an error if none are available.
	DiscoverResourceGVR(ctx context.Context, group, resource, namespace string, knownVersions []string) (schema.GroupVersionResource, error)
}

// DefaultK8sClientConfig holds configuration for creating a Kubernetes client.
type DefaultK8sClientConfig struct {
	AuthMethod string
}

// NewDefaultK8sClient creates a Kubernetes client based on the configured auth method.
// Returns K8sTokenClient for "user_token" auth, K8sInternalClient otherwise.
// For user_token auth, the token is extracted from the request context via IdentityFromContext.
func NewDefaultK8sClient(cfg DefaultK8sClientConfig) (K8sClientInterface, error) {
	if cfg.AuthMethod == "user_token" {
		return NewDefaultK8sTokenClient(K8sTokenClientConfig{})
	}
	return NewDefaultK8sInternalClient(K8sInternalClientConfig{})
}
