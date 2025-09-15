package kubernetes

import (
	"context"

	lsdapi "github.com/llamastack/llama-stack-k8s-operator/api/v1alpha1"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/models/genaiassets"
	corev1 "k8s.io/api/core/v1"
)

const ComponenetLabelValue = "llama-stack"

type KubernetesClientInterface interface {
	// Namespace access
	GetNamespaces(ctx context.Context, identity *integrations.RequestIdentity) ([]corev1.Namespace, error)
	GetAAModels(ctx context.Context, identity *integrations.RequestIdentity, namespace string) ([]genaiassets.AAModel, error)

	// Meta
	IsClusterAdmin(ctx context.Context, identity *integrations.RequestIdentity) (bool, error)
	BearerToken() (string, error)

	// Identity
	GetUser(ctx context.Context, identity *integrations.RequestIdentity) (string, error)

	// LlamaStack Distribution
	GetLlamaStackDistributions(ctx context.Context, identity *integrations.RequestIdentity, namespace string) (*lsdapi.LlamaStackDistributionList, error)
}
