package controller_test

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/client/interceptor"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	ctrlpkg "github.com/opendatahub-io/odh-dashboard/dashboard-operator/internal/controller"
)

const (
	testAppNamespace    = "redhat-ods-applications"
	testNotebooksNS     = "rhods-notebooks"
	testModelRegistryNS = "rhoai-model-registries"
	managedLabel        = "dashboard.opendatahub.io/namespaced-rbac"
)

func newReconciler(t *testing.T, platform cluster.Platform, objects ...client.Object) (*ctrlpkg.DashboardReconciler, client.Client) {
	t.Helper()
	s := testScheme(t)
	baseObjects := []client.Object{
		optedInNamespace(testNotebooksNS),
		optedInNamespace(testModelRegistryNS),
	}
	baseObjects = append(baseObjects, objects...)
	cli := fake.NewClientBuilder().WithScheme(s).WithObjects(baseObjects...).Build()
	r := &ctrlpkg.DashboardReconciler{
		Client:                         cli,
		APIReader:                      cli,
		Scheme:                         s,
		ManifestsBasePath:              t.TempDir(),
		Platform:                       platform,
		Namespace:                      testNamespace,
		ApplicationsNamespace:          testAppNamespace,
		NamespacedRBACAdmissionEnabled: true,
	}
	return r, cli
}

func optedInNamespace(name string) *corev1.Namespace {
	return &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{
		Name: name,
		Labels: map[string]string{
			v1alpha1.NamespacedRBACOptInLabel: "true",
		},
	}}
}

func newRBACDashboard(notebooksNS, modelRegistryNS string) *v1alpha1.Dashboard {
	return &v1alpha1.Dashboard{
		ObjectMeta: metav1.ObjectMeta{
			Name: v1alpha1.DashboardInstanceName,
		},
		Spec: v1alpha1.DashboardSpec{
			NotebooksNamespace:     notebooksNS,
			ModelRegistryNamespace: modelRegistryNS,
		},
	}
}

func managedRBACLabels() client.MatchingLabels {
	return client.MatchingLabels{
		managedLabel:          "true",
		labels.PlatformPartOf: "dashboard",
	}
}

func listRoles(t *testing.T, cli client.Client) []rbacv1.Role {
	t.Helper()
	var list rbacv1.RoleList
	require.NoError(t, cli.List(context.Background(), &list, managedRBACLabels()))
	return list.Items
}

func listRoleBindings(t *testing.T, cli client.Client) []rbacv1.RoleBinding {
	t.Helper()
	var list rbacv1.RoleBindingList
	require.NoError(t, cli.List(context.Background(), &list, managedRBACLabels()))
	return list.Items
}

func getRole(t *testing.T, cli client.Client, ns, name string) *rbacv1.Role {
	t.Helper()
	role := &rbacv1.Role{}
	err := cli.Get(context.Background(), types.NamespacedName{Namespace: ns, Name: name}, role)
	require.NoError(t, err)
	return role
}

func getRoleBinding(t *testing.T, cli client.Client, ns, name string) *rbacv1.RoleBinding {
	t.Helper()
	rb := &rbacv1.RoleBinding{}
	err := cli.Get(context.Background(), types.NamespacedName{Namespace: ns, Name: name}, rb)
	require.NoError(t, err)
	return rb
}

// TestDashboardSAName verifies platform-based SA name selection.
func TestDashboardSAName(t *testing.T) {
	tests := []struct {
		platform cluster.Platform
		want     string
	}{
		{cluster.SelfManagedRhoai, "rhods-dashboard"},
		{cluster.ManagedRhoai, "rhods-dashboard"},
		{cluster.OpenDataHub, "odh-dashboard"},
		{cluster.XKS, "odh-dashboard"},
	}
	for _, tc := range tests {
		t.Run(string(tc.platform), func(t *testing.T) {
			assert.Equal(t, tc.want, ctrlpkg.DashboardSAName(tc.platform))
		})
	}
}

// TestReconcileNamespacedRBAC_BothNamespaces verifies that Roles and RoleBindings
// are created in both target namespaces when both spec fields are set.
func TestReconcileNamespacedRBAC_BothNamespaces(t *testing.T) {
	r, cli := newReconciler(t, cluster.SelfManagedRhoai)
	dashboard := newRBACDashboard(testNotebooksNS, testModelRegistryNS)

	err := r.ReconcileNamespacedRBAC(context.Background(), dashboard)
	require.NoError(t, err)

	// Expect 2 Roles and 2 RoleBindings
	roles := listRoles(t, cli)
	assert.Len(t, roles, 2)

	rbs := listRoleBindings(t, cli)
	assert.Len(t, rbs, 2)

	// Verify notebooks Role is in the right namespace with the right rules
	notebooksRole := getRole(t, cli, testNotebooksNS, "dashboard-notebooks-role")
	assert.Equal(t, testNotebooksNS, notebooksRole.Namespace)
	assert.Len(t, notebooksRole.Rules, 3)

	// Verify notebooks RoleBinding points to rhods-dashboard SA
	notebooksRB := getRoleBinding(t, cli, testNotebooksNS, "dashboard-notebooks-rolebinding")
	require.Len(t, notebooksRB.Subjects, 1)
	assert.Equal(t, "rhods-dashboard", notebooksRB.Subjects[0].Name)
	assert.Equal(t, testAppNamespace, notebooksRB.Subjects[0].Namespace)
	assert.Equal(t, "dashboard-notebooks-role", notebooksRB.RoleRef.Name)

	// Verify model-registry Role is in the right namespace
	mrRole := getRole(t, cli, testModelRegistryNS, "dashboard-model-registry-role")
	assert.Equal(t, testModelRegistryNS, mrRole.Namespace)
	assert.Len(t, mrRole.Rules, 2)

	// Verify model-registry RoleBinding
	mrRB := getRoleBinding(t, cli, testModelRegistryNS, "dashboard-model-registry-rolebinding")
	require.Len(t, mrRB.Subjects, 1)
	assert.Equal(t, "rhods-dashboard", mrRB.Subjects[0].Name)
}

// TestReconcileNamespacedRBAC_OnlyNotebooks verifies only notebooks RBAC is created
// when ModelRegistryNamespace is empty.
func TestReconcileNamespacedRBAC_OnlyNotebooks(t *testing.T) {
	r, cli := newReconciler(t, cluster.OpenDataHub)
	dashboard := newRBACDashboard(testNotebooksNS, "")

	err := r.ReconcileNamespacedRBAC(context.Background(), dashboard)
	require.NoError(t, err)

	roles := listRoles(t, cli)
	assert.Len(t, roles, 1)
	assert.Equal(t, testNotebooksNS, roles[0].Namespace)

	rbs := listRoleBindings(t, cli)
	assert.Len(t, rbs, 1)

	// ODH platform uses odh-dashboard SA
	rb := getRoleBinding(t, cli, testNotebooksNS, "dashboard-notebooks-rolebinding")
	assert.Equal(t, "odh-dashboard", rb.Subjects[0].Name)
}

// TestReconcileNamespacedRBAC_OnlyModelRegistry verifies only model-registry RBAC
// is created when NotebooksNamespace is empty.
func TestReconcileNamespacedRBAC_OnlyModelRegistry(t *testing.T) {
	r, cli := newReconciler(t, cluster.OpenDataHub)
	dashboard := newRBACDashboard("", testModelRegistryNS)

	err := r.ReconcileNamespacedRBAC(context.Background(), dashboard)
	require.NoError(t, err)

	roles := listRoles(t, cli)
	assert.Len(t, roles, 1)
	assert.Equal(t, testModelRegistryNS, roles[0].Namespace)

	rbs := listRoleBindings(t, cli)
	assert.Len(t, rbs, 1)
}

// TestReconcileNamespacedRBAC_NoNamespaces verifies nothing is created when both
// namespace fields are empty.
func TestReconcileNamespacedRBAC_NoNamespaces(t *testing.T) {
	r, cli := newReconciler(t, cluster.OpenDataHub)
	dashboard := newRBACDashboard("", "")

	err := r.ReconcileNamespacedRBAC(context.Background(), dashboard)
	require.NoError(t, err)

	assert.Empty(t, listRoles(t, cli))
	assert.Empty(t, listRoleBindings(t, cli))
}

func TestReconcileNamespacedRBAC_AdmissionDisabledFailsClosedAndRevokes(t *testing.T) {
	r, cli := newReconciler(t, cluster.SelfManagedRhoai)
	dashboard := newRBACDashboard(testNotebooksNS, "")
	require.NoError(t, r.ReconcileNamespacedRBAC(context.Background(), dashboard))
	require.Len(t, listRoles(t, cli), 1)

	r.NamespacedRBACAdmissionEnabled = false
	err := r.ReconcileNamespacedRBAC(context.Background(), dashboard)
	require.ErrorContains(t, err, "requires the validating webhook and at least one trusted writer")
	assert.Empty(t, listRoles(t, cli))
	assert.Empty(t, listRoleBindings(t, cli))
}

func TestReconcileNamespacedRBAC_RejectsUnlabelledNamespace(t *testing.T) {
	unlabelled := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "arbitrary-namespace"}}
	r, cli := newReconciler(t, cluster.OpenDataHub, unlabelled)

	err := r.ReconcileNamespacedRBAC(context.Background(), newRBACDashboard(unlabelled.Name, ""))
	require.ErrorContains(t, err, "dashboard.opendatahub.io/allow-namespaced-rbac=true")
	assert.Empty(t, listRoles(t, cli))
	assert.Empty(t, listRoleBindings(t, cli))
}

func TestReconcileNamespacedRBAC_RejectsMissingNamespace(t *testing.T) {
	r, cli := newReconciler(t, cluster.OpenDataHub)

	err := r.ReconcileNamespacedRBAC(context.Background(), newRBACDashboard("missing-namespace", ""))
	require.ErrorContains(t, err, "getting target namespace")
	assert.Empty(t, listRoles(t, cli))
	assert.Empty(t, listRoleBindings(t, cli))
}

func TestReconcileNamespacedRBAC_MixedValidationAppliesOnlyOptedInTarget(t *testing.T) {
	unlabelled := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "arbitrary-registry"}}
	r, cli := newReconciler(t, cluster.OpenDataHub, unlabelled)

	err := r.ReconcileNamespacedRBAC(context.Background(), newRBACDashboard(testNotebooksNS, unlabelled.Name))
	require.ErrorContains(t, err, "model-registry namespace RBAC")

	roles := listRoles(t, cli)
	require.Len(t, roles, 1)
	assert.Equal(t, testNotebooksNS, roles[0].Namespace)
	bindings := listRoleBindings(t, cli)
	require.Len(t, bindings, 1)
	assert.Equal(t, testNotebooksNS, bindings[0].Namespace)
}

func TestReconcileNamespacedRBAC_RemovingOptInRevokesExistingGrant(t *testing.T) {
	r, cli := newReconciler(t, cluster.OpenDataHub)
	dashboard := newRBACDashboard(testNotebooksNS, "")
	require.NoError(t, r.ReconcileNamespacedRBAC(context.Background(), dashboard))
	require.Len(t, listRoles(t, cli), 1)

	namespace := &corev1.Namespace{}
	require.NoError(t, cli.Get(context.Background(), types.NamespacedName{Name: testNotebooksNS}, namespace))
	delete(namespace.Labels, v1alpha1.NamespacedRBACOptInLabel)
	require.NoError(t, cli.Update(context.Background(), namespace))

	err := r.ReconcileNamespacedRBAC(context.Background(), dashboard)
	require.ErrorContains(t, err, "dashboard.opendatahub.io/allow-namespaced-rbac=true")
	assert.Empty(t, listRoles(t, cli))
	assert.Empty(t, listRoleBindings(t, cli))
}

func TestReconcileNamespacedRBAC_RemovingOptInRevokesGrantAfterLabelsAreStripped(t *testing.T) {
	r, cli := newReconciler(t, cluster.OpenDataHub)
	dashboard := newRBACDashboard(testNotebooksNS, "")
	require.NoError(t, r.ReconcileNamespacedRBAC(context.Background(), dashboard))

	role := getRole(t, cli, testNotebooksNS, "dashboard-notebooks-role")
	role.Labels = nil
	require.NoError(t, cli.Update(context.Background(), role))
	binding := getRoleBinding(t, cli, testNotebooksNS, "dashboard-notebooks-rolebinding")
	binding.Labels = nil
	require.NoError(t, cli.Update(context.Background(), binding))

	namespace := &corev1.Namespace{}
	require.NoError(t, cli.Get(context.Background(), types.NamespacedName{Name: testNotebooksNS}, namespace))
	delete(namespace.Labels, v1alpha1.NamespacedRBACOptInLabel)
	require.NoError(t, cli.Update(context.Background(), namespace))

	err := r.ReconcileNamespacedRBAC(context.Background(), dashboard)
	require.ErrorContains(t, err, v1alpha1.NamespacedRBACOptInLabel+"=true")
	assert.True(t, k8sNotFound(t, cli, context.Background(), &rbacv1.Role{}, testNotebooksNS, role.Name))
	assert.True(t, k8sNotFound(t, cli, context.Background(), &rbacv1.RoleBinding{}, testNotebooksNS, binding.Name))
}

func TestReconcileNamespacedRBAC_RemovingOptInRevokesEquivalentUserSubject(t *testing.T) {
	r, cli := newReconciler(t, cluster.OpenDataHub)
	dashboard := newRBACDashboard(testNotebooksNS, "")
	require.NoError(t, r.ReconcileNamespacedRBAC(context.Background(), dashboard))

	role := getRole(t, cli, testNotebooksNS, "dashboard-notebooks-role")
	role.Labels = nil
	require.NoError(t, cli.Update(context.Background(), role))
	binding := getRoleBinding(t, cli, testNotebooksNS, "dashboard-notebooks-rolebinding")
	binding.Labels = nil
	binding.Subjects = []rbacv1.Subject{{
		Kind:     rbacv1.UserKind,
		APIGroup: rbacv1.GroupName,
		Name:     "system:serviceaccount:" + testAppNamespace + ":odh-dashboard",
	}}
	require.NoError(t, cli.Update(context.Background(), binding))

	namespace := &corev1.Namespace{}
	require.NoError(t, cli.Get(context.Background(), types.NamespacedName{Name: testNotebooksNS}, namespace))
	delete(namespace.Labels, v1alpha1.NamespacedRBACOptInLabel)
	require.NoError(t, cli.Update(context.Background(), namespace))

	err := r.ReconcileNamespacedRBAC(context.Background(), dashboard)
	require.ErrorContains(t, err, v1alpha1.NamespacedRBACOptInLabel+"=true")
	assert.True(t, k8sNotFound(t, cli, context.Background(), &rbacv1.Role{}, testNotebooksNS, role.Name))
	assert.True(t, k8sNotFound(t, cli, context.Background(), &rbacv1.RoleBinding{}, testNotebooksNS, binding.Name))
}

func TestReconcileNamespacedRBAC_RemovingOptInRevokesReplacementBinding(t *testing.T) {
	r, cli := newReconciler(t, cluster.OpenDataHub)
	dashboard := newRBACDashboard(testNotebooksNS, "")
	require.NoError(t, r.ReconcileNamespacedRBAC(context.Background(), dashboard))
	require.Equal(t, []string{testNotebooksNS + "/notebooks"}, dashboard.Status.NamespacedRBACGrants)

	role := getRole(t, cli, testNotebooksNS, "dashboard-notebooks-role")
	role.Labels = nil
	require.NoError(t, cli.Update(context.Background(), role))
	original := getRoleBinding(t, cli, testNotebooksNS, "dashboard-notebooks-rolebinding")
	require.NoError(t, cli.Delete(context.Background(), original))
	replacement := &rbacv1.RoleBinding{
		ObjectMeta: metav1.ObjectMeta{Name: "replacement-dashboard-access", Namespace: testNotebooksNS},
		RoleRef:    rbacv1.RoleRef{APIGroup: rbacv1.GroupName, Kind: "Role", Name: role.Name},
		Subjects: []rbacv1.Subject{{
			Kind:      rbacv1.ServiceAccountKind,
			Name:      "odh-dashboard",
			Namespace: testAppNamespace,
		}},
	}
	require.NoError(t, cli.Create(context.Background(), replacement))

	namespace := &corev1.Namespace{}
	require.NoError(t, cli.Get(context.Background(), types.NamespacedName{Name: testNotebooksNS}, namespace))
	delete(namespace.Labels, v1alpha1.NamespacedRBACOptInLabel)
	require.NoError(t, cli.Update(context.Background(), namespace))

	err := r.ReconcileNamespacedRBAC(context.Background(), dashboard)
	require.ErrorContains(t, err, v1alpha1.NamespacedRBACOptInLabel+"=true")
	assert.True(t, k8sNotFound(t, cli, context.Background(), &rbacv1.Role{}, testNotebooksNS, role.Name))
	assert.True(t, k8sNotFound(t, cli, context.Background(), &rbacv1.RoleBinding{}, testNotebooksNS, replacement.Name))
	assert.Empty(t, dashboard.Status.NamespacedRBACGrants)
}

func TestReconcileNamespacedRBAC_FinalizedRoleIsNeutralizedBeforeDeletion(t *testing.T) {
	r, cli := newReconciler(t, cluster.OpenDataHub)
	dashboard := newRBACDashboard(testNotebooksNS, "")
	require.NoError(t, r.ReconcileNamespacedRBAC(context.Background(), dashboard))

	role := getRole(t, cli, testNotebooksNS, "dashboard-notebooks-role")
	role.Finalizers = []string{"test.dashboard.opendatahub.io/hold"}
	require.NoError(t, cli.Update(context.Background(), role))
	namespace := &corev1.Namespace{}
	require.NoError(t, cli.Get(context.Background(), types.NamespacedName{Name: testNotebooksNS}, namespace))
	delete(namespace.Labels, v1alpha1.NamespacedRBACOptInLabel)
	require.NoError(t, cli.Update(context.Background(), namespace))

	err := r.ReconcileNamespacedRBAC(context.Background(), dashboard)
	require.ErrorContains(t, err, "waiting for stale Role")
	pending := getRole(t, cli, testNotebooksNS, role.Name)
	assert.Empty(t, pending.Rules, "a terminating Role must be ineffective while its finalizer blocks deletion")
	assert.NotNil(t, pending.DeletionTimestamp)
	assert.True(t, k8sNotFound(t, cli, context.Background(), &rbacv1.RoleBinding{}, testNotebooksNS, "dashboard-notebooks-rolebinding"))
	require.Equal(t, []string{testNotebooksNS + "/notebooks"}, dashboard.Status.NamespacedRBACGrants)

	pending.Finalizers = nil
	require.NoError(t, cli.Update(context.Background(), pending))
	err = r.ReconcileNamespacedRBAC(context.Background(), dashboard)
	require.ErrorContains(t, err, v1alpha1.NamespacedRBACOptInLabel+"=true")
	assert.True(t, k8sNotFound(t, cli, context.Background(), &rbacv1.Role{}, testNotebooksNS, role.Name))
	assert.Empty(t, dashboard.Status.NamespacedRBACGrants)
}

func TestReconcileNamespacedRBAC_RoleListFailurePreservesBindingForRetry(t *testing.T) {
	r, cli := newReconciler(t, cluster.OpenDataHub)
	dashboard := newRBACDashboard(testNotebooksNS, "")
	require.NoError(t, r.ReconcileNamespacedRBAC(context.Background(), dashboard))

	role := getRole(t, cli, testNotebooksNS, "dashboard-notebooks-role")
	role.Labels = nil
	require.NoError(t, cli.Update(context.Background(), role))
	binding := getRoleBinding(t, cli, testNotebooksNS, "dashboard-notebooks-rolebinding")
	binding.Labels = nil
	require.NoError(t, cli.Update(context.Background(), binding))

	namespace := &corev1.Namespace{}
	require.NoError(t, cli.Get(context.Background(), types.NamespacedName{Name: testNotebooksNS}, namespace))
	delete(namespace.Labels, v1alpha1.NamespacedRBACOptInLabel)
	require.NoError(t, cli.Update(context.Background(), namespace))

	listErr := errors.New("injected Role list failure")
	watchClient, ok := cli.(client.WithWatch)
	require.True(t, ok)
	r.APIReader = interceptor.NewClient(watchClient, interceptor.Funcs{
		List: func(ctx context.Context, delegate client.WithWatch, list client.ObjectList, opts ...client.ListOption) error {
			if _, isRoleList := list.(*rbacv1.RoleList); isRoleList {
				return listErr
			}
			return delegate.List(ctx, list, opts...)
		},
	})

	err := r.ReconcileNamespacedRBAC(context.Background(), dashboard)
	require.ErrorIs(t, err, listErr)
	require.NoError(t, cli.Get(context.Background(), client.ObjectKeyFromObject(role), &rbacv1.Role{}))
	require.NoError(t, cli.Get(context.Background(), client.ObjectKeyFromObject(binding), &rbacv1.RoleBinding{}),
		"the binding remains as durable discovery evidence until its Role is removed")

	r.APIReader = cli
	err = r.ReconcileNamespacedRBAC(context.Background(), dashboard)
	require.ErrorContains(t, err, v1alpha1.NamespacedRBACOptInLabel+"=true")
	assert.True(t, k8sNotFound(t, cli, context.Background(), &rbacv1.Role{}, testNotebooksNS, role.Name))
	assert.True(t, k8sNotFound(t, cli, context.Background(), &rbacv1.RoleBinding{}, testNotebooksNS, binding.Name))
}

func TestReconcileNamespacedRBAC_NamespaceLookupFailureRevokesExistingGrant(t *testing.T) {
	r, cli := newReconciler(t, cluster.OpenDataHub)
	dashboard := newRBACDashboard(testNotebooksNS, "")
	require.NoError(t, r.ReconcileNamespacedRBAC(context.Background(), dashboard))

	lookupErr := errors.New("injected namespace lookup failure")
	watchClient, ok := cli.(client.WithWatch)
	require.True(t, ok)
	r.APIReader = interceptor.NewClient(watchClient, interceptor.Funcs{
		Get: func(ctx context.Context, delegate client.WithWatch, key client.ObjectKey, obj client.Object, opts ...client.GetOption) error {
			if _, isNamespace := obj.(*corev1.Namespace); isNamespace && key.Name == testNotebooksNS {
				return lookupErr
			}
			return delegate.Get(ctx, key, obj, opts...)
		},
	})

	err := r.ReconcileNamespacedRBAC(context.Background(), dashboard)
	require.ErrorIs(t, err, lookupErr)
	assert.Empty(t, listRoles(t, cli))
	assert.Empty(t, listRoleBindings(t, cli))
}

func TestReconcileNamespacedRBAC_ApplyFailureDoesNotSkipStaleGrantGC(t *testing.T) {
	const newTarget = "new-notebooks-target"
	r, cli := newReconciler(t, cluster.OpenDataHub, optedInNamespace(newTarget))
	dashboard := newRBACDashboard(testNotebooksNS, testModelRegistryNS)
	require.NoError(t, r.ReconcileNamespacedRBAC(context.Background(), dashboard))
	require.Len(t, listRoles(t, cli), 2)

	applyErr := errors.New("injected Role create failure")
	watchClient, ok := cli.(client.WithWatch)
	require.True(t, ok)
	r.Client = interceptor.NewClient(watchClient, interceptor.Funcs{
		Create: func(ctx context.Context, delegate client.WithWatch, obj client.Object, opts ...client.CreateOption) error {
			if role, isRole := obj.(*rbacv1.Role); isRole && role.Namespace == newTarget {
				return applyErr
			}
			return delegate.Create(ctx, obj, opts...)
		},
	})
	dashboard.Spec.NotebooksNamespace = newTarget
	dashboard.Spec.ModelRegistryNamespace = ""

	err := r.ReconcileNamespacedRBAC(context.Background(), dashboard)
	require.ErrorIs(t, err, applyErr)
	assert.Empty(t, listRoles(t, cli))
	assert.Empty(t, listRoleBindings(t, cli))
}

func TestReconcileNamespacedRBAC_ApplyFailureKeepsValidatedGrant(t *testing.T) {
	r, cli := newReconciler(t, cluster.OpenDataHub)
	dashboard := newRBACDashboard(testNotebooksNS, testModelRegistryNS)
	require.NoError(t, r.ReconcileNamespacedRBAC(context.Background(), dashboard))

	role := getRole(t, cli, testNotebooksNS, "dashboard-notebooks-role")
	role.Rules = []rbacv1.PolicyRule{{APIGroups: []string{""}, Resources: []string{"pods"}, Verbs: []string{"get"}}}
	require.NoError(t, cli.Update(context.Background(), role))

	applyErr := errors.New("injected Role update failure")
	watchClient, ok := cli.(client.WithWatch)
	require.True(t, ok)
	r.Client = interceptor.NewClient(watchClient, interceptor.Funcs{
		Update: func(ctx context.Context, delegate client.WithWatch, obj client.Object, opts ...client.UpdateOption) error {
			if updatedRole, isRole := obj.(*rbacv1.Role); isRole && updatedRole.Namespace == testNotebooksNS {
				return applyErr
			}
			return delegate.Update(ctx, obj, opts...)
		},
	})
	dashboard.Spec.ModelRegistryNamespace = ""

	err := r.ReconcileNamespacedRBAC(context.Background(), dashboard)
	require.ErrorIs(t, err, applyErr)
	roles := listRoles(t, cli)
	require.Len(t, roles, 1)
	assert.Equal(t, testNotebooksNS, roles[0].Namespace, "a validated target remains desired during a transient apply failure")
	bindings := listRoleBindings(t, cli)
	require.Len(t, bindings, 1)
	assert.Equal(t, testNotebooksNS, bindings[0].Namespace)
}

// TestReconcileNamespacedRBAC_Idempotent verifies that reconciling twice produces
// the same result (no duplicate resources, update path works).
func TestReconcileNamespacedRBAC_Idempotent(t *testing.T) {
	r, cli := newReconciler(t, cluster.SelfManagedRhoai)
	dashboard := newRBACDashboard(testNotebooksNS, testModelRegistryNS)

	require.NoError(t, r.ReconcileNamespacedRBAC(context.Background(), dashboard))
	require.NoError(t, r.ReconcileNamespacedRBAC(context.Background(), dashboard))

	// Should still be exactly 2 of each
	assert.Len(t, listRoles(t, cli), 2)
	assert.Len(t, listRoleBindings(t, cli), 2)
}

// TestReconcileNamespacedRBAC_UpdateExistingRole verifies that reconcile updates
// an existing Role rather than failing on conflict.
func TestReconcileNamespacedRBAC_UpdateExistingRole(t *testing.T) {
	// Pre-create a Role with different rules
	existingRole := &rbacv1.Role{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "dashboard-notebooks-role",
			Namespace: testNotebooksNS,
			Labels: map[string]string{
				managedLabel:          "true",
				labels.PlatformPartOf: "dashboard",
			},
		},
		Rules: []rbacv1.PolicyRule{
			{APIGroups: []string{""}, Resources: []string{"pods"}, Verbs: []string{"get"}},
		},
	}

	r, cli := newReconciler(t, cluster.OpenDataHub, existingRole)
	dashboard := newRBACDashboard(testNotebooksNS, "")

	err := r.ReconcileNamespacedRBAC(context.Background(), dashboard)
	require.NoError(t, err)

	// Rules should be updated to the canonical notebooks rules
	role := getRole(t, cli, testNotebooksNS, "dashboard-notebooks-role")
	assert.Len(t, role.Rules, 3, "rules should be updated to the canonical notebooks set")

	// Verify the specific resources are present
	resources := make([]string, 0, 3)
	for _, rule := range role.Rules {
		resources = append(resources, rule.Resources...)
	}
	assert.Contains(t, resources, "persistentvolumeclaims")
	assert.Contains(t, resources, "configmaps")
	assert.Contains(t, resources, "secrets")
}

// TestReconcileNamespacedRBAC_GCStaleOnNamespaceChange verifies that when the
// NotebooksNamespace changes from ns-a to ns-b, the old resources in ns-a are removed.
func TestReconcileNamespacedRBAC_GCStaleOnNamespaceChange(t *testing.T) {
	oldNS := "old-notebooks-ns"
	newNS := "new-notebooks-ns"
	r, cli := newReconciler(t, cluster.SelfManagedRhoai, optedInNamespace(oldNS), optedInNamespace(newNS))

	// First reconcile with old namespace
	dashboard := newRBACDashboard(oldNS, "")
	require.NoError(t, r.ReconcileNamespacedRBAC(context.Background(), dashboard))

	// Verify old resources exist
	assert.Len(t, listRoles(t, cli), 1)
	getRole(t, cli, oldNS, "dashboard-notebooks-role")

	// Second reconcile with new namespace
	dashboard.Spec.NotebooksNamespace = newNS
	require.NoError(t, r.ReconcileNamespacedRBAC(context.Background(), dashboard))

	// Old namespace resources should be gone
	roles := listRoles(t, cli)
	assert.Len(t, roles, 1, "should have exactly one role (in new namespace)")
	assert.Equal(t, newNS, roles[0].Namespace)

	rbs := listRoleBindings(t, cli)
	assert.Len(t, rbs, 1)
	assert.Equal(t, newNS, rbs[0].Namespace)
}

// TestReconcileNamespacedRBAC_GCStaleOnNamespaceRemoved verifies that when both
// namespace fields are cleared, all managed resources are removed.
func TestReconcileNamespacedRBAC_GCStaleOnNamespaceRemoved(t *testing.T) {
	r, cli := newReconciler(t, cluster.OpenDataHub)
	dashboard := newRBACDashboard(testNotebooksNS, testModelRegistryNS)

	require.NoError(t, r.ReconcileNamespacedRBAC(context.Background(), dashboard))
	assert.Len(t, listRoles(t, cli), 2)

	// Clear both namespaces
	dashboard.Spec.NotebooksNamespace = ""
	dashboard.Spec.ModelRegistryNamespace = ""
	require.NoError(t, r.ReconcileNamespacedRBAC(context.Background(), dashboard))

	assert.Empty(t, listRoles(t, cli))
	assert.Empty(t, listRoleBindings(t, cli))
}

// TestCleanupNamespacedRBAC verifies that cleanup deletes all managed resources
// cluster-wide, regardless of namespace.
func TestCleanupNamespacedRBAC(t *testing.T) {
	r, cli := newReconciler(t, cluster.SelfManagedRhoai)
	dashboard := newRBACDashboard(testNotebooksNS, testModelRegistryNS)

	require.NoError(t, r.ReconcileNamespacedRBAC(context.Background(), dashboard))
	assert.Len(t, listRoles(t, cli), 2)

	err := r.CleanupNamespacedRBAC(context.Background())
	require.NoError(t, err)

	assert.Empty(t, listRoles(t, cli))
	assert.Empty(t, listRoleBindings(t, cli))
}

// TestCleanupNamespacedRBAC_AlreadyGone verifies that cleanup is idempotent when
// resources don't exist (NotFound is tolerated).
func TestCleanupNamespacedRBAC_AlreadyGone(t *testing.T) {
	r, _ := newReconciler(t, cluster.OpenDataHub)

	err := r.CleanupNamespacedRBAC(context.Background())
	require.NoError(t, err)
}

// TestGCStaleNamespacedRBAC_OnlyRemovesNonDesired verifies that GC leaves desired
// namespaces untouched and only removes resources in non-desired namespaces.
func TestGCStaleNamespacedRBAC_OnlyRemovesNonDesired(t *testing.T) {
	r, cli := newReconciler(t, cluster.SelfManagedRhoai)
	dashboard := newRBACDashboard(testNotebooksNS, testModelRegistryNS)

	require.NoError(t, r.ReconcileNamespacedRBAC(context.Background(), dashboard))
	assert.Len(t, listRoles(t, cli), 2)

	// GC keeping only model-registry namespace (key is "ns/suffix", matching namespacedRBACKey)
	desired := map[string]bool{testModelRegistryNS + "/model-registry": true}
	err := r.GCStaleNamespacedRBAC(context.Background(), desired)
	require.NoError(t, err)

	roles := listRoles(t, cli)
	require.Len(t, roles, 1)
	assert.Equal(t, testModelRegistryNS, roles[0].Namespace)

	rbs := listRoleBindings(t, cli)
	require.Len(t, rbs, 1)
	assert.Equal(t, testModelRegistryNS, rbs[0].Namespace)
}

// TestGCStaleNamespacedRBAC_EmptyDesiredDeletesAll verifies that passing an empty
// desired set removes all managed resources.
func TestGCStaleNamespacedRBAC_EmptyDesiredDeletesAll(t *testing.T) {
	r, cli := newReconciler(t, cluster.OpenDataHub)
	dashboard := newRBACDashboard(testNotebooksNS, testModelRegistryNS)

	require.NoError(t, r.ReconcileNamespacedRBAC(context.Background(), dashboard))
	assert.Len(t, listRoles(t, cli), 2)

	err := r.GCStaleNamespacedRBAC(context.Background(), map[string]bool{})
	require.NoError(t, err)

	assert.Empty(t, listRoles(t, cli))
	assert.Empty(t, listRoleBindings(t, cli))
}

// TestReconcileNamespacedRBAC_DoesNotTouchUnmanagedRoles verifies that Roles
// without the managed label are not touched by GC or cleanup.
func TestReconcileNamespacedRBAC_DoesNotTouchUnmanagedRoles(t *testing.T) {
	// A pre-existing Role in testNotebooksNS that we do NOT own
	foreignRole := &rbacv1.Role{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "some-other-role",
			Namespace: testNotebooksNS,
		},
		Rules: []rbacv1.PolicyRule{
			{APIGroups: []string{""}, Resources: []string{"pods"}, Verbs: []string{"get"}},
		},
	}

	r, cli := newReconciler(t, cluster.OpenDataHub, foreignRole)

	// GC with empty desired — should not delete the foreign role
	err := r.GCStaleNamespacedRBAC(context.Background(), map[string]bool{})
	require.NoError(t, err)

	// Foreign role is still there
	var remaining rbacv1.RoleList
	require.NoError(t, cli.List(context.Background(), &remaining, client.InNamespace(testNotebooksNS)))
	require.Len(t, remaining.Items, 1)
	assert.Equal(t, "some-other-role", remaining.Items[0].Name)

	// No managed RBAC was created
	assert.Empty(t, listRoles(t, cli))
}

// TestReconcileNamespacedRBAC_Labels verifies that created resources carry the
// expected managed label so future label-based GC can find them.
func TestReconcileNamespacedRBAC_Labels(t *testing.T) {
	r, cli := newReconciler(t, cluster.SelfManagedRhoai)
	dashboard := newRBACDashboard(testNotebooksNS, "")

	require.NoError(t, r.ReconcileNamespacedRBAC(context.Background(), dashboard))

	role := getRole(t, cli, testNotebooksNS, "dashboard-notebooks-role")
	assert.Equal(t, "true", role.Labels[managedLabel])
	assert.Equal(t, "dashboard", role.Labels[labels.PlatformPartOf])

	rb := getRoleBinding(t, cli, testNotebooksNS, "dashboard-notebooks-rolebinding")
	assert.Equal(t, "true", rb.Labels[managedLabel])
	assert.Equal(t, "dashboard", rb.Labels[labels.PlatformPartOf])
}

// TestReconcileNamespacedRBAC_RoleRefIsRole verifies RoleBindings reference a Role
// (not ClusterRole) in the same namespace.
func TestReconcileNamespacedRBAC_RoleRefIsRole(t *testing.T) {
	r, cli := newReconciler(t, cluster.OpenDataHub)
	dashboard := newRBACDashboard(testNotebooksNS, testModelRegistryNS)

	require.NoError(t, r.ReconcileNamespacedRBAC(context.Background(), dashboard))

	notebooksRB := getRoleBinding(t, cli, testNotebooksNS, "dashboard-notebooks-rolebinding")
	assert.Equal(t, "Role", notebooksRB.RoleRef.Kind)
	assert.Equal(t, "rbac.authorization.k8s.io", notebooksRB.RoleRef.APIGroup)

	mrRB := getRoleBinding(t, cli, testModelRegistryNS, "dashboard-model-registry-rolebinding")
	assert.Equal(t, "Role", mrRB.RoleRef.Kind)
}

// TestReconcileNamespacedRBAC_NotebooksRules verifies the exact RBAC rules for the
// notebooks namespace match what the dashboard app needs.
func TestReconcileNamespacedRBAC_NotebooksRules(t *testing.T) {
	r, cli := newReconciler(t, cluster.OpenDataHub)
	dashboard := newRBACDashboard(testNotebooksNS, "")

	require.NoError(t, r.ReconcileNamespacedRBAC(context.Background(), dashboard))

	role := getRole(t, cli, testNotebooksNS, "dashboard-notebooks-role")
	require.Len(t, role.Rules, 3)

	// Build a map of resource → verbs for easy assertion
	ruleMap := map[string][]string{}
	for _, rule := range role.Rules {
		for _, res := range rule.Resources {
			ruleMap[res] = rule.Verbs
		}
	}

	assert.ElementsMatch(t, []string{"create", "get"}, ruleMap["persistentvolumeclaims"])
	assert.ElementsMatch(t, []string{"create", "get", "update"}, ruleMap["configmaps"])
	assert.ElementsMatch(t, []string{"create", "get", "update"}, ruleMap["secrets"])
}

// TestReconcileNamespacedRBAC_ModelRegistryRules verifies the exact RBAC rules for
// the model-registry namespace.
func TestReconcileNamespacedRBAC_ModelRegistryRules(t *testing.T) {
	r, cli := newReconciler(t, cluster.OpenDataHub)
	dashboard := newRBACDashboard("", testModelRegistryNS)

	require.NoError(t, r.ReconcileNamespacedRBAC(context.Background(), dashboard))

	role := getRole(t, cli, testModelRegistryNS, "dashboard-model-registry-role")
	require.Len(t, role.Rules, 2)

	ruleMap := map[string][]string{}
	for _, rule := range role.Rules {
		for _, res := range rule.Resources {
			ruleMap[res] = rule.Verbs
		}
	}

	assert.ElementsMatch(t, []string{"create", "delete", "get", "list", "patch"}, ruleMap["secrets"])
	assert.ElementsMatch(t, []string{"create", "list"}, ruleMap["configmaps"])
}

// TestReconcileNamespacedRBAC_SameNamespaceBothComponents covers the edge case where
// both namespace fields point to the same namespace. Should create 2 separate Role/RB pairs
// both in that namespace (no collision since names differ).
func TestReconcileNamespacedRBAC_SameNamespaceBothComponents(t *testing.T) {
	sharedNS := "shared-namespace"
	r, cli := newReconciler(t, cluster.OpenDataHub, optedInNamespace(sharedNS))
	dashboard := newRBACDashboard(sharedNS, sharedNS)

	err := r.ReconcileNamespacedRBAC(context.Background(), dashboard)
	require.NoError(t, err)

	roles := listRoles(t, cli)
	assert.Len(t, roles, 2)

	// Both roles in the shared namespace
	getRole(t, cli, sharedNS, "dashboard-notebooks-role")
	getRole(t, cli, sharedNS, "dashboard-model-registry-role")
}
