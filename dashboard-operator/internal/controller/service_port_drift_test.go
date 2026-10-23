package controller

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

func serviceWithPorts(name string, ports ...any) *unstructured.Unstructured {
	return &unstructured.Unstructured{Object: map[string]any{
		"apiVersion": "v1",
		"kind":       "Service",
		"metadata": map[string]any{
			"name":      name,
			"namespace": "test",
		},
		"spec": map[string]any{"ports": ports},
	}}
}

func TestBuildServicePortDriftPatch_ReplacesChangedAssociativeKey(t *testing.T) {
	live := serviceWithPorts("maas-ui", map[string]any{
		"name": "maas-ui", "port": int64(9999), "protocol": "TCP", "targetPort": int64(8543),
	})
	desired := serviceWithPorts("maas-ui", map[string]any{
		"name": "maas-ui", "port": int64(8543), "targetPort": int64(8543),
	})

	patch, err := buildServicePortDriftPatch(live, desired)
	require.NoError(t, err)
	require.NotNil(t, patch)
	ports := patch["spec"].(map[string]any)["ports"].([]any)
	require.Len(t, ports, 1)
	assert.Equal(t, int64(8543), ports[0].(map[string]any)["port"])
}

func TestBuildServicePortDriftPatch_IgnoresAPIDefaults(t *testing.T) {
	live := serviceWithPorts("maas-ui", map[string]any{
		"name": "maas-ui", "port": int64(8543), "protocol": "TCP", "targetPort": int64(8543),
	})
	desired := serviceWithPorts("maas-ui", map[string]any{
		"name": "maas-ui", "port": int64(8543),
	})

	patch, err := buildServicePortDriftPatch(live, desired)
	require.NoError(t, err)
	assert.Nil(t, patch)
}

func TestBuildServicePortDriftPatch_RemovesExternallyAddedPort(t *testing.T) {
	live := serviceWithPorts("dashboard", map[string]any{
		"name": "https", "port": int64(8443), "targetPort": int64(8443),
	}, map[string]any{
		"name": "external", "port": int64(9999), "targetPort": int64(9999),
	})
	desired := serviceWithPorts("dashboard", map[string]any{
		"name": "https", "port": int64(8443), "targetPort": int64(8443),
	})

	patch, err := buildServicePortDriftPatch(live, desired)
	require.NoError(t, err)
	ports := patch["spec"].(map[string]any)["ports"].([]any)
	require.Len(t, ports, 1)
	assert.Equal(t, "https", ports[0].(map[string]any)["name"])
}

func TestBuildServicePortDriftPatch_PreservesAllocatedNodePort(t *testing.T) {
	live := serviceWithPorts("dashboard", map[string]any{
		"name": "https", "port": int64(9999), "targetPort": int64(8443), "nodePort": int64(30443),
	})
	desired := serviceWithPorts("dashboard", map[string]any{
		"name": "https", "port": int64(8443), "targetPort": int64(8443),
	})

	patch, err := buildServicePortDriftPatch(live, desired)
	require.NoError(t, err)
	ports := patch["spec"].(map[string]any)["ports"].([]any)
	require.Len(t, ports, 1)
	assert.Equal(t, int64(30443), ports[0].(map[string]any)["nodePort"])
}

func TestBuildServicePortDriftPatch_SkipsMissingPortLists(t *testing.T) {
	live := serviceWithPorts("dashboard")
	desired := serviceWithPorts("dashboard")
	delete(live.Object["spec"].(map[string]any), "ports")

	patch, err := buildServicePortDriftPatch(live, desired)
	require.NoError(t, err)
	assert.Nil(t, patch)
}
