// Package kubernetes provides Kubernetes client abstractions and token-based authentication.
package kubernetes

import (
	"context"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/dynamic"
)

const ComponentLabelValue = "core"

// KubernetesClientInterface exposes only the minimal surface needed by the starter project.
type KubernetesClientInterface interface {
	GetNamespaces(ctx context.Context, identity *RequestIdentity) ([]corev1.Namespace, error)
	IsClusterAdmin(ctx context.Context, identity *RequestIdentity) (bool, error)
	GetUser(ctx context.Context, identity *RequestIdentity) (string, error)

	// admin/allowed checks via SSAR on auths/default-auth
	IsUserAdmin(ctx context.Context, identity *RequestIdentity) (bool, error)
	IsUserAllowed(ctx context.Context, identity *RequestIdentity) (bool, error)

	// Dynamic client for CRD operations (OdhDashboardConfig, Auth, OdhApplication)
	GetDynamicClient() (dynamic.Interface, error)

	// ConfigMap operations (connection-types, cluster settings)
	GetConfigMap(ctx context.Context, namespace, name string) (*corev1.ConfigMap, error)
	ListConfigMaps(ctx context.Context, namespace string, labelSelector string) (*corev1.ConfigMapList, error)
	CreateConfigMap(ctx context.Context, namespace string, cm *corev1.ConfigMap) (*corev1.ConfigMap, error)
	UpdateConfigMap(ctx context.Context, namespace string, cm *corev1.ConfigMap) (*corev1.ConfigMap, error)
	PatchConfigMap(ctx context.Context, namespace, name string, patchData []byte, patchType types.PatchType) (*corev1.ConfigMap, error)
	DeleteConfigMap(ctx context.Context, namespace, name string) error
}
