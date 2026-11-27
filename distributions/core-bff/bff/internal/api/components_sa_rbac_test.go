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

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/util/yaml"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"sigs.k8s.io/controller-runtime/pkg/envtest"
)

// shippedRoles are the namespaced Roles the dashboard service account runs
// with, relative to this package. They are read from disk so this test breaks
// when a manifest drops a rule the contract depends on. The RHAII bundle is the
// only shipped xKS manifest set (RHAI-50761); internal/bundlecontract pins its
// RBAC to the bootstrap contract.
var shippedRoles = map[string]string{
	"RHAII bundle": "../../../../../manifests/distributions/rhaii/role.yaml",
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

	cfg := impersonateServiceAccount(ns.Name, sa)
	dyn, err := dynamic.NewForConfig(cfg)
	require.NoError(t, err)
	return dyn, ns.Name
}

// impersonateServiceAccount returns a config for the envtest API server that
// acts as the named service account, with the groups the API server gives it.
func impersonateServiceAccount(namespace, name string) *rest.Config {
	cfg := rest.CopyConfig(testEnvInstance.Config)
	cfg.Impersonate = rest.ImpersonationConfig{
		UserName: "system:serviceaccount:" + namespace + ":" + name,
		Groups:   []string{"system:serviceaccounts", "system:serviceaccounts:" + namespace, "system:authenticated"},
	}
	return cfg
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
// runs with the shipped service-account Role and serves defaults when the
// OdhDashboardConfig instance is not provisioned, without creating it.
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

// No shipped manifest auto-detects the platform any more: the RHAII bundle sets
// --platform-type=XKS. A deployment that leaves ODH_PLATFORM_TYPE unset must
// grant `get clusterversions/version` (bootstrap contract, "The platform
// default requires a confirmed platform"). This pins that the single rule is
// enough: the API server authorizes before it resolves the resource, so without
// it the probe is a 403 and the platform stays unconfirmed. envtest does not
// serve the ClusterVersion API.
func TestStartupPlatform_WithTheDocumentedProbeRule_ConfirmsXKS(t *testing.T) {
	ctx := context.Background()
	admin, err := kubernetes.NewForConfig(testEnvInstance.Config)
	require.NoError(t, err)

	role := readRole(t, shippedRoles["RHAII bundle"])
	_, namespace := serviceAccountDynamicClient(t, role.Rules)
	const sa = "rhaii-dashboard"

	cr := rbacv1.ClusterRole{
		ObjectMeta: metav1.ObjectMeta{Name: "probe-" + namespace},
		Rules: []rbacv1.PolicyRule{{
			APIGroups:     []string{"config.openshift.io"},
			Resources:     []string{"clusterversions"},
			ResourceNames: []string{"version"},
			Verbs:         []string{"get"},
		}},
	}
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

	cfg := impersonateServiceAccount(namespace, sa)
	typed, err := kubernetes.NewForConfig(cfg)
	require.NoError(t, err)
	dyn, err := dynamic.NewForConfig(cfg)
	require.NoError(t, err)

	_, platform, confirmed := initStartupClusterInfo(config.EnvConfig{AuthMethod: config.AuthMethodUser},
		k8sSetupResult{saClientset: typed, saDynClient: dyn, kubeconfig: cfg}, discardLogger())

	assert.Equal(t, config.PlatformXKS, platform)
	assert.True(t, confirmed, "the documented probe rule must let the probe see that the ClusterVersion API is absent")
}

// AC (RHOAIENG-96080, RHAI-50761): the connection-type templates are the third
// service-account read. With only the shipped Role (no ConfigMap write verbs)
// the list and get routes still serve the labelled templates.
func TestConnectionTypes_WithTheShippedServiceAccountRole_XKS(t *testing.T) {
	for name, path := range shippedRoles {
		t.Run(name, func(t *testing.T) {
			role := readRole(t, path)
			dyn, namespace := serviceAccountDynamicClient(t, role.Rules)

			admin, err := kubernetes.NewForConfig(testEnvInstance.Config)
			require.NoError(t, err)
			_, err = admin.CoreV1().ConfigMaps(namespace).Create(context.Background(), &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{Name: "s3", Labels: map[string]string{
					models.LabelDashboardResource: "true",
					models.LabelConnectionType:    "true",
				}},
			}, metav1.CreateOptions{})
			require.NoError(t, err)

			typed, err := kubernetes.NewForConfig(impersonateServiceAccount(namespace, "rhaii-dashboard"))
			require.NoError(t, err)

			app := newTestApp(func(a *App) {
				a.config.Namespace = namespace
				a.repositories = repositories.NewRepositories(repositories.RepositoriesConfig{
					Platform:          config.PlatformXKS,
					PlatformConfirmed: true,
					SADynClient:       dyn,
					SAClientset:       typed,
					Namespace:         namespace,
				})
			})

			list := httptest.NewRecorder()
			app.ListConnectionTypesHandler(list, httptest.NewRequest(http.MethodGet, "/api/connection-types", nil), nil)
			require.Equal(t, http.StatusOK, list.Code, list.Body.String())
			var items []map[string]any
			require.NoError(t, json.Unmarshal(list.Body.Bytes(), &items))
			assert.Len(t, items, 1)

			get := httptest.NewRecorder()
			app.GetConnectionTypeHandler(get, httptest.NewRequest(http.MethodGet, "/api/connection-types/s3", nil),
				httprouter.Params{{Key: "name", Value: "s3"}})
			assert.Equal(t, http.StatusOK, get.Code, get.Body.String())
		})
	}
}

// AC (RHAI-50761): the shipped `get odhdashboardconfigs` rule is load-bearing.
// Without it a confirmed xKS platform still serves defaults (a forbidden read
// degrades), so only an installed CRD with a provisioned instance tells the
// two apart: with the shipped Role the real instance is served, without the
// rule the defaults are.
func TestGetConfig_TheShippedRoleServesTheProvisionedInstance_XKS(t *testing.T) {
	preserve := true
	crds, err := envtest.InstallCRDs(testEnvInstance.Config, envtest.CRDInstallOptions{CRDs: []*apiextensionsv1.CustomResourceDefinition{{
		ObjectMeta: metav1.ObjectMeta{Name: "odhdashboardconfigs.opendatahub.io"},
		Spec: apiextensionsv1.CustomResourceDefinitionSpec{
			Group: "opendatahub.io",
			Scope: apiextensionsv1.NamespaceScoped,
			Names: apiextensionsv1.CustomResourceDefinitionNames{Plural: "odhdashboardconfigs", Kind: "OdhDashboardConfig", ListKind: "OdhDashboardConfigList"},
			Versions: []apiextensionsv1.CustomResourceDefinitionVersion{{
				Name: "v1alpha", Served: true, Storage: true,
				Schema: &apiextensionsv1.CustomResourceValidation{OpenAPIV3Schema: &apiextensionsv1.JSONSchemaProps{
					Type: "object", XPreserveUnknownFields: &preserve,
				}},
			}},
		},
	}}})
	require.NoError(t, err)
	// Other tests in this package rely on the CRD being absent; wait until it is gone.
	t.Cleanup(func() {
		require.NoError(t, envtest.UninstallCRDs(testEnvInstance.Config, envtest.CRDInstallOptions{CRDs: crds}))
	})

	read := func(t *testing.T, rules []rbacv1.PolicyRule) map[string]any {
		t.Helper()
		dyn, namespace := serviceAccountDynamicClient(t, rules)
		adminDyn, err := dynamic.NewForConfig(testEnvInstance.Config)
		require.NoError(t, err)
		_, err = adminDyn.Resource(models.DashboardConfigGVR).Namespace(namespace).Create(context.Background(), &unstructured.Unstructured{Object: map[string]any{
			"apiVersion": "opendatahub.io/v1alpha",
			"kind":       "OdhDashboardConfig",
			"metadata":   map[string]any{"name": "odh-dashboard-config"},
			"spec":       map[string]any{"dashboardConfig": map[string]any{}},
		}}, metav1.CreateOptions{})
		require.NoError(t, err)

		app := newTestApp(func(a *App) {
			a.config.Namespace = namespace
			a.config.DashboardConfigName = "odh-dashboard-config"
			a.repositories = repositories.NewRepositories(repositories.RepositoriesConfig{
				Platform: config.PlatformXKS, PlatformConfirmed: true, SADynClient: dyn, Namespace: namespace,
			})
		})
		rr := httptest.NewRecorder()
		app.GetConfigHandler(rr, httptest.NewRequest(http.MethodGet, "/api/config", nil), nil)
		require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())
		var body map[string]any
		require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &body))
		return body
	}
	uid := func(body map[string]any) any {
		meta, _ := body["metadata"].(map[string]any)
		return meta["uid"]
	}

	role := readRole(t, shippedRoles["RHAII bundle"])
	assert.NotEmpty(t, uid(read(t, role.Rules)), "the shipped Role must serve the provisioned instance")

	var withoutGet []rbacv1.PolicyRule
	for _, r := range role.Rules {
		if len(r.APIGroups) == 1 && r.APIGroups[0] == "opendatahub.io" {
			continue
		}
		withoutGet = append(withoutGet, r)
	}
	assert.Empty(t, uid(read(t, withoutGet)), "without the rule a forbidden read serves defaults")
}
