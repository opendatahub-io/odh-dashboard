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
		return nil, fmt.Errorf("failed to list namespaces for agent discovery: %w", err)
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

// CanListAgentsInNamespace checks whether the caller has permission to list agent workloads in the given namespace.
func (c *Client) CanListAgentsInNamespace(ctx context.Context, namespace string) (bool, error) {
	return c.k8sClient.CanListAgentsInNamespace(ctx, c.identity, namespace)
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
	return c.getAgentDetail(ctx, namespace, name)
}

func (c *Client) listAgentSummaries(ctx context.Context, namespace string) ([]agents.AgentSummary, error) {
	clientset := c.k8sClient.KubernetesClientset()
	selector := agentLabelSelector()
	seen := make(map[string]struct{})
	summaries := make([]agents.AgentSummary, 0)

	deployments, err := clientset.AppsV1().Deployments(namespace).List(ctx, metav1.ListOptions{LabelSelector: selector})
	if err != nil {
		if apierrors.IsForbidden(err) {
			c.logger.Debug("skipping deployments list due to forbidden access",
				slog.String("namespace", namespace))
		} else {
			return nil, fmt.Errorf("failed to list deployments in namespace %q: %w", namespace, err)
		}
	} else {
		for _, deployment := range deployments.Items {
			seen[deployment.Name] = struct{}{}
			service := c.getServiceBestEffort(ctx, namespace, deployment.Name)
			summaries = append(summaries, deploymentToSummary(deployment, service))
		}
	}

	statefulSets, err := clientset.AppsV1().StatefulSets(namespace).List(ctx, metav1.ListOptions{LabelSelector: selector})
	if err != nil {
		if apierrors.IsForbidden(err) {
			c.logger.Debug("skipping statefulsets list due to forbidden access",
				slog.String("namespace", namespace))
		} else {
			return nil, fmt.Errorf("failed to list statefulsets in namespace %q: %w", namespace, err)
		}
	} else {
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
	}

	jobs, err := clientset.BatchV1().Jobs(namespace).List(ctx, metav1.ListOptions{LabelSelector: selector})
	if err != nil {
		if apierrors.IsForbidden(err) {
			c.logger.Debug("skipping jobs list due to forbidden access",
				slog.String("namespace", namespace))
		} else {
			return nil, fmt.Errorf("failed to list jobs in namespace %q: %w", namespace, err)
		}
	} else {
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
	}

	return summaries, nil
}

func (c *Client) getAgentDetail(ctx context.Context, namespace, name string) (*agents.AgentDetail, error) {
	clientset := c.k8sClient.KubernetesClientset()

	var (
		notFoundAttempts  int
		forbiddenAttempts int
		lastErr           error
	)

	tryWorkload := func(fetch func() (*agents.AgentDetail, error)) (*agents.AgentDetail, bool) {
		detail, err := fetch()
		if err == nil {
			return detail, true
		}
		switch {
		case apierrors.IsNotFound(err):
			notFoundAttempts++
		case apierrors.IsForbidden(err):
			forbiddenAttempts++
		default:
			lastErr = err
		}
		return nil, false
	}

	if detail, ok := tryWorkload(func() (*agents.AgentDetail, error) {
		deployment, err := clientset.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
		if err != nil {
			return nil, err
		}
		return deploymentToDetail(*deployment, nil), nil
	}); ok {
		return c.finalizeAgentDetail(ctx, namespace, name, detail), nil
	}

	if detail, ok := tryWorkload(func() (*agents.AgentDetail, error) {
		statefulSet, err := clientset.AppsV1().StatefulSets(namespace).Get(ctx, name, metav1.GetOptions{})
		if err != nil {
			return nil, err
		}
		return statefulSetToDetail(*statefulSet, nil), nil
	}); ok {
		return c.finalizeAgentDetail(ctx, namespace, name, detail), nil
	}

	if detail, ok := tryWorkload(func() (*agents.AgentDetail, error) {
		job, err := clientset.BatchV1().Jobs(namespace).Get(ctx, name, metav1.GetOptions{})
		if err != nil {
			return nil, err
		}
		return jobToDetail(*job), nil
	}); ok {
		return c.finalizeAgentDetail(ctx, namespace, name, detail), nil
	}

	return nil, workloadLookupError(notFoundAttempts, forbiddenAttempts, lastErr)
}

// finalizeAgentDetail attaches optional Service and AgentRuntime card data.
// Failures in those enrichments are logged and omitted from the response rather
// than failing the entire detail request.
func (c *Client) finalizeAgentDetail(ctx context.Context, namespace, name string, detail *agents.AgentDetail) *agents.AgentDetail {
	if detail == nil {
		return nil
	}
	detail.Service = mapService(c.getServiceBestEffort(ctx, namespace, name))
	c.enrichAgentCard(ctx, namespace, name, detail)
	return detail
}

func workloadLookupError(notFoundAttempts, forbiddenAttempts int, lastErr error) error {
	const workloadKinds = 3

	if notFoundAttempts == workloadKinds {
		return agents.ErrNotFound
	}
	if forbiddenAttempts > 0 && lastErr == nil {
		return agents.ErrForbidden
	}
	if lastErr != nil {
		return lastErr
	}
	return agents.ErrNotFound
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
