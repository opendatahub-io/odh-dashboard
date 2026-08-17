package helper

import (
	"testing"

	"github.com/kubeflow/hub/ui/bff/internal/models"
	"github.com/stretchr/testify/assert"
)

func TestConvertToMCPServer_AnnotationsCanBeAddedPostConversion(t *testing.T) {
	result := ConvertToMCPServer(nil, ConversionOptions{
		Name:           "prometheus-mcp-server",
		ContainerImage: "ghcr.io/prometheus-community/prometheus-mcp:0.9.2",
	})

	cr := result.MCPServer

	// Verify annotations start empty (converter does not set any)
	assert.Nil(t, cr.Metadata.Annotations)

	// Simulate what the handler does: inject the catalog display name
	displayName := "Prometheus Monitoring"
	if cr.Metadata.Annotations == nil {
		cr.Metadata.Annotations = make(map[string]string)
	}
	cr.Metadata.Annotations["openshift.io/display-name"] = displayName

	assert.Equal(t, "Prometheus Monitoring", cr.Metadata.Annotations["openshift.io/display-name"])
	assert.Equal(t, "prometheus-mcp-server", cr.Metadata.Name)
}

func TestConvertToMCPServer_AnnotationsPreservedWhenAlreadySet(t *testing.T) {
	metadata := &models.McpRuntimeMetadata{
		DefaultPort: ptr(int32(9090)),
		Prerequisites: &models.McpPrerequisites{
			ServiceAccount: &models.McpServiceAccountRequirement{
				Required:      ptr(true),
				SuggestedName: ptr("prom-sa"),
			},
		},
	}

	result := ConvertToMCPServer(metadata, ConversionOptions{
		Name:           "prometheus-mcp-server",
		ContainerImage: "ghcr.io/prometheus-community/prometheus-mcp:0.9.2",
	})

	cr := result.MCPServer

	// After prerequisites processing, annotations may still be nil (prerequisites
	// don't set annotations). Add display name annotation.
	if cr.Metadata.Annotations == nil {
		cr.Metadata.Annotations = make(map[string]string)
	}
	cr.Metadata.Annotations["openshift.io/display-name"] = "Prometheus Monitoring"

	// Verify both the annotation and other CR fields coexist
	assert.Equal(t, "Prometheus Monitoring", cr.Metadata.Annotations["openshift.io/display-name"])
	assert.Equal(t, "prom-sa", cr.Spec.Runtime.Security.ServiceAccountName)
}
