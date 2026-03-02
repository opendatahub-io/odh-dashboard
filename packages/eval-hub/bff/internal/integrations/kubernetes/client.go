package kubernetes

import (
	"context"

	corev1 "k8s.io/api/core/v1"
)

const ComponentLabelValue = "eval-hub"

// KubernetesClientInterface exposes only the minimal surface needed by the starter project.
type KubernetesClientInterface interface {
	GetNamespaces(ctx context.Context, identity *RequestIdentity) ([]corev1.Namespace, error)
	IsClusterAdmin(identity *RequestIdentity) (bool, error)
	GetUser(identity *RequestIdentity) (string, error)

	// EvalHub CR auto-discovery
	// CanListEvalHubInstances performs a SubjectAccessReview to verify the user has permission
	// to list EvalHub custom resources in the given namespace.
	CanListEvalHubInstances(ctx context.Context, identity *RequestIdentity, namespace string) (bool, error)
	// GetEvalHubServiceURL lists EvalHub CRs in the namespace (filtered by the ODH dashboard label)
	// and returns the service URL from the first CR's status.serviceURL field.
	GetEvalHubServiceURL(ctx context.Context, identity *RequestIdentity, namespace string) (string, error)
}
