package kubernetes

import (
	"context"

	lsdapi "github.com/llamastack/llama-stack-k8s-operator/api/v1alpha1"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations"
	corev1 "k8s.io/api/core/v1"
)

const ComponenetLabelValue = "llama-stack"

type KubernetesClientInterface interface {
	// TODO: Add service discovery methods

	// Namespace access
	GetNamespaces(ctx context.Context, identity *integrations.RequestIdentity) ([]corev1.Namespace, error)

	// Meta
	IsClusterAdmin(ctx context.Context, identity *integrations.RequestIdentity) (bool, error)
	BearerToken() (string, error)

	// LlamaStack Distribution
	GetLlamaStackDistributions(ctx context.Context, identity *integrations.RequestIdentity, namespace string) (*lsdapi.LlamaStackDistributionList, error)
}
