package kubernetes

import (
	"fmt"
	"strings"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

const (
	labelManagedBy = "app.kubernetes.io/managed-by"
	labelAppName   = "app.kubernetes.io/name"
	labelComponent = "app.kubernetes.io/component"

	managedByValue = "odh-agent-ops"
	componentValue = "agent"
	containerName  = "agent"

	defaultPort    int32 = 8000
	defaultSvcPort int32 = 8080
)

func buildSandboxCR(params *agents.DeployAgentParams) *unstructured.Unstructured {
	image := params.ContainerImage
	if params.ImageTag != "" {
		image = fmt.Sprintf("%s:%s", image, params.ImageTag)
	}

	containerPort := defaultPort
	if len(params.ServicePorts) > 0 && params.ServicePorts[0].TargetPort > 0 {
		containerPort = params.ServicePorts[0].TargetPort
	}

	envVars := buildEnvVarsForSandbox(params)

	container := map[string]any{
		"name":  containerName,
		"image": image,
		"ports": []any{
			map[string]any{
				"containerPort": int64(containerPort),
				"name":          "http",
			},
		},
		"env": envVars,
	}

	labels := map[string]any{
		agents.LabelAgentType:    agents.AgentTypeAgent,
		agents.LabelWorkloadType: agents.WorkloadTypeSandbox,
		labelManagedBy:           managedByValue,
		labelAppName:             params.Name,
		labelComponent:           componentValue,
	}

	annotations := map[string]any{
		agents.AnnotationDescription: descriptionOrDefault(params),
	}
	if params.Protocol != "" {
		annotations[agents.AnnotationProtocol] = params.Protocol
	}
	if params.Framework != "" {
		annotations[agents.AnnotationFramework] = params.Framework
	}
	annotations[agents.AnnotationImageRef] = image

	podTemplateSpec := map[string]any{
		"containers": []any{container},
	}

	if params.ImagePullSecret != "" {
		podTemplateSpec["imagePullSecrets"] = []any{
			map[string]any{"name": params.ImagePullSecret},
		}
	}

	return &unstructured.Unstructured{
		Object: map[string]any{
			"apiVersion": sandboxGVR.Group + "/" + sandboxGVR.Version,
			"kind":       "Sandbox",
			"metadata": map[string]any{
				"name":        params.Name,
				"namespace":   params.Namespace,
				"labels":      labels,
				"annotations": annotations,
			},
			"spec": map[string]any{
				"operatingMode": "Running",
				"service":       true,
				"podTemplate": map[string]any{
					"spec": podTemplateSpec,
				},
			},
		},
	}
}

func descriptionOrDefault(params *agents.DeployAgentParams) string {
	if params.Description != "" {
		return params.Description
	}
	return fmt.Sprintf("Agent '%s' deployed from dashboard.", params.Name)
}

func buildEnvVarsForSandbox(params *agents.DeployAgentParams) []any {
	svcPort := defaultSvcPort
	if len(params.ServicePorts) > 0 && params.ServicePorts[0].Port > 0 {
		svcPort = params.ServicePorts[0].Port
	}
	containerPort := defaultPort
	if len(params.ServicePorts) > 0 && params.ServicePorts[0].TargetPort > 0 {
		containerPort = params.ServicePorts[0].TargetPort
	}

	defaultKeys := []string{"AGENT_ENDPOINT", "HOST", "PORT", "UV_CACHE_DIR"}
	defaultValues := map[string]string{
		"AGENT_ENDPOINT": agentEndpointURL(params.Name, params.Namespace, svcPort),
		"PORT":           fmt.Sprintf("%d", containerPort),
		"HOST":           "0.0.0.0",
		"UV_CACHE_DIR":   "/app/.cache/uv",
	}

	seen := make(map[string]bool)
	for _, ev := range params.EnvVars {
		seen[strings.TrimSpace(ev.Name)] = true
	}

	var result []any
	for _, name := range defaultKeys {
		if !seen[name] {
			result = append(result, map[string]any{"name": name, "value": defaultValues[name]})
		}
	}
	for _, ev := range params.EnvVars {
		result = append(result, map[string]any{"name": ev.Name, "value": ev.Value})
	}
	return result
}

func agentEndpointURL(name, namespace string, port int32) string {
	return fmt.Sprintf("http://%s.%s.svc.cluster.local:%d/", name, namespace, port)
}
