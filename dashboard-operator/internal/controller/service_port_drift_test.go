package controller

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
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

func TestRevertServicePortDrift_RespectsManagedOptOut(t *testing.T) {
	tests := []struct {
		name            string
		annotateLive    bool
		annotateDesired bool
	}{
		{name: "live Service", annotateLive: true},
		{name: "rendered Service", annotateDesired: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			live := serviceWithPorts("dashboard", map[string]any{
				"name": "https", "port": int64(9999), "targetPort": int64(8443),
			})
			desired := serviceWithPorts("dashboard", map[string]any{
				"name": "https", "port": int64(8443), "targetPort": int64(8443),
			})
			if tt.annotateLive {
				live.SetAnnotations(map[string]string{managedAnnotation: "false"})
			}
			if tt.annotateDesired {
				desired.SetAnnotations(map[string]string{managedAnnotation: "false"})
			}

			cli := fake.NewClientBuilder().WithObjects(live).Build()
			require.NoError(t, revertServicePortDrift(context.Background(), cli, cli, []unstructured.Unstructured{*desired}))

			current := &unstructured.Unstructured{}
			current.SetGroupVersionKind(live.GroupVersionKind())
			require.NoError(t, cli.Get(context.Background(), client.ObjectKeyFromObject(live), current))
			ports, found, err := unstructured.NestedSlice(current.Object, "spec", "ports")
			require.NoError(t, err)
			require.True(t, found)
			assert.Equal(t, int64(9999), ports[0].(map[string]any)["port"])
		})
	}
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

func TestBuildServicePortDriftPatch_IgnoresEquivalentNumericTypes(t *testing.T) {
	live := serviceWithPorts("maas-ui", map[string]any{
		"name": "maas-ui", "port": float64(8543), "protocol": "TCP", "targetPort": float64(8543),
	})
	desired := serviceWithPorts("maas-ui", map[string]any{
		"name": "maas-ui", "port": int64(8543), "targetPort": int64(8543),
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

func TestBuildServicePortDriftPatch_RemovesLiveOnlyPortField(t *testing.T) {
	live := serviceWithPorts("dashboard", map[string]any{
		"name": "https", "port": int64(8443), "targetPort": int64(8443), "appProtocol": "https",
	})
	desired := serviceWithPorts("dashboard", map[string]any{
		"name": "https", "port": int64(8443), "targetPort": int64(8443),
	})

	patch, err := buildServicePortDriftPatch(live, desired)
	require.NoError(t, err)
	ports := patch["spec"].(map[string]any)["ports"].([]any)
	require.Len(t, ports, 1)
	_, exists := ports[0].(map[string]any)["appProtocol"]
	assert.False(t, exists)
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

func TestBuildServicePortDriftPatch_PreservesAllocatedNodePortWhenDesiredIsZero(t *testing.T) {
	live := serviceWithPorts("dashboard", map[string]any{
		"name": "https", "port": int64(9999), "targetPort": int64(8443), "nodePort": int64(30443),
	})
	desired := serviceWithPorts("dashboard", map[string]any{
		"name": "https", "port": int64(8443), "targetPort": int64(8443), "nodePort": int64(0),
	})

	patch, err := buildServicePortDriftPatch(live, desired)
	require.NoError(t, err)
	ports := patch["spec"].(map[string]any)["ports"].([]any)
	require.Len(t, ports, 1)
	assert.Equal(t, int64(30443), ports[0].(map[string]any)["nodePort"])
}

func TestBuildServicePortDriftPatch_PreservesUnnamedPortAllocationAcrossPortChange(t *testing.T) {
	live := serviceWithPorts("dashboard", map[string]any{
		"port": int64(9999), "targetPort": int64(8443), "nodePort": int64(30443),
	})
	desired := serviceWithPorts("dashboard", map[string]any{
		"port": int64(8443), "targetPort": int64(8443),
	})

	patch, err := buildServicePortDriftPatch(live, desired)
	require.NoError(t, err)
	ports := patch["spec"].(map[string]any)["ports"].([]any)
	require.Len(t, ports, 1)
	assert.Equal(t, int64(30443), ports[0].(map[string]any)["nodePort"])
}

func TestBuildServicePortDriftPatch_PreservesAllocatedNodePortAcrossPortRename(t *testing.T) {
	live := serviceWithPorts("dashboard", map[string]any{
		"name": "old-https", "port": int64(8443), "protocol": "TCP", "targetPort": int64(8443), "nodePort": int64(30443),
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

func TestBuildServicePortDriftPatch_DoesNotCopyAmbiguousNodePortAcrossRename(t *testing.T) {
	live := serviceWithPorts("dashboard",
		map[string]any{
			"name": "old-https", "port": int64(8443), "targetPort": int64(8443), "nodePort": int64(30443),
		},
		map[string]any{
			"name": "other-https", "port": int64(8443), "targetPort": int64(9443), "nodePort": int64(30444),
		},
	)
	desired := serviceWithPorts("dashboard", map[string]any{
		"name": "https", "port": int64(8443), "targetPort": int64(8443),
	})

	patch, err := buildServicePortDriftPatch(live, desired)
	require.NoError(t, err)
	ports := patch["spec"].(map[string]any)["ports"].([]any)
	require.Len(t, ports, 1)
	_, exists := ports[0].(map[string]any)["nodePort"]
	assert.False(t, exists)
}

func TestBuildServicePortDriftPatch_DoesNotReuseNodePortAcrossDesiredPorts(t *testing.T) {
	live := serviceWithPorts("dashboard", map[string]any{
		"name": "old-https", "port": int64(8443), "targetPort": int64(8443), "nodePort": int64(30443),
	})
	desired := serviceWithPorts("dashboard",
		map[string]any{
			"name": "old-https", "port": int64(9443), "targetPort": int64(9443),
		},
		map[string]any{
			"name": "https", "port": int64(8443), "targetPort": int64(8443),
		},
	)

	patch, err := buildServicePortDriftPatch(live, desired)
	require.NoError(t, err)
	ports := patch["spec"].(map[string]any)["ports"].([]any)
	require.Len(t, ports, 2)
	assert.Equal(t, int64(30443), ports[0].(map[string]any)["nodePort"])
	_, exists := ports[1].(map[string]any)["nodePort"]
	assert.False(t, exists)
}

func TestBuildServicePortDriftPatch_SkipsMissingPortLists(t *testing.T) {
	live := serviceWithPorts("dashboard")
	desired := serviceWithPorts("dashboard")
	delete(live.Object["spec"].(map[string]any), "ports")

	patch, err := buildServicePortDriftPatch(live, desired)
	require.NoError(t, err)
	assert.Nil(t, patch)
}

func TestBuildServicePortDriftPatch_SkipsMissingDesiredPortList(t *testing.T) {
	live := serviceWithPorts("dashboard", map[string]any{
		"name": "https", "port": int64(8443), "targetPort": int64(8443),
	})
	desired := serviceWithPorts("dashboard")
	delete(desired.Object["spec"].(map[string]any), "ports")

	patch, err := buildServicePortDriftPatch(live, desired)
	require.NoError(t, err)
	assert.Nil(t, patch)
}
