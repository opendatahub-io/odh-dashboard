package controller

import (
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/render/kustomize"
)

func TestDashboardManifestsDoNotDependOnClusterMonitoringView(t *testing.T) {
	tests := []struct {
		name            string
		overlay         string
		clusterRoleName string
	}{
		{name: "ODH", overlay: "odh", clusterRoleName: "odh-dashboard"},
		{name: "RHOAI", overlay: "rhoai", clusterRoleName: "rhods-dashboard"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			source := filepath.Join("..", "..", "..", "manifests", tt.overlay)
			resources, err := kustomize.NewEngine().Render(source, kustomize.WithNamespace("dashboard-test"))
			require.NoError(t, err)

			var dashboardRole *unstructured.Unstructured
			for i := range resources {
				resource := &resources[i]
				if resource.GetKind() == "ClusterRoleBinding" {
					assert.NotContains(t, []string{"odh-dashboard-monitoring", "rhods-dashboard-monitoring"}, resource.GetName())
					roleName, found, nestedErr := unstructured.NestedString(resource.Object, "roleRef", "name")
					require.NoError(t, nestedErr)
					require.True(t, found)
					assert.NotEqual(t, "cluster-monitoring-view", roleName)
				}
				if resource.GetKind() == "ClusterRole" && resource.GetName() == tt.clusterRoleName {
					dashboardRole = resource
				}
			}

			require.NotNil(t, dashboardRole)
			assertNamespaceAccess(t, dashboardRole)
		})
	}
}

func assertNamespaceAccess(t *testing.T, role *unstructured.Unstructured) {
	t.Helper()
	rules, found, err := unstructured.NestedSlice(role.Object, "rules")
	require.NoError(t, err)
	require.True(t, found)

	for _, rawRule := range rules {
		rule, ok := rawRule.(map[string]interface{})
		require.True(t, ok)
		apiGroups, _, err := unstructured.NestedStringSlice(rule, "apiGroups")
		require.NoError(t, err)
		resources, _, err := unstructured.NestedStringSlice(rule, "resources")
		require.NoError(t, err)
		if !containsString(apiGroups, "") || !containsString(resources, "namespaces") {
			continue
		}

		verbs, _, err := unstructured.NestedStringSlice(rule, "verbs")
		require.NoError(t, err)
		assert.ElementsMatch(t, []string{"get", "patch"}, verbs)
		return
	}

	require.Fail(t, "dashboard ClusterRole does not grant namespace access")
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}
