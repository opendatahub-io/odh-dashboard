package kubernetes

import (
	"testing"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/mapper"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

func TestSandboxToSummary(t *testing.T) {
	sandbox := unstructured.Unstructured{Object: map[string]any{
		"apiVersion": sandboxGVR.Group + "/" + sandboxGVR.Version,
		"kind":       "Sandbox",
		"metadata": map[string]any{
			"name":      "my-agent",
			"namespace": "test-ns",
			"labels": map[string]any{
				agents.LabelAgentType:    agents.AgentTypeAgent,
				agents.LabelWorkloadType: agents.WorkloadTypeSandbox,
			},
			"annotations": map[string]any{
				agents.AnnotationDescription: "Test agent",
			},
		},
		"status": map[string]any{
			"phase": "Ready",
		},
	}}

	summary := sandboxToSummary(sandbox, nil)
	assert.Equal(t, "my-agent", summary.Name)
	assert.Equal(t, "test-ns", summary.Namespace)
	assert.Equal(t, "Test agent", summary.Description)
	assert.Equal(t, "ready", summary.Status)
	assert.Equal(t, agents.WorkloadTypeSandbox, summary.WorkloadType)
	assert.Equal(t, agents.AgentTypeAgent, summary.ResourceType)
}

func TestSandboxToSummaryOpenShellDefaultsResourceType(t *testing.T) {
	sandbox := unstructured.Unstructured{Object: map[string]any{
		"apiVersion": sandboxGVR.Group + "/" + sandboxGVR.Version,
		"kind":       "Sandbox",
		"metadata": map[string]any{
			"name":      "openshell-agent",
			"namespace": "openshell-ns",
			"labels": map[string]any{
				agents.LabelOpenShellManagedBy: agents.OpenShellManagedByValue,
				agents.LabelOpenShellSandboxID: "uuid-123",
			},
		},
		"status": map[string]any{
			"phase": "Ready",
		},
	}}

	summary := sandboxToSummary(sandbox, nil)
	assert.Equal(t, "openshell-agent", summary.Name)
	assert.Equal(t, agents.AgentTypeAgent, summary.ResourceType)
}

func TestSandboxToDetail(t *testing.T) {
	sandbox := unstructured.Unstructured{Object: map[string]any{
		"apiVersion": sandboxGVR.Group + "/" + sandboxGVR.Version,
		"kind":       "Sandbox",
		"metadata": map[string]any{
			"name":      "my-agent",
			"namespace": "test-ns",
			"labels": map[string]any{
				agents.LabelAgentType: agents.AgentTypeAgent,
			},
			"annotations": map[string]any{
				agents.AnnotationDescription: "Detail agent",
			},
		},
		"spec": map[string]any{
			"operatingMode": "Running",
			"service":       true,
		},
		"status": map[string]any{
			"phase":       "Ready",
			"serviceFQDN": "my-agent.test-ns.svc.cluster.local",
		},
	}}

	detail := sandboxToDetail(sandbox, nil)
	require.NotNil(t, detail)
	assert.Equal(t, "my-agent", detail.Metadata.Name)
	assert.Equal(t, "Detail agent", detail.Metadata.Annotations[agents.AnnotationDescription])
	assert.Equal(t, agents.WorkloadTypeSandbox, detail.WorkloadType)
	assert.Equal(t, "ready", detail.ReadyStatus)
	require.NotNil(t, detail.Service)
	assert.Equal(t, "my-agent", detail.Service.Name)
}

func TestSandboxPhaseFallback(t *testing.T) {
	sandbox := unstructured.Unstructured{Object: map[string]any{
		"metadata": map[string]any{"name": "x", "namespace": "ns"},
	}}
	assert.Equal(t, statusPending, sandboxPhase(sandbox))
}

func TestSandboxPhaseSuspendedOperatingMode(t *testing.T) {
	sandbox := unstructured.Unstructured{Object: map[string]any{
		"metadata": map[string]any{"name": "x", "namespace": "ns"},
		"spec": map[string]any{
			"operatingMode": "Suspended",
		},
		"status": map[string]any{
			"phase": "Ready",
		},
	}}
	assert.Equal(t, statusStopped, sandboxPhase(sandbox))
}

func TestSandboxEndpointURLConsistentBetweenSummaryAndDetail(t *testing.T) {
	sandbox := unstructured.Unstructured{Object: map[string]any{
		"metadata": map[string]any{
			"name":      "my-agent",
			"namespace": "test-ns",
		},
		"status": map[string]any{
			"serviceFQDN": "my-agent.test-ns.svc.cluster.local",
		},
	}}

	summary := sandboxToSummary(sandbox, nil)
	detail := sandboxToDetail(sandbox, nil)
	require.NotNil(t, detail.Service)

	detailURL := mapper.BuildPrimaryEndpointURL(detail.Service.Name, sandbox.GetNamespace(), detail.Service.Ports)
	assert.Equal(t, detailURL, summary.EndpointURL)
	assert.Equal(t, "http://my-agent.test-ns.svc.cluster.local:8080", summary.EndpointURL)
}

func TestServiceNameFromFQDN(t *testing.T) {
	assert.Equal(t, "my-agent", serviceNameFromFQDN("my-agent.test-ns.svc.cluster.local"))
	assert.Equal(t, "backing-svc", serviceNameFromFQDN("backing-svc.test-ns.svc.cluster.local."))
	assert.Equal(t, "", serviceNameFromFQDN(""))
}

func TestSandboxEndpointURLUsesServiceNameFromFQDN(t *testing.T) {
	sandbox := unstructured.Unstructured{Object: map[string]any{
		"metadata": map[string]any{
			"name":      "my-agent",
			"namespace": "test-ns",
		},
		"status": map[string]any{
			"serviceFQDN": "backing-svc.test-ns.svc.cluster.local",
		},
	}}

	summary := sandboxToSummary(sandbox, nil)
	assert.Equal(t, "http://backing-svc.test-ns.svc.cluster.local:8080", summary.EndpointURL)

	detail := sandboxToDetail(sandbox, nil)
	require.NotNil(t, detail.Service)
	assert.Equal(t, "backing-svc", detail.Service.Name)
}
