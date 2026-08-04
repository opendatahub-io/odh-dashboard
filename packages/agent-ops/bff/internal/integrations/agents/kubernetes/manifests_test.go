package kubernetes

import (
	"testing"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBuildSandboxCR(t *testing.T) {
	params := &agents.DeployAgentParams{
		Name:           "my-agent",
		Namespace:      "test-ns",
		ContainerImage: "quay.io/example/agent",
		ImageTag:       "v1.0.0",
	}

	obj := buildSandboxCR(params)
	require.NotNil(t, obj)

	assert.Equal(t, "Sandbox", obj.GetKind())
	assert.Equal(t, sandboxGVR.Group+"/"+sandboxGVR.Version, obj.GetAPIVersion())
	assert.Equal(t, "my-agent", obj.GetName())
	assert.Equal(t, "test-ns", obj.GetNamespace())

	labels := obj.GetLabels()
	assert.Equal(t, agents.OpenShellManagedByValue, labels[agents.LabelOpenShellManagedBy])
	assert.Equal(t, agents.AgentTypeAgent, labels[agents.LabelAgentType])
	assert.Equal(t, agents.WorkloadTypeSandbox, labels[agents.LabelWorkloadType])
	assert.Equal(t, managedByValue, labels[labelManagedBy])

	spec := obj.Object["spec"].(map[string]any)
	assert.Equal(t, "Running", spec["operatingMode"])
	assert.Equal(t, true, spec["service"])

	podTemplate := spec["podTemplate"].(map[string]any)
	podSpec := podTemplate["spec"].(map[string]any)

	containers := podSpec["containers"].([]any)
	require.Len(t, containers, 1)
	container := containers[0].(map[string]any)
	assert.Equal(t, "quay.io/example/agent:v1.0.0", container["image"])
}

func TestBuildSandboxCR_EnvVars(t *testing.T) {
	params := &agents.DeployAgentParams{
		Name:           "my-agent",
		Namespace:      "test-ns",
		ContainerImage: "quay.io/example/agent",
		EnvVars: []agents.AgentEnvVar{
			{Name: "API_KEY", Value: "secret"},
		},
	}

	obj := buildSandboxCR(params)
	spec := obj.Object["spec"].(map[string]any)
	podSpec := spec["podTemplate"].(map[string]any)["spec"].(map[string]any)
	container := podSpec["containers"].([]any)[0].(map[string]any)
	envVars := container["env"].([]any)

	envMap := make(map[string]string)
	for _, ev := range envVars {
		e := ev.(map[string]any)
		envMap[e["name"].(string)] = e["value"].(string)
	}
	assert.Equal(t, "secret", envMap["API_KEY"])
	assert.Equal(t, "0.0.0.0", envMap["HOST"])
	assert.Equal(t, "http://my-agent.test-ns.svc.cluster.local:8080/", envMap["AGENT_ENDPOINT"])
}

func TestBuildSandboxCR_Description(t *testing.T) {
	params := &agents.DeployAgentParams{
		Name:           "my-agent",
		Namespace:      "test-ns",
		ContainerImage: "quay.io/example/agent",
		Description:    "Custom description",
	}

	obj := buildSandboxCR(params)
	annotations := obj.GetAnnotations()
	assert.Equal(t, "Custom description", annotations[agents.AnnotationDescription])
}

func TestBuildSandboxCR_ImagePullSecret(t *testing.T) {
	params := &agents.DeployAgentParams{
		Name:            "my-agent",
		Namespace:       "test-ns",
		ContainerImage:  "quay.io/example/agent",
		ImagePullSecret: "my-secret",
	}

	obj := buildSandboxCR(params)
	spec := obj.Object["spec"].(map[string]any)
	podSpec := spec["podTemplate"].(map[string]any)["spec"].(map[string]any)
	secrets := podSpec["imagePullSecrets"].([]any)
	require.Len(t, secrets, 1)
	assert.Equal(t, "my-secret", secrets[0].(map[string]any)["name"])
}
