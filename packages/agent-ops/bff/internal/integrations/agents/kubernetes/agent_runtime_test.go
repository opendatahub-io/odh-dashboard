package kubernetes

import (
	"context"
	"testing"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	fakedynamic "k8s.io/client-go/dynamic/fake"
)

func TestParseAgentRuntimeCard(t *testing.T) {
	obj := &unstructured.Unstructured{Object: map[string]any{
		"status": map[string]any{
			"linkedSkills": []any{"summarizer"},
			"card": map[string]any{
				"name":              "Weather Assistant",
				"description":       "Provides weather information",
				"version":           "1.0.0",
				"protocol":          "a2a",
				"transportSecurity": "http",
				"lastCardFetchTime": "2026-05-12T16:00:03.214610Z",
				"provider": map[string]any{
					"organization": "Example Org",
					"url":          "https://example.com",
				},
				"capabilities": map[string]any{
					"streaming": true,
					"extensions": []any{
						map[string]any{
							"uri":         "https://example.com/ext/state-history",
							"description": "State transition history",
						},
					},
				},
				"defaultInputModes":  []any{"text/plain"},
				"defaultOutputModes": []any{"text/plain"},
				"skills": []any{
					map[string]any{
						"id":          "get-weather",
						"name":        "Get weather",
						"description": "Get current weather for a city",
						"tags":        []any{"weather"},
						"examples":    []any{"What is the weather in Boston?"},
						"inputModes":  []any{"text/plain"},
						"outputModes": []any{"text/plain"},
						"parameters": []any{
							map[string]any{
								"name":     "city",
								"type":     "string",
								"required": true,
							},
						},
					},
				},
				"validSignature":        true,
				"attestedAgentSpiffeID": "spiffe://cluster.local/ns/demo/sa/weather-agent",
			},
		},
	}}

	card := parseAgentRuntimeCard(obj)
	require.NotNil(t, card)
	assert.Equal(t, "Weather Assistant", card.Name)
	assert.Equal(t, "1.0.0", card.Version)
	assert.Equal(t, "Example Org", card.ProviderOrganization)
	assert.True(t, card.Streaming)
	assert.Len(t, card.Extensions, 1)
	assert.Equal(t, "State transition history", card.Extensions[0].Description)
	require.Len(t, card.Skills, 1)
	assert.Equal(t, "get-weather", card.Skills[0].ID)
	require.Len(t, card.Skills[0].Parameters, 1)
	assert.True(t, card.Skills[0].Parameters[0].Required)
	require.NotNil(t, card.ValidSignature)
	assert.True(t, *card.ValidSignature)
	assert.Equal(t, []string{"summarizer"}, card.LinkedSkills)
}

func TestParseAgentRuntimeCardEmpty(t *testing.T) {
	assert.Nil(t, parseAgentRuntimeCard(nil))
	assert.Nil(t, parseAgentRuntimeCard(&unstructured.Unstructured{Object: map[string]any{}}))
}

func TestServiceAccountFromSpec(t *testing.T) {
	spec := map[string]any{
		"template": map[string]any{
			"spec": map[string]any{
				"serviceAccountName": "claude-code-development-agent",
			},
		},
	}
	assert.Equal(t, "claude-code-development-agent", serviceAccountFromSpec(spec))
	assert.Equal(t, "", serviceAccountFromSpec(nil))
}

func TestParseAgentRuntimeCardLinkedSkillsOnly(t *testing.T) {
	obj := &unstructured.Unstructured{Object: map[string]any{
		"status": map[string]any{
			"linkedSkills": []any{"skill-a"},
		},
	}}
	card := parseAgentRuntimeCard(obj)
	require.NotNil(t, card)
	assert.Equal(t, []string{"skill-a"}, card.LinkedSkills)
	assert.Empty(t, card.Name)
}

func TestParseAgentRuntimeCardUsesAgentsPackage(t *testing.T) {
	_ = agents.A2AAgentCardPath()
}

func TestAgentRuntimeTargetsWorkloadByTargetRef(t *testing.T) {
	obj := &unstructured.Unstructured{Object: map[string]any{
		"metadata": map[string]any{"name": "runtime-for-agent"},
		"spec": map[string]any{
			"targetRef": map[string]any{
				"name": "sample-support-agent",
				"kind": "Deployment",
			},
		},
	}}
	assert.True(t, agentRuntimeTargetsWorkload(obj, "sample-support-agent"))
	assert.False(t, agentRuntimeTargetsWorkload(obj, "other-agent"))
}

func TestAuthBridgeModeFromSpec(t *testing.T) {
	assert.Equal(t, "proxy-sidecar", authBridgeModeFromSpec(map[string]any{
		"authBridgeMode": "proxy-sidecar",
	}))
	assert.Equal(t, "", authBridgeModeFromSpec(nil))
}

func TestFindAgentRuntimeByTargetRefPrefersExactNameMatch(t *testing.T) {
	namespace := "agent-ops-demo"
	runtimeB := &unstructured.Unstructured{Object: map[string]any{
		"apiVersion": "agent.kagenti.dev/v1alpha1",
		"kind":       "AgentRuntime",
		"metadata":   map[string]any{"name": "runtime-b", "namespace": namespace},
		"spec":       map[string]any{"targetRef": map[string]any{"name": "weather-agent"}},
	}}
	runtimeExact := &unstructured.Unstructured{Object: map[string]any{
		"apiVersion": "agent.kagenti.dev/v1alpha1",
		"kind":       "AgentRuntime",
		"metadata":   map[string]any{"name": "weather-agent", "namespace": namespace},
		"spec":       map[string]any{"targetRef": map[string]any{"name": "weather-agent"}},
	}}

	gvrToListKind := map[schema.GroupVersionResource]string{
		agentRuntimeGVR: "AgentRuntimeList",
	}
	dynamicClient := fakedynamic.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), gvrToListKind, runtimeB, runtimeExact)

	obj, err := findAgentRuntimeByTargetRef(context.Background(), dynamicClient, namespace, "weather-agent")
	require.NoError(t, err)
	assert.Equal(t, "weather-agent", obj.GetName())
}
