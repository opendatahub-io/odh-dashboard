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
			return nil, fmt.Errorf("Sandbox %q already exists: %w", params.Name, agents.ErrAlreadyExists)
		}
		return nil, fmt.Errorf("failed to create Sandbox CR: %w", mapK8sError(err))
	}

	return &agents.DeployAgentResult{
		Name:      params.Name,
		Namespace: params.Namespace,
	}, nil
}

// DeleteAgent removes a Sandbox CR (agents.x-k8s.io/v1beta1).
// The sandbox controller handles pod and service cleanup.
func (c *Client) DeleteAgent(ctx context.Context, namespace, name string) error {
	dynamicClient, err := c.k8sClient.DynamicClient()
	if err != nil {
		return fmt.Errorf("failed to get dynamic client: %w", err)
	}

	cr, err := dynamicClient.Resource(sandboxGVR).Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return mapK8sError(err)
	}

	rv := cr.GetResourceVersion()
	if err := dynamicClient.Resource(sandboxGVR).Namespace(namespace).Delete(ctx, name, metav1.DeleteOptions{
		Preconditions: &metav1.Preconditions{ResourceVersion: &rv},
	}); err != nil {
		return fmt.Errorf("failed to delete Sandbox: %w", mapK8sError(err))
	}

	c.logger.Info("Deleted Sandbox CR",
		slog.String("name", name),
		slog.String("namespace", namespace))
	return nil
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

// RestartAgent deletes pods associated with a Sandbox CR so the controller recreates them.
func (c *Client) RestartAgent(ctx context.Context, namespace, name string) error {
	dynamicClient, err := c.k8sClient.DynamicClient()
	if err != nil {
		return fmt.Errorf("failed to get dynamic client: %w", err)
	}

	cr, err := dynamicClient.Resource(sandboxGVR).Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return mapK8sError(err)
	}

	podSelector := ""
	if status, ok := cr.Object["status"].(map[string]any); ok {
		podSelector = stringField(status["selector"])
	}
	if podSelector == "" {
		return fmt.Errorf("sandbox %s/%s has no pod selector in status", namespace, name)
	}

	clientset := c.k8sClient.KubernetesClientset()
	err = clientset.CoreV1().Pods(namespace).DeleteCollection(ctx, metav1.DeleteOptions{}, metav1.ListOptions{
		LabelSelector: podSelector,
	})
	if err != nil {
		return fmt.Errorf("failed to restart agent: %w", mapK8sError(err))
	}

	c.logger.Info("Agent restarted (pods deleted for recreation)",
		slog.String("name", name),
		slog.String("namespace", namespace),
		slog.String("selector", podSelector))
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
