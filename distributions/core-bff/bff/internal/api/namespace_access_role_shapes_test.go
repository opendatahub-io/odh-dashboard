package api

import (
	"context"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes/k8mocks"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// Each role shape gets its own namespace and is bound to a user with no other
// access there, so envtest's RBAC authorizer decides every review.
func grantRoleShape(t *testing.T, namespace, user string, rules []rbacv1.PolicyRule) {
	t.Helper()
	ctx := context.Background()
	_, err := testSAClientset.CoreV1().Namespaces().Create(ctx, &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: namespace}}, metav1.CreateOptions{})
	require.NoError(t, err)
	_, err = testSAClientset.RbacV1().Roles(namespace).Create(ctx, &rbacv1.Role{ObjectMeta: metav1.ObjectMeta{Name: "shape"}, Rules: rules}, metav1.CreateOptions{})
	require.NoError(t, err)
	_, err = testSAClientset.RbacV1().RoleBindings(namespace).Create(ctx, &rbacv1.RoleBinding{
		ObjectMeta: metav1.ObjectMeta{Name: "shape"},
		Subjects:   []rbacv1.Subject{{Kind: "User", Name: user}},
		RoleRef:    rbacv1.RoleRef{Kind: "Role", Name: "shape", APIGroup: "rbac.authorization.k8s.io"},
	}, metav1.CreateOptions{})
	require.NoError(t, err)
}

func TestNamespaceAccess_RoleShapes(t *testing.T) {
	user := k8mocks.DefaultTestUsers[3]
	modelRule := func(verbs ...string) rbacv1.PolicyRule {
		return rbacv1.PolicyRule{APIGroups: []string{"serving.kserve.io"}, Resources: []string{"llminferenceservices"}, Verbs: verbs}
	}
	secrets := rbacv1.PolicyRule{APIGroups: []string{""}, Resources: []string{"secrets"}, Verbs: []string{"create", "get", "list", "update", "delete"}}
	configs := rbacv1.PolicyRule{APIGroups: []string{"serving.kserve.io"}, Resources: []string{"llminferenceserviceconfigs"}, Verbs: []string{"get", "list", "watch", "update", "patch"}}
	serviceAccounts := rbacv1.PolicyRule{APIGroups: []string{""}, Resources: []string{"serviceaccounts"}, Verbs: []string{"get", "create"}}
	roles := rbacv1.PolicyRule{APIGroups: []string{"rbac.authorization.k8s.io"}, Resources: []string{"roles"}, Verbs: []string{"get", "create"}}
	roleBindings := rbacv1.PolicyRule{APIGroups: []string{"rbac.authorization.k8s.io"}, Resources: []string{"rolebindings"}, Verbs: []string{"get", "create"}}
	allModelVerbs := modelRule("get", "list", "watch", "create", "update", "patch", "delete")

	for _, tc := range []struct {
		name  string
		ns    string
		rules []rbacv1.PolicyRule
		// nil means the namespace is not returned at all.
		want *models.NamespaceActions
	}{
		{
			name:  "full deployer",
			ns:    "shape-full",
			rules: []rbacv1.PolicyRule{allModelVerbs, configs, secrets, serviceAccounts, roles, roleBindings},
			want:  &models.NamespaceActions{View: true, Deploy: true, Edit: true, StartStop: true, Delete: true, CreateTokenAuth: true, ManageTokenAuth: true},
		},
		{
			name:  "token Secrets and RoleBindings without ServiceAccount and Role reads",
			ns:    "shape-token-prereqs",
			rules: []rbacv1.PolicyRule{allModelVerbs, configs, secrets, roleBindings},
			// Without ServiceAccount reads neither token auth nor Edit (which
			// loads the Hugging Face token ServiceAccount) is offered.
			want: &models.NamespaceActions{View: true, Deploy: true, StartStop: true, Delete: true},
		},
		{
			name:  "patch-only starts and stops but does not edit",
			ns:    "shape-patch-only",
			rules: []rbacv1.PolicyRule{modelRule("get", "list", "watch", "patch")},
			want:  &models.NamespaceActions{View: true, StartStop: true},
		},
		{
			name:  "create-only deploys without viewing",
			ns:    "shape-create-only",
			rules: []rbacv1.PolicyRule{modelRule("create")},
			want:  &models.NamespaceActions{Deploy: true},
		},
		{
			name:  "model editor without config reads cannot edit",
			ns:    "shape-edit-no-configs",
			rules: []rbacv1.PolicyRule{modelRule("get", "list", "watch", "patch", "update"), secrets, serviceAccounts},
			want:  &models.NamespaceActions{View: true, StartStop: true},
		},
		{
			name:  "model editor without ServiceAccount reads cannot load an HF-token deployment",
			ns:    "shape-edit-no-sa",
			rules: []rbacv1.PolicyRule{modelRule("get", "list", "watch", "patch", "update"), configs, secrets},
			want:  &models.NamespaceActions{View: true, StartStop: true},
		},
		{
			name:  "create-only deployer with token permissions cannot grant the token Role",
			ns:    "shape-create-token",
			rules: []rbacv1.PolicyRule{modelRule("create"), secrets, serviceAccounts, roles, roleBindings},
			want:  &models.NamespaceActions{Deploy: true},
		},
		{
			name:  "token creation without managing existing tokens",
			ns:    "shape-token-create-only",
			rules: []rbacv1.PolicyRule{modelRule("get", "list", "watch", "create"), {APIGroups: []string{""}, Resources: []string{"secrets"}, Verbs: []string{"create"}}, serviceAccounts, roles, roleBindings},
			want:  &models.NamespaceActions{View: true, Deploy: true, CreateTokenAuth: true},
		},
		{
			name:  "read-only",
			ns:    "shape-read-only",
			rules: []rbacv1.PolicyRule{modelRule("get", "list", "watch")},
			want:  &models.NamespaceActions{View: true},
		},
		{
			name:  "list and get without watch browse by polling",
			ns:    "shape-no-watch",
			rules: []rbacv1.PolicyRule{modelRule("get", "list")},
			want:  &models.NamespaceActions{View: true},
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			ns := tc.ns
			grantRoleShape(t, ns, user.UserName, tc.rules)
			app := newNamespaceAccessTestApp(ns)
			rr := httptest.NewRecorder()
			app.GetNamespaceAccessHandler(rr, namespaceAccessRequest(user, NamespaceAccessPath), nil)
			list := decodeAccessList(t, rr)
			if tc.want == nil {
				assert.Empty(t, list.Namespaces)
				return
			}
			require.Equal(t, []string{ns}, accessNames(list))
			assert.Equal(t, *tc.want, list.Namespaces[0].Actions)
		})
	}
}
