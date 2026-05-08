package kubernetes

import (
	"context"

	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
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
type K8sClientInterface interface {
	// Generic resource operations
	ListResources(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error)
	GetResource(ctx context.Context, gvr schema.GroupVersionResource, namespace, name string) (*unstructured.Unstructured, error)
	CreateResource(ctx context.Context, gvr schema.GroupVersionResource, namespace string, obj *unstructured.Unstructured) (*unstructured.Unstructured, error)

	// Convenience methods for common resources
	GetNamespaces(ctx context.Context, identity *RequestIdentity) ([]v1.Namespace, error)
	GetPods(ctx context.Context, identity *RequestIdentity, namespace string) (*v1.PodList, error)
	GetSecrets(ctx context.Context, identity *RequestIdentity, namespace string) ([]v1.Secret, error)
	GetSecret(ctx context.Context, identity *RequestIdentity, namespace, secretName string) (*v1.Secret, error)

	// User identity and permissions
	GetUser(identity *RequestIdentity) (string, error)
	IsClusterAdmin(identity *RequestIdentity) (bool, error)

	// Generic RBAC check - checks if identity can perform verb on resource in namespace
	CanAccessResource(ctx context.Context, identity *RequestIdentity, namespace, verb, group, resource, name string) (bool, error)

	// Advanced operations - expose underlying clients
	GetClientset() any
	GetRestConfig() *rest.Config
}

// DefaultK8sClientConfig for creating a K8s client based on auth method
type DefaultK8sClientConfig struct {
	AuthMethod   string
	GetAuthToken func(ctx context.Context) (string, error)
}

// NewDefaultK8sClient creates a client based on auth method
func NewDefaultK8sClient(cfg DefaultK8sClientConfig) K8sClientInterface {
	if cfg.AuthMethod == "user_token" {
		return NewDefaultK8sTokenClient(DefaultK8sTokenClientConfig{
			GetAuthToken: cfg.GetAuthToken,
		})
	}
	return NewDefaultK8sInternalClient(DefaultK8sInternalClientConfig{})
}
