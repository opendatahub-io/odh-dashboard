package kubernetes

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	k8s "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/mapper"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	fakedynamic "k8s.io/client-go/dynamic/fake"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/kubernetes/fake"
	ktesting "k8s.io/client-go/testing"
)

type permissiveK8sClient struct {
	k8s.SharedClientLogic
	dynamicClient dynamic.Interface
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


func (c *permissiveK8sClient) CanGetAgentInNamespace(context.Context, *k8s.RequestIdentity, string, string) (bool, error) {
	return true, nil
}

func (c *permissiveK8sClient) CanPatchAgentInNamespace(context.Context, *k8s.RequestIdentity, string, string) (bool, error) {
	return true, nil
}

func (c *permissiveK8sClient) CanDeleteAgentInNamespace(context.Context, *k8s.RequestIdentity, string, string) (bool, error) {
	return true, nil
}

func (c *permissiveK8sClient) CanDeployAgentInNamespace(context.Context, *k8s.RequestIdentity, string) (bool, error) {
	return true, nil
}

func (c *permissiveK8sClient) CanAccessAgentCardEnrichment(context.Context, *k8s.RequestIdentity, string) (k8s.AgentCardEnrichmentAccess, error) {
	return k8s.AgentCardEnrichmentAccess{
		Routes:     true,
		MCPServers: true,
	}, nil
}

func defaultGVRListKinds() map[schema.GroupVersionResource]string {
	return map[schema.GroupVersionResource]string{
		sandboxGVR:                     "SandboxList",
		openshiftRouteGVR:              "RouteList",
		mcpServerRegistrationGVR:       "MCPServerRegistrationList",
		legacyMCPServerRegistrationGVR: "MCPServerRegistrationList",
	}
}

func (c *permissiveK8sClient) DynamicClient() (dynamic.Interface, error) {
	if c.dynamicClient == nil {
		c.dynamicClient = fakedynamic.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), defaultGVRListKinds())
	}
	return c.dynamicClient, nil
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

func testSandboxCR(namespace, name string, extra ...func(*unstructured.Unstructured)) *unstructured.Unstructured {
	obj := &unstructured.Unstructured{}
	obj.SetGroupVersionKind(schema.GroupVersionKind{
		Group:   sandboxGVR.Group,
		Version: sandboxGVR.Version,
		Kind:    "Sandbox",
	})
	obj.SetName(name)
	obj.SetNamespace(namespace)
	obj.SetLabels(map[string]string{
		agents.LabelOpenShellManagedBy: agents.OpenShellManagedByValue,
		agents.LabelWorkloadType:       agents.WorkloadTypeSandbox,
	})
	obj.Object["status"] = map[string]any{
		"phase": "Ready",
	}
	for _, fn := range extra {
		fn(obj)
	}
	return obj
}

func seedSandboxCR(t *testing.T, dynamicClient dynamic.Interface, sandbox *unstructured.Unstructured) {
	t.Helper()
	_, err := dynamicClient.Resource(sandboxGVR).
		Namespace(sandbox.GetNamespace()).
		Create(context.Background(), sandbox, metav1.CreateOptions{})
	require.NoError(t, err)
}

func TestClient_ListAgentsFromSandboxCR(t *testing.T) {
	createdAt := time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC)
	conditionTime := time.Date(2026, 5, 12, 16, 0, 3, 214610000, time.UTC)
	namespace := "agent-ops-demo"
	agentName := "sample-support-agent"

	sandbox := testSandboxCR(namespace, agentName, func(obj *unstructured.Unstructured) {
		obj.SetCreationTimestamp(metav1.NewTime(createdAt))
		obj.Object["status"] = map[string]any{
			"phase": "Ready",
			"conditions": []any{
				map[string]any{
					"type":               "Ready",
					"status":             "True",
					"lastTransitionTime": conditionTime.Format(time.RFC3339),
				},
			},
		}
	})

	dynamicClient := fakedynamic.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), defaultGVRListKinds())
	seedSandboxCR(t, dynamicClient, sandbox)

	client := newTestAgentClient(t,
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
	client.k8sClient = &dynamicTestK8sClient{
		permissiveK8sClient: *client.k8sClient.(*permissiveK8sClient),
		dynamic:             dynamicClient,
	}

	list, err := client.ListAgents(context.Background(), namespace)
	require.NoError(t, err)
	require.Len(t, list.Items, 1)
	assert.Equal(t, agentName, list.Items[0].Name)
	assert.Equal(t, "ready", list.Items[0].Status)
	assert.Equal(t, agents.WorkloadTypeSandbox, list.Items[0].WorkloadType)
	assert.Contains(t, list.Items[0].EndpointURL, agentName)
	assert.Equal(t, conditionTime.UTC().Truncate(time.Second), mapper.ParseTime(list.Items[0].LastSyncAt).UTC().Truncate(time.Second))
}

func TestClient_ListAgentsFromConditionsOnlySandboxCR(t *testing.T) {
	namespace := "dan"
	agentName := "weatherservice"

	sandbox := testSandboxCR(namespace, agentName, func(obj *unstructured.Unstructured) {
		obj.Object["status"] = map[string]any{
			"conditions": []any{
				map[string]any{
					"type":    sandboxConditionReady,
					"status":  "True",
					"reason":  sandboxReasonDependenciesReady,
					"message": "Pod is Ready; Service Exists",
				},
			},
			"serviceFQDN": "weatherservice.dan.svc.cluster.local",
		}
	})

	dynamicClient := fakedynamic.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), defaultGVRListKinds())
	seedSandboxCR(t, dynamicClient, sandbox)

	client := newTestAgentClient(t)
	client.k8sClient = &dynamicTestK8sClient{
		permissiveK8sClient: *client.k8sClient.(*permissiveK8sClient),
		dynamic:             dynamicClient,
	}

	list, err := client.ListAgents(context.Background(), namespace)
	require.NoError(t, err)
	require.Len(t, list.Items, 1)
	assert.Equal(t, agentName, list.Items[0].Name)
	assert.Equal(t, "ready", list.Items[0].Status)
}

func testOpenShellSandboxCR(namespace, name string, extra ...func(*unstructured.Unstructured)) *unstructured.Unstructured {
	obj := &unstructured.Unstructured{}
	obj.SetGroupVersionKind(schema.GroupVersionKind{
		Group:   sandboxGVR.Group,
		Version: sandboxGVR.Version,
		Kind:    "Sandbox",
	})
	obj.SetName(name)
	obj.SetNamespace(namespace)
	obj.SetLabels(map[string]string{
		agents.LabelOpenShellManagedBy: agents.OpenShellManagedByValue,
		agents.LabelOpenShellSandboxID: "sandbox-uuid-123",
	})
	obj.Object["status"] = map[string]any{
		"phase": "Ready",
	}
	for _, fn := range extra {
		fn(obj)
	}
	return obj
}

func TestClient_ListAgentsFromOpenShellSandboxCR(t *testing.T) {
	namespace := "openshell-ns"
	agentName := "openshell-agent"

	sandbox := testOpenShellSandboxCR(namespace, agentName)
	dynamicClient := fakedynamic.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), defaultGVRListKinds())
	seedSandboxCR(t, dynamicClient, sandbox)

	client := newTestAgentClient(t)
	client.k8sClient = &dynamicTestK8sClient{
		permissiveK8sClient: *client.k8sClient.(*permissiveK8sClient),
		dynamic:             dynamicClient,
	}

	list, err := client.ListAgents(context.Background(), namespace)
	require.NoError(t, err)
	require.Len(t, list.Items, 1)
	assert.Equal(t, agentName, list.Items[0].Name)
	assert.Equal(t, agents.AgentTypeAgent, list.Items[0].ResourceType)
	assert.Equal(t, "ready", list.Items[0].Status)
}

func TestClient_ListAgentsSkipsSandboxesWithoutOpenShellLabel(t *testing.T) {
	namespace := "shared-ns"
	agentName := "agent-type-only"

	sandbox := testSandboxCR(namespace, agentName, func(obj *unstructured.Unstructured) {
		obj.SetLabels(map[string]string{
			agents.LabelAgentType:    agents.AgentTypeAgent,
			agents.LabelWorkloadType: agents.WorkloadTypeSandbox,
		})
	})

	dynamicClient := fakedynamic.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), defaultGVRListKinds())
	seedSandboxCR(t, dynamicClient, sandbox)

	client := newTestAgentClient(t)
	client.k8sClient = &dynamicTestK8sClient{
		permissiveK8sClient: *client.k8sClient.(*permissiveK8sClient),
		dynamic:             dynamicClient,
	}

	list, err := client.ListAgents(context.Background(), namespace)
	require.NoError(t, err)
	assert.Empty(t, list.Items)
}

func TestClient_GetAgentFromOpenShellSandboxCR(t *testing.T) {
	namespace := "openshell-ns"
	agentName := "openshell-agent"

	sandbox := testOpenShellSandboxCR(namespace, agentName)
	dynamicClient := fakedynamic.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), defaultGVRListKinds())
	seedSandboxCR(t, dynamicClient, sandbox)

	client := newTestAgentClient(t)
	client.k8sClient = &dynamicTestK8sClient{
		permissiveK8sClient: *client.k8sClient.(*permissiveK8sClient),
		dynamic:             dynamicClient,
	}

	detail, err := client.GetAgent(context.Background(), namespace, agentName)
	require.NoError(t, err)
	require.NotNil(t, detail)
	assert.Equal(t, agentName, detail.Metadata.Name)
	assert.Equal(t, agents.OpenShellManagedByValue, detail.Metadata.Labels[agents.LabelOpenShellManagedBy])
	assert.Equal(t, "", detail.Metadata.Labels[agents.LabelAgentType])

	result := mapper.AgentDetailToRuntimeDetail(detail)
	require.NotNil(t, result)
	assert.Equal(t, agents.AgentTypeAgent, result.Runtime.Type)
}

func TestAgentLabelSelectors(t *testing.T) {
	selectors := agentLabelSelectors()
	require.Len(t, selectors, 1)
	assert.Equal(t, fmt.Sprintf("%s=%s", agents.LabelOpenShellManagedBy, agents.OpenShellManagedByValue), selectors[0])
}

func TestClient_GetAgentFromSandboxCR(t *testing.T) {
	namespace := "agent-ops-demo"
	agentName := "sample-support-agent"

	sandbox := testSandboxCR(namespace, agentName, func(obj *unstructured.Unstructured) {
		obj.SetAnnotations(map[string]string{
			agents.AnnotationDisplayName: "Support Agent",
			agents.AnnotationDescription: "Support agent",
		})
	})

	dynamicClient := fakedynamic.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), defaultGVRListKinds())
	seedSandboxCR(t, dynamicClient, sandbox)
	client := newTestAgentClient(t)
	client.k8sClient = &dynamicTestK8sClient{
		permissiveK8sClient: *client.k8sClient.(*permissiveK8sClient),
		dynamic:             dynamicClient,
	}

	detail, err := client.GetAgent(context.Background(), namespace, agentName)
	require.NoError(t, err)
	require.NotNil(t, detail)
	assert.Equal(t, agentName, detail.Metadata.Name)
	assert.Equal(t, "Support agent", detail.Metadata.Annotations[agents.AnnotationDescription])
	assert.Equal(t, agents.WorkloadTypeSandbox, detail.WorkloadType)
}

func TestClient_GetAgentNotFound(t *testing.T) {
	dynamicClient := fakedynamic.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), defaultGVRListKinds())
	client := newTestAgentClient(t)
	client.k8sClient = &dynamicTestK8sClient{
		permissiveK8sClient: *client.k8sClient.(*permissiveK8sClient),
		dynamic:             dynamicClient,
	}

	_, err := client.GetAgent(context.Background(), "missing-ns", "missing-agent")
	require.ErrorIs(t, err, agents.ErrNotFound)
}

func TestClient_ListAgentsEmptyWhenNoSandboxes(t *testing.T) {
	dynamicClient := fakedynamic.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), defaultGVRListKinds())
	client := newTestAgentClient(t)
	client.k8sClient = &dynamicTestK8sClient{
		permissiveK8sClient: *client.k8sClient.(*permissiveK8sClient),
		dynamic:             dynamicClient,
	}

	list, err := client.ListAgents(context.Background(), "empty-ns")
	require.NoError(t, err)
	assert.Empty(t, list.Items)
}

func TestClient_ListAgentsEmptyWhenCRDAbsent(t *testing.T) {
	dynamicClient := fakedynamic.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), defaultGVRListKinds())
	dynamicClient.PrependReactor("list", "sandboxes", func(action ktesting.Action) (bool, runtime.Object, error) {
		return true, nil, &apierrors.StatusError{
			ErrStatus: metav1.Status{
				Reason: metav1.StatusReasonNotFound,
				Code:   404,
			},
		}
	})

	client := newTestAgentClient(t)
	client.k8sClient = &dynamicTestK8sClient{
		permissiveK8sClient: *client.k8sClient.(*permissiveK8sClient),
		dynamic:             dynamicClient,
	}

	list, err := client.ListAgents(context.Background(), "empty-ns")
	require.NoError(t, err)
	assert.Empty(t, list.Items)
}

func TestClient_ListAgentsReturnsForbiddenWhenSelectorForbidden(t *testing.T) {
	namespace := "agent-ops-demo"
	dynamicClient := fakedynamic.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), defaultGVRListKinds())
	dynamicClient.PrependReactor("list", "sandboxes", func(action ktesting.Action) (bool, runtime.Object, error) {
		return true, nil, apierrors.NewForbidden(
			schema.GroupResource{Group: sandboxGVR.Group, Resource: sandboxGVR.Resource},
			"",
			errors.New("forbidden"),
		)
	})

	client := newTestAgentClient(t)
	client.k8sClient = &dynamicTestK8sClient{
		permissiveK8sClient: *client.k8sClient.(*permissiveK8sClient),
		dynamic:             dynamicClient,
	}

	_, err := client.ListAgents(context.Background(), namespace)
	require.Error(t, err)
	assert.True(t, errors.Is(err, agents.ErrForbidden))
}

func TestClient_ListAgentsEmptyWhenSelectorNoMatch(t *testing.T) {
	namespace := "agent-ops-demo"
	dynamicClient := fakedynamic.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), defaultGVRListKinds())
	dynamicClient.PrependReactor("list", "sandboxes", func(action ktesting.Action) (bool, runtime.Object, error) {
		return true, nil, &meta.NoResourceMatchError{
			PartialResource: schema.GroupVersionResource{
				Group:    sandboxGVR.Group,
				Version:  sandboxGVR.Version,
				Resource: sandboxGVR.Resource,
			},
		}
	})

	client := newTestAgentClient(t)
	client.k8sClient = &dynamicTestK8sClient{
		permissiveK8sClient: *client.k8sClient.(*permissiveK8sClient),
		dynamic:             dynamicClient,
	}

	list, err := client.ListAgents(context.Background(), namespace)
	require.NoError(t, err)
	assert.Empty(t, list.Items)
}

func TestClient_ListAgentsReturnsErrorWhenSelectorTimesOut(t *testing.T) {
	namespace := "agent-ops-demo"
	dynamicClient := fakedynamic.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), defaultGVRListKinds())
	dynamicClient.PrependReactor("list", "sandboxes", func(action ktesting.Action) (bool, runtime.Object, error) {
		return true, nil, apierrors.NewServerTimeout(
			schema.GroupResource{Group: sandboxGVR.Group, Resource: sandboxGVR.Resource},
			"list",
			0,
		)
	})

	client := newTestAgentClient(t)
	client.k8sClient = &dynamicTestK8sClient{
		permissiveK8sClient: *client.k8sClient.(*permissiveK8sClient),
		dynamic:             dynamicClient,
	}

	_, err := client.ListAgents(context.Background(), namespace)
	require.Error(t, err)
	assert.False(t, errors.Is(err, agents.ErrForbidden))
}

func TestClient_ListNamespacesIncludesAllAccessibleNamespaces(t *testing.T) {
	client := newTestAgentClient(t,
		&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "plain-ns"}},
		&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "other-ns"}},
	)

	namespaces, err := client.ListNamespaces(context.Background(), true)
	require.NoError(t, err)
	assert.ElementsMatch(t, []string{"plain-ns", "other-ns"}, namespaces)
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


func (c *failingNamespacesK8sClient) CanGetAgentInNamespace(context.Context, *k8s.RequestIdentity, string, string) (bool, error) {
	return true, nil
}

func (c *failingNamespacesK8sClient) CanPatchAgentInNamespace(context.Context, *k8s.RequestIdentity, string, string) (bool, error) {
	return true, nil
}

func (c *failingNamespacesK8sClient) CanDeleteAgentInNamespace(context.Context, *k8s.RequestIdentity, string, string) (bool, error) {
	return true, nil
}

func (c *failingNamespacesK8sClient) CanDeployAgentInNamespace(context.Context, *k8s.RequestIdentity, string) (bool, error) {
	return false, nil
}

func (c *failingNamespacesK8sClient) CanAccessAgentCardEnrichment(context.Context, *k8s.RequestIdentity, string) (k8s.AgentCardEnrichmentAccess, error) {
	return k8s.AgentCardEnrichmentAccess{}, nil
}

func (c *failingNamespacesK8sClient) KubernetesClientset() kubernetes.Interface {
	return nil
}

func (c *failingNamespacesK8sClient) DynamicClient() (dynamic.Interface, error) {
	return nil, assert.AnError
}

type dynamicTestK8sClient struct {
	permissiveK8sClient
	dynamic dynamic.Interface
}

func (c *dynamicTestK8sClient) DynamicClient() (dynamic.Interface, error) {
	return c.dynamic, nil
}
