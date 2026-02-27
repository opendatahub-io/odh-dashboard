package kubernetes

import (
	"context"

	lsdapi "github.com/llamastack/llama-stack-k8s-operator/api/v1alpha1"
	corev1 "k8s.io/api/core/v1"
)

const ComponentLabelValue = "autorag"

// Label for LSD identification
const OpenDataHubDashboardLabelKey = "opendatahub.io/dashboard"

// KubernetesClientInterface exposes only the minimal surface needed by the starter project.
type KubernetesClientInterface interface {
	GetNamespaces(ctx context.Context, identity *RequestIdentity) ([]corev1.Namespace, error)
	IsClusterAdmin(identity *RequestIdentity) (bool, error)
	GetUser(identity *RequestIdentity) (string, error)

	// Llamastack Distribution
	CanListLlamaStackDistributions(ctx context.Context, identity *RequestIdentity, namespace string) (bool, error)
	GetLlamaStackDistributions(ctx context.Context, identity *RequestIdentity, namespace string) (*lsdapi.LlamaStackDistributionList, error)
}
