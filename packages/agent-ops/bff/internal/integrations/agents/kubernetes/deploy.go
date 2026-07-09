package kubernetes

import (
	"context"
	"fmt"
	"log/slog"

	"strings"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/types"
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

// StopAgent patches the Sandbox CR operatingMode to Suspended.
func (c *Client) StopAgent(ctx context.Context, namespace, name string) error {
	dynamicClient, err := c.k8sClient.DynamicClient()
	if err != nil {
		return fmt.Errorf("failed to get dynamic client: %w", err)
	}

	cr, err := dynamicClient.Resource(sandboxGVR).Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return mapK8sError(err)
	}
	if cr.GetLabels()[labelManagedBy] != managedByValue {
		return fmt.Errorf("Sandbox %q is not managed by odh-dashboard: %w", name, agents.ErrForbidden)
	}

	operatingMode, _, _ := unstructured.NestedString(cr.Object, "spec", "operatingMode")
	if strings.EqualFold(operatingMode, "Suspended") {
		return fmt.Errorf("agent %s/%s is already stopped: %w", namespace, name, agents.ErrConflict)
	}

	patch := []byte(`{"spec":{"operatingMode":"Suspended"}}`)
	_, err = dynamicClient.Resource(sandboxGVR).Namespace(namespace).Patch(
		ctx, name, types.MergePatchType, patch, metav1.PatchOptions{},
	)
	if err != nil {
		return fmt.Errorf("failed to stop agent: %w", mapK8sError(err))
	}

	c.logger.Info("Agent stopped (operatingMode: Suspended)",
		slog.String("name", name),
		slog.String("namespace", namespace))
	return nil
}

// StartAgent patches the Sandbox CR operatingMode to Running.
func (c *Client) StartAgent(ctx context.Context, namespace, name string) error {
	dynamicClient, err := c.k8sClient.DynamicClient()
	if err != nil {
		return fmt.Errorf("failed to get dynamic client: %w", err)
	}

	cr, err := dynamicClient.Resource(sandboxGVR).Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return mapK8sError(err)
	}
	if cr.GetLabels()[labelManagedBy] != managedByValue {
		return fmt.Errorf("Sandbox %q is not managed by odh-dashboard: %w", name, agents.ErrForbidden)
	}

	operatingMode, _, _ := unstructured.NestedString(cr.Object, "spec", "operatingMode")
	if operatingMode == "" || strings.EqualFold(operatingMode, "Running") {
		return fmt.Errorf("agent %s/%s is already running: %w", namespace, name, agents.ErrConflict)
	}

	patch := []byte(`{"spec":{"operatingMode":"Running"}}`)
	_, err = dynamicClient.Resource(sandboxGVR).Namespace(namespace).Patch(
		ctx, name, types.MergePatchType, patch, metav1.PatchOptions{},
	)
	if err != nil {
		return fmt.Errorf("failed to start agent: %w", mapK8sError(err))
	}

	c.logger.Info("Agent started (operatingMode: Running)",
		slog.String("name", name),
		slog.String("namespace", namespace))
	return nil
}
