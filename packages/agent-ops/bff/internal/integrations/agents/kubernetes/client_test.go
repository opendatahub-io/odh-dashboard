package kubernetes

import (
	"context"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	k8s "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/mapper"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	fakedynamic "k8s.io/client-go/dynamic/fake"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/kubernetes/fake"
)

type permissiveK8sClient struct {
	k8s.SharedClientLogic
}

func (c *permissiveK8sClient) GetNamespaces(ctx context.Context, _ *k8s.RequestIdentity) ([]corev1.Namespace, error) {
	list, err := c.Client.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	return list.Items, nil
}

func (c *permissiveK8sClient) IsClusterAdmin(_ *k8s.RequestIdentity) (bool, error) {
	return true, nil
}

func (c *permissiveK8sClient) GetUser(_ *k8s.RequestIdentity) (string, error) {
	return "test-user", nil
}

func (c *permissiveK8sClient) CanListServicesInNamespace(context.Context, *k8s.RequestIdentity, string) (bool, error) {
	return true, nil
}

func (c *permissiveK8sClient) CanListAgentsInNamespace(context.Context, *k8s.RequestIdentity, string) (bool, error) {
	return true, nil
}

func (c *permissiveK8sClient) CanGetAgentInNamespace(context.Context, *k8s.RequestIdentity, string, string) (bool, error) {
	return true, nil
}

func (c *permissiveK8sClient) CanDeployAgentInNamespace(context.Context, *k8s.RequestIdentity, string, bool) (bool, error) {
	return true, nil
}

func (c *permissiveK8sClient) CanAccessAgentCardEnrichment(context.Context, *k8s.RequestIdentity, string, string) (k8s.AgentCardEnrichmentAccess, error) {
	return k8s.AgentCardEnrichmentAccess{
		AgentRuntime: true,
		Routes:       true,
		MCPServers:   true,
	}, nil
}

func (c *permissiveK8sClient) DynamicClient() (dynamic.Interface, error) {
	gvrToListKind := map[schema.GroupVersionResource]string{
		agentRuntimeGVR:              "AgentRuntimeList",
		openshiftRouteGVR:            "RouteList",
		mcpServerRegistrationGVRs[0]: "MCPServerRegistrationList",
		mcpServerRegistrationGVRs[1]: "MCPServerRegistrationList",
	}
	return fakedynamic.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), gvrToListKind), nil
}

func newTestAgentClient(t *testing.T, objects ...runtime.Object) *Client {
	t.Helper()

	clientset := fake.NewClientset(objects...)
	return &Client{
		k8sClient: &permissiveK8sClient{
			SharedClientLogic: k8s.SharedClientLogic{
				Client: clientset,
				Logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
			},
		},
		identity: &k8s.RequestIdentity{UserID: "test-user"},
		logger:   slog.New(slog.NewTextHandler(io.Discard, nil)),
	}
}

func TestClient_ListAgentsFromLabeledDeployment(t *testing.T) {
	createdAt := time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC)
	conditionTime := time.Date(2026, 5, 12, 16, 0, 3, 214610000, time.UTC)
	namespace := "agent-ops-demo"
	agentName := "sample-support-agent"

	client := newTestAgentClient(t,
		&corev1.Namespace{
			ObjectMeta: metav1.ObjectMeta{
				Name:   namespace,
				Labels: map[string]string{agents.LabelKagentiEnabled: agents.LabelKagentiEnabledValue},
			},
		},
		&appsv1.Deployment{
			ObjectMeta: metav1.ObjectMeta{
				Name:      agentName,
				Namespace: namespace,
				Labels: map[string]string{
					agents.LabelAgentType: agents.AgentTypeAgent,
				},
				CreationTimestamp: metav1.NewTime(createdAt),
			},
			Status: appsv1.DeploymentStatus{
				Replicas:          1,
				ReadyReplicas:     1,
				AvailableReplicas: 1,
				Conditions: []appsv1.DeploymentCondition{
					{
						Type:               appsv1.DeploymentAvailable,
						Status:             corev1.ConditionTrue,
						LastTransitionTime: metav1.NewTime(conditionTime),
					},
				},
			},
		},
		&corev1.Service{
			ObjectMeta: metav1.ObjectMeta{
				Name:      agentName,
				Namespace: namespace,
			},
			Spec: corev1.ServiceSpec{
				Ports: []corev1.ServicePort{{Name: "http", Port: 8080}},
			},
		},
	)

	list, err := client.ListAgents(context.Background(), namespace)
	require.NoError(t, err)
	require.Len(t, list.Items, 1)
	assert.Equal(t, agentName, list.Items[0].Name)
	assert.Equal(t, "Ready", list.Items[0].Status)
	assert.Contains(t, list.Items[0].EndpointURL, agentName)
	assert.Equal(t, conditionTime.UTC().Truncate(time.Second), mapper.ParseTime(list.Items[0].LastSyncAt).UTC().Truncate(time.Second))
}

func TestClient_GetAgentFromDeployment(t *testing.T) {
	namespace := "agent-ops-demo"
	agentName := "sample-support-agent"

	client := newTestAgentClient(t,
		&appsv1.Deployment{
			ObjectMeta: metav1.ObjectMeta{
				Name:      agentName,
				Namespace: namespace,
				Labels: map[string]string{
					agents.LabelAgentType: agents.AgentTypeAgent,
				},
				Annotations: map[string]string{
					agents.AnnotationDescription: "Support agent",
				},
			},
			Status: appsv1.DeploymentStatus{
				Replicas:      1,
				ReadyReplicas: 1,
			},
		},
	)

	detail, err := client.GetAgent(context.Background(), namespace, agentName)
	require.NoError(t, err)
	require.NotNil(t, detail)
	assert.Equal(t, agentName, detail.Metadata.Name)
	assert.Equal(t, "Support agent", detail.Metadata.Annotations[agents.AnnotationDescription])
}

func TestClient_GetAgentNotFound(t *testing.T) {
	client := newTestAgentClient(t)

	_, err := client.GetAgent(context.Background(), "missing-ns", "missing-agent")
	require.ErrorIs(t, err, agents.ErrNotFound)
}

func TestClient_ListNamespacesSkipsWithoutKagentiLabel(t *testing.T) {
	client := newTestAgentClient(t,
		&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "plain-ns"}},
		&corev1.Namespace{
			ObjectMeta: metav1.ObjectMeta{
				Name:   "enabled-ns",
				Labels: map[string]string{agents.LabelKagentiEnabled: agents.LabelKagentiEnabledValue},
			},
		},
	)

	namespaces, err := client.ListNamespaces(context.Background(), true)
	require.NoError(t, err)
	assert.Equal(t, []string{"enabled-ns"}, namespaces)
}

func TestClient_ListNamespacesReturnsErrorOnFailure(t *testing.T) {
	client := &Client{
		k8sClient: &failingNamespacesK8sClient{},
		identity:  &k8s.RequestIdentity{UserID: "test-user"},
		logger:    slog.New(slog.NewTextHandler(io.Discard, nil)),
	}

	_, err := client.ListNamespaces(context.Background(), true)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "failed to list namespaces for agent discovery")
}

type failingNamespacesK8sClient struct{}

func (c *failingNamespacesK8sClient) GetNamespaces(context.Context, *k8s.RequestIdentity) ([]corev1.Namespace, error) {
	return nil, assert.AnError
}

func (c *failingNamespacesK8sClient) IsClusterAdmin(*k8s.RequestIdentity) (bool, error) {
	return false, nil
}

func (c *failingNamespacesK8sClient) GetUser(*k8s.RequestIdentity) (string, error) {
	return "test-user", nil
}

func (c *failingNamespacesK8sClient) CanListServicesInNamespace(context.Context, *k8s.RequestIdentity, string) (bool, error) {
	return true, nil
}

func (c *failingNamespacesK8sClient) CanListAgentsInNamespace(context.Context, *k8s.RequestIdentity, string) (bool, error) {
	return true, nil
}

func (c *failingNamespacesK8sClient) CanGetAgentInNamespace(context.Context, *k8s.RequestIdentity, string, string) (bool, error) {
	return true, nil
}

func (c *failingNamespacesK8sClient) CanDeployAgentInNamespace(context.Context, *k8s.RequestIdentity, string, bool) (bool, error) {
	return false, nil
}

func (c *failingNamespacesK8sClient) CanAccessAgentCardEnrichment(context.Context, *k8s.RequestIdentity, string, string) (k8s.AgentCardEnrichmentAccess, error) {
	return k8s.AgentCardEnrichmentAccess{}, nil
}

func (c *failingNamespacesK8sClient) KubernetesClientset() kubernetes.Interface {
	return nil
}

func (c *failingNamespacesK8sClient) DynamicClient() (dynamic.Interface, error) {
	return nil, assert.AnError
}
