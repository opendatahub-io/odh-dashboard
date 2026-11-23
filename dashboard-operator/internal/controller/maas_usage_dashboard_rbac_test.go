package controller

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	rbacv1 "k8s.io/api/rbac/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/render/kustomize"
)

func TestCleanupMaaSUsageDashboardRBAC(t *testing.T) {
	scheme := maasPortalScheme(t)
	ownership := map[string]string{
		labels.PlatformPartOf: "dashboard", moduleComponentLabel: observabilityComponent,
	}
	role := &rbacv1.Role{ObjectMeta: metav1.ObjectMeta{
		Name: "odh-dashboard-maas-usage-dashboards", Namespace: "custom-monitoring", Labels: ownership,
	}}
	binding := &rbacv1.RoleBinding{ObjectMeta: metav1.ObjectMeta{
		Name: role.Name, Namespace: role.Namespace, Labels: ownership,
	}}
	cli := fake.NewClientBuilder().WithScheme(scheme).WithObjects(role, binding).Build()
	r := &DashboardReconciler{Client: cli, Scheme: scheme, ApplicationsNamespace: "custom-applications"}
	dashboard := &v1alpha1.Dashboard{Spec: v1alpha1.DashboardSpec{
		Observability: &v1alpha1.ObservabilitySpec{PersesService: &v1alpha1.ServiceTarget{Namespace: role.Namespace}},
	}}
	ctx := context.Background()
	require.NoError(t, r.cleanupManagedObservability(ctx, dashboard))
	assert.True(t, apierrors.IsNotFound(cli.Get(ctx, client.ObjectKeyFromObject(role), &rbacv1.Role{})))
	assert.True(t, apierrors.IsNotFound(cli.Get(ctx, client.ObjectKeyFromObject(binding), &rbacv1.RoleBinding{})))
}

func TestMaaSManifestUsesConfiguredPersesNamespace(t *testing.T) {
	source := filepath.Join("..", "..", "..", "manifests", "modules", "maas")
	dir := filepath.Join(t.TempDir(), "maas")
	require.NoError(t, os.CopyFS(dir, os.DirFS(source)))
	params := readExistingParams(filepath.Join(dir, "params.env"))
	params["perses-namespace"] = "custom-monitoring"
	require.NoError(t, writeParamsEnv(dir, params))
	resources, err := kustomize.NewEngine().Render(dir, kustomize.WithNamespace("custom-applications"))
	require.NoError(t, err)
	for i := range resources {
		resource := &resources[i]
		if resource.GetKind() != "Deployment" || resource.GetName() != "maas-ui" {
			continue
		}
		containers, found, err := unstructured.NestedSlice(resource.Object, "spec", "template", "spec", "containers")
		require.NoError(t, err)
		require.True(t, found)
		for _, rawContainer := range containers {
			container := rawContainer.(map[string]interface{})
			if container["name"] != "maas-ui" {
				continue
			}
			for _, rawEnv := range container["env"].([]interface{}) {
				env := rawEnv.(map[string]interface{})
				if env["name"] == "PERSES_NAMESPACE" {
					assert.Equal(t, "custom-monitoring", env["value"])
					return
				}
			}
		}
	}
	t.Fatal("MaaS deployment PERSES_NAMESPACE was not rendered")
}

func TestMaaSUsageDashboardRBACIsNamespacedAndLimited(t *testing.T) {
	source := filepath.Join("..", "..", "..", "manifests", "observability", "rhoai")
	resources, err := kustomize.NewEngine().Render(source, kustomize.WithNamespace("custom-monitoring"))
	require.NoError(t, err)
	require.NoError(t, setMaaSUsageDashboardRoleBindingNamespace(resources, "custom-applications"))

	var role, binding *unstructured.Unstructured
	for i := range resources {
		resource := &resources[i]
		if resource.GetName() != "odh-dashboard-maas-usage-dashboards" {
			continue
		}
		switch resource.GetKind() {
		case "Role":
			role = resource
		case "RoleBinding":
			binding = resource
		}
	}
	require.NotNil(t, role)
	require.NotNil(t, binding)
	assert.Equal(t, "custom-monitoring", role.GetNamespace())
	assert.Equal(t, "custom-monitoring", binding.GetNamespace())
	subjects, found, err := unstructured.NestedSlice(binding.Object, "subjects")
	require.NoError(t, err)
	require.True(t, found)
	require.Len(t, subjects, 1)
	assert.Equal(t, map[string]interface{}{
		"kind": "ServiceAccount", "name": "odh-dashboard-maas", "namespace": "custom-applications",
	}, subjects[0])
	rules, found, err := unstructured.NestedSlice(role.Object, "rules")
	require.NoError(t, err)
	require.True(t, found)
	require.Len(t, rules, 1)
	rule := rules[0].(map[string]interface{})
	assert.Equal(t, []interface{}{"perses.dev"}, rule["apiGroups"])
	assert.Equal(t, []interface{}{"persesdashboards"}, rule["resources"])
	assert.Equal(t, []interface{}{"dashboard-5-maas-usage-logs", "dashboard-4-maas-usage-logs-admin"}, rule["resourceNames"])
	assert.Equal(t, []interface{}{"get"}, rule["verbs"])
}
