package kubernetes

import (
	"context"
	"fmt"

	corev1 "k8s.io/api/core/v1"
)

const ComponentLabelValue = "mlflow"

// InvalidVerbError is returned when an unsupported verb is passed to CanWritePromptsInNamespace.
type InvalidVerbError struct {
	Verb string
}

func (e *InvalidVerbError) Error() string {
	return fmt.Sprintf("invalid verb %q: must be 'create' or 'delete'", e.Verb)
}

// KubernetesClientInterface exposes only the minimal surface needed by the starter project.
type KubernetesClientInterface interface {
	GetNamespaces(ctx context.Context, identity *RequestIdentity) ([]corev1.Namespace, error)
	IsClusterAdmin(identity *RequestIdentity) (bool, error)
	GetUser(identity *RequestIdentity) (string, error)
	CanWritePromptsInNamespace(ctx context.Context, namespace string, verb string) (bool, error)
}
