package kubernetes

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	fakedynamic "k8s.io/client-go/dynamic/fake"
)

func TestMCPRegistrationLabelPrefersToolPrefix(t *testing.T) {
	obj := &unstructured.Unstructured{Object: map[string]any{
		"metadata": map[string]any{
			"name": "weather-tool-servers",
		},
		"spec": map[string]any{
			"toolPrefix": "weather_",
		},
	}}
	assert.Equal(t, "weather_", mcpRegistrationLabel(obj))
}

func TestMCPRegistrationLabelFallsBackToName(t *testing.T) {
	obj := &unstructured.Unstructured{Object: map[string]any{
		"metadata": map[string]any{
			"name": "slack-tool-servers",
		},
	}}
	assert.Equal(t, "slack-tool-servers", mcpRegistrationLabel(obj))
}

func TestListMCPToolConnectionsReturnsKuadrantRegistrations(t *testing.T) {
	namespace := "agent-ops-demo"
	weather := &unstructured.Unstructured{Object: map[string]any{
		"apiVersion": "mcp.kuadrant.io/v1alpha1",
		"kind":       "MCPServerRegistration",
		"metadata":   map[string]any{"name": "weather-tool-servers", "namespace": namespace},
		"spec":       map[string]any{"toolPrefix": "weather_"},
	}}
	slack := &unstructured.Unstructured{Object: map[string]any{
		"apiVersion": "mcp.kuadrant.io/v1alpha1",
		"kind":       "MCPServerRegistration",
		"metadata":   map[string]any{"name": "slack-tool-servers", "namespace": namespace},
	}}

	gvrToListKind := map[schema.GroupVersionResource]string{
		mcpServerRegistrationGVR:       "MCPServerRegistrationList",
		legacyMCPServerRegistrationGVR: "MCPServerRegistrationList",
	}
	dynamicClient := fakedynamic.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), gvrToListKind, weather, slack)

	connections := listMCPToolConnections(context.Background(), dynamicClient, nil, namespace)
	assert.Equal(t, []string{"slack-tool-servers", "weather_"}, connections)
}
