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
	// CanListAgentsInNamespace checks whether the user can list agent workloads
	// (deployments, statefulsets, or jobs) in the namespace.
	CanListAgentsInNamespace(ctx context.Context, identity *RequestIdentity, namespace string) (bool, error)
	// CanGetAgentInNamespace checks whether the user can get an agent workload
	// (deployment, statefulset, or job) and its service in the namespace.
	CanGetAgentInNamespace(ctx context.Context, identity *RequestIdentity, namespace, name string) (bool, error)
	// CanDeployAgentInNamespace checks whether the user can create all resources
	// required for an agent deployment (serviceaccounts, deployments, services, agentruntimes,
	// and routes when createRoute is true).
	CanDeployAgentInNamespace(ctx context.Context, identity *RequestIdentity, namespace string, createRoute bool) (bool, error)
	// CanAccessAgentCardEnrichment checks SAR/SSAR for optional card enrichment sources.
	CanAccessAgentCardEnrichment(ctx context.Context, identity *RequestIdentity, namespace, agentRuntimeName string) (AgentCardEnrichmentAccess, error)
	// KubernetesClientset exposes the underlying clientset for workload reads.
	KubernetesClientset() kubernetes.Interface
	// DynamicClient exposes a dynamic client for CRD reads (e.g. AgentRuntime).
	DynamicClient() (dynamic.Interface, error)
}
