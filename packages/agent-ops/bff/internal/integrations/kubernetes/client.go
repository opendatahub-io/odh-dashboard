package kubernetes

import (
	"context"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/client-go/dynamic"
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
	// CanListAgentsInNamespace checks whether the user can list agent Sandbox CRs
	// (agents.x-k8s.io/sandboxes) in the namespace.
	CanListAgentsInNamespace(ctx context.Context, identity *RequestIdentity, namespace string) (bool, error)
	// CanGetAgentInNamespace checks whether the user can get an agent Sandbox CR
	// (agents.x-k8s.io/sandboxes) in the namespace.
	CanGetAgentInNamespace(ctx context.Context, identity *RequestIdentity, namespace, name string) (bool, error)
	// CanPatchAgentInNamespace checks whether the user can patch an agent Sandbox CR.
	CanPatchAgentInNamespace(ctx context.Context, identity *RequestIdentity, namespace, name string) (bool, error)
	// CanDeleteAgentInNamespace checks whether the user can delete an agent Sandbox CR.
	CanDeleteAgentInNamespace(ctx context.Context, identity *RequestIdentity, namespace, name string) (bool, error)
	// CanDeployAgentInNamespace checks whether the user can create all resources
	// required for an agent deployment (sandboxes create/get).
	CanDeployAgentInNamespace(ctx context.Context, identity *RequestIdentity, namespace string) (bool, error)
	// CanAccessAgentCardEnrichment checks SAR/SSAR for optional card enrichment sources.
	CanAccessAgentCardEnrichment(ctx context.Context, identity *RequestIdentity, namespace string) (AgentCardEnrichmentAccess, error)
	// KubernetesClientset exposes the underlying clientset for Service reads and related lookups.
	KubernetesClientset() kubernetes.Interface
	// DynamicClient exposes a dynamic client for Sandbox CR and optional enrichment CRDs.
	DynamicClient() (dynamic.Interface, error)
}
