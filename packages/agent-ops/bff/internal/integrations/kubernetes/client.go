package kubernetes

import (
	"context"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/client-go/kubernetes"
)

const ComponentLabelValue = "mod-arch"

// KubernetesClientInterface exposes only the minimal surface needed by the starter project.
type KubernetesClientInterface interface {
	GetNamespaces(ctx context.Context, identity *RequestIdentity) ([]corev1.Namespace, error)
	IsClusterAdmin(identity *RequestIdentity) (bool, error)
	GetUser(identity *RequestIdentity) (string, error)
	// CanListServicesInNamespace performs a SubjectAccessReview or SelfSubjectAccessReview
	// to verify the user can list services in the given namespace.
	CanListServicesInNamespace(ctx context.Context, identity *RequestIdentity, namespace string) (bool, error)
	// CanListAgentsInNamespace checks whether the user can list deployments in the namespace.
	CanListAgentsInNamespace(ctx context.Context, identity *RequestIdentity, namespace string) (bool, error)
	// CanGetAgentInNamespace checks whether the user can get a deployment and service in the namespace.
	CanGetAgentInNamespace(ctx context.Context, identity *RequestIdentity, namespace, name string) (bool, error)
	// KubernetesClientset exposes the underlying clientset for workload reads.
	KubernetesClientset() kubernetes.Interface
}
