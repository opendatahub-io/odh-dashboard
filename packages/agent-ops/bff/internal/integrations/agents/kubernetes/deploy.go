package kubernetes

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// DeployAgent creates a Sandbox CR for the agent.
// The agent-sandbox controller auto-creates Service + Pod from the Sandbox CR spec.
func (c *Client) DeployAgent(ctx context.Context, params *agents.DeployAgentParams) (*agents.DeployAgentResult, error) {
	if params == nil {
		return nil, fmt.Errorf("deploy params must not be nil")
	}

	dynamicClient, err := c.k8sClient.DynamicClient()
	if err != nil {
		return nil, fmt.Errorf("failed to get dynamic client: %w", err)
	}

	sandboxCR := buildSandboxCR(params)
	_, err = dynamicClient.Resource(sandboxGVR).Namespace(params.Namespace).Create(ctx, sandboxCR, metav1.CreateOptions{})
	if err != nil {
		if apierrors.IsAlreadyExists(err) {
			existingCR, getErr := dynamicClient.Resource(sandboxGVR).Namespace(params.Namespace).Get(ctx, params.Name, metav1.GetOptions{})
			if getErr != nil {
				return nil, fmt.Errorf("failed to get existing Sandbox CR: %w", mapK8sError(getErr))
			}
			if existingCR.GetLabels()[labelManagedBy] != managedByValue {
				return nil, fmt.Errorf("Sandbox %q already exists and is not managed by %s: %w", params.Name, managedByValue, agents.ErrAlreadyExists)
			}
			c.logger.Debug("Sandbox CR already exists, reusing",
				slog.String("name", params.Name),
				slog.String("namespace", params.Namespace))
		} else {
			return nil, fmt.Errorf("failed to create Sandbox CR: %w", mapK8sError(err))
		}
	}

	return &agents.DeployAgentResult{
		Name:      params.Name,
		Namespace: params.Namespace,
	}, nil
}

// DeleteAgent removes all Kubernetes resources associated with an agent deployment.
func (c *Client) DeleteAgent(ctx context.Context, namespace, name string) error {
	_ = ctx
	return &agents.UnavailableError{Message: fmt.Sprintf("delete not yet implemented for agent %s/%s", namespace, name)}
}

// StopAgent scales down the agent workload to zero replicas.
func (c *Client) StopAgent(ctx context.Context, namespace, name string) error {
	_ = ctx
	return &agents.UnavailableError{Message: fmt.Sprintf("stop not yet implemented for agent %s/%s", namespace, name)}
}

// StartAgent scales the agent workload back up.
func (c *Client) StartAgent(ctx context.Context, namespace, name string) error {
	_ = ctx
	return &agents.UnavailableError{Message: fmt.Sprintf("start not yet implemented for agent %s/%s", namespace, name)}
}
