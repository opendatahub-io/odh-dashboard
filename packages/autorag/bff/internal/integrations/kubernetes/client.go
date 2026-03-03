package kubernetes

import (
	"context"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/client-go/rest"
)

const ComponentLabelValue = "autorag"

// KubernetesClientInterface exposes only the minimal surface needed by the starter project.
type KubernetesClientInterface interface {
	GetNamespaces(ctx context.Context, identity *RequestIdentity) ([]corev1.Namespace, error)
	IsClusterAdmin(identity *RequestIdentity) (bool, error)
	GetUser(identity *RequestIdentity) (string, error)
	// GetClientset returns the underlying kubernetes.Interface for advanced operations
	GetClientset() interface{}
	// GetRestConfig returns the rest.Config for creating specialized clients (e.g., dynamic client)
	GetRestConfig() *rest.Config
	// CanListDSPipelineApplications checks if the user can list DSPipelineApplications in the namespace
	CanListDSPipelineApplications(ctx context.Context, identity *RequestIdentity, namespace string) (bool, error)
}
