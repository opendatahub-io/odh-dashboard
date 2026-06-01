package kubernetes

import (
	"context"

	corev1 "k8s.io/api/core/v1"
)

const ComponentLabelValue = "core"

// KubernetesClientInterface exposes only the minimal surface needed by the starter project.
type KubernetesClientInterface interface {
	GetNamespaces(ctx context.Context, identity *RequestIdentity) ([]corev1.Namespace, error)
	IsClusterAdmin(ctx context.Context, identity *RequestIdentity) (bool, error)
	GetUser(ctx context.Context, identity *RequestIdentity) (string, error)
}
