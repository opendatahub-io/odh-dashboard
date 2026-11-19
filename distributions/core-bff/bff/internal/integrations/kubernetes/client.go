// Package kubernetes provides Kubernetes client abstractions and token-based authentication.
package kubernetes

import (
	"context"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
)

const ComponentLabelValue = "core"

// AccessReviewAttributes are the resource attributes of one access review.
type AccessReviewAttributes struct {
	Verb      string
	Group     string
	Resource  string
	Namespace string
	Name      string
}

// AccessReviewResult is the outcome of a completed access review.
type AccessReviewResult int

const (
	// AccessReviewDenied: an authorizer denied the request, or none allowed it
	// and none reported an error.
	AccessReviewDenied AccessReviewResult = iota
	// AccessReviewAllowed: an authorizer allowed the request.
	AccessReviewAllowed
	// AccessReviewIndeterminate: no authorizer decided, and at least one
	// reported an evaluation error (for example a failing webhook). The
	// request might have been allowed; it is neither a grant nor a denial.
	AccessReviewIndeterminate
)

// ClassifyAccessReview maps a completed review's status to a result. A
// definitive allow or deny wins over any evaluation error.
func ClassifyAccessReview(allowed, denied bool, evaluationError string) AccessReviewResult {
	switch {
	case allowed:
		return AccessReviewAllowed
	case denied:
		return AccessReviewDenied
	case evaluationError != "":
		return AccessReviewIndeterminate
	default:
		return AccessReviewDenied
	}
}

// KubernetesClientInterface exposes per-request K8s operations using the caller's
// bearer token. Methods here should be low-level K8s primitives reusable across
// features (identity, RBAC, dynamic client access). Resource-level business logic
// (listing notebooks, merging configs, CRUD on connection types) belongs in repositories.
type KubernetesClientInterface interface {
	GetNamespaces(ctx context.Context, identity *RequestIdentity) ([]corev1.Namespace, error)
	CanGetNamespace(ctx context.Context, identity *RequestIdentity, name string) (bool, error)
	GetNamespace(ctx context.Context, identity *RequestIdentity, name string) (*corev1.Namespace, error)
	IsClusterAdmin(ctx context.Context, identity *RequestIdentity) (bool, error)
	GetUser(ctx context.Context, identity *RequestIdentity) (string, error)

	// admin/allowed checks via SSAR on auths/auth
	IsUserAdmin(ctx context.Context, identity *RequestIdentity) (bool, error)
	IsUserAllowed(ctx context.Context, identity *RequestIdentity) (bool, error)

	// Generic SSAR check for custom resource permissions
	CheckAccess(ctx context.Context, identity *RequestIdentity, verb, group, resource, namespace string) (bool, error)

	// ReviewAccess is a SelfSubjectAccessReview that keeps an indeterminate
	// result (an authorizer error with no decision) apart from a denial.
	ReviewAccess(ctx context.Context, identity *RequestIdentity, attrs AccessReviewAttributes) (AccessReviewResult, error)

	// Dynamic client for CRD operations
	GetDynamicClient() (dynamic.Interface, error)

	// GetClientset returns the typed clientset authenticated as this client's
	// caller. Repositories use it for caller-scoped access (see
	// repositories.CredentialPolicyCaller).
	GetClientset() (kubernetes.Interface, error)

	// ConfigMap operations
	GetConfigMap(ctx context.Context, namespace, name string) (*corev1.ConfigMap, error)
	ListConfigMaps(ctx context.Context, namespace string, labelSelector string) (*corev1.ConfigMapList, error)
	CreateConfigMap(ctx context.Context, namespace string, cm *corev1.ConfigMap) (*corev1.ConfigMap, error)
	UpdateConfigMap(ctx context.Context, namespace string, cm *corev1.ConfigMap) (*corev1.ConfigMap, error)
	PatchConfigMap(ctx context.Context, namespace, name string, patchData []byte, patchType types.PatchType) (*corev1.ConfigMap, error)
	DeleteConfigMap(ctx context.Context, namespace, name string) error
}
