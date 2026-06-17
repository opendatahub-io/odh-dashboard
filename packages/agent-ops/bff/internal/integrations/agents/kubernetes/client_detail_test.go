package kubernetes

import (
	"context"
	"testing"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	fakedynamic "k8s.io/client-go/dynamic/fake"
)

func TestWorkloadLookupError(t *testing.T) {
	assert.ErrorIs(t, workloadLookupError(3, 0, nil), agents.ErrNotFound)
	assert.ErrorIs(t, workloadLookupError(1, 2, nil), agents.ErrForbidden)
	assert.ErrorIs(t, workloadLookupError(0, 1, assert.AnError), assert.AnError)
	assert.ErrorIs(t, workloadLookupError(2, 0, nil), agents.ErrNotFound)
}

func TestGetAgentDetailFallsBackToStatefulSet(t *testing.T) {
	namespace := "agent-ops-demo"
	agentName := "sample-support-agent"

	client := newTestAgentClient(t,
		&appsv1.StatefulSet{
			ObjectMeta: metav1.ObjectMeta{
				Name:      agentName,
				Namespace: namespace,
				Labels: map[string]string{
					agents.LabelAgentType: agents.AgentTypeAgent,
				},
			},
			Status: appsv1.StatefulSetStatus{
				Replicas:      1,
				ReadyReplicas: 1,
			},
		},
	)

	detail, err := client.GetAgent(context.Background(), namespace, agentName)
	require.NoError(t, err)
	require.NotNil(t, detail)
	assert.Equal(t, agentName, detail.Metadata.Name)
	assert.Nil(t, detail.AgentCard)
}

func TestGetAgentDetailReturnsWithoutServiceOrAgentCard(t *testing.T) {
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
	assert.Nil(t, detail.Service)
	assert.Nil(t, detail.AgentCard)
}

func TestGetAgentDetailEnrichesRouteWithoutAgentRuntime(t *testing.T) {
	namespace := "agent-ops-demo"
	agentName := "sample-support-agent"

	route := &unstructured.Unstructured{Object: map[string]any{
		"apiVersion": "route.openshift.io/v1",
		"kind":       "Route",
		"metadata":   map[string]any{"name": "sample-support-agent", "namespace": namespace},
		"spec": map[string]any{
			"host": "sample-support-agent.apps.example.com",
			"to": map[string]any{
				"kind": "Service",
				"name": agentName,
			},
			"tls": map[string]any{"termination": "edge"},
		},
	}}

	gvrToListKind := map[schema.GroupVersionResource]string{
		agentRuntimeGVR:              "AgentRuntimeList",
		openshiftRouteGVR:            "RouteList",
		mcpServerRegistrationGVRs[0]: "MCPServerRegistrationList",
		mcpServerRegistrationGVRs[1]: "MCPServerRegistrationList",
	}
	dynamicClient := fakedynamic.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), gvrToListKind, route)

	client := newTestAgentClient(t,
		&appsv1.Deployment{
			ObjectMeta: metav1.ObjectMeta{
				Name:      agentName,
				Namespace: namespace,
				Labels: map[string]string{
					agents.LabelAgentType: agents.AgentTypeAgent,
				},
			},
			Status: appsv1.DeploymentStatus{
				Replicas:      1,
				ReadyReplicas: 1,
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
	client.k8sClient = &dynamicTestK8sClient{
		permissiveK8sClient: *client.k8sClient.(*permissiveK8sClient),
		dynamic:             dynamicClient,
	}

	detail, err := client.GetAgent(context.Background(), namespace, agentName)
	require.NoError(t, err)
	require.NotNil(t, detail.AgentCard)
	assert.Equal(t, "https://sample-support-agent.apps.example.com/.well-known/agent-card.json", detail.AgentCard.ExternalAgentCardURL)
}

type dynamicTestK8sClient struct {
	permissiveK8sClient
	dynamic dynamic.Interface
}

func (c *dynamicTestK8sClient) DynamicClient() (dynamic.Interface, error) {
	return c.dynamic, nil
}
