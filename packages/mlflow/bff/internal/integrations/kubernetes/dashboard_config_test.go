package kubernetes

import (
	"log/slog"
	"testing"

	"github.com/stretchr/testify/assert"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

func TestParseGlobalNamespaces(t *testing.T) {
	logger := slog.Default()

	tests := []struct {
		name string
		obj  map[string]any
		want []string
	}{
		{
			name: "valid namespaces",
			obj: map[string]any{
				"spec": map[string]any{
					"globalMLflowNamespaces": []any{"ns-a", "ns-b"},
				},
			},
			want: []string{"ns-a", "ns-b"},
		},
		{
			name: "single namespace",
			obj: map[string]any{
				"spec": map[string]any{
					"globalMLflowNamespaces": []any{"shared-mlflow"},
				},
			},
			want: []string{"shared-mlflow"},
		},
		{
			name: "empty array",
			obj: map[string]any{
				"spec": map[string]any{
					"globalMLflowNamespaces": []any{},
				},
			},
			want: []string{},
		},
		{
			name: "missing globalMLflowNamespaces field",
			obj: map[string]any{
				"spec": map[string]any{},
			},
			want: nil,
		},
		{
			name: "missing spec",
			obj:  map[string]any{},
			want: nil,
		},
		{
			name: "spec is not a map",
			obj: map[string]any{
				"spec": "not-a-map",
			},
			want: nil,
		},
		{
			name: "globalMLflowNamespaces is not an array",
			obj: map[string]any{
				"spec": map[string]any{
					"globalMLflowNamespaces": "not-an-array",
				},
			},
			want: nil,
		},
		{
			name: "globalMLflowNamespaces is a number",
			obj: map[string]any{
				"spec": map[string]any{
					"globalMLflowNamespaces": 42,
				},
			},
			want: nil,
		},
		{
			name: "mixed types in array — non-strings skipped",
			obj: map[string]any{
				"spec": map[string]any{
					"globalMLflowNamespaces": []any{"valid", 42, true, nil, "also-valid"},
				},
			},
			want: []string{"valid", "also-valid"},
		},
		{
			name: "whitespace entries are skipped",
			obj: map[string]any{
				"spec": map[string]any{
					"globalMLflowNamespaces": []any{"  ", "", "\t"},
				},
			},
			want: []string{},
		},
		{
			name: "entries are trimmed",
			obj: map[string]any{
				"spec": map[string]any{
					"globalMLflowNamespaces": []any{"  ns-a  ", "ns-b\t"},
				},
			},
			want: []string{"ns-a", "ns-b"},
		},
		{
			name: "duplicates are removed",
			obj: map[string]any{
				"spec": map[string]any{
					"globalMLflowNamespaces": []any{"ns-a", "ns-b", "ns-a", "ns-b", "ns-c"},
				},
			},
			want: []string{"ns-a", "ns-b", "ns-c"},
		},
		{
			name: "duplicates after trimming are removed",
			obj: map[string]any{
				"spec": map[string]any{
					"globalMLflowNamespaces": []any{"ns-a", "  ns-a  "},
				},
			},
			want: []string{"ns-a"},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			item := &unstructured.Unstructured{Object: tc.obj}
			got := parseGlobalNamespaces(item, logger)
			assert.Equal(t, tc.want, got)
		})
	}
}

func TestDashboardConfigGVR(t *testing.T) {
	assert.Equal(t, "opendatahub.io", dashboardConfigGVR.Group)
	assert.Equal(t, "v1alpha", dashboardConfigGVR.Version)
	assert.Equal(t, "odhdashboardconfigs", dashboardConfigGVR.Resource)
}
