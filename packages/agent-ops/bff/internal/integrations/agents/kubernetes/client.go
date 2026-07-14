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
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// Client reads agent Sandbox CRs from the Kubernetes API.
type Client struct {
	k8sClient k8s.KubernetesClientInterface
	identity  *k8s.RequestIdentity
	logger    *slog.Logger
}

// ListNamespaces returns namespaces where the caller can list agents.
// enabledOnly is reserved for future filtering and is currently ignored.
func (c *Client) ListNamespaces(ctx context.Context, enabledOnly bool) ([]string, error) {
	_ = enabledOnly

	namespaces, err := c.k8sClient.GetNamespaces(ctx, c.identity)
	if err != nil {
		return nil, fmt.Errorf("failed to list namespaces for agent discovery: %w", err)
	}

	result := make([]string, 0, len(namespaces))
	for _, namespace := range namespaces {
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

// CanListAgentsInNamespace checks whether the caller has permission to list agent sandboxes in the given namespace.
func (c *Client) CanListAgentsInNamespace(ctx context.Context, namespace string) (bool, error) {
	return c.k8sClient.CanListAgentsInNamespace(ctx, c.identity, namespace)
}

// ListAgents returns labeled agent sandboxes in a namespace.
func (c *Client) ListAgents(ctx context.Context, namespace string) (*agents.AgentList, error) {
	summaries, err := c.listAgentSummaries(ctx, namespace)
	if err != nil {
		return nil, err
	}
	return &agents.AgentList{Items: summaries}, nil
}

// GetAgent returns detailed sandbox information for one agent.
func (c *Client) GetAgent(ctx context.Context, namespace, name string) (*agents.AgentDetail, error) {
	return c.getAgentDetail(ctx, namespace, name)
}

func (c *Client) listAgentSummaries(ctx context.Context, namespace string) ([]agents.AgentSummary, error) {
	dynamicClient, err := c.k8sClient.DynamicClient()
	if err != nil {
		return nil, fmt.Errorf("failed to get dynamic client: %w", err)
	}

	seen := make(map[string]struct{})
	summaries := make([]agents.AgentSummary, 0)
	var listed bool
	var deferredErr error

	for _, selector := range agentLabelSelectors() {
		sandboxes, err := listSandboxes(ctx, dynamicClient, namespace, selector)
		if err != nil {
			if meta.IsNoMatchError(err) || apierrors.IsNotFound(err) {
				continue
			}
			if apierrors.IsForbidden(err) {
				if deferredErr == nil {
					deferredErr = agents.ErrForbidden
				}
				c.logger.Debug("skipping sandbox list due to forbidden access",
					slog.String("namespace", namespace),
					slog.String("selector", selector))
				continue
			}
			if isRetryableListError(err) {
				if deferredErr == nil {
					deferredErr = err
				}
				c.logger.Warn("skipping sandbox list due to transient error",
					slog.String("namespace", namespace),
					slog.String("selector", selector),
					slog.Any("error", err))
				continue
			}
			return nil, fmt.Errorf("failed to list sandboxes in namespace %q with selector %q: %w", namespace, selector, err)
		}
		listed = true

		for _, sandbox := range sandboxes {
			name := sandbox.GetName()
			if _, exists := seen[name]; exists {
				continue
			}
			seen[name] = struct{}{}
			service := mapService(c.getServiceBestEffort(ctx, namespace, name))
			summaries = append(summaries, sandboxToSummary(sandbox, service))
		}
	}

	if !listed && deferredErr != nil {
		if errors.Is(deferredErr, agents.ErrForbidden) {
			return nil, agents.ErrForbidden
		}
		return nil, fmt.Errorf("failed to list sandboxes in namespace %q: %w", namespace, deferredErr)
	}

	return summaries, nil
}

func (c *Client) getAgentDetail(ctx context.Context, namespace, name string) (*agents.AgentDetail, error) {
	dynamicClient, err := c.k8sClient.DynamicClient()
	if err != nil {
		return nil, fmt.Errorf("failed to get dynamic client: %w", err)
	}

	obj, err := getSandbox(ctx, dynamicClient, namespace, name)
	if err != nil {
		if apierrors.IsNotFound(err) || meta.IsNoMatchError(err) {
			return nil, agents.ErrNotFound
		}
		if apierrors.IsForbidden(err) {
			return nil, agents.ErrForbidden
		}
		return nil, fmt.Errorf("failed to get sandbox %q in namespace %q: %w", name, namespace, err)
	}

	service := mapService(c.getServiceBestEffort(ctx, namespace, name))
	detail := sandboxToDetail(*obj, service)
	return detail, nil
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

func isRetryableListError(err error) bool {
	return apierrors.IsServerTimeout(err) ||
		apierrors.IsServiceUnavailable(err) ||
		apierrors.IsTimeout(err) ||
		apierrors.IsTooManyRequests(err)
}
