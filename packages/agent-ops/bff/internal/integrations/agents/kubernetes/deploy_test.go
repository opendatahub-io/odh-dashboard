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
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
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


func (c *deployTestK8sClient) CanGetAgentInNamespace(context.Context, *k8s.RequestIdentity, string, string) (bool, error) {
	return true, nil
}

func (c *deployTestK8sClient) CanPatchAgentInNamespace(context.Context, *k8s.RequestIdentity, string, string) (bool, error) {
	return true, nil
}

func (c *deployTestK8sClient) CanDeleteAgentInNamespace(context.Context, *k8s.RequestIdentity, string, string) (bool, error) {
	return true, nil
}

func (c *deployTestK8sClient) CanDeployAgentInNamespace(context.Context, *k8s.RequestIdentity, string) (bool, error) {
	return true, nil
}

func (c *deployTestK8sClient) CanAccessAgentCardEnrichment(context.Context, *k8s.RequestIdentity, string) (k8s.AgentCardEnrichmentAccess, error) {
	return k8s.AgentCardEnrichmentAccess{}, nil
}

func (c *deployTestK8sClient) KubernetesClientset() kubernetes.Interface {
	return c.clientset
}

func (c *deployTestK8sClient) DynamicClient() (dynamic.Interface, error) {
	return c.dynamicClient, nil
}

func newDeployTestClient(t *testing.T, objects ...runtime.Object) (*Client, *fakedynamic.FakeDynamicClient) {
	t.Helper()

	clientset := fake.NewClientset(objects...)
	scheme := runtime.NewScheme()
	gvrToListKind := map[schema.GroupVersionResource]string{
		sandboxGVR:        "SandboxList",
		openshiftRouteGVR: "RouteList",
	}
	dynamicClient := fakedynamic.NewSimpleDynamicClientWithCustomListKinds(scheme, gvrToListKind)

	client := &Client{
		k8sClient: &deployTestK8sClient{
			clientset:     clientset,
			dynamicClient: dynamicClient,
		},
		identity: &k8s.RequestIdentity{UserID: "test-user"},
		logger:   slog.New(slog.NewTextHandler(io.Discard, nil)),
	}
	return client, dynamicClient
}

func TestDeployAgent_CreatesSandboxCR(t *testing.T) {
	ns := "test-ns"
	client, dynamicClient := newDeployTestClient(t,
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

	sandbox, err := dynamicClient.Resource(sandboxGVR).Namespace(ns).Get(context.Background(), "my-agent", metav1.GetOptions{})
	require.NoError(t, err)
	assert.Equal(t, "Sandbox", sandbox.GetKind())
	assert.Equal(t, managedByValue, sandbox.GetLabels()[labelManagedBy])

	spec := sandbox.Object["spec"].(map[string]any)
	assert.Equal(t, "Running", spec["operatingMode"])
	assert.Equal(t, true, spec["service"])
}

func TestDeployAgent_NilParams(t *testing.T) {
	client, _ := newDeployTestClient(t)

	result, err := client.DeployAgent(context.Background(), nil)

	require.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "must not be nil")
}

func TestDeployAgent_AlreadyExistsManaged(t *testing.T) {
	ns := "test-ns"
	client, dynamicClient := newDeployTestClient(t,
		&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: ns}},
	)

	existing := &unstructured.Unstructured{Object: map[string]any{
		"apiVersion": sandboxGVR.Group + "/" + sandboxGVR.Version,
		"kind":       "Sandbox",
		"metadata": map[string]any{
			"name":      "my-agent",
			"namespace": ns,
			"labels": map[string]any{
				labelManagedBy: managedByValue,
			},
		},
	}}
	_, err := dynamicClient.Resource(sandboxGVR).Namespace(ns).Create(context.Background(), existing, metav1.CreateOptions{})
	require.NoError(t, err)

	result, err := client.DeployAgent(context.Background(), &agents.DeployAgentParams{
		Name:           "my-agent",
		Namespace:      ns,
		ContainerImage: "quay.io/example/agent",
	})

	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "my-agent", result.Name)
}

func TestDeployAgent_AlreadyExistsUnmanaged(t *testing.T) {
	ns := "test-ns"
	client, dynamicClient := newDeployTestClient(t,
		&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: ns}},
	)

	existing := &unstructured.Unstructured{Object: map[string]any{
		"apiVersion": sandboxGVR.Group + "/" + sandboxGVR.Version,
		"kind":       "Sandbox",
		"metadata": map[string]any{
			"name":      "my-agent",
			"namespace": ns,
			"labels": map[string]any{
				labelManagedBy: "some-other-tool",
			},
		},
	}}
	_, err := dynamicClient.Resource(sandboxGVR).Namespace(ns).Create(context.Background(), existing, metav1.CreateOptions{})
	require.NoError(t, err)

	_, err = client.DeployAgent(context.Background(), &agents.DeployAgentParams{
		Name:           "my-agent",
		Namespace:      ns,
		ContainerImage: "quay.io/example/agent",
	})

	require.Error(t, err)
	assert.ErrorIs(t, err, agents.ErrAlreadyExists)
}

func TestDeleteAgent_Success(t *testing.T) {
	ns := "test-ns"
	client, dynamicClient := newDeployTestClient(t)

	managed := &unstructured.Unstructured{Object: map[string]any{
		"apiVersion": sandboxGVR.Group + "/" + sandboxGVR.Version,
		"kind":       "Sandbox",
		"metadata": map[string]any{
			"name":      "my-agent",
			"namespace": ns,
			"labels": map[string]any{
				labelManagedBy: managedByValue,
			},
		},
	}}
	_, err := dynamicClient.Resource(sandboxGVR).Namespace(ns).Create(context.Background(), managed, metav1.CreateOptions{})
	require.NoError(t, err)

	err = client.DeleteAgent(context.Background(), ns, "my-agent")
	require.NoError(t, err)

	_, err = dynamicClient.Resource(sandboxGVR).Namespace(ns).Get(context.Background(), "my-agent", metav1.GetOptions{})
	assert.True(t, err != nil, "Sandbox should be gone after delete")
}

func TestDeleteAgent_NotFound(t *testing.T) {
	client, _ := newDeployTestClient(t)

	err := client.DeleteAgent(context.Background(), "test-ns", "missing-agent")
	require.Error(t, err)
	assert.ErrorIs(t, err, agents.ErrNotFound)
}

func TestDeleteAgent_Unmanaged(t *testing.T) {
	ns := "test-ns"
	client, dynamicClient := newDeployTestClient(t)

	unmanaged := &unstructured.Unstructured{Object: map[string]any{
		"apiVersion": sandboxGVR.Group + "/" + sandboxGVR.Version,
		"kind":       "Sandbox",
		"metadata": map[string]any{
			"name":      "foreign-agent",
			"namespace": ns,
			"labels": map[string]any{
				labelManagedBy: "some-other-tool",
			},
		},
	}}
	_, err := dynamicClient.Resource(sandboxGVR).Namespace(ns).Create(context.Background(), unmanaged, metav1.CreateOptions{})
	require.NoError(t, err)

	err = client.DeleteAgent(context.Background(), ns, "foreign-agent")
	require.Error(t, err)
	assert.ErrorIs(t, err, agents.ErrForbidden)

	_, err = dynamicClient.Resource(sandboxGVR).Namespace(ns).Get(context.Background(), "foreign-agent", metav1.GetOptions{})
	assert.NoError(t, err, "Unmanaged sandbox should not be deleted")
}

func TestDeployAgent_FullParams(t *testing.T) {
	ns := "test-ns"
	client, _ := newDeployTestClient(t,
		&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: ns}},
	)

	result, err := client.DeployAgent(context.Background(), &agents.DeployAgentParams{
		Name:            "full-agent",
		Namespace:       ns,
		ContainerImage:  "quay.io/example/full-agent",
		ImageTag:        "v2.0.0",
		ImagePullSecret: "my-pull-secret",
		Protocol:        "a2a",
		Framework:       "langgraph",
		Description:     "Full test agent",
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
