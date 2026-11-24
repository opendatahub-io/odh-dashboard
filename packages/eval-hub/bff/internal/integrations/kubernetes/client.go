package kubernetes

import (
	"context"

	"github.com/opendatahub-io/eval-hub/bff/internal/models"
	corev1 "k8s.io/api/core/v1"
)

const ComponentLabelValue = "eval-hub"

// KubernetesClientInterface exposes only the minimal surface needed by the starter project.
type KubernetesClientInterface interface {
	GetNamespaces(ctx context.Context, identity *RequestIdentity) ([]corev1.Namespace, error)
	IsClusterAdmin(identity *RequestIdentity) (bool, error)
	GetUser(identity *RequestIdentity) (string, error)

	// EvalHub service discovery

	// GetEvalHubDiscoveryURL reads the EvalHubDiscovery ConfigMap from the tenant namespace
	// and returns the service URL. This is the preferred discovery method for multi-tenant
	// deployments where the EvalHub CR lives in a different namespace than the user's tenant.
	// Returns ("", nil) if the ConfigMap does not exist in the namespace.
	GetEvalHubDiscoveryURL(ctx context.Context, identity *RequestIdentity, namespace string) (string, error)

	// EvalHub CR auto-discovery (fallback)

	// CanListEvalHubInstances performs a SubjectAccessReview to verify the user has permission
	// to list EvalHub custom resources in the given namespace.
	CanListEvalHubInstances(ctx context.Context, identity *RequestIdentity, namespace string) (bool, error)
	// GetEvalHubServiceURL lists EvalHub CRs in the namespace (filtered by the ODH dashboard label)
	// and returns the service URL from the first CR's status.url field.
	GetEvalHubServiceURL(ctx context.Context, identity *RequestIdentity, namespace string) (string, error)
	// GetEvalHubCRStatus lists EvalHub CRs in the namespace and returns the full status
	// of the first found instance, including phase, readiness, conditions, and providers.
	GetEvalHubCRStatus(ctx context.Context, identity *RequestIdentity, namespace string) (*models.EvalHubCRStatus, error)
}
