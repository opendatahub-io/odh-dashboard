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

const (
	// AnnotationOriginalReplicas stores the original replica count before a stop operation.
	AnnotationOriginalReplicas = "opendatahub.io/original-replicas"
)

// StopAgent scales down the agent Deployment to zero replicas.
// The original replica count is preserved in an annotation so StartAgent can restore it.
func (c *Client) StopAgent(ctx context.Context, namespace, name string) error {
	clientset := c.k8sClient.KubernetesClientset()

	deployment, err := clientset.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("failed to get Deployment %s/%s: %w", namespace, name, mapK8sError(err))
	}
	if deployment.Labels[labelManagedBy] != managedByValue {
		return fmt.Errorf("cannot stop agent %s/%s: not managed by %s", namespace, name, managedByValue)
	}

	currentReplicas := int32(1)
	if deployment.Spec.Replicas != nil {
		currentReplicas = *deployment.Spec.Replicas
	}

	if currentReplicas == 0 {
		return &agents.UnavailableError{Message: fmt.Sprintf("agent %s/%s is already stopped", namespace, name)}
	}

	// Store original replica count in annotation before scaling to zero.
	if deployment.Annotations == nil {
		deployment.Annotations = make(map[string]string)
	}
	deployment.Annotations[AnnotationOriginalReplicas] = fmt.Sprintf("%d", currentReplicas)

	zero := int32(0)
	deployment.Spec.Replicas = &zero

	_, err = clientset.AppsV1().Deployments(namespace).Update(ctx, deployment, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("failed to scale down Deployment %s/%s: %w", namespace, name, mapK8sError(err))
	}

	c.logger.Info("Agent stopped (scaled to 0)",
		slog.String("name", name),
		slog.String("namespace", namespace),
		slog.Int("originalReplicas", int(currentReplicas)))

	return nil
}

// StartAgent scales the agent Deployment back up to its original replica count.
// If no original replica count is stored, it defaults to 1.
func (c *Client) StartAgent(ctx context.Context, namespace, name string) error {
	clientset := c.k8sClient.KubernetesClientset()

	deployment, err := clientset.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("failed to get Deployment %s/%s: %w", namespace, name, mapK8sError(err))
	}
	if deployment.Labels[labelManagedBy] != managedByValue {
		return fmt.Errorf("cannot start agent %s/%s: not managed by %s", namespace, name, managedByValue)
	}

	currentReplicas := int32(1)
	if deployment.Spec.Replicas != nil {
		currentReplicas = *deployment.Spec.Replicas
	}

	if currentReplicas > 0 {
		return &agents.UnavailableError{Message: fmt.Sprintf("agent %s/%s is already running", namespace, name)}
	}

	// Restore from annotation, default to 1.
	targetReplicas := int32(1)
	if stored, ok := deployment.Annotations[AnnotationOriginalReplicas]; ok {
		if parsed, parseErr := parseReplicaCount(stored); parseErr == nil && parsed > 0 {
			targetReplicas = parsed
		}
		// Clean up the annotation.
		delete(deployment.Annotations, AnnotationOriginalReplicas)
	}

	deployment.Spec.Replicas = &targetReplicas

	_, err = clientset.AppsV1().Deployments(namespace).Update(ctx, deployment, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("failed to scale up Deployment %s/%s: %w", namespace, name, mapK8sError(err))
	}

	c.logger.Info("Agent started",
		slog.String("name", name),
		slog.String("namespace", namespace),
		slog.Int("replicas", int(targetReplicas)))

	return nil
}

func parseReplicaCount(s string) (int32, error) {
	var n int32
	_, err := fmt.Sscanf(s, "%d", &n)
	return n, err
}
