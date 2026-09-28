package kubernetes

import (
	"context"

	corev1 "k8s.io/api/core/v1"
)

const ComponentLabelValue = "mod-arch"

// KubernetesClientInterface exposes only the minimal surface needed by the starter project.
type KubernetesClientInterface interface {
	GetNamespaces(ctx context.Context, identity *RequestIdentity) ([]corev1.Namespace, error)
	CanAccessResource(ctx context.Context, identity *RequestIdentity, namespace, verb, group, resource string) (bool, error)
	IsClusterAdmin(identity *RequestIdentity) (bool, error)
	GetUser(identity *RequestIdentity) (string, error)
}
