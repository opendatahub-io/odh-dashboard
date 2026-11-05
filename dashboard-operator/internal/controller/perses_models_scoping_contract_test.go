package controller

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"sigs.k8s.io/yaml"
)

// TestModelsPersesDashboardsScopedPins guards Models CR product pins:
// admin + non-admin must route kserve through the DS namespace proxy,
// OCP GPU/CPU through OCP tenancy, never unscoped cluster :9091, use a TextVariable
// namespace stub, and keep PromQL queryparam-first (no namespace=~"$namespace" dual tenancy).
//
// Out of scope here: tenancy GPU/CPU PromQL that still joins kserve_vllm:* (cross-stack).
// That is a separate metric-ownership change — do not encode absence of kserve in tenancy
// panels as a scoping pin.
func TestModelsPersesDashboardsScopedPins(t *testing.T) {
	t.Parallel()

	files := []string{
		"manifests/observability/rhoai/perses-dashboard-model.yaml",
		"manifests/observability/rhoai/perses-dashboard-model-admin.yaml",
		"manifests/observability/odh/perses-dashboard-model.yaml",
		"manifests/observability/odh/perses-dashboard-model-admin.yaml",
	}

	for _, rel := range files {
		rel := rel
		t.Run(rel, func(t *testing.T) {
			t.Parallel()
			data, err := os.ReadFile(filepath.Join("..", "..", "..", rel))
			require.NoError(t, err)
			raw := string(data)

			assert.NotContains(t, raw, "name: cluster-prometheus-datasource",
				"Models must not pin unscoped OCP :9091")
			assert.Contains(t, raw, "name: data-science-prometheus-datasource",
				"Models must pin DS namespace proxy for kserve series")
			assert.Contains(t, raw, "name: cluster-prometheus-tenancy-datasource",
				"Models must pin OCP tenancy for GPU/CPU series")
			assert.NotContains(t, raw, `namespace=~"$namespace"`,
				"scoped DS/tenancy already inject namespace=; PromQL must not dual-filter namespace")

			resource := unstructured.Unstructured{}
			require.NoError(t, yaml.Unmarshal(data, &resource.Object))
			require.Equal(t, "PersesDashboard", resource.GetKind())

			variables, found, err := unstructured.NestedSlice(resource.Object, "spec", "config", "variables")
			require.NoError(t, err)
			require.True(t, found, "expected variables")

			nsVar := findVariableByName(t, variables, "namespace")
			require.NotNil(t, nsVar, "namespace variable required")
			assert.Equal(t, "TextVariable", nsVar["kind"],
				"namespace must be a TextVariable stub; Dashboard transform injects ProjectsContext StaticList")
			nsSpec, _ := nsVar["spec"].(map[string]any)
			_, hasNSCustomAll := nsSpec["customAllValue"]
			assert.False(t, hasNSCustomAll,
				"namespace must not set customAllValue (scoped queryParams break on wildcards)")
			assert.Equal(t, "", nsSpec["value"],
				"namespace TextVariable stub must be empty; ProjectsContext fills the list at runtime")

			modelVar := findVariableByName(t, variables, "model_name")
			require.NotNil(t, modelVar, "model_name variable required")
			assert.Equal(t, "ListVariable", modelVar["kind"])
			modelSpec, _ := modelVar["spec"].(map[string]any)
			// PromQL-only All is allowed on model_name; do not require a specific wildcard encoding.
			assert.Equal(t, true, modelSpec["allowAllValue"], "model_name should allow All")
			plugin, _ := modelSpec["plugin"].(map[string]any)
			pluginSpec, _ := plugin["spec"].(map[string]any)
			ds, _ := pluginSpec["datasource"].(map[string]any)
			assert.Equal(t, "data-science-prometheus-datasource", ds["name"],
				"model_name label values must query the DS proxy")
			matchers, _ := pluginSpec["matchers"].([]any)
			require.NotEmpty(t, matchers, "model_name needs at least one matcher")
			for _, m := range matchers {
				s, _ := m.(string)
				assert.NotContains(t, s, "namespace=",
					"model_name matchers must not PromQL-filter namespace; tenancy is queryparam-only")
			}
		})
	}
}

// TestModelsAdminIsTwinOfNonAdmin fails if admin/non-admin Models CRs drift in
// anything other than metadata.name and intentional header comments.
func TestModelsAdminIsTwinOfNonAdmin(t *testing.T) {
	t.Parallel()
	for _, dist := range []string{"rhoai", "odh"} {
		dist := dist
		t.Run(dist, func(t *testing.T) {
			t.Parallel()
			base := filepath.Join("..", "..", "..", "manifests", "observability", dist)
			model, err := os.ReadFile(filepath.Join(base, "perses-dashboard-model.yaml"))
			require.NoError(t, err)
			admin, err := os.ReadFile(filepath.Join(base, "perses-dashboard-model-admin.yaml"))
			require.NoError(t, err)

			assert.Equal(t,
				normalizeModelsTwin(string(model)),
				normalizeModelsTwin(string(admin)),
				"dashboard-1-model-admin must stay a queryparam/pin twin of dashboard-1-model (only name/comments may differ)",
			)
		})
	}
}

func normalizeModelsTwin(raw string) string {
	var b strings.Builder
	for _, line := range strings.Split(raw, "\n") {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "#") {
			continue
		}
		// metadata.name is the only intentional structural difference.
		if trimmed == "name: dashboard-1-model" || trimmed == "name: dashboard-1-model-admin" {
			b.WriteString("name: dashboard-1-model\n")
			continue
		}
		b.WriteString(trimmed)
		b.WriteByte('\n')
	}
	return b.String()
}

func findVariableByName(t *testing.T, variables []any, name string) map[string]any {
	t.Helper()
	for _, entry := range variables {
		v, ok := entry.(map[string]any)
		if !ok {
			continue
		}
		spec, _ := v["spec"].(map[string]any)
		if spec["name"] == name {
			return v
		}
	}
	return nil
}
