//go:build integration

package controller_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/rest"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/yaml"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

func TestIntegration_NamespacedRBACUnderOperatorPermissions(t *testing.T) {
	ctx := context.Background()
	admin := newIsolatedClient(t)

	notebooksNS := "real-rbac-notebooks"
	modelRegistryNS := "real-rbac-model-registry"
	unrelatedNS := "real-rbac-unrelated"
	for _, namespace := range []string{notebooksNS, modelRegistryNS, unrelatedNS} {
		ns := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: namespace}}
		require.NoError(t, admin.Create(ctx, ns))
		t.Cleanup(func() { deleteIgnoreNotFound(t, ns) })
	}
	// Only the two target namespaces opt in to namespaced RBAC.
	for _, namespace := range []string{notebooksNS, modelRegistryNS} {
		target := &corev1.Namespace{}
		require.NoError(t, admin.Get(ctx, types.NamespacedName{Name: namespace}, target))
		if target.Labels == nil {
			target.Labels = map[string]string{}
		}
		target.Labels[v1alpha1.NamespacedRBACOptInLabel] = "true"
		require.NoError(t, admin.Update(ctx, target))
	}

	operatorSA := &corev1.ServiceAccount{ObjectMeta: metav1.ObjectMeta{
		Name:      "real-rbac-operator",
		Namespace: integrationNamespace,
	}}
	require.NoError(t, admin.Create(ctx, operatorSA))
	t.Cleanup(func() { deleteIgnoreNotFound(t, operatorSA) })

	// Load the real operator ClusterRole and remove only its Secret grant. This
	// mirrors the chart after RHOAIENG-98916 without granting test-only access.
	roleData, err := os.ReadFile(filepath.Join("..", "..", "config", "rbac", "role.yaml"))
	require.NoError(t, err)
	clusterRole := &rbacv1.ClusterRole{}
	require.NoError(t, yaml.Unmarshal(roleData, clusterRole))
	clusterRole.Name = "real-rbac-operator-role"
	for i := range clusterRole.Rules {
		resources := make([]string, 0, len(clusterRole.Rules[i].Resources))
		for _, resource := range clusterRole.Rules[i].Resources {
			if resource != "secrets" {
				resources = append(resources, resource)
			}
		}
		clusterRole.Rules[i].Resources = resources
	}
	require.NoError(t, admin.Create(ctx, clusterRole))
	t.Cleanup(func() { deleteIgnoreNotFound(t, clusterRole) })

	clusterBinding := &rbacv1.ClusterRoleBinding{
		ObjectMeta: metav1.ObjectMeta{Name: "real-rbac-operator-rolebinding"},
		RoleRef:    rbacv1.RoleRef{APIGroup: rbacv1.GroupName, Kind: "ClusterRole", Name: clusterRole.Name},
		Subjects: []rbacv1.Subject{{
			Kind:      "ServiceAccount",
			Name:      operatorSA.Name,
			Namespace: operatorSA.Namespace,
		}},
	}
	require.NoError(t, admin.Create(ctx, clusterBinding))
	t.Cleanup(func() { deleteIgnoreNotFound(t, clusterBinding) })

	// Pre-provision the operator's Secret Role in the applications namespace and
	// both target namespaces, exactly as the installer does in production.
	for _, namespace := range []string{integrationNamespace, notebooksNS, modelRegistryNS} {
		role := &rbacv1.Role{
			ObjectMeta: metav1.ObjectMeta{Name: "real-rbac-operator-secrets", Namespace: namespace},
			Rules: []rbacv1.PolicyRule{{
				APIGroups: []string{""},
				Resources: []string{"secrets"},
				Verbs:     []string{"get", "list", "create", "update", "patch", "delete"},
			}},
		}
		binding := &rbacv1.RoleBinding{
			ObjectMeta: metav1.ObjectMeta{Name: "real-rbac-operator-secrets", Namespace: namespace},
			RoleRef:    rbacv1.RoleRef{APIGroup: rbacv1.GroupName, Kind: "Role", Name: role.Name},
			Subjects: []rbacv1.Subject{{
				Kind:      "ServiceAccount",
				Name:      operatorSA.Name,
				Namespace: operatorSA.Namespace,
			}},
		}
		require.NoError(t, admin.Create(ctx, role))
		require.NoError(t, admin.Create(ctx, binding))
		t.Cleanup(func() {
			deleteIgnoreNotFound(t, role)
			deleteIgnoreNotFound(t, binding)
		})
	}

	cfg := rest.CopyConfig(restCfg)
	cfg.Impersonate = rest.ImpersonationConfig{
		UserName: "system:serviceaccount:" + integrationNamespace + ":" + operatorSA.Name,
		Groups:   []string{"system:serviceaccounts", "system:serviceaccounts:" + integrationNamespace, "system:authenticated"},
	}
	restricted, err := client.New(cfg, client.Options{Scheme: admin.Scheme()})
	require.NoError(t, err)

	// The restricted operator can manage Secrets only in its intended namespaces.
	for _, namespace := range []string{integrationNamespace, notebooksNS, modelRegistryNS} {
		secret := &corev1.Secret{ObjectMeta: metav1.ObjectMeta{Name: "dry-run", Namespace: namespace}}
		require.NoError(t, restricted.Create(ctx, secret, client.DryRunAll), "namespace: %s", namespace)
	}
	unrelatedSecret := &corev1.Secret{ObjectMeta: metav1.ObjectMeta{Name: "denied", Namespace: unrelatedNS}}
	err = restricted.Create(ctx, unrelatedSecret, client.DryRunAll)
	assert.True(t, apierrors.IsForbidden(err), "expected unrelated namespace Secret creation to be forbidden, got %v", err)

	dashboard := newDashboard(v1alpha1.DashboardSpec{
		ManagementSpec:         common.ManagementSpec{ManagementState: "Managed"},
		NotebooksNamespace:     notebooksNS,
		ModelRegistryNamespace: modelRegistryNS,
		Modules:                disableAllModulesExcept(),
	})
	require.NoError(t, restricted.Create(ctx, dashboard))
	t.Cleanup(func() { deleteDashboard(t) })

	r := newReconcilerWithClient(restricted, createIntegrationManifests(t, nil))
	r.NamespacedRBACAdmissionEnabled = true
	r.NamespacedRBACWebhookEnabled = true

	// First reconcile adds the finalizer; the second performs the RBAC work.
	reconcile(t, r)
	reconcile(t, r)

	for _, tt := range []struct {
		namespace string
		role      string
		binding   string
		rule      rbacv1.PolicyRule
	}{
		{
			namespace: notebooksNS,
			role:      "dashboard-notebooks-role",
			binding:   "dashboard-notebooks-rolebinding",
			rule: rbacv1.PolicyRule{
				APIGroups: []string{""},
				Resources: []string{"secrets"},
				Verbs:     []string{"create", "get", "update"},
			},
		},
		{
			namespace: modelRegistryNS,
			role:      "dashboard-model-registry-role",
			binding:   "dashboard-model-registry-rolebinding",
			rule: rbacv1.PolicyRule{
				APIGroups: []string{""},
				Resources: []string{"secrets"},
				Verbs:     []string{"create", "delete", "get", "list", "patch"},
			},
		},
	} {
		role := &rbacv1.Role{}
		require.NoError(t, admin.Get(ctx, types.NamespacedName{Namespace: tt.namespace, Name: tt.role}, role), "namespace: %s", tt.namespace)
		assert.Contains(t, role.Rules, tt.rule, "namespace: %s", tt.namespace)

		binding := &rbacv1.RoleBinding{}
		require.NoError(t, admin.Get(ctx, types.NamespacedName{Namespace: tt.namespace, Name: tt.binding}, binding), "namespace: %s", tt.namespace)
		assert.Equal(t, "Role", binding.RoleRef.Kind)
		assert.Equal(t, tt.role, binding.RoleRef.Name)
	}
}
