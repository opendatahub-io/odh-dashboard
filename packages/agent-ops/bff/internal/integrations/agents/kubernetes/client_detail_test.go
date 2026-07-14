package kubernetes

import (
	"context"
	"errors"
	"testing"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	fakedynamic "k8s.io/client-go/dynamic/fake"
	ktesting "k8s.io/client-go/testing"
)

func TestGetAgentDetailReturnsWithoutServiceOrAgentCard(t *testing.T) {
	namespace := "agent-ops-demo"
	agentName := "sample-support-agent"

	sandbox := testSandboxCR(namespace, agentName)
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
	assert.Nil(t, detail.Service)
	assert.Nil(t, detail.AgentCard)
}

func TestGetAgentDetailDoesNotEnrichAgentCard(t *testing.T) {
	namespace := "agent-ops-demo"
	agentName := "sample-support-agent"

	sandbox := testSandboxCR(namespace, agentName)
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

	dynamicClient := fakedynamic.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), defaultGVRListKinds())
	seedSandboxCR(t, dynamicClient, sandbox)
	_, err := dynamicClient.Resource(openshiftRouteGVR).Namespace(namespace).Create(context.Background(), route, metav1.CreateOptions{})
	require.NoError(t, err)

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

	detail, err := client.GetAgent(context.Background(), namespace, agentName)
	require.NoError(t, err)
	assert.Nil(t, detail.AgentCard)
}

func TestGetAgentDetailDoesNotFallBackToDeployment(t *testing.T) {
	namespace := "agent-ops-demo"
	agentName := "legacy-deployment"

	dynamicClient := fakedynamic.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), defaultGVRListKinds())
	client := newTestAgentClient(t,
		&appsv1.Deployment{
			ObjectMeta: metav1.ObjectMeta{
				Name:      agentName,
				Namespace: namespace,
				Labels: map[string]string{
					agents.LabelAgentType: agents.AgentTypeAgent,
				},
			},
		},
	)
	client.k8sClient = &dynamicTestK8sClient{
		permissiveK8sClient: *client.k8sClient.(*permissiveK8sClient),
		dynamic:             dynamicClient,
	}

	_, err := client.GetAgent(context.Background(), namespace, agentName)
	require.ErrorIs(t, err, agents.ErrNotFound)
}

func TestGetAgentDetailReturnsUnlabeledSandbox(t *testing.T) {
	namespace := "agent-ops-demo"
	agentName := "unlabeled-sandbox"

	sandbox := testSandboxCR(namespace, agentName, func(obj *unstructured.Unstructured) {
		obj.SetLabels(map[string]string{})
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
}

func TestGetAgentDetailReturnsForbiddenWhenSandboxGetDenied(t *testing.T) {
	namespace := "agent-ops-demo"
	agentName := "sample-support-agent"

	dynamicClient := fakedynamic.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), defaultGVRListKinds())
	dynamicClient.PrependReactor("get", "sandboxes", func(action ktesting.Action) (bool, runtime.Object, error) {
		return true, nil, apierrors.NewForbidden(
			schema.GroupResource{Group: sandboxGVR.Group, Resource: sandboxGVR.Resource},
			agentName,
			errors.New("forbidden"),
		)
	})

	client := newTestAgentClient(t)
	client.k8sClient = &dynamicTestK8sClient{
		permissiveK8sClient: *client.k8sClient.(*permissiveK8sClient),
		dynamic:             dynamicClient,
	}

	_, err := client.GetAgent(context.Background(), namespace, agentName)
	require.ErrorIs(t, err, agents.ErrForbidden)
}

func TestGetAgentDetailReturnsNotFoundOnNoMatchError(t *testing.T) {
	namespace := "agent-ops-demo"
	agentName := "sample-support-agent"

	dynamicClient := fakedynamic.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), defaultGVRListKinds())
	dynamicClient.PrependReactor("get", "sandboxes", func(action ktesting.Action) (bool, runtime.Object, error) {
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

	_, err := client.GetAgent(context.Background(), namespace, agentName)
	require.ErrorIs(t, err, agents.ErrNotFound)
}
