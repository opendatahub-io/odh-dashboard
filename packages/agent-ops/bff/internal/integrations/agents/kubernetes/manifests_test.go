package kubernetes

import (
	"testing"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
)

var testOwnerRef = metav1.OwnerReference{
	APIVersion: "agent.kagenti.dev/v1alpha1",
	Kind:       "AgentRuntime",
	Name:       "my-agent",
	UID:        types.UID("test-uid-1234"),
}

func TestBuildServiceAccount(t *testing.T) {
	sa := buildServiceAccount("my-agent", "test-ns")
	require.NotNil(t, sa)
	assert.Equal(t, "my-agent", sa.Name)
	assert.Equal(t, "test-ns", sa.Namespace)
	assert.Equal(t, managedByValue, sa.Labels[labelManagedBy])
	assert.Equal(t, "my-agent", sa.Labels[labelAppName])
}

func TestBuildDeployment(t *testing.T) {
	tests := []struct {
		name            string
		params          *agents.DeployAgentParams
		wantLabels      map[string]string
		wantImage       string
		wantPort        int32
		wantPullSecrets int
	}{
		{
			name: "minimal params",
			params: &agents.DeployAgentParams{
				Name:           "my-agent",
				Namespace:      "test-ns",
				ContainerImage: "quay.io/example/agent",
			},
			wantLabels: map[string]string{
				agents.LabelAgentType:    agents.AgentTypeAgent,
				agents.LabelWorkloadType: agents.WorkloadTypeDeployment,
				labelAppName:             "my-agent",
				labelComponent:           componentValue,
			},
			wantImage:       "quay.io/example/agent",
			wantPort:        defaultPort,
			wantPullSecrets: 0,
		},
		{
			name: "with image tag",
			params: &agents.DeployAgentParams{
				Name:           "my-agent",
				Namespace:      "test-ns",
				ContainerImage: "quay.io/example/agent",
				ImageTag:       "v1.0.0",
			},
			wantImage: "quay.io/example/agent:v1.0.0",
			wantPort:  defaultPort,
		},
		{
			name: "with auth bridge enabled",
			params: &agents.DeployAgentParams{
				Name:              "my-agent",
				Namespace:         "test-ns",
				ContainerImage:    "quay.io/example/agent",
				AuthBridgeEnabled: true,
			},
			wantLabels: map[string]string{
				labelInject: injectEnabled,
			},
			wantPort: defaultPort,
		},
		{
			name: "with protocol and framework labels",
			params: &agents.DeployAgentParams{
				Name:           "my-agent",
				Namespace:      "test-ns",
				ContainerImage: "quay.io/example/agent",
				Protocol:       "a2a",
				Framework:      "langgraph",
			},
			wantLabels: map[string]string{
				agents.LabelProtocolPrefix + "a2a": "",
				labelFramework:                     "langgraph",
			},
			wantPort: defaultPort,
		},
		{
			name: "with custom service ports",
			params: &agents.DeployAgentParams{
				Name:           "my-agent",
				Namespace:      "test-ns",
				ContainerImage: "quay.io/example/agent",
				ServicePorts: []agents.AgentServicePortSpec{
					{Name: "http", Port: 9090, TargetPort: 9000, Protocol: "TCP"},
				},
			},
			wantPort: 9000,
		},
		{
			name: "with image pull secret",
			params: &agents.DeployAgentParams{
				Name:            "my-agent",
				Namespace:       "test-ns",
				ContainerImage:  "quay.io/example/agent",
				ImagePullSecret: "my-registry-secret",
			},
			wantPort:        defaultPort,
			wantPullSecrets: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			deployment := buildDeployment(tt.params, testOwnerRef)
			require.NotNil(t, deployment)

			assert.Equal(t, tt.params.Name, deployment.Name)
			assert.Equal(t, tt.params.Namespace, deployment.Namespace)

			if tt.wantImage != "" {
				require.Len(t, deployment.Spec.Template.Spec.Containers, 1)
				assert.Equal(t, tt.wantImage, deployment.Spec.Template.Spec.Containers[0].Image)
			}

			if tt.wantPort > 0 {
				require.Len(t, deployment.Spec.Template.Spec.Containers, 1)
				require.Len(t, deployment.Spec.Template.Spec.Containers[0].Ports, 1)
				assert.Equal(t, tt.wantPort, deployment.Spec.Template.Spec.Containers[0].Ports[0].ContainerPort)
			}

			for key, val := range tt.wantLabels {
				assert.Equal(t, val, deployment.Labels[key], "label %s", key)
			}

			assert.Len(t, deployment.Spec.Template.Spec.ImagePullSecrets, tt.wantPullSecrets)

			require.Len(t, deployment.OwnerReferences, 1)
			assert.Equal(t, "AgentRuntime", deployment.OwnerReferences[0].Kind)
			assert.Equal(t, testOwnerRef.UID, deployment.OwnerReferences[0].UID)

			container := deployment.Spec.Template.Spec.Containers[0]
			assert.Equal(t, containerName, container.Name)
			require.NotNil(t, container.SecurityContext)
			assert.False(t, *container.SecurityContext.AllowPrivilegeEscalation)
			assert.Contains(t, container.SecurityContext.Capabilities.Drop, corev1.Capability("ALL"))

			require.NotNil(t, deployment.Spec.Template.Spec.SecurityContext)
			assert.True(t, *deployment.Spec.Template.Spec.SecurityContext.RunAsNonRoot)
		})
	}
}

func TestBuildDeploymentEnvVars(t *testing.T) {
	params := &agents.DeployAgentParams{
		Name:           "my-agent",
		Namespace:      "test-ns",
		ContainerImage: "quay.io/example/agent",
		EnvVars: []agents.AgentEnvVar{
			{Name: "API_KEY", Value: "secret"},
			{Name: "LOG_LEVEL", Value: "debug"},
		},
	}

	deployment := buildDeployment(params, testOwnerRef)
	require.NotNil(t, deployment)
	require.Len(t, deployment.Spec.Template.Spec.Containers, 1)

	envVars := deployment.Spec.Template.Spec.Containers[0].Env
	envMap := make(map[string]string)
	for _, ev := range envVars {
		envMap[ev.Name] = ev.Value
	}
	assert.Equal(t, "http://my-agent.test-ns.svc.cluster.local:8080/", envMap["AGENT_ENDPOINT"])
	assert.Equal(t, "8000", envMap["PORT"])
	assert.Equal(t, "0.0.0.0", envMap["HOST"])
	assert.Equal(t, "/app/.cache/uv", envMap["UV_CACHE_DIR"])
	assert.Equal(t, "secret", envMap["API_KEY"])
	assert.Equal(t, "debug", envMap["LOG_LEVEL"])
}

func TestBuildService(t *testing.T) {
	tests := []struct {
		name       string
		params     *agents.DeployAgentParams
		wantPorts  int
		wantPort   int32
		wantTarget int32
	}{
		{
			name: "default ports",
			params: &agents.DeployAgentParams{
				Name:           "my-agent",
				Namespace:      "test-ns",
				ContainerImage: "quay.io/example/agent",
			},
			wantPorts:  1,
			wantPort:   defaultSvcPort,
			wantTarget: defaultPort,
		},
		{
			name: "custom ports",
			params: &agents.DeployAgentParams{
				Name:           "my-agent",
				Namespace:      "test-ns",
				ContainerImage: "quay.io/example/agent",
				ServicePorts: []agents.AgentServicePortSpec{
					{Name: "grpc", Port: 50051, TargetPort: 50051, Protocol: "TCP"},
					{Name: "http", Port: 8080, TargetPort: 8000, Protocol: "TCP"},
				},
			},
			wantPorts: 2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := buildService(tt.params, testOwnerRef)
			require.NotNil(t, svc)

			assert.Equal(t, tt.params.Name, svc.Name)
			assert.Equal(t, tt.params.Namespace, svc.Namespace)
			require.Len(t, svc.OwnerReferences, 1)
			assert.Equal(t, "AgentRuntime", svc.OwnerReferences[0].Kind)
			assert.Equal(t, corev1.ServiceTypeClusterIP, svc.Spec.Type)
			assert.Equal(t, tt.params.Name, svc.Spec.Selector[labelAppName])
			assert.Len(t, svc.Spec.Ports, tt.wantPorts)

			if tt.wantPort > 0 {
				assert.Equal(t, tt.wantPort, svc.Spec.Ports[0].Port)
			}
			if tt.wantTarget > 0 {
				assert.Equal(t, tt.wantTarget, svc.Spec.Ports[0].TargetPort.IntVal)
			}
		})
	}
}

func TestBuildAgentRuntimeCR(t *testing.T) {
	tests := []struct {
		name           string
		params         *agents.DeployAgentParams
		wantAuthBridge bool
		wantMTLS       bool
	}{
		{
			name: "minimal",
			params: &agents.DeployAgentParams{
				Name:           "my-agent",
				Namespace:      "test-ns",
				ContainerImage: "quay.io/example/agent",
			},
		},
		{
			name: "with auth bridge mode",
			params: &agents.DeployAgentParams{
				Name:           "my-agent",
				Namespace:      "test-ns",
				ContainerImage: "quay.io/example/agent",
				AuthBridgeMode: "token",
			},
			wantAuthBridge: true,
		},
		{
			name: "with mTLS mode",
			params: &agents.DeployAgentParams{
				Name:           "my-agent",
				Namespace:      "test-ns",
				ContainerImage: "quay.io/example/agent",
				MTLSMode:       "strict",
			},
			wantMTLS: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			obj := buildAgentRuntimeCR(tt.params)
			require.NotNil(t, obj)

			assert.Equal(t, "AgentRuntime", obj.GetKind())
			assert.Equal(t, agentRuntimeGVR.Group+"/"+agentRuntimeGVR.Version, obj.GetAPIVersion())
			assert.Equal(t, tt.params.Name, obj.GetName())
			assert.Equal(t, tt.params.Namespace, obj.GetNamespace())

			spec, ok := obj.Object["spec"].(map[string]any)
			require.True(t, ok)

			targetRef, ok := spec["targetRef"].(map[string]any)
			require.True(t, ok)
			assert.Equal(t, "Deployment", targetRef["kind"])
			assert.Equal(t, tt.params.Name, targetRef["name"])

			if tt.wantAuthBridge {
				assert.Equal(t, tt.params.AuthBridgeMode, spec["authBridgeMode"])
			} else {
				_, exists := spec["authBridgeMode"]
				assert.False(t, exists)
			}

			if tt.wantMTLS {
				assert.Equal(t, tt.params.MTLSMode, spec["mtlsMode"])
			} else {
				_, exists := spec["mtlsMode"]
				assert.False(t, exists)
			}
		})
	}
}

func TestBuildRoute(t *testing.T) {
	route := buildRoute("my-agent", "test-ns", 8080, testOwnerRef)
	require.NotNil(t, route)

	assert.Equal(t, "Route", route.GetKind())
	assert.Equal(t, "my-agent", route.GetName())
	assert.Equal(t, "test-ns", route.GetNamespace())

	metadata, ok := route.Object["metadata"].(map[string]any)
	require.True(t, ok)
	ownerRefs, ok := metadata["ownerReferences"].([]any)
	require.True(t, ok)
	require.Len(t, ownerRefs, 1)
	ownerRefMap, ok := ownerRefs[0].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, "AgentRuntime", ownerRefMap["kind"])

	spec, ok := route.Object["spec"].(map[string]any)
	require.True(t, ok)

	to, ok := spec["to"].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, "Service", to["kind"])
	assert.Equal(t, "my-agent", to["name"])

	port, ok := spec["port"].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, "8080", port["targetPort"])

	tls, ok := spec["tls"].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, "edge", tls["termination"])
}
