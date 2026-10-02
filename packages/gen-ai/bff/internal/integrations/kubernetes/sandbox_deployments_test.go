package kubernetes

import (
	"context"
	"errors"
	"log/slog"
	"testing"
	"time"

	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	apimeta "k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/client/interceptor"
)

func TestListAgentDeployments(t *testing.T) {
	const namespace = "agent-namespace"
	const otherNamespace = "other-namespace"
	const profileOne = "11111111-1111-1111-1111-111111111111"
	const profileTwo = "22222222-2222-2222-2222-222222222222"

	readySandbox := testSandbox(namespace, "ready-agent", map[string]string{
		dashboardLabel: dashboardLabelValue, agentProfileIDLabel: profileOne,
	}, "agents.x-k8s.io/sandbox-name-hash=ready")
	readySandbox.SetCreationTimestamp(metav1.NewTime(time.Date(2026, time.July, 30, 6, 30, 0, 0, time.UTC)))
	readySandbox.SetAnnotations(map[string]string{deploymentDisplayNameAnnotation: "Ready agent"})
	failedSandbox := testSandbox(namespace, "failed-agent", map[string]string{
		dashboardLabel: dashboardLabelValue, agentProfileIDLabel: profileTwo,
	}, "agents.x-k8s.io/sandbox-name-hash=failed")
	failedSandbox.SetCreationTimestamp(metav1.NewTime(time.Date(2026, time.July, 28, 6, 30, 0, 0, time.UTC)))
	legacySandbox := testSandbox(namespace, "legacy-agent", map[string]string{
		dashboardLabel: dashboardLabelValue,
	}, "agents.x-k8s.io/sandbox-name-hash=legacy")
	legacySandbox.SetCreationTimestamp(metav1.NewTime(time.Date(2026, time.July, 29, 6, 30, 0, 0, time.UTC)))
	nonDashboardSandbox := testSandbox(namespace, "not-an-agent", nil, "agents.x-k8s.io/sandbox-name-hash=other")
	otherNamespaceSandbox := testSandbox(otherNamespace, "other-namespace-agent", map[string]string{
		dashboardLabel: dashboardLabelValue, agentProfileIDLabel: profileOne,
	}, "agents.x-k8s.io/sandbox-name-hash=other-namespace")

	objects := []client.Object{
		readySandbox,
		failedSandbox,
		legacySandbox,
		nonDashboardSandbox,
		otherNamespaceSandbox,
		testRoute(namespace, "ready-agent", "ready-agent-agent-namespace.apps.example.com"),
		testPod(namespace, "ready-agent-pod", "ready", corev1.PodRunning, true, ""),
		testPod(namespace, "failed-agent-pod", "failed", corev1.PodPending, false, "ImagePullBackOff"),
		testPod(namespace, "legacy-agent-pod", "legacy", corev1.PodPending, false, ""),
	}

	scheme := runtime.NewScheme()
	require.NoError(t, corev1.AddToScheme(scheme))
	kc := &TokenKubernetesClient{
		Client: fake.NewClientBuilder().WithScheme(scheme).WithObjects(objects...).Build(),
		Logger: slog.Default(),
	}

	response, err := kc.ListAgentDeployments(context.Background(), namespace, "")
	require.NoError(t, err)
	require.Len(t, response.Deployments, 3)
	assert.Equal(t, 3, response.TotalCount)
	assert.Equal(t, []string{"ready-agent", "legacy-agent", "failed-agent"}, deploymentNames(response.Deployments))
	assert.Equal(t, "Ready agent", response.Deployments[0].DisplayName)
	assert.Equal(t, "legacy-agent", response.Deployments[1].DisplayName)
	assert.Equal(t, profileOne, response.Deployments[0].AgentProfileID)
	assert.Equal(t, agentDeploymentStateReady, response.Deployments[0].State)
	assert.Equal(t, "https://ready-agent-agent-namespace.apps.example.com", response.Deployments[0].RouteURL)
	assert.Equal(t, "2026-07-30T06:30:00Z", response.Deployments[0].CreatedAt)
	assert.Equal(t, "", response.Deployments[1].AgentProfileID)
	assert.Equal(t, agentDeploymentStateCreating, response.Deployments[1].State)
	assert.Equal(t, agentDeploymentStateFailed, response.Deployments[2].State)
	assert.Equal(t, "ImagePullBackOff", response.Deployments[2].LastError)

	filtered, err := kc.ListAgentDeployments(context.Background(), namespace, profileTwo)
	require.NoError(t, err)
	require.Len(t, filtered.Deployments, 1)
	assert.Equal(t, "failed-agent", filtered.Deployments[0].Name)

	deployment, err := kc.GetAgentDeployment(context.Background(), namespace, "failed-agent")
	require.NoError(t, err)
	assert.Equal(t, profileTwo, deployment.AgentProfileID)
	assert.Equal(t, agentDeploymentStateFailed, deployment.State)
	assert.Equal(t, "ImagePullBackOff", deployment.LastError)

	_, err = kc.GetAgentDeployment(context.Background(), namespace, "not-an-agent")
	require.Error(t, err)
	assert.Equal(t, 404, err.(*integrations.HTTPError).StatusCode)

	_, err = kc.GetAgentDeployment(context.Background(), namespace, "does-not-exist")
	require.Error(t, err)
	assert.Equal(t, 404, err.(*integrations.HTTPError).StatusCode)

	empty, err := kc.ListAgentDeployments(context.Background(), "empty-namespace", "")
	require.NoError(t, err)
	assert.Empty(t, empty.Deployments)
	assert.Equal(t, 0, empty.TotalCount)
}

func TestDeleteAgentDeployment(t *testing.T) {
	const namespace = "agent-namespace"
	const profileID = "11111111-1111-1111-1111-111111111111"

	deletable := testSandbox(namespace, "deletable-agent", map[string]string{
		dashboardLabel: dashboardLabelValue, agentProfileIDLabel: profileID,
	}, "agents.x-k8s.io/sandbox-name-hash=deletable")
	notAnAgent := testSandbox(namespace, "not-an-agent", nil, "agents.x-k8s.io/sandbox-name-hash=other")

	scheme := runtime.NewScheme()
	require.NoError(t, corev1.AddToScheme(scheme))
	kc := &TokenKubernetesClient{
		Client: fake.NewClientBuilder().WithScheme(scheme).WithObjects(deletable, notAnAgent).Build(),
		Logger: slog.Default(),
	}

	require.NoError(t, kc.DeleteAgentDeployment(context.Background(), namespace, deletable.GetName()))
	_, err := kc.GetAgentDeployment(context.Background(), namespace, deletable.GetName())
	require.Error(t, err)
	assert.Equal(t, 404, err.(*integrations.HTTPError).StatusCode)

	err = kc.DeleteAgentDeployment(context.Background(), namespace, notAnAgent.GetName())
	require.Error(t, err)
	assert.Equal(t, 404, err.(*integrations.HTTPError).StatusCode)

	err = kc.DeleteAgentDeployment(context.Background(), namespace, "does-not-exist")
	require.Error(t, err)
	assert.Equal(t, 404, err.(*integrations.HTTPError).StatusCode)
}

func TestSandboxDeploymentResourceAccessErrors(t *testing.T) {
	const namespace = "agent-namespace"

	t.Run("returns forbidden when the Route cannot be read", func(t *testing.T) {
		kc := sandboxDeploymentClientWithInterceptor(t, interceptor.Funcs{
			Get: func(_ context.Context, _ client.WithWatch, key client.ObjectKey, obj client.Object, _ ...client.GetOption) error {
				if _, isRoute := obj.(*unstructured.Unstructured); isRoute && key.Name == "test-agent" {
					return apierrors.NewForbidden(schema.GroupResource{Group: "route.openshift.io", Resource: "routes"}, key.Name, errors.New("forbidden"))
				}
				return apierrors.NewNotFound(schema.GroupResource{Resource: "unknown"}, key.Name)
			},
		})

		_, _, err := kc.sandboxRouteURL(context.Background(), namespace, "test-agent")
		require.Error(t, err)
		assert.Equal(t, 403, err.(*integrations.HTTPError).StatusCode)
	})

	t.Run("returns unavailable when the Route API is absent", func(t *testing.T) {
		kc := sandboxDeploymentClientWithInterceptor(t, interceptor.Funcs{
			Get: func(_ context.Context, _ client.WithWatch, _ client.ObjectKey, _ client.Object, _ ...client.GetOption) error {
				return &apimeta.NoKindMatchError{GroupKind: schema.GroupKind{Group: "route.openshift.io", Kind: "Route"}, SearchedVersions: []string{"v1"}}
			},
		})

		_, _, err := kc.sandboxRouteURL(context.Background(), namespace, "test-agent")
		require.Error(t, err)
		assert.Equal(t, 503, err.(*integrations.HTTPError).StatusCode)
	})

	t.Run("returns forbidden when Pods cannot be listed", func(t *testing.T) {
		kc := sandboxDeploymentClientWithInterceptor(t, interceptor.Funcs{
			List: func(_ context.Context, _ client.WithWatch, list client.ObjectList, _ ...client.ListOption) error {
				if _, isPodList := list.(*corev1.PodList); isPodList {
					return apierrors.NewForbidden(schema.GroupResource{Resource: "pods"}, "", errors.New("forbidden"))
				}
				return nil
			},
		})
		sandbox := testSandbox(namespace, "test-agent", map[string]string{dashboardLabel: dashboardLabelValue}, "sandbox=test-agent")

		_, _, err := kc.sandboxDeploymentState(context.Background(), namespace, sandbox, true)
		require.Error(t, err)
		assert.Equal(t, 403, err.(*integrations.HTTPError).StatusCode)
	})
}

func sandboxDeploymentClientWithInterceptor(t *testing.T, funcs interceptor.Funcs) *TokenKubernetesClient {
	t.Helper()
	scheme := runtime.NewScheme()
	require.NoError(t, corev1.AddToScheme(scheme))
	return &TokenKubernetesClient{
		Client: fake.NewClientBuilder().WithScheme(scheme).WithInterceptorFuncs(funcs).Build(),
		Logger: slog.Default(),
	}
}

const dashboardLabelValue = "true"

func testSandbox(namespace, name string, labels map[string]string, selector string) *unstructured.Unstructured {
	sandbox := &unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": sandboxGroup + "/" + sandboxVersion,
		"kind":       sandboxKind,
		"metadata": map[string]interface{}{
			"name": name, "namespace": namespace,
		},
		"status": map[string]interface{}{"selector": selector},
	}}
	sandbox.SetGroupVersionKind(schema.GroupVersionKind{Group: sandboxGroup, Version: sandboxVersion, Kind: sandboxKind})
	sandbox.SetLabels(labels)
	return sandbox
}

func testRoute(namespace, name, host string) *unstructured.Unstructured {
	route := &unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": "route.openshift.io/v1",
		"kind":       "Route",
		"metadata":   map[string]interface{}{"name": name, "namespace": namespace},
		"spec":       map[string]interface{}{"host": host},
	}}
	route.SetGroupVersionKind(schema.GroupVersionKind{Group: "route.openshift.io", Version: "v1", Kind: "Route"})
	return route
}

func testPod(namespace, name, selectorValue string, phase corev1.PodPhase, ready bool, waitingReason string) *corev1.Pod {
	pod := &corev1.Pod{ObjectMeta: metav1.ObjectMeta{
		Name: name, Namespace: namespace, Labels: map[string]string{"agents.x-k8s.io/sandbox-name-hash": selectorValue},
	}, Status: corev1.PodStatus{Phase: phase}}
	if ready {
		pod.Status.Conditions = []corev1.PodCondition{{Type: corev1.PodReady, Status: corev1.ConditionTrue}}
	}
	if waitingReason != "" {
		pod.Status.ContainerStatuses = []corev1.ContainerStatus{{State: corev1.ContainerState{
			Waiting: &corev1.ContainerStateWaiting{Reason: waitingReason},
		}}}
	}
	return pod
}

func deploymentNames(deployments []models.AgentDeploymentSummary) []string {
	names := make([]string, len(deployments))
	for i := range deployments {
		names[i] = deployments[i].Name
	}
	return names
}
