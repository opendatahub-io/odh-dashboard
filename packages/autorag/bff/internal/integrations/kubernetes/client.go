package kubernetes

import (
	"context"

	lsdapi "github.com/llamastack/llama-stack-k8s-operator/api/v1alpha1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/client-go/rest"
)

const ComponentLabelValue = "autorag"

// Label for LSD identification
const OpenDataHubDashboardLabelKey = "opendatahub.io/dashboard"

// KubernetesClientInterface exposes only the minimal surface needed by the starter project.
type KubernetesClientInterface interface {
	GetNamespaces(ctx context.Context, identity *RequestIdentity) ([]corev1.Namespace, error)
	GetSecrets(ctx context.Context, namespace string, identity *RequestIdentity) ([]corev1.Secret, error)
	GetSecret(ctx context.Context, namespace, secretName string, identity *RequestIdentity) (*corev1.Secret, error)
	IsClusterAdmin(identity *RequestIdentity) (bool, error)
	GetUser(identity *RequestIdentity) (string, error)

	// Llamastack Distribution
	CanListLlamaStackDistributions(ctx context.Context, identity *RequestIdentity, namespace string) (bool, error)
	GetLlamaStackDistributions(ctx context.Context, identity *RequestIdentity, namespace string) (*lsdapi.LlamaStackDistributionList, error)
	// GetClientset returns the underlying kubernetes.Interface for advanced operations
	GetClientset() interface{}
	// GetRestConfig returns the rest.Config for creating specialized clients (e.g., dynamic client)
	GetRestConfig() *rest.Config
	// CanListDSPipelineApplications checks if the user can list DSPipelineApplications in the namespace
	CanListDSPipelineApplications(ctx context.Context, identity *RequestIdentity, namespace string) (bool, error)
}
