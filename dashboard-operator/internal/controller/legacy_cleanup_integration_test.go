//go:build integration

package controller_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

// TestIntegration_LegacySidecarCleanup verifies that a normal reconcile removes the
// resources left behind by the now-removed sidecar deployment mode (upgrade safety),
// while leaving unrelated resources in the namespace untouched. (RHOAIENG-83648)
func TestIntegration_LegacySidecarCleanup(t *testing.T) {
	seedLegacySidecarResources(t)

	// An unrelated ConfigMap that must survive the legacy sweep.
	survivor := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{Name: "unrelated-config", Namespace: integrationNamespace},
		Data:       map[string]string{"keep": "me"},
	}
	require.NoError(t, k8sClient.Create(context.Background(), survivor))
	t.Cleanup(func() { deleteIgnoreNotFound(t, survivor) })

	manifests := createIntegrationManifests(t, nil)
	r := newManifestReconciler(manifests)

	dashboard := newDashboard(v1alpha1.DashboardSpec{
		Gateway: &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Modules: disableAllModulesExcept(), // all modules disabled
	})

	ctx := context.Background()
	require.NoError(t, k8sClient.Create(ctx, dashboard))

	t.Cleanup(func() {
		deleteDashboard(t)
		cleanupModuleResources(t)
	})

	// cleanupLegacySidecarResources runs first in the deployment pipeline.
	reconcile(t, r)
	reconcile(t, r)

	// All six legacy resources must be gone.
	assertNotFound(t, &corev1.ServiceAccount{}, types.NamespacedName{Name: "odh-dashboard-modules", Namespace: integrationNamespace})
	assertNotFound(t, &corev1.Secret{}, types.NamespacedName{Name: "odh-dashboard-modules-token", Namespace: integrationNamespace})
	assertNotFound(t, &networkingv1.NetworkPolicy{}, types.NamespacedName{Name: "odh-dashboard-allow-ports", Namespace: integrationNamespace})
	assertNotFound(t, &corev1.ConfigMap{}, types.NamespacedName{Name: "sidecar-params", Namespace: integrationNamespace})
	assertNotFound(t, &rbacv1.ClusterRole{}, types.NamespacedName{Name: "odh-dashboard-modules"})
	assertNotFound(t, &rbacv1.ClusterRoleBinding{}, types.NamespacedName{Name: "odh-dashboard-modules"})

	// The unrelated ConfigMap must still exist.
	require.NoError(t, k8sClient.Get(ctx, types.NamespacedName{
		Name:      "unrelated-config",
		Namespace: integrationNamespace,
	}, &corev1.ConfigMap{}), "unrelated ConfigMap should survive the legacy cleanup")
}

// seedLegacySidecarResources creates the six resources the removed sidecar mode used
// to provision, registering cleanup so they never leak (cluster-scoped ones in
// particular). The reconcile under test is expected to delete them.
func seedLegacySidecarResources(t *testing.T) {
	t.Helper()
	ctx := context.Background()

	objs := []client.Object{
		&corev1.ServiceAccount{ObjectMeta: metav1.ObjectMeta{Name: "odh-dashboard-modules", Namespace: integrationNamespace}},
		&corev1.Secret{ObjectMeta: metav1.ObjectMeta{Name: "odh-dashboard-modules-token", Namespace: integrationNamespace}},
		&networkingv1.NetworkPolicy{
			ObjectMeta: metav1.ObjectMeta{Name: "odh-dashboard-allow-ports", Namespace: integrationNamespace},
			Spec:       networkingv1.NetworkPolicySpec{PodSelector: metav1.LabelSelector{}},
		},
		&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "sidecar-params", Namespace: integrationNamespace}},
		&rbacv1.ClusterRole{ObjectMeta: metav1.ObjectMeta{Name: "odh-dashboard-modules"}},
		&rbacv1.ClusterRoleBinding{
			ObjectMeta: metav1.ObjectMeta{Name: "odh-dashboard-modules"},
			RoleRef: rbacv1.RoleRef{
				APIGroup: rbacv1.GroupName,
				Kind:     "ClusterRole",
				Name:     "odh-dashboard-modules",
			},
		},
	}

	for _, o := range objs {
		require.NoError(t, k8sClient.Create(ctx, o))
	}
	t.Cleanup(func() { deleteIgnoreNotFound(t, objs...) })
}

// assertNotFound asserts that getting the object at key returns a NotFound error.
func assertNotFound(t *testing.T, obj client.Object, key types.NamespacedName) {
	t.Helper()
	err := k8sClient.Get(context.Background(), key, obj)
	assert.True(t, k8serrors.IsNotFound(err), "expected %T %q to be NotFound, got: %v", obj, key.Name, err)
}
