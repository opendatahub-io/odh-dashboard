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
		sandbox := &sandboxes.Items[i]
		routeURL, routePresent, err := kc.sandboxRouteURL(ctx, namespace, sandbox.GetName())
		if err != nil {
			return nil, err
		}
		state, err := kc.sandboxDeploymentState(ctx, namespace, sandbox, routePresent)
		if err != nil {
			return nil, err
		}
		deployments = append(deployments, models.AgentDeploymentSummary{
			Name:           sandbox.GetName(),
			Namespace:      namespace,
			AgentProfileID: sandbox.GetLabels()[agentProfileIDLabel],
			RouteURL:       routeURL,
			State:          state,
		})
	}

	sort.Slice(deployments, func(i, j int) bool { return deployments[i].Name < deployments[j].Name })
	return &models.AgentDeploymentListResponse{Deployments: deployments, TotalCount: len(deployments)}, nil
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

func (kc *TokenKubernetesClient) sandboxRouteURL(ctx context.Context, namespace, sandboxName string) (string, bool, error) {
	route := sandboxRoute(namespace, sandboxName)
	if err := kc.Client.Get(ctx, client.ObjectKeyFromObject(route), route); err != nil {
		if apierrors.IsNotFound(err) {
			return "", false, nil
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
	routePresent bool,
) (string, error) {
	selectorStr, found, err := unstructured.NestedString(sandbox.Object, "status", "selector")
	if err != nil || !found || selectorStr == "" {
		return agentDeploymentStateCreating, nil
	}

	pods := &corev1.PodList{}
	if err := kc.Client.List(ctx, pods, client.InNamespace(namespace), client.MatchingLabels(parseLabelSelectorString(selectorStr))); err != nil {
		return "", fmt.Errorf("failed to list Pods for Sandbox %s: %w", sandbox.GetName(), err)
	}

	ready := false
	for i := range pods.Items {
		pod := &pods.Items[i]
		if pod.Status.Phase == corev1.PodFailed || sandboxPodHasStartupFailure(pod) {
			return agentDeploymentStateFailed, nil
		}
		if sandboxPodReady(pod) {
			ready = true
		}
	}
	if ready && routePresent {
		return agentDeploymentStateReady, nil
	}
	return agentDeploymentStateCreating, nil
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
