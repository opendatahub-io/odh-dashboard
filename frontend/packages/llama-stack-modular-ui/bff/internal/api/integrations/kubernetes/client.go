package kubernetes

import (
	"context"

	corev1 "k8s.io/api/core/v1"
)

const ComponenetLabelValue = "llama-stack"

type KubernetesClientInterface interface {
	// TODO: Add service discovery methods

	// Namespace access
	GetNamespaces(ctx context.Context, identity *RequestIdentity) ([]corev1.Namespace, error)

	// Meta
	IsClusterAdmin(identity *RequestIdentity) (bool, error)
	BearerToken() (string, error)
}
