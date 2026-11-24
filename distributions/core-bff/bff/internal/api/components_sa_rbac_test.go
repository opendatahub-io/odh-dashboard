package api

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/yaml"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

// shippedRoles are the namespaced Roles the dashboard service account runs
// with, relative to this package. Both are read from disk so this test breaks
// when a manifest drops a rule the contract depends on.
var shippedRoles = map[string]string{
	"RHAII bundle":  "../../../../../manifests/distributions/rhaii/role.yaml",
	"core-bff base": "../../../manifests/base/role.yaml",
}

// AC (RHOAIENG-96080): on xKS without the OdhApplication API, /api/components
// returns 200 [] when it runs with the service-account permissions the
// manifests actually ship. The API server authorizes a request before it
// resolves the resource, so a missing `list` rule turns "API absent" into 403;
// a privileged test client cannot see that. The envtest instance from
// TestMain does not install the OdhApplication CRD.
func TestGetComponents_WithTheShippedServiceAccountRole_APIAbsent(t *testing.T) {
	for name, path := range shippedRoles {
		t.Run(name, func(t *testing.T) {
			role := readRole(t, path)
			dyn, namespace := serviceAccountDynamicClient(t, role.Rules)

			rr := getComponentsAs(t, dyn, namespace)

			require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())
			var body []any
			require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &body))
			assert.Empty(t, body)
		})
	}
}

// The counterpart, proving the rule is load-bearing: without `list` on
// odhapplications, an absent API is reported as a failure, not as [].
func TestGetComponents_WithoutTheListRule_APIAbsentIsAnError(t *testing.T) {
	dyn, namespace := serviceAccountDynamicClient(t, []rbacv1.PolicyRule{{
		APIGroups: []string{""},
		Resources: []string{"configmaps"},
		Verbs:     []string{"get"},
	}})

	rr := getComponentsAs(t, dyn, namespace)

	assert.Equal(t, http.StatusForbidden, rr.Code,
		"a forbidden list must not be mistaken for an absent API")
}

func readRole(t *testing.T, path string) rbacv1.Role {
	t.Helper()
	raw, err := os.ReadFile(filepath.Clean(path))
	require.NoError(t, err)
	var role rbacv1.Role
	require.NoError(t, yaml.NewYAMLOrJSONDecoder(bytes.NewReader(raw), 4096).Decode(&role))
	require.Equal(t, "Role", role.Kind)
	return role
}

// serviceAccountDynamicClient creates a fresh namespace with a service account
// bound to a Role carrying rules, and returns a dynamic client that
// impersonates that service account against the envtest API server, plus the
// namespace. The deployment sets the dashboard namespace to the pod's own
// namespace, which is where the Role is bound, so the handler lists there.
func serviceAccountDynamicClient(t *testing.T, rules []rbacv1.PolicyRule) (dynamic.Interface, string) {
	t.Helper()
	ctx := context.Background()
	admin, err := kubernetes.NewForConfig(testEnvInstance.Config)
	require.NoError(t, err)

	ns, err := admin.CoreV1().Namespaces().Create(ctx, &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{GenerateName: "sa-rbac-"},
	}, metav1.CreateOptions{})
	require.NoError(t, err)
	t.Cleanup(func() {
		_ = admin.CoreV1().Namespaces().Delete(context.Background(), ns.Name, metav1.DeleteOptions{})
	})

	const sa = "rhaii-dashboard"
	_, err = admin.CoreV1().ServiceAccounts(ns.Name).Create(ctx, &corev1.ServiceAccount{
		ObjectMeta: metav1.ObjectMeta{Name: sa},
	}, metav1.CreateOptions{})
	require.NoError(t, err)
	_, err = admin.RbacV1().Roles(ns.Name).Create(ctx, &rbacv1.Role{
		ObjectMeta: metav1.ObjectMeta{Name: sa},
		Rules:      rules,
	}, metav1.CreateOptions{})
	require.NoError(t, err)
	_, err = admin.RbacV1().RoleBindings(ns.Name).Create(ctx, &rbacv1.RoleBinding{
		ObjectMeta: metav1.ObjectMeta{Name: sa},
		RoleRef:    rbacv1.RoleRef{APIGroup: rbacv1.GroupName, Kind: "Role", Name: sa},
		Subjects:   []rbacv1.Subject{{Kind: rbacv1.ServiceAccountKind, Name: sa, Namespace: ns.Name}},
	}, metav1.CreateOptions{})
	require.NoError(t, err)

	cfg := rest.CopyConfig(testEnvInstance.Config)
	cfg.Impersonate = rest.ImpersonationConfig{
		UserName: "system:serviceaccount:" + ns.Name + ":" + sa,
		Groups:   []string{"system:serviceaccounts", "system:serviceaccounts:" + ns.Name, "system:authenticated"},
	}
	dyn, err := dynamic.NewForConfig(cfg)
	require.NoError(t, err)
	return dyn, ns.Name
}

func getComponentsAs(t *testing.T, dyn dynamic.Interface, namespace string) *httptest.ResponseRecorder {
	t.Helper()
	app := newTestApp(func(a *App) {
		a.config.Namespace = namespace
		a.repositories = repositories.NewRepositories(repositories.RepositoriesConfig{
			Platform:          config.PlatformXKS,
			PlatformConfirmed: true,
			SADynClient:       dyn,
			Namespace:         namespace,
		})
	})

	rr := httptest.NewRecorder()
	app.GetComponentsHandler(rr, httptest.NewRequest(http.MethodGet, "/api/components", nil), nil)
	return rr
}

// AC (RHOAIENG-96080), /api/config counterpart: on xKS the bootstrap read
// runs with the shipped service-account Role and serves defaults whether the
// Role grants the OdhDashboardConfig read (core-bff base) or not (RHAII).
func TestGetConfig_WithTheShippedServiceAccountRole_XKS(t *testing.T) {
	for name, path := range shippedRoles {
		t.Run(name, func(t *testing.T) {
			role := readRole(t, path)
			dyn, namespace := serviceAccountDynamicClient(t, role.Rules)
			app := newTestApp(func(a *App) {
				a.config.Namespace = namespace
				a.config.DashboardConfigName = "odh-dashboard-config"
				a.repositories = repositories.NewRepositories(repositories.RepositoriesConfig{
					Platform:          config.PlatformXKS,
					PlatformConfirmed: true,
					SADynClient:       dyn,
					Namespace:         namespace,
				})
			})

			rr := httptest.NewRecorder()
			app.GetConfigHandler(rr, httptest.NewRequest(http.MethodGet, "/api/config", nil), nil)

			require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())
			var body map[string]any
			require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &body))
			assert.NotEmpty(t, body, "defaults are served")
		})
	}
}

// The auto-detect profile (core-bff base, no ODH_PLATFORM_TYPE) must be able
// to confirm xKS with the RBAC it ships. The API server authorizes before it
// resolves the resource, so without `get clusterversions` the probe is a 403
// and the platform stays unconfirmed: restrictive admission and a 403 from
// /api/config on xKS. envtest does not serve the ClusterVersion API.
func TestStartupPlatform_WithTheShippedBaseRBAC_ConfirmsXKS(t *testing.T) {
	ctx := context.Background()
	admin, err := kubernetes.NewForConfig(testEnvInstance.Config)
	require.NoError(t, err)

	role := readRole(t, shippedRoles["core-bff base"])
	_, namespace := serviceAccountDynamicClient(t, role.Rules)
	const sa = "rhaii-dashboard"

	raw, err := os.ReadFile(filepath.Clean("../../../manifests/base/cluster-role.yaml"))
	require.NoError(t, err)
	var cr rbacv1.ClusterRole
	require.NoError(t, yaml.NewYAMLOrJSONDecoder(bytes.NewReader(raw), 4096).Decode(&cr))
	cr.ObjectMeta = metav1.ObjectMeta{Name: "base-probe-" + namespace}
	_, err = admin.RbacV1().ClusterRoles().Create(ctx, &cr, metav1.CreateOptions{})
	require.NoError(t, err)
	_, err = admin.RbacV1().ClusterRoleBindings().Create(ctx, &rbacv1.ClusterRoleBinding{
		ObjectMeta: metav1.ObjectMeta{Name: cr.Name},
		RoleRef:    rbacv1.RoleRef{APIGroup: rbacv1.GroupName, Kind: "ClusterRole", Name: cr.Name},
		Subjects:   []rbacv1.Subject{{Kind: rbacv1.ServiceAccountKind, Name: sa, Namespace: namespace}},
	}, metav1.CreateOptions{})
	require.NoError(t, err)
	t.Cleanup(func() {
		_ = admin.RbacV1().ClusterRoleBindings().Delete(context.Background(), cr.Name, metav1.DeleteOptions{})
		_ = admin.RbacV1().ClusterRoles().Delete(context.Background(), cr.Name, metav1.DeleteOptions{})
	})

	cfg := rest.CopyConfig(testEnvInstance.Config)
	cfg.Impersonate = rest.ImpersonationConfig{
		UserName: "system:serviceaccount:" + namespace + ":" + sa,
		Groups:   []string{"system:serviceaccounts", "system:serviceaccounts:" + namespace, "system:authenticated"},
	}
	typed, err := kubernetes.NewForConfig(cfg)
	require.NoError(t, err)
	dyn, err := dynamic.NewForConfig(cfg)
	require.NoError(t, err)

	_, platform, confirmed := initStartupClusterInfo(config.EnvConfig{AuthMethod: config.AuthMethodUser},
		k8sSetupResult{saClientset: typed, saDynClient: dyn, kubeconfig: cfg}, discardLogger())

	assert.Equal(t, config.PlatformXKS, platform)
	assert.True(t, confirmed, "the shipped base RBAC must let the probe see that the ClusterVersion API is absent")
}

// The shipped ClusterRoleBinding leaves the service-account subject's
// namespace to the kustomization's namespace transformer. A hard-coded one
// (it used to say "system") is never rewritten, so no ClusterRole rule would
// reach the deployed service account.
func TestShippedClusterRoleBinding_DoesNotHardCodeTheSubjectNamespace(t *testing.T) {
	raw, err := os.ReadFile(filepath.Clean("../../../manifests/base/cluster-role-binding.yaml"))
	require.NoError(t, err)
	var crb rbacv1.ClusterRoleBinding
	require.NoError(t, yaml.NewYAMLOrJSONDecoder(bytes.NewReader(raw), 4096).Decode(&crb))
	require.NotEmpty(t, crb.Subjects)
	for _, s := range crb.Subjects {
		assert.Empty(t, s.Namespace, "subject %s must take the overlay's namespace", s.Name)
	}
}
