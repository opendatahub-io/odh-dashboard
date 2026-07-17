package mapper

import (
	"testing"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAgentDetailToRuntimeDetail(t *testing.T) {
	createdAt := "2026-05-12T16:00:03.214610Z"
	detail := &agents.AgentDetail{
		Metadata: agents.AgentMetadata{
			Name:      "sample-support-agent",
			Namespace: "agent-ops-demo",
			Labels: map[string]string{
				agents.LabelOpenShellManagedBy: agents.OpenShellManagedByValue,
			},
			Annotations: map[string]string{
				agents.AnnotationDescription: "Customer support agent",
				agents.AnnotationFramework:   "langgraph",
			},
			CreationTimestamp: createdAt,
		},
		ReadyStatus:  "ready",
		WorkloadType: agents.WorkloadTypeSandbox,
		Status: map[string]any{
			"phase": "ready",
			"conditions": []any{
				map[string]any{
					"type":               "Ready",
					"status":             "True",
					"reason":             "SandboxReady",
					"message":            "Sandbox is ready.",
					"lastTransitionTime": createdAt,
				},
			},
		},
		Service: &agents.AgentService{
			Name: "sample-support-agent",
			Ports: []agents.AgentServicePort{
				{Name: "http", Port: 8080},
			},
		},
	}

	result := AgentDetailToRuntimeDetail(detail)
	require.NotNil(t, result)
	assert.Equal(t, "sample-support-agent", result.Name)
	assert.Equal(t, "agent-ops-demo", result.Namespace)
	assert.Equal(t, "ready", result.WorkloadStatus)
	assert.Equal(t, "ready", result.Runtime.Status)
	assert.Equal(t, "agent", result.Runtime.Type)
	require.Len(t, result.ServiceEndpoints, 1)
	assert.Equal(t, "http://sample-support-agent.agent-ops-demo.svc.cluster.local:8080", result.Runtime.EndpointURL)
}

func TestAgentDetailToRuntimeDetail_OpenShellDefaultsResourceType(t *testing.T) {
	detail := &agents.AgentDetail{
		Metadata: agents.AgentMetadata{
			Name:      "openshell-agent",
			Namespace: "openshell-ns",
			Labels: map[string]string{
				agents.LabelOpenShellManagedBy: agents.OpenShellManagedByValue,
				agents.LabelOpenShellSandboxID: "uuid-123",
			},
		},
		ReadyStatus:  "Ready",
		WorkloadType: agents.WorkloadTypeSandbox,
	}

	result := AgentDetailToRuntimeDetail(detail)
	require.NotNil(t, result)
	assert.Equal(t, agents.AgentTypeAgent, result.Runtime.Type)
}

func TestAgentDisplayNameAndFramework(t *testing.T) {
	annotations := map[string]string{
		agents.AnnotationDisplayName: "Display",
		agents.AnnotationDescription: "Desc",
		agents.AnnotationFramework:   "langgraph",
	}
	assert.Equal(t, "Display", AgentDisplayName(annotations, "fallback"))
	assert.Equal(t, "fallback", AgentDisplayName(nil, "fallback"))
	assert.Equal(t, "Desc", AgentDescription(annotations))
	assert.Equal(t, "langgraph", AgentFramework(annotations))
}

func TestAgentSummaryToRuntime(t *testing.T) {
	item := agents.AgentSummary{
		Name:         "sample-support-agent",
		Namespace:    "agent-ops-demo",
		DisplayName:  "Sample Support Agent",
		Description:  "desc",
		Framework:    "langgraph",
		Status:       "Ready",
		ResourceType: "agent",
		ServiceFQDN:  "sample-support-agent.agent-ops-demo.svc.cluster.local",
		Ports: []agents.AgentServicePort{
			{Name: "http", Port: 8080},
		},
		CreatedAt:    "2026-05-01T00:00:00Z",
		LastSyncAt:   "2026-05-12T16:00:03.214610Z",
	}

	runtime := AgentSummaryToRuntime(item)
	assert.Equal(t, "Sample Support Agent", runtime.DisplayName)
	assert.Equal(t, "langgraph", runtime.Framework)
	assert.Equal(t, "Ready", runtime.Status)
	assert.Equal(t, "agent", runtime.Type)
	assert.Equal(t, "", runtime.EndpointURL)
	assert.False(t, runtime.LastSyncTime.IsZero())
	assert.Equal(t, 12, int(runtime.LastSyncTime.Day()))
}

func TestParseTime(t *testing.T) {
	tm := ParseTime("2026-05-12T16:00:03.214610Z")
	assert.Equal(t, 2026, tm.Year())
	assert.True(t, ParseTime("").IsZero())

	// Test RFC3339 without nanoseconds
	tm2 := ParseTime("2026-05-12T16:00:03Z")
	assert.Equal(t, 2026, tm2.Year())

	// Test invalid format returns zero time
	assert.True(t, ParseTime("invalid-date").IsZero())
	assert.True(t, ParseTime("2026-13-45").IsZero())
}

func TestAgentDetailToRuntimeDetail_NilService(t *testing.T) {
	detail := &agents.AgentDetail{
		Metadata: agents.AgentMetadata{
			Name:              "test-agent",
			Namespace:         "test-ns",
			Labels:            map[string]string{agents.LabelAgentType: "agent"},
			CreationTimestamp: "2026-05-12T16:00:03Z",
		},
		ReadyStatus: "Ready",
		Status:      map[string]any{},
		Service:     nil, // No service
	}

	result := AgentDetailToRuntimeDetail(detail)
	require.NotNil(t, result)
	assert.Empty(t, result.ServiceEndpoints)
	assert.Equal(t, "", result.Runtime.EndpointURL)
}

func TestAgentDetailToRuntimeDetail_EmptyPorts(t *testing.T) {
	detail := &agents.AgentDetail{
		Metadata: agents.AgentMetadata{
			Name:              "test-agent",
			Namespace:         "test-ns",
			Labels:            map[string]string{agents.LabelAgentType: "agent"},
			CreationTimestamp: "2026-05-12T16:00:03Z",
		},
		ReadyStatus: "Ready",
		Status:      map[string]any{},
		Service: &agents.AgentService{
			Name:  "test-agent",
			Ports: []agents.AgentServicePort{}, // Empty ports
		},
	}

	result := AgentDetailToRuntimeDetail(detail)
	require.NotNil(t, result)
	assert.Empty(t, result.ServiceEndpoints)
	assert.Equal(t, "", result.Runtime.EndpointURL)
}

func TestBuildPrimaryEndpointURL_NoValidPort(t *testing.T) {
	url := BuildPrimaryEndpointURL("test-agent", "test-ns", []agents.AgentServicePort{})
	assert.Equal(t, "", url)
}

func TestMapWorkloadConditions_EmptyConditions(t *testing.T) {
	// Empty conditions array
	result := MapWorkloadConditions(map[string]any{"conditions": []any{}})
	assert.NotNil(t, result)
	assert.Empty(t, result)
}

func TestMapWorkloadConditions_MalformedConditions(t *testing.T) {
	// Malformed condition (not a map)
	result := MapWorkloadConditions(map[string]any{"conditions": []any{"not-a-map", 123}})
	assert.NotNil(t, result)
	assert.Empty(t, result)
}

func TestMapWorkloadConditions_IncorrectType(t *testing.T) {
	// Conditions field is not an array
	result := MapWorkloadConditions(map[string]any{"conditions": "not-an-array"})
	assert.Nil(t, result)
}

func TestMapWorkloadConditions_MissingField(t *testing.T) {
	// No conditions field
	result := MapWorkloadConditions(map[string]any{})
	assert.Nil(t, result)
}

func TestSelectHTTPPort_EmptySlice(t *testing.T) {
	port := SelectHTTPPort([]agents.AgentServicePort{})
	assert.Equal(t, 0, port)
}

func TestSelectHTTPPort_ZeroPort(t *testing.T) {
	port := SelectHTTPPort([]agents.AgentServicePort{{Name: "http", Port: 0}})
	assert.Equal(t, 0, port)
}

func TestSelectHTTPPort_NegativePort(t *testing.T) {
	port := SelectHTTPPort([]agents.AgentServicePort{{Name: "http", Port: -1}})
	assert.Equal(t, 0, port)
}

func TestBuildPrimaryEndpointURL_HTTPSNamedPort(t *testing.T) {
	url := BuildPrimaryEndpointURL("tls-agent", "agent-ops-demo", []agents.AgentServicePort{
		{Name: "https", Port: 8443},
	})
	assert.Equal(t, "https://tls-agent.agent-ops-demo.svc.cluster.local:8443", url)
}

func TestBuildPrimaryEndpointURL_HTTPSPort443(t *testing.T) {
	url := BuildPrimaryEndpointURL("tls-agent", "agent-ops-demo", []agents.AgentServicePort{
		{Name: "web", Port: 443},
	})
	assert.Equal(t, "https://tls-agent.agent-ops-demo.svc.cluster.local:443", url)
}

func TestMapServiceEndpoints_MixedSchemes(t *testing.T) {
	endpoints := MapServiceEndpoints(&agents.AgentService{
		Name: "sample-agent",
		Ports: []agents.AgentServicePort{
			{Name: "http", Port: 8080},
			{Name: "https", Port: 8443},
		},
	}, "agent-ops-demo")

	require.Len(t, endpoints, 2)
	assert.Equal(t, "http://sample-agent.agent-ops-demo.svc.cluster.local:8080", endpoints[0].URL)
	assert.Equal(t, "https://sample-agent.agent-ops-demo.svc.cluster.local:8443", endpoints[1].URL)
}

func TestSelectPrimaryPort_PrefersHTTPOverHTTPS(t *testing.T) {
	port, ok := SelectPrimaryPort([]agents.AgentServicePort{
		{Name: "https", Port: 8443},
		{Name: "http", Port: 8080},
	})
	require.True(t, ok)
	assert.Equal(t, "http", port.Name)
	assert.Equal(t, 8080, port.Port)
}

func TestSyntheticReadyCondition_UsesDerivedTimestamp(t *testing.T) {
	createdAt := "2026-05-12T16:00:03.214610Z"
	detail := &agents.AgentDetail{
		Metadata: agents.AgentMetadata{
			Name:              "sample-support-agent",
			Namespace:         "agent-ops-demo",
			Labels:            map[string]string{agents.LabelAgentType: "agent"},
			CreationTimestamp: createdAt,
		},
		ReadyStatus: "Ready",
		Status:      map[string]any{"readyReplicas": float64(1)},
		Service: &agents.AgentService{
			Name:  "sample-support-agent",
			Ports: []agents.AgentServicePort{{Name: "http", Port: 8080}},
		},
	}

	first := AgentDetailToRuntimeDetail(detail)
	second := AgentDetailToRuntimeDetail(detail)
	require.NotNil(t, first)
	require.NotNil(t, second)

	var readyCondition *models.AgentRuntimeCondition
	for i := range first.Conditions {
		if first.Conditions[i].Type == "Ready" {
			readyCondition = &first.Conditions[i]
			break
		}
	}
	require.NotNil(t, readyCondition, "expected synthetic Ready condition")
	assert.Equal(t, first.Runtime.LastSyncTime, readyCondition.LastTransitionTime)
	assert.Equal(t, first.Conditions, second.Conditions)
}
