package kubernetes

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
)

// DeployAgent creates all Kubernetes resources for a new agent deployment.
// Resources are created in order: ServiceAccount, AgentRuntime CR, Deployment, Service, Route (optional).
// On failure, previously created resources are cleaned up via a closure-based rollback stack.
func (c *Client) DeployAgent(ctx context.Context, params *agents.DeployAgentParams) (*agents.DeployAgentResult, error) {
	if params == nil {
		return nil, fmt.Errorf("deploy params must not be nil")
	}

	clientset := c.k8sClient.KubernetesClientset()
	dynamicClient, err := c.k8sClient.DynamicClient()
	if err != nil {
		return nil, fmt.Errorf("failed to get dynamic client: %w", err)
	}

	rollbackCtx := context.Background()
	var cleanups []func()
	rollback := func() {
		for i := len(cleanups) - 1; i >= 0; i-- {
			cleanups[i]()
		}
	}
	// 1. ServiceAccount
	sa := buildServiceAccount(params.Name, params.Namespace)
	_, err = clientset.CoreV1().ServiceAccounts(params.Namespace).Create(ctx, sa, metav1.CreateOptions{})
	if err != nil {
		if !apierrors.IsAlreadyExists(err) {
			return nil, fmt.Errorf("failed to create ServiceAccount: %w", mapK8sError(err))
		}
		existingSA, getErr := clientset.CoreV1().ServiceAccounts(params.Namespace).Get(ctx, params.Name, metav1.GetOptions{})
		if getErr != nil {
			return nil, fmt.Errorf("failed to verify existing ServiceAccount %q: %w", params.Name, mapK8sError(getErr))
		}
		if existingSA.Labels[labelManagedBy] != managedByValue {
			return nil, fmt.Errorf("ServiceAccount %q already exists and is not managed by odh-dashboard", params.Name)
		}
		c.logger.Debug("ServiceAccount already exists, reusing",
			slog.String("name", params.Name),
			slog.String("namespace", params.Namespace))
	} else {
		cleanups = append(cleanups, func() {
			if delErr := clientset.CoreV1().ServiceAccounts(params.Namespace).Delete(rollbackCtx, params.Name, metav1.DeleteOptions{}); delErr != nil {
				c.logger.Warn("rollback: failed to delete ServiceAccount",
					slog.String("name", params.Name),
					slog.Any("error", delErr))
			}
		})
	}

	// 2. AgentRuntime CR
	agentRuntime := buildAgentRuntimeCR(params)
	var crUID types.UID
	createdCR, err := dynamicClient.Resource(agentRuntimeGVR).Namespace(params.Namespace).Create(ctx, agentRuntime, metav1.CreateOptions{})
	if err != nil {
		if !apierrors.IsAlreadyExists(err) {
			rollback()
			return nil, fmt.Errorf("failed to create AgentRuntime: %w", mapK8sError(err))
		}
		existingCR, getErr := dynamicClient.Resource(agentRuntimeGVR).Namespace(params.Namespace).Get(ctx, params.Name, metav1.GetOptions{})
		if getErr != nil {
			rollback()
			return nil, fmt.Errorf("failed to get existing AgentRuntime: %w", mapK8sError(getErr))
		}
		if existingCR.GetLabels()[labelManagedBy] != managedByValue {
			rollback()
			return nil, fmt.Errorf("AgentRuntime %q already exists and is not managed by odh-dashboard", params.Name)
		}
		crUID = existingCR.GetUID()
		c.logger.Debug("AgentRuntime already exists, reusing",
			slog.String("name", params.Name),
			slog.String("namespace", params.Namespace))
	} else {
		crUID = createdCR.GetUID()
		cleanups = append(cleanups, func() {
			if delErr := dynamicClient.Resource(agentRuntimeGVR).Namespace(params.Namespace).Delete(rollbackCtx, params.Name, metav1.DeleteOptions{}); delErr != nil {
				c.logger.Warn("rollback: failed to delete AgentRuntime",
					slog.String("name", params.Name),
					slog.Any("error", delErr))
			}
		})
	}

	ownerRef := metav1.OwnerReference{
		APIVersion: agentRuntimeGVR.Group + "/" + agentRuntimeGVR.Version,
		Kind:       "AgentRuntime",
		Name:       params.Name,
		UID:        crUID,
		Controller: boolPtr(true),
	}

	// 3. Deployment
	deployment := buildDeployment(params, ownerRef)
	_, err = clientset.AppsV1().Deployments(params.Namespace).Create(ctx, deployment, metav1.CreateOptions{})
	if err != nil {
		rollback()
		return nil, fmt.Errorf("failed to create Deployment: %w", mapK8sError(err))
	}
	cleanups = append(cleanups, func() {
		if delErr := clientset.AppsV1().Deployments(params.Namespace).Delete(rollbackCtx, params.Name, metav1.DeleteOptions{}); delErr != nil {
			c.logger.Warn("rollback: failed to delete Deployment",
				slog.String("name", params.Name),
				slog.Any("error", delErr))
		}
	})

	// 4. Service
	svc := buildService(params, ownerRef)
	_, err = clientset.CoreV1().Services(params.Namespace).Create(ctx, svc, metav1.CreateOptions{})
	if err != nil {
		rollback()
		return nil, fmt.Errorf("failed to create Service: %w", mapK8sError(err))
	}
	cleanups = append(cleanups, func() {
		if delErr := clientset.CoreV1().Services(params.Namespace).Delete(rollbackCtx, params.Name, metav1.DeleteOptions{}); delErr != nil {
			c.logger.Warn("rollback: failed to delete Service",
				slog.String("name", params.Name),
				slog.Any("error", delErr))
		}
	})

	// 5. Route (optional)
	if params.CreateRoute {
		svcPort := defaultSvcPort
		if len(params.ServicePorts) > 0 && params.ServicePorts[0].Port > 0 {
			svcPort = params.ServicePorts[0].Port
		}

		route := buildRoute(params.Name, params.Namespace, svcPort, ownerRef)
		_, err = dynamicClient.Resource(openshiftRouteGVR).Namespace(params.Namespace).Create(ctx, route, metav1.CreateOptions{})
		if err != nil {
			rollback()
			return nil, fmt.Errorf("failed to create Route: %w", mapK8sError(err))
		}
		cleanups = append(cleanups, func() {
			if delErr := dynamicClient.Resource(openshiftRouteGVR).Namespace(params.Namespace).Delete(rollbackCtx, params.Name, metav1.DeleteOptions{}); delErr != nil {
				c.logger.Warn("rollback: failed to delete Route",
					slog.String("name", params.Name),
					slog.Any("error", delErr))
			}
		})
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
