package kubernetes

import (
	"context"
	"io"
	"log/slog"
	"testing"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	k8s "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/kubernetes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	fakedynamic "k8s.io/client-go/dynamic/fake"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/kubernetes/fake"
)

type deployTestK8sClient struct {
	clientset     *fake.Clientset
	dynamicClient *fakedynamic.FakeDynamicClient
}

func (c *deployTestK8sClient) GetNamespaces(context.Context, *k8s.RequestIdentity) ([]corev1.Namespace, error) {
	return nil, nil
}

func (c *deployTestK8sClient) IsClusterAdmin(*k8s.RequestIdentity) (bool, error) {
	return true, nil
}

func (c *deployTestK8sClient) GetUser(*k8s.RequestIdentity) (string, error) {
	return "test-user", nil
}

func (c *deployTestK8sClient) CanListServicesInNamespace(context.Context, *k8s.RequestIdentity, string) (bool, error) {
	return true, nil
}

func (c *deployTestK8sClient) CanListAgentsInNamespace(context.Context, *k8s.RequestIdentity, string) (bool, error) {
	return true, nil
}

func (c *deployTestK8sClient) CanGetAgentInNamespace(context.Context, *k8s.RequestIdentity, string, string) (bool, error) {
	return true, nil
}

func (c *deployTestK8sClient) CanDeployAgentInNamespace(context.Context, *k8s.RequestIdentity, string, bool) (bool, error) {
	return true, nil
}

func (c *deployTestK8sClient) CanAccessAgentCardEnrichment(context.Context, *k8s.RequestIdentity, string, string) (k8s.AgentCardEnrichmentAccess, error) {
	return k8s.AgentCardEnrichmentAccess{}, nil
}

func (c *deployTestK8sClient) KubernetesClientset() kubernetes.Interface {
	return c.clientset
}

func (c *deployTestK8sClient) DynamicClient() (dynamic.Interface, error) {
	return c.dynamicClient, nil
}

func newDeployTestClient(t *testing.T, objects ...runtime.Object) *Client {
	t.Helper()

	clientset := fake.NewClientset(objects...)
	scheme := runtime.NewScheme()
	gvrToListKind := map[schema.GroupVersionResource]string{
		agentRuntimeGVR:   "AgentRuntimeList",
		openshiftRouteGVR: "RouteList",
	}
	dynamicClient := fakedynamic.NewSimpleDynamicClientWithCustomListKinds(scheme, gvrToListKind)

	return &Client{
		k8sClient: &deployTestK8sClient{
			clientset:     clientset,
			dynamicClient: dynamicClient,
		},
		identity: &k8s.RequestIdentity{UserID: "test-user"},
		logger:   slog.New(slog.NewTextHandler(io.Discard, nil)),
	}
}

func TestDeployAgent_Success(t *testing.T) {
	ns := "test-ns"
	client := newDeployTestClient(t,
		&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: ns}},
	)

	result, err := client.DeployAgent(context.Background(), &agents.DeployAgentParams{
		Name:           "my-agent",
		Namespace:      ns,
		ContainerImage: "quay.io/example/agent",
		ImageTag:       "latest",
	})

	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "my-agent", result.Name)
	assert.Equal(t, ns, result.Namespace)
}

func TestDeployAgent_WithRoute(t *testing.T) {
	ns := "test-ns"
	client := newDeployTestClient(t,
		&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: ns}},
	)

	result, err := client.DeployAgent(context.Background(), &agents.DeployAgentParams{
		Name:           "my-agent",
		Namespace:      ns,
		ContainerImage: "quay.io/example/agent",
		CreateRoute:    true,
	})

	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "my-agent", result.Name)
}

func TestDeployAgent_NilParams(t *testing.T) {
	client := newDeployTestClient(t)

	result, err := client.DeployAgent(context.Background(), nil)

	require.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "must not be nil")
}

func TestDeployAgent_ServiceAccountAlreadyExists(t *testing.T) {
	ns := "test-ns"
	client := newDeployTestClient(t,
		&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: ns}},
		&corev1.ServiceAccount{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "my-agent",
				Namespace: ns,
				Labels: map[string]string{
					"app.kubernetes.io/managed-by": "odh-dashboard",
				},
			},
		},
	)

	result, err := client.DeployAgent(context.Background(), &agents.DeployAgentParams{
		Name:           "my-agent",
		Namespace:      ns,
		ContainerImage: "quay.io/example/agent",
	})

	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "my-agent", result.Name)
}

func TestDeployAgent_ServiceAccountUnmanaged(t *testing.T) {
	ns := "test-ns"
	client := newDeployTestClient(t,
		&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: ns}},
		&corev1.ServiceAccount{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "my-agent",
				Namespace: ns,
			},
		},
	)

	_, err := client.DeployAgent(context.Background(), &agents.DeployAgentParams{
		Name:           "my-agent",
		Namespace:      ns,
		ContainerImage: "quay.io/example/agent",
	})

	require.Error(t, err)
	assert.Contains(t, err.Error(), "not managed by odh-dashboard")
}

func TestDeployAgent_FullParams(t *testing.T) {
	ns := "test-ns"
	client := newDeployTestClient(t,
		&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: ns}},
	)

	result, err := client.DeployAgent(context.Background(), &agents.DeployAgentParams{
		Name:              "full-agent",
		Namespace:         ns,
		ContainerImage:    "quay.io/example/full-agent",
		ImageTag:          "v2.0.0",
		ImagePullSecret:   "my-pull-secret",
		Protocol:          "a2a",
		Framework:         "langgraph",
		AuthBridgeEnabled: true,
		AuthBridgeMode:    "proxy-sidecar",
		MTLSMode:          "strict",
		CreateRoute:       true,
		EnvVars: []agents.AgentEnvVar{
			{Name: "LOG_LEVEL", Value: "debug"},
		},
		ServicePorts: []agents.AgentServicePortSpec{
			{Name: "http", Port: 9090, TargetPort: 9000, Protocol: "TCP"},
		},
	})

	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "full-agent", result.Name)
	assert.Equal(t, ns, result.Namespace)
}
