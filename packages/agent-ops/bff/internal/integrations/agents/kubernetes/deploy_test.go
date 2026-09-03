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
	assert.Equal(t, agents.ManagedByValue, sandbox.GetLabels()[agents.LabelManagedBy])

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
				agents.LabelManagedBy: agents.ManagedByValue,
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

func TestDeployAgent_AlreadyExistsReuses(t *testing.T) {
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
				agents.LabelManagedBy: "some-other-tool",
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
				agents.LabelManagedBy: agents.ManagedByValue,
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
				agents.LabelManagedBy: "some-other-tool",
			},
		},
	}}
	_, err := dynamicClient.Resource(sandboxGVR).Namespace(ns).Create(context.Background(), unmanaged, metav1.CreateOptions{})
	require.NoError(t, err)

	err = client.DeleteAgent(context.Background(), ns, "foreign-agent")
	require.Error(t, err)
	assert.ErrorIs(t, err, agents.ErrNotFound)

	_, err = dynamicClient.Resource(sandboxGVR).Namespace(ns).Get(context.Background(), "foreign-agent", metav1.GetOptions{})
	require.NoError(t, err, "unmanaged Sandbox must not be deleted")
}

func TestDeployAgent_FullParams(t *testing.T) {
	ns := "test-ns"
	client, dynamicClient := newDeployTestClient(t,
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

	sandbox, err := dynamicClient.Resource(sandboxGVR).Namespace(ns).Get(context.Background(), "full-agent", metav1.GetOptions{})
	require.NoError(t, err)

	labels := sandbox.GetLabels()
	assert.Equal(t, agents.ManagedByValue, labels[agents.LabelManagedBy])
	assert.Equal(t, agents.AgentTypeAgent, labels[agents.LabelAgentType])
	assert.Equal(t, agents.WorkloadTypeSandbox, labels[agents.LabelWorkloadType])
	assert.Equal(t, "full-agent", labels["app.kubernetes.io/name"])
	assert.Equal(t, "agent", labels["app.kubernetes.io/component"])
	assert.Empty(t, labels["openshell.ai/managed-by"], "must not contain openshell labels")

	annotations := sandbox.GetAnnotations()
	assert.Equal(t, "Full test agent", annotations[agents.AnnotationDescription])
	assert.Equal(t, "a2a", annotations[agents.AnnotationProtocol])
	assert.Equal(t, "langgraph", annotations[agents.AnnotationFramework])
	assert.Equal(t, "quay.io/example/full-agent:v2.0.0", annotations[agents.AnnotationImageRef])

	spec := sandbox.Object["spec"].(map[string]any)
	podSpec := spec["podTemplate"].(map[string]any)["spec"].(map[string]any)
	container := podSpec["containers"].([]any)[0].(map[string]any)
	assert.Equal(t, "quay.io/example/full-agent:v2.0.0", container["image"])

	ports := container["ports"].([]any)
	require.Len(t, ports, 1)
	assert.Equal(t, int64(9000), ports[0].(map[string]any)["containerPort"])

	envVars := container["env"].([]any)
	envMap := make(map[string]string)
	for _, ev := range envVars {
		e := ev.(map[string]any)
		envMap[e["name"].(string)] = e["value"].(string)
	}
	assert.Equal(t, "debug", envMap["LOG_LEVEL"])
	assert.Contains(t, envMap, "AGENT_ENDPOINT")
	assert.Contains(t, envMap, "HOST")
	assert.Contains(t, envMap, "PORT")

	secrets := podSpec["imagePullSecrets"].([]any)
	require.Len(t, secrets, 1)
	assert.Equal(t, "my-pull-secret", secrets[0].(map[string]any)["name"])
}

func seedSandboxWithMode(t *testing.T, dynamicClient *fakedynamic.FakeDynamicClient, ns, name, mode string) {
	t.Helper()
	obj := &unstructured.Unstructured{Object: map[string]any{
		"apiVersion": sandboxGVR.Group + "/" + sandboxGVR.Version,
		"kind":       "Sandbox",
		"metadata": map[string]any{
			"name":      name,
			"namespace": ns,
			"labels": map[string]any{
				agents.LabelManagedBy: agents.ManagedByValue,
			},
		},
		"spec": map[string]any{
			"operatingMode": mode,
		},
		"status": map[string]any{
			"selector": "app=" + name,
		},
	}}
	_, err := dynamicClient.Resource(sandboxGVR).Namespace(ns).Create(context.Background(), obj, metav1.CreateOptions{})
	require.NoError(t, err)
}

func seedUnmanagedSandboxWithMode(t *testing.T, dynamicClient *fakedynamic.FakeDynamicClient, ns, name, mode string) {
	t.Helper()
	obj := &unstructured.Unstructured{Object: map[string]any{
		"apiVersion": sandboxGVR.Group + "/" + sandboxGVR.Version,
		"kind":       "Sandbox",
		"metadata": map[string]any{
			"name":      name,
			"namespace": ns,
			"labels": map[string]any{
				agents.LabelManagedBy: "some-other-tool",
			},
		},
		"spec": map[string]any{
			"operatingMode": mode,
		},
		"status": map[string]any{
			"selector": "app=" + name,
		},
	}}
	_, err := dynamicClient.Resource(sandboxGVR).Namespace(ns).Create(context.Background(), obj, metav1.CreateOptions{})
	require.NoError(t, err)
}

func TestStopAgent_Unmanaged(t *testing.T) {
	ns := "test-ns"
	client, dynamicClient := newDeployTestClient(t)
	seedUnmanagedSandboxWithMode(t, dynamicClient, ns, "foreign-agent", "Running")

	err := client.StopAgent(context.Background(), ns, "foreign-agent")
	require.Error(t, err)
	assert.ErrorIs(t, err, agents.ErrNotFound)

	cr, err := dynamicClient.Resource(sandboxGVR).Namespace(ns).Get(context.Background(), "foreign-agent", metav1.GetOptions{})
	require.NoError(t, err)
	mode, _, _ := unstructured.NestedString(cr.Object, "spec", "operatingMode")
	assert.Equal(t, "Running", mode, "unmanaged Sandbox operatingMode must be unchanged")
}

func TestStartAgent_Unmanaged(t *testing.T) {
	ns := "test-ns"
	client, dynamicClient := newDeployTestClient(t)
	seedUnmanagedSandboxWithMode(t, dynamicClient, ns, "foreign-agent", "Suspended")

	err := client.StartAgent(context.Background(), ns, "foreign-agent")
	require.Error(t, err)
	assert.ErrorIs(t, err, agents.ErrNotFound)

	cr, err := dynamicClient.Resource(sandboxGVR).Namespace(ns).Get(context.Background(), "foreign-agent", metav1.GetOptions{})
	require.NoError(t, err)
	mode, _, _ := unstructured.NestedString(cr.Object, "spec", "operatingMode")
	assert.Equal(t, "Suspended", mode, "unmanaged Sandbox operatingMode must be unchanged")
}

func TestRestartAgent_Unmanaged(t *testing.T) {
	ns := "test-ns"
	client, dynamicClient := newDeployTestClient(t)
	seedUnmanagedSandboxWithMode(t, dynamicClient, ns, "foreign-agent", "Running")

	err := client.RestartAgent(context.Background(), ns, "foreign-agent")
	require.Error(t, err)
	assert.ErrorIs(t, err, agents.ErrNotFound)
}

func TestStopAgent_Success(t *testing.T) {
	ns := "test-ns"
	client, dynamicClient := newDeployTestClient(t)
	seedSandboxWithMode(t, dynamicClient, ns, "my-agent", "Running")

	err := client.StopAgent(context.Background(), ns, "my-agent")
	require.NoError(t, err)

	cr, err := dynamicClient.Resource(sandboxGVR).Namespace(ns).Get(context.Background(), "my-agent", metav1.GetOptions{})
	require.NoError(t, err)
	mode, _, _ := unstructured.NestedString(cr.Object, "spec", "operatingMode")
	assert.Equal(t, "Suspended", mode)
}

func TestStopAgent_NotFound(t *testing.T) {
	client, _ := newDeployTestClient(t)
	err := client.StopAgent(context.Background(), "test-ns", "missing")
	require.Error(t, err)
	assert.ErrorIs(t, err, agents.ErrNotFound)
}

func TestStopAgent_AlreadyStopped(t *testing.T) {
	ns := "test-ns"
	client, dynamicClient := newDeployTestClient(t)
	seedSandboxWithMode(t, dynamicClient, ns, "my-agent", "Suspended")

	err := client.StopAgent(context.Background(), ns, "my-agent")
	require.Error(t, err)
	assert.ErrorIs(t, err, agents.ErrConflict)
}

func TestStartAgent_Success(t *testing.T) {
	ns := "test-ns"
	client, dynamicClient := newDeployTestClient(t)
	seedSandboxWithMode(t, dynamicClient, ns, "my-agent", "Suspended")

	err := client.StartAgent(context.Background(), ns, "my-agent")
	require.NoError(t, err)

	cr, err := dynamicClient.Resource(sandboxGVR).Namespace(ns).Get(context.Background(), "my-agent", metav1.GetOptions{})
	require.NoError(t, err)
	mode, _, _ := unstructured.NestedString(cr.Object, "spec", "operatingMode")
	assert.Equal(t, "Running", mode)
}

func TestStartAgent_NotFound(t *testing.T) {
	client, _ := newDeployTestClient(t)
	err := client.StartAgent(context.Background(), "test-ns", "missing")
	require.Error(t, err)
	assert.ErrorIs(t, err, agents.ErrNotFound)
}

func TestStartAgent_AlreadyRunning(t *testing.T) {
	ns := "test-ns"
	client, dynamicClient := newDeployTestClient(t)
	seedSandboxWithMode(t, dynamicClient, ns, "my-agent", "Running")

	err := client.StartAgent(context.Background(), ns, "my-agent")
	require.Error(t, err)
	assert.ErrorIs(t, err, agents.ErrConflict)
}

func TestStartAgent_AlreadyRunningEmptyMode(t *testing.T) {
	ns := "test-ns"
	client, dynamicClient := newDeployTestClient(t)
	seedSandboxWithMode(t, dynamicClient, ns, "my-agent", "")

	err := client.StartAgent(context.Background(), ns, "my-agent")
	require.Error(t, err)
	assert.ErrorIs(t, err, agents.ErrConflict)
}

func TestRestartAgent_Success(t *testing.T) {
	ns := "test-ns"
	client, dynamicClient := newDeployTestClient(t)
	seedSandboxWithMode(t, dynamicClient, ns, "my-agent", "Running")

	err := client.RestartAgent(context.Background(), ns, "my-agent")
	require.NoError(t, err)
}

func TestRestartAgent_NotFound(t *testing.T) {
	client, _ := newDeployTestClient(t)
	err := client.RestartAgent(context.Background(), "test-ns", "missing")
	require.Error(t, err)
	assert.ErrorIs(t, err, agents.ErrNotFound)
}
