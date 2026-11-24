package controller

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"sigs.k8s.io/yaml"
)

// Execute the actual dashboard queries against duplicated, missing and
// untrusted series, rather than testing only their textual shape.
func TestModelsResourceQueriesPromQL(t *testing.T) {
	promtool, err := exec.LookPath("promtool")
	if err != nil {
		if os.Getenv("REQUIRE_PROMTOOL") == "true" {
			t.Fatal("promtool is required but is not installed")
		}
		t.Skip("promtool is not installed")
	}
	testData, err := os.ReadFile("testdata/model-resource-promql.test.yaml")
	require.NoError(t, err)
	for _, dist := range []string{"odh", "rhoai"} {
		for _, name := range []string{"perses-dashboard-model.yaml", "perses-dashboard-model-admin.yaml"} {
			t.Run(dist+"/"+name, func(t *testing.T) {
				data, err := os.ReadFile(filepath.Join("..", "..", "..", "manifests", "observability", dist, name))
				require.NoError(t, err)
				var resource unstructured.Unstructured
				require.NoError(t, yaml.Unmarshal(data, &resource.Object))
				queries, found, err := unstructured.NestedSlice(resource.Object, "spec", "config", "panels", "modelDeploymentsTable", "spec", "queries")
				require.NoError(t, err)
				require.True(t, found)
				require.GreaterOrEqual(t, len(queries), 7)
				query := func(index int, model string) string {
					value, ok := queries[index].(map[string]any)
					require.True(t, ok)
					expr, found, err := unstructured.NestedString(value, "spec", "plugin", "spec", "query")
					require.NoError(t, err)
					require.True(t, found)
					return strings.NewReplacer("$model_name", model, "$__range", "1m").Replace(expr)
				}
				contents := strings.NewReplacer(
					"@@GPU_QUERY@@", query(4, ".*"),
					"@@CPU_QUERY@@", query(5, ".*"),
					"@@QUOTA_QUERY@@", query(6, ".*"),
					"@@GPU_SELECTED_QUERY@@", query(4, "model-a"),
					"@@CPU_SELECTED_QUERY@@", query(5, "model-a"),
					"@@QUOTA_SELECTED_QUERY@@", query(6, "model-a"),
				).Replace(string(testData))
				path := filepath.Join(t.TempDir(), "test.yaml")
				require.NoError(t, os.WriteFile(path, []byte(contents), 0o600))
				output, err := exec.Command(promtool, "test", "rules", path).CombinedOutput()
				require.NoError(t, err, "%s", output)
			})
		}
	}
}
