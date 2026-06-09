package kubernetes

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/constants"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	k8s "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/kubernetes"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// Client reads kagenti agent workloads from the Kubernetes API.
type Client struct {
	k8sClient k8s.KubernetesClientInterface
	identity  *k8s.RequestIdentity
	logger    *slog.Logger
}

// ListNamespaces returns namespaces where kagenti is enabled and the caller can list agents.
func (c *Client) ListNamespaces(ctx context.Context, enabledOnly bool) ([]string, error) {
	namespaces, err := c.k8sClient.GetNamespaces(ctx, c.identity)
	if err != nil {
		return nil, err
	}

	result := make([]string, 0, len(namespaces))
	for _, namespace := range namespaces {
		if enabledOnly && !isKagentiEnabledNamespace(namespace.Labels) {
			continue
		}

		allowed, err := c.k8sClient.CanListAgentsInNamespace(ctx, c.identity, namespace.Name)
		if err != nil {
			c.logger.Warn("failed to check agent list access for namespace",
				slog.String("namespace", namespace.Name),
				slog.Any("error", err))
			continue
		}
		if !allowed {
			c.logger.Debug("skipping namespace without agent list access", slog.String("namespace", namespace.Name))
			continue
		}

		result = append(result, namespace.Name)
	}

	return result, nil
}

// ListAgents returns labeled agent workloads in a namespace.
func (c *Client) ListAgents(ctx context.Context, namespace string) (*agents.AgentList, error) {
	summaries, err := c.listAgentSummaries(ctx, namespace)
	if err != nil {
		return nil, err
	}
	return &agents.AgentList{Items: summaries}, nil
}

// GetAgent returns detailed workload information for one agent.
func (c *Client) GetAgent(ctx context.Context, namespace, name string) (*agents.AgentDetail, error) {
	detail, err := c.getAgentDetail(ctx, namespace, name)
	if err != nil {
		if apierrors.IsNotFound(err) {
			return nil, agents.ErrNotFound
		}
		return nil, err
	}
	return detail, nil
}

func (c *Client) listAgentSummaries(ctx context.Context, namespace string) ([]agents.AgentSummary, error) {
	clientset := c.k8sClient.KubernetesClientset()
	selector := agentLabelSelector()
	seen := make(map[string]struct{})
	summaries := make([]agents.AgentSummary, 0)

	deployments, err := clientset.AppsV1().Deployments(namespace).List(ctx, metav1.ListOptions{LabelSelector: selector})
	if err != nil {
		return nil, fmt.Errorf("failed to list deployments in namespace %q: %w", namespace, err)
	}
	for _, deployment := range deployments.Items {
		seen[deployment.Name] = struct{}{}
		service := c.getServiceBestEffort(ctx, namespace, deployment.Name)
		summaries = append(summaries, deploymentToSummary(deployment, service))
	}

	statefulSets, err := clientset.AppsV1().StatefulSets(namespace).List(ctx, metav1.ListOptions{LabelSelector: selector})
	if err != nil {
		return nil, fmt.Errorf("failed to list statefulsets in namespace %q: %w", namespace, err)
	}
	for _, statefulSet := range statefulSets.Items {
		if _, exists := seen[statefulSet.Name]; exists {
			c.logger.Warn("duplicate agent name detected; skipping statefulset",
				slog.String("namespace", namespace),
				slog.String("name", statefulSet.Name))
			continue
		}
		seen[statefulSet.Name] = struct{}{}
		service := c.getServiceBestEffort(ctx, namespace, statefulSet.Name)
		summaries = append(summaries, statefulSetToSummary(statefulSet, service))
	}

	jobs, err := clientset.BatchV1().Jobs(namespace).List(ctx, metav1.ListOptions{LabelSelector: selector})
	if err != nil {
		return nil, fmt.Errorf("failed to list jobs in namespace %q: %w", namespace, err)
	}
	for _, job := range jobs.Items {
		if _, exists := seen[job.Name]; exists {
			c.logger.Warn("duplicate agent name detected; skipping job",
				slog.String("namespace", namespace),
				slog.String("name", job.Name))
			continue
		}
		seen[job.Name] = struct{}{}
		summaries = append(summaries, jobToSummary(job))
	}

	return summaries, nil
}

func (c *Client) getAgentDetail(ctx context.Context, namespace, name string) (*agents.AgentDetail, error) {
	clientset := c.k8sClient.KubernetesClientset()

	deployment, err := clientset.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
	if err == nil {
		service := c.getServiceBestEffort(ctx, namespace, name)
		return deploymentToDetail(*deployment, service), nil
	}
	if !apierrors.IsNotFound(err) {
		return nil, fmt.Errorf("failed to get deployment %q in namespace %q: %w", name, namespace, err)
	}

	statefulSet, err := clientset.AppsV1().StatefulSets(namespace).Get(ctx, name, metav1.GetOptions{})
	if err == nil {
		service := c.getServiceBestEffort(ctx, namespace, name)
		return statefulSetToDetail(*statefulSet, service), nil
	}
	if !apierrors.IsNotFound(err) {
		return nil, fmt.Errorf("failed to get statefulset %q in namespace %q: %w", name, namespace, err)
	}

	job, err := clientset.BatchV1().Jobs(namespace).Get(ctx, name, metav1.GetOptions{})
	if err == nil {
		return jobToDetail(*job), nil
	}
	if apierrors.IsNotFound(err) {
		return nil, agents.ErrNotFound
	}
	return nil, fmt.Errorf("failed to get job %q in namespace %q: %w", name, namespace, err)
}

func (c *Client) getServiceBestEffort(ctx context.Context, namespace, name string) *corev1.Service {
	clientset := c.k8sClient.KubernetesClientset()
	service, err := clientset.CoreV1().Services(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		if !apierrors.IsNotFound(err) {
			c.logger.Debug("failed to get service for agent",
				slog.String("namespace", namespace),
				slog.String("name", name),
				slog.Any("error", err))
		}
		return nil
	}
	return service
}

func isKagentiEnabledNamespace(labels map[string]string) bool {
	if labels == nil {
		return false
	}
	return labels[agents.LabelKagentiEnabled] == agents.LabelKagentiEnabledValue
}

func requestIdentityFromContext(ctx context.Context) (*k8s.RequestIdentity, error) {
	identityVal := ctx.Value(constants.RequestIdentityKey)
	if identityVal == nil {
		return nil, errors.New("missing RequestIdentity in context")
	}
	identity, ok := identityVal.(*k8s.RequestIdentity)
	if !ok || identity == nil {
		return nil, errors.New("invalid RequestIdentity in context")
	}
	return identity, nil
}
