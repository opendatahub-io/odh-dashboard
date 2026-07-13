// Package kubernetes provides Kubernetes client abstractions and token-based authentication.
package kubernetes

import (
	"context"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/dynamic"
)

const ComponentLabelValue = "core"

// KubernetesClientInterface exposes per-request K8s operations using the caller's
// bearer token. Methods here should be low-level K8s primitives reusable across
// features (identity, RBAC, dynamic client access). Resource-level business logic
// (listing notebooks, merging configs, CRUD on connection types) belongs in repositories.
type KubernetesClientInterface interface {
	GetNamespaces(ctx context.Context, identity *RequestIdentity) ([]corev1.Namespace, error)
	IsClusterAdmin(ctx context.Context, identity *RequestIdentity) (bool, error)
	GetUser(ctx context.Context, identity *RequestIdentity) (string, error)

	// admin/allowed checks via SSAR on auths/default-auth
	IsUserAdmin(ctx context.Context, identity *RequestIdentity) (bool, error)
	IsUserAllowed(ctx context.Context, identity *RequestIdentity) (bool, error)

	// Generic SSAR check for custom resource permissions
	CheckAccess(ctx context.Context, identity *RequestIdentity, verb, group, resource, namespace string) (bool, error)

	// Dynamic client for CRD operations
	GetDynamicClient() (dynamic.Interface, error)

	// ConfigMap operations
	GetConfigMap(ctx context.Context, namespace, name string) (*corev1.ConfigMap, error)
	ListConfigMaps(ctx context.Context, namespace string, labelSelector string) (*corev1.ConfigMapList, error)
	CreateConfigMap(ctx context.Context, namespace string, cm *corev1.ConfigMap) (*corev1.ConfigMap, error)
	UpdateConfigMap(ctx context.Context, namespace string, cm *corev1.ConfigMap) (*corev1.ConfigMap, error)
	PatchConfigMap(ctx context.Context, namespace, name string, patchData []byte, patchType types.PatchType) (*corev1.ConfigMap, error)
	DeleteConfigMap(ctx context.Context, namespace, name string) error
}
