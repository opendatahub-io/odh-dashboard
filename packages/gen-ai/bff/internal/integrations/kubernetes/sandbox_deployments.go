package kubernetes

import (
	"context"
	"fmt"
	"sort"

	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/models"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	apimeta "k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const (
	agentDeploymentStateReady    = "ready"
	agentDeploymentStateCreating = "creating"
	agentDeploymentStateFailed   = "failed"
)

// ListAgentDeployments returns only dashboard-created Sandbox deployments in a
// namespace. When agentProfileID is provided it is included in the Kubernetes
// label selector, rather than filtering an unscoped result client-side.
func (kc *TokenKubernetesClient) ListAgentDeployments(
	ctx context.Context,
	namespace, agentProfileID string,
) (*models.AgentDeploymentListResponse, error) {
	sandboxes := &unstructured.UnstructuredList{}
	sandboxes.SetGroupVersionKind(schema.GroupVersionKind{
		Group: sandboxGroup, Version: sandboxVersion, Kind: sandboxKind + "List",
	})

	labels := map[string]string{dashboardLabel: "true"}
	if agentProfileID != "" {
		labels[agentProfileIDLabel] = agentProfileID
	}
	if err := kc.Client.List(ctx, sandboxes, client.InNamespace(namespace), client.MatchingLabels(labels)); err != nil {
		return nil, sandboxDeploymentListError(err, namespace)
	}

	deployments := make([]models.AgentDeploymentSummary, 0, len(sandboxes.Items))
	for i := range sandboxes.Items {
		deployment, err := kc.sandboxDeploymentSummary(ctx, namespace, &sandboxes.Items[i])
		if err != nil {
			return nil, err
		}
		deployments = append(deployments, *deployment)
	}

	sort.Slice(deployments, func(i, j int) bool { return deployments[i].Name < deployments[j].Name })
	return &models.AgentDeploymentListResponse{Deployments: deployments, TotalCount: len(deployments)}, nil
}

// GetAgentDeployment returns one dashboard-created Sandbox deployment by its name.
func (kc *TokenKubernetesClient) GetAgentDeployment(
	ctx context.Context,
	namespace, name string,
) (*models.AgentDeploymentSummary, error) {
	sandbox := sandboxCR(namespace, name)
	if err := kc.Client.Get(ctx, client.ObjectKeyFromObject(sandbox), sandbox); err != nil {
		return nil, sandboxDeploymentGetError(err, name, namespace)
	}
	if sandbox.GetLabels()[dashboardLabel] != "true" {
		return nil, &integrations.HTTPError{StatusCode: 404, ErrorResponse: integrations.ErrorResponse{
			Code: "not_found", Message: "agent deployment not found",
		}}
	}
	return kc.sandboxDeploymentSummary(ctx, namespace, sandbox)
}

// DeleteAgentDeployment deletes a dashboard-created Sandbox. Its dependent
// resources have owner references pointing to the Sandbox and are removed by
// Kubernetes garbage collection.
func (kc *TokenKubernetesClient) DeleteAgentDeployment(ctx context.Context, namespace, name string) error {
	sandbox := sandboxCR(namespace, name)
	if err := kc.Client.Get(ctx, client.ObjectKeyFromObject(sandbox), sandbox); err != nil {
		return sandboxDeploymentGetError(err, name, namespace)
	}
	if sandbox.GetLabels()[dashboardLabel] != "true" {
		return &integrations.HTTPError{StatusCode: 404, ErrorResponse: integrations.ErrorResponse{
			Code: "not_found", Message: "agent deployment not found",
		}}
	}

	if err := kc.Client.Delete(ctx, sandbox, client.PropagationPolicy(metav1.DeletePropagationForeground)); err != nil {
		return sandboxDeploymentDeleteError(err, name, namespace)
	}
	kc.Logger.Info("deleted agent deployment Sandbox", "name", name, "namespace", namespace)
	return nil
}

func (kc *TokenKubernetesClient) sandboxDeploymentSummary(
	ctx context.Context,
	namespace string,
	sandbox *unstructured.Unstructured,
) (*models.AgentDeploymentSummary, error) {
	routeURL, routeReady, err := kc.sandboxRouteURL(ctx, namespace, sandbox.GetName())
	if err != nil {
		return nil, err
	}
	state, lastError, err := kc.sandboxDeploymentState(ctx, namespace, sandbox, routeReady)
	if err != nil {
		return nil, err
	}
	return &models.AgentDeploymentSummary{
		Name:           sandbox.GetName(),
		Namespace:      namespace,
		AgentProfileID: sandbox.GetLabels()[agentProfileIDLabel],
		RouteURL:       routeURL,
		State:          state,
		LastError:      lastError,
	}, nil
}

func sandboxDeploymentListError(err error, namespace string) error {
	if apierrors.IsForbidden(err) {
		return &integrations.HTTPError{StatusCode: 403, ErrorResponse: integrations.ErrorResponse{
			Code: "forbidden", Message: "insufficient permissions to list agent deployments in this namespace",
		}}
	}
	if apierrors.IsNotFound(err) || apimeta.IsNoMatchError(err) {
		return &integrations.HTTPError{StatusCode: 503, ErrorResponse: integrations.ErrorResponse{
			Code: "service_unavailable", Message: "Agent Sandbox CRD is not available",
		}}
	}
	return fmt.Errorf("failed to list Sandbox deployments in namespace %s: %w", namespace, err)
}

func sandboxDeploymentGetError(err error, name, namespace string) error {
	if apierrors.IsNotFound(err) {
		return &integrations.HTTPError{StatusCode: 404, ErrorResponse: integrations.ErrorResponse{
			Code: "not_found", Message: "agent deployment not found",
		}}
	}
	if apierrors.IsForbidden(err) {
		return &integrations.HTTPError{StatusCode: 403, ErrorResponse: integrations.ErrorResponse{
			Code: "forbidden", Message: "insufficient permissions to access agent deployment in this namespace",
		}}
	}
	if apimeta.IsNoMatchError(err) {
		return &integrations.HTTPError{StatusCode: 503, ErrorResponse: integrations.ErrorResponse{
			Code: "sandbox_unavailable", Message: "Agent Sandbox CRD is not available",
		}}
	}
	return fmt.Errorf("failed to read Sandbox deployment %s in namespace %s: %w", name, namespace, err)
}

func sandboxDeploymentDeleteError(err error, name, namespace string) error {
	if apierrors.IsNotFound(err) {
		return &integrations.HTTPError{StatusCode: 404, ErrorResponse: integrations.ErrorResponse{
			Code: "not_found", Message: "agent deployment not found",
		}}
	}
	if apierrors.IsForbidden(err) {
		return &integrations.HTTPError{StatusCode: 403, ErrorResponse: integrations.ErrorResponse{
			Code: "forbidden", Message: "insufficient permissions to delete agent deployment in this namespace",
		}}
	}
	if apimeta.IsNoMatchError(err) {
		return &integrations.HTTPError{StatusCode: 503, ErrorResponse: integrations.ErrorResponse{
			Code: "sandbox_unavailable", Message: "Agent Sandbox CRD is not available",
		}}
	}
	return fmt.Errorf("failed to delete Sandbox deployment %s in namespace %s: %w", name, namespace, err)
}

func (kc *TokenKubernetesClient) sandboxRouteURL(ctx context.Context, namespace, sandboxName string) (string, bool, error) {
	route := sandboxRoute(namespace, sandboxName)
	if err := kc.Client.Get(ctx, client.ObjectKeyFromObject(route), route); err != nil {
		if apierrors.IsNotFound(err) {
			return "", false, nil
		}
		if apierrors.IsForbidden(err) {
			return "", false, &integrations.HTTPError{StatusCode: 403, ErrorResponse: integrations.ErrorResponse{
				Code: "forbidden", Message: "insufficient permissions to access the agent deployment Route",
			}}
		}
		if apimeta.IsNoMatchError(err) {
			return "", false, &integrations.HTTPError{StatusCode: 503, ErrorResponse: integrations.ErrorResponse{
				Code: "route_unavailable", Message: "OpenShift Route API is not available",
			}}
		}
		return "", false, fmt.Errorf("failed to read Route for Sandbox %s: %w", sandboxName, err)
	}
	host, _, err := unstructured.NestedString(route.Object, "spec", "host")
	if err != nil || host == "" {
		return "", false, nil
	}
	return "https://" + host, true, nil
}

func (kc *TokenKubernetesClient) sandboxDeploymentState(
	ctx context.Context,
	namespace string,
	sandbox *unstructured.Unstructured,
	routeReady bool,
) (string, string, error) {
	selectorStr, found, err := unstructured.NestedString(sandbox.Object, "status", "selector")
	if err != nil || !found || selectorStr == "" {
		return agentDeploymentStateCreating, "", nil
	}

	pods := &corev1.PodList{}
	if err := kc.Client.List(ctx, pods, client.InNamespace(namespace), client.MatchingLabels(parseLabelSelectorString(selectorStr))); err != nil {
		if apierrors.IsForbidden(err) {
			return "", "", &integrations.HTTPError{StatusCode: 403, ErrorResponse: integrations.ErrorResponse{
				Code: "forbidden", Message: "insufficient permissions to list Pods for agent deployments in this namespace",
			}}
		}
		if apimeta.IsNoMatchError(err) {
			return "", "", &integrations.HTTPError{StatusCode: 503, ErrorResponse: integrations.ErrorResponse{
				Code: "pods_unavailable", Message: "Kubernetes Pod API is not available",
			}}
		}
		return "", "", fmt.Errorf("failed to list Pods for Sandbox %s: %w", sandbox.GetName(), err)
	}

	ready := false
	lastError := ""
	for i := range pods.Items {
		pod := &pods.Items[i]
		if pod.Status.Phase == corev1.PodFailed || sandboxPodHasStartupFailure(pod) {
			return agentDeploymentStateFailed, sandboxPodLastError(pod), nil
		}
		if sandboxPodReady(pod) {
			ready = true
		} else if lastError == "" {
			lastError = sandboxPodLastError(pod)
		}
	}
	if ready && routeReady {
		return agentDeploymentStateReady, "", nil
	}
	return agentDeploymentStateCreating, lastError, nil
}

func sandboxPodReady(pod *corev1.Pod) bool {
	for _, condition := range pod.Status.Conditions {
		if condition.Type == corev1.PodReady && condition.Status == corev1.ConditionTrue {
			return true
		}
	}
	return false
}

func sandboxPodHasStartupFailure(pod *corev1.Pod) bool {
	for _, status := range append(pod.Status.InitContainerStatuses, pod.Status.ContainerStatuses...) {
		if status.State.Waiting == nil {
			continue
		}
		switch status.State.Waiting.Reason {
		case "CrashLoopBackOff", "CreateContainerConfigError", "ErrImagePull", "ImagePullBackOff":
			return true
		}
	}
	return false
}

func sandboxPodLastError(pod *corev1.Pod) string {
	for _, status := range append(pod.Status.InitContainerStatuses, pod.Status.ContainerStatuses...) {
		if status.State.Waiting != nil && status.State.Waiting.Reason != "" {
			return formatPodError(status.State.Waiting.Reason, status.State.Waiting.Message)
		}
		if status.State.Terminated != nil && status.State.Terminated.Reason != "" {
			return formatPodError(status.State.Terminated.Reason, status.State.Terminated.Message)
		}
	}
	for _, condition := range pod.Status.Conditions {
		if condition.Type == corev1.PodReady && condition.Status != corev1.ConditionTrue && condition.Reason != "" {
			return formatPodError(condition.Reason, condition.Message)
		}
	}
	if pod.Status.Reason != "" {
		return formatPodError(pod.Status.Reason, pod.Status.Message)
	}
	return ""
}

func formatPodError(reason, message string) string {
	if message == "" {
		return reason
	}
	return reason + ": " + message
}
