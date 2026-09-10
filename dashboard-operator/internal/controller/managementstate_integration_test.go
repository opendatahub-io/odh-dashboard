//go:build integration

package controller_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/controller/conditions"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

// TestIntegration_ManagementStateRemoved_TeardownResources verifies that switching a
// deployed Dashboard to managementState: Removed tears down the module operands while
// preserving the CR and the operator's own resources, and reports the removed state on
// the status. (RHOAIENG-83646)
func TestIntegration_ManagementStateRemoved_TeardownResources(t *testing.T) {
	seedOperatorOwnedResources(t)

	manifests := createIntegrationManifests(t, []string{"model-registry"})
	r := newManifestReconciler(manifests)

	dashboard := newDashboard(v1alpha1.DashboardSpec{
		Gateway: &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Modules: disableAllModulesExcept("modelRegistry"),
	})

	ctx := context.Background()
	require.NoError(t, k8sClient.Create(ctx, dashboard))

	t.Cleanup(func() {
		deleteDashboard(t)
		cleanupModuleResources(t)
	})

	// Deploy first, then confirm the module operand and a managed core resource exist.
	reconcile(t, r)
	reconcile(t, r)
	require.Len(t, listDeployments(t, "model-registry"), 1, "module Deployment should exist before removal")
	// dashboard-core-config is a managed (non-operator-owned) ConfigMap the operator deploys; it
	// carries the same part-of=dashboard label as operator-owned resources. Confirm it exists now
	// so the post-teardown assertion below proves teardown actually deletes managed ConfigMaps
	// rather than skipping every ConfigMap that shares the label.
	assertExists(t, &corev1.ConfigMap{}, types.NamespacedName{Name: "dashboard-core-config", Namespace: integrationNamespace})

	// Flip to Removed and reconcile once to run the teardown path.
	dashboard = getDashboard(t)
	dashboard.Spec.ManagementState = "Removed"
	require.NoError(t, k8sClient.Update(ctx, dashboard))

	reconcile(t, r)

	// Module operands are gone.
	assert.Empty(t, listDeployments(t, "model-registry"), "module Deployment should be removed")
	assert.Empty(t, listServices(t, "model-registry"), "module Service should be removed")

	// The managed core ConfigMap is deleted — teardown discriminates by name, not just by label.
	assertGone(t, &corev1.ConfigMap{}, types.NamespacedName{Name: "dashboard-core-config", Namespace: integrationNamespace})

	// Operator-owned resources are preserved (skipped by name during teardown). The webhook
	// serving-cert Secret is intentionally not asserted: cert-manager issues it without the
	// part-of label, so teardown never selects it and a survival check would be false confidence.
	assertExists(t, &appsv1.Deployment{}, types.NamespacedName{Name: "dashboard-operator", Namespace: integrationNamespace})
	assertExists(t, &corev1.ServiceAccount{}, types.NamespacedName{Name: "dashboard-operator", Namespace: integrationNamespace})
	assertExists(t, &corev1.Service{}, types.NamespacedName{Name: "dashboard-operator-webhook", Namespace: integrationNamespace})
	assertExists(t, &corev1.ConfigMap{}, types.NamespacedName{Name: "odh-dashboard-config", Namespace: integrationNamespace})
	assertExists(t, &rbacv1.ClusterRole{}, types.NamespacedName{Name: "dashboard-operator-role"})
	assertExists(t, &rbacv1.ClusterRoleBinding{}, types.NamespacedName{Name: "dashboard-operator-rolebinding"})

	// CR is preserved and its status reflects the removal.
	dashboard = getDashboard(t)
	assert.Equal(t, common.PhaseNotReady, dashboard.Status.Phase)
	assert.Empty(t, dashboard.Status.URL)
	require.NotNil(t, dashboard.Status.ModuleStatuses)
	assert.Equal(t, v1alpha1.ModulePhaseNotDeployed, dashboard.Status.ModuleStatuses["modelRegistry"].Phase)
	assert.Equal(t, "NotRequired", dashboard.Status.ModuleStatuses["modelRegistry"].Reason)

	cond := conditions.FindStatusCondition(dashboard, string(common.ConditionTypeProvisioningSucceeded))
	require.NotNil(t, cond, "ProvisioningSucceeded condition should be present")
	assert.Equal(t, metav1.ConditionFalse, cond.Status)
	assert.Equal(t, "Removed", cond.Reason)
}

// TestIntegration_ManagementStateRemoved_IdempotentRereconcile verifies that repeated
// reconciles of a Removed Dashboard are stable — no errors, no resource recreation, and
// unchanged status. (RHOAIENG-83646)
func TestIntegration_ManagementStateRemoved_IdempotentRereconcile(t *testing.T) {
	seedOperatorOwnedResources(t)

	manifests := createIntegrationManifests(t, []string{"model-registry"})
	r := newManifestReconciler(manifests)

	dashboard := newDashboard(v1alpha1.DashboardSpec{
		Gateway: &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Modules: disableAllModulesExcept("modelRegistry"),
	})

	ctx := context.Background()
	require.NoError(t, k8sClient.Create(ctx, dashboard))

	t.Cleanup(func() {
		deleteDashboard(t)
		cleanupModuleResources(t)
	})

	reconcile(t, r)
	reconcile(t, r)

	dashboard = getDashboard(t)
	dashboard.Spec.ManagementState = "Removed"
	require.NoError(t, k8sClient.Update(ctx, dashboard))

	// First teardown reconcile plus two more — all must be stable.
	reconcile(t, r)
	reconcile(t, r)
	reconcile(t, r)

	assert.Empty(t, listDeployments(t, "model-registry"), "module Deployment should stay removed")
	assert.Empty(t, listServices(t, "model-registry"), "module Service should stay removed")

	dashboard = getDashboard(t)
	assert.Equal(t, common.PhaseNotReady, dashboard.Status.Phase)
	require.NotNil(t, dashboard.Status.ModuleStatuses)
	assert.Equal(t, v1alpha1.ModulePhaseNotDeployed, dashboard.Status.ModuleStatuses["modelRegistry"].Phase)
	assert.Equal(t, "NotRequired", dashboard.Status.ModuleStatuses["modelRegistry"].Reason)

	// Operator-owned resources remain intact across repeated teardowns.
	assertExists(t, &appsv1.Deployment{}, types.NamespacedName{Name: "dashboard-operator", Namespace: integrationNamespace})
	assertExists(t, &corev1.Service{}, types.NamespacedName{Name: "dashboard-operator-webhook", Namespace: integrationNamespace})
	assertExists(t, &corev1.ConfigMap{}, types.NamespacedName{Name: "odh-dashboard-config", Namespace: integrationNamespace})
	assertExists(t, &rbacv1.ClusterRole{}, types.NamespacedName{Name: "dashboard-operator-role"})
	assertExists(t, &rbacv1.ClusterRoleBinding{}, types.NamespacedName{Name: "dashboard-operator-rolebinding"})
}

// seedOperatorOwnedResources creates the operator's own resources — Deployment,
// ServiceAccount, ClusterRole, ClusterRoleBinding, the webhook Service, and the operator config
// ConfigMap — all carrying the part-of=dashboard label the operator's Helm chart stamps on them
// (commonLabels). Teardown lists them by label, then must skip them by name. Cleanup is registered
// so cluster-scoped resources never leak.
//
// The webhook serving-cert Secret is deliberately not seeded: cert-manager issues it from the
// chart's Certificate (no secretTemplate), so it never carries the part-of label and is never
// selected by teardown — seeding + asserting its survival would only give false confidence.
func seedOperatorOwnedResources(t *testing.T) {
	t.Helper()
	ctx := context.Background()

	partOf := map[string]string{labels.PlatformPartOf: "dashboard"}
	replicas := int32(1)
	podLabels := map[string]string{"app": "dashboard-operator"}

	objs := []client.Object{
		&appsv1.Deployment{
			ObjectMeta: metav1.ObjectMeta{Name: "dashboard-operator", Namespace: integrationNamespace, Labels: partOf},
			Spec: appsv1.DeploymentSpec{
				Replicas: &replicas,
				Selector: &metav1.LabelSelector{MatchLabels: podLabels},
				Template: corev1.PodTemplateSpec{
					ObjectMeta: metav1.ObjectMeta{Labels: podLabels},
					Spec: corev1.PodSpec{
						Containers: []corev1.Container{{
							Name:  "manager",
							Image: "registry.example.com/dashboard-operator:latest",
						}},
					},
				},
			},
		},
		&corev1.ServiceAccount{ObjectMeta: metav1.ObjectMeta{Name: "dashboard-operator", Namespace: integrationNamespace, Labels: partOf}},
		// Webhook Service: deleting it would break the failurePolicy: Fail ValidatingWebhookConfiguration.
		&corev1.Service{
			ObjectMeta: metav1.ObjectMeta{Name: "dashboard-operator-webhook", Namespace: integrationNamespace, Labels: partOf},
			Spec: corev1.ServiceSpec{
				Ports: []corev1.ServicePort{{Port: 443}},
			},
		},
		// Operator config ConfigMap the operator itself reads.
		&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "odh-dashboard-config", Namespace: integrationNamespace, Labels: partOf}},
		&rbacv1.ClusterRole{ObjectMeta: metav1.ObjectMeta{Name: "dashboard-operator-role", Labels: partOf}},
		&rbacv1.ClusterRoleBinding{
			ObjectMeta: metav1.ObjectMeta{Name: "dashboard-operator-rolebinding", Labels: partOf},
			RoleRef: rbacv1.RoleRef{
				APIGroup: rbacv1.GroupName,
				Kind:     "ClusterRole",
				Name:     "dashboard-operator-role",
			},
		},
	}

	for _, o := range objs {
		require.NoError(t, k8sClient.Create(ctx, o))
	}
	t.Cleanup(func() { deleteIgnoreNotFound(t, objs...) })
}

// assertExists asserts that getting the object at key succeeds.
func assertExists(t *testing.T, obj client.Object, key types.NamespacedName) {
	t.Helper()
	require.NoError(t, k8sClient.Get(context.Background(), key, obj),
		"expected %T %q to exist", obj, key.Name)
}

// assertGone asserts that getting the object at key returns NotFound.
func assertGone(t *testing.T, obj client.Object, key types.NamespacedName) {
	t.Helper()
	err := k8sClient.Get(context.Background(), key, obj)
	assert.True(t, apierrors.IsNotFound(err),
		"expected %T %q to be gone, got err=%v", obj, key.Name, err)
}
