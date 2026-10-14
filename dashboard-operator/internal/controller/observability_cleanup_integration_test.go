//go:build integration

package controller_test

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	rbacv1 "k8s.io/api/rbac/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/rest"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/controller/conditions"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	ctrlpkg "github.com/opendatahub-io/odh-dashboard/dashboard-operator/internal/controller"
)

func TestIntegration_Observability_CleanupFailureDoesNotBlockCore(t *testing.T) {
	installPersesCRD(t)
	ctx := context.Background()
	admin := newIsolatedClient(t)
	const identity = "observability-cleanup-test"
	// Grant core reconciliation access but omit Perses. Cleanup failures below
	// come from the real API server's RBAC authorization, without interceptors.
	role := &rbacv1.ClusterRole{
		ObjectMeta: metav1.ObjectMeta{Name: identity},
		Rules: []rbacv1.PolicyRule{
			{APIGroups: []string{"", "apps", "rbac.authorization.k8s.io", "networking.k8s.io", "policy",
				"components.platform.opendatahub.io", "gateway.networking.k8s.io", "console.openshift.io",
				"apiextensions.k8s.io", "operators.coreos.com", "config.openshift.io"}, Resources: []string{"*"}, Verbs: []string{"*"}},
			{NonResourceURLs: []string{"*"}, Verbs: []string{"get"}},
		},
	}
	binding := &rbacv1.ClusterRoleBinding{
		ObjectMeta: metav1.ObjectMeta{Name: identity},
		RoleRef:    rbacv1.RoleRef{APIGroup: rbacv1.GroupName, Kind: "ClusterRole", Name: identity},
		Subjects:   []rbacv1.Subject{{Kind: "User", APIGroup: rbacv1.GroupName, Name: identity}},
	}
	require.NoError(t, admin.Create(ctx, role))
	t.Cleanup(func() { deleteIgnoreNotFound(t, role) })
	require.NoError(t, admin.Create(ctx, binding))
	t.Cleanup(func() { deleteIgnoreNotFound(t, binding) })

	cfg := rest.CopyConfig(restCfg)
	cfg.Impersonate = rest.ImpersonationConfig{UserName: identity, Groups: []string{"system:authenticated"}}
	restricted, err := client.New(cfg, client.Options{Scheme: k8sClient.Scheme()})
	require.NoError(t, err)
	r := newReconcilerWithClient(restricted, createIntegrationManifests(t, nil))
	dashboard := newDashboard(v1alpha1.DashboardSpec{
		ManagementSpec: common.ManagementSpec{ManagementState: "Managed"},
		Gateway:        &v1alpha1.GatewaySpec{Domain: "apps.example.com"},
		Modules:        disableAllModulesExcept(),
		Observability:  &v1alpha1.ObservabilitySpec{Enabled: false},
	})
	require.NoError(t, admin.Create(ctx, dashboard))
	t.Cleanup(func() {
		deleteDashboard(t)
		cleanupModuleResources(t)
	})
	stale := &unstructured.Unstructured{Object: map[string]any{
		"apiVersion": "perses.dev/v1alpha1", "kind": "PersesDashboard",
		"metadata": map[string]any{"name": "cleanup-test-dashboard", "namespace": integrationNamespace,
			"labels": map[string]any{labels.PlatformPartOf: "dashboard", "app.kubernetes.io/component": "observability"}},
		"spec": map[string]any{},
	}}
	require.NoError(t, admin.Create(ctx, stale))
	t.Cleanup(func() { require.NoError(t, client.IgnoreNotFound(admin.Delete(ctx, stale))) })

	list := &unstructured.UnstructuredList{}
	list.SetGroupVersionKind(persesDashboardListGVK)
	require.Eventually(t, func() bool {
		return apierrors.IsForbidden(restricted.List(ctx, list))
	}, 10*time.Second, 100*time.Millisecond, "Perses lists must be denied by RBAC")
	reconcile(t, r) // Add the finalizer.

	for _, operation := range []string{"list", "delete"} {
		t.Run(operation, func(t *testing.T) {
			if operation == "delete" {
				role.Rules = append(role.Rules, rbacv1.PolicyRule{
					APIGroups: []string{"perses.dev"}, Resources: []string{"persesdashboards"}, Verbs: []string{"get", "list"},
				})
				require.NoError(t, admin.Update(ctx, role))
				require.Eventually(t, func() bool {
					return restricted.List(ctx, list) == nil && apierrors.IsForbidden(restricted.Delete(ctx, stale, client.DryRunAll))
				}, 10*time.Second, 100*time.Millisecond, "Perses lists must succeed while deletes remain denied")
			}
			result := reconcile(t, r)
			assert.Equal(t, ctrlpkg.ObservabilityRetryInterval, result.RequeueAfter)
			updated := getDashboard(t)
			condition := conditions.FindStatusCondition(updated, conditionObservabilityAvailable)
			require.NotNil(t, condition)
			assert.Equal(t, "CleanupFailed", condition.Reason)
			assert.Equal(t, common.ConditionSeverityInfo, condition.Severity)
			assert.Contains(t, condition.Message, "forbidden")
			assert.True(t, conditions.IsStatusConditionTrue(updated, string(common.ConditionTypeProvisioningSucceeded)))
			assert.True(t, conditions.IsStatusConditionTrue(updated, string(common.ConditionTypeReady)))
			assert.Equal(t, common.PhaseReady, updated.Status.Phase)
			require.NoError(t, admin.Get(ctx, client.ObjectKeyFromObject(stale), stale))
		})
	}
	coreUID := getConfigMap(t, "dashboard-core-config").UID
	role.Rules[len(role.Rules)-1].Verbs = append(role.Rules[len(role.Rules)-1].Verbs, "delete")
	require.NoError(t, admin.Update(ctx, role))
	require.Eventually(t, func() bool {
		return restricted.Delete(ctx, stale, client.DryRunAll) == nil
	}, 10*time.Second, 100*time.Millisecond, "Perses deletion permission must recover")
	reconcile(t, r)
	updated := getDashboard(t)
	assert.Equal(t, "Disabled", conditionReason(updated, conditionObservabilityAvailable))
	assert.True(t, conditions.IsStatusConditionTrue(updated, string(common.ConditionTypeReady)))
	assert.Equal(t, common.PhaseReady, updated.Status.Phase)
	assert.True(t, apierrors.IsNotFound(admin.Get(ctx, client.ObjectKeyFromObject(stale), stale)))
	assert.Equal(t, coreUID, getConfigMap(t, "dashboard-core-config").UID)
}
