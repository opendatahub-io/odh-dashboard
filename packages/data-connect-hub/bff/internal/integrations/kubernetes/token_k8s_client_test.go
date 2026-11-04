package kubernetes

import (
	"testing"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

func TestNamespacesFromProjects(t *testing.T) {
	tests := []struct {
		name      string
		projects  []unstructured.Unstructured
		wantNames []string
		wantError bool
	}{
		{
			name: "returns accessible project names",
			projects: []unstructured.Unstructured{
				{Object: map[string]interface{}{
					"metadata": map[string]interface{}{"name": "test-project"},
				}},
			},
			wantNames: []string{"test-project"},
		},
		{
			name:      "returns no namespaces for no projects",
			wantNames: []string{},
		},
		{
			name: "errors when a project has no name",
			projects: []unstructured.Unstructured{
				{Object: map[string]interface{}{"metadata": map[string]interface{}{}}},
			},
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			namespaces, err := namespacesFromProjects(tt.projects)

			if tt.wantError {
				if err == nil {
					t.Fatal("expected an error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			var gotNames []string
			for _, namespace := range namespaces {
				gotNames = append(gotNames, namespace.Name)
			}
			if len(gotNames) != len(tt.wantNames) {
				t.Fatalf("namespace count = %d, want %d", len(gotNames), len(tt.wantNames))
			}
			for i, wantName := range tt.wantNames {
				if gotNames[i] != wantName {
					t.Fatalf("namespace name[%d] = %q, want %q", i, gotNames[i], wantName)
				}
			}
		})
	}
}
