//go:build integration

package controller_test

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	routev1 "github.com/openshift/api/route/v1"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/envtest"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	ctrlpkg "github.com/opendatahub-io/odh-dashboard/dashboard-operator/internal/controller"
)

const integrationNamespace = "integration-test"

var (
	testEnv   *envtest.Environment
	k8sClient client.Client
	restCfg   *rest.Config
)

func TestMain(m *testing.M) {
	s := runtime.NewScheme()
	if err := clientgoscheme.AddToScheme(s); err != nil {
		fmt.Fprintf(os.Stderr, "failed to add clientgo scheme: %v\n", err)
		os.Exit(1)
	}
	if err := v1alpha1.AddToScheme(s); err != nil {
		fmt.Fprintf(os.Stderr, "failed to add v1alpha1 scheme: %v\n", err)
		os.Exit(1)
	}
	if err := routev1.AddToScheme(s); err != nil {
		fmt.Fprintf(os.Stderr, "failed to add routev1 scheme: %v\n", err)
		os.Exit(1)
	}
	if err := apiextensionsv1.AddToScheme(s); err != nil {
		fmt.Fprintf(os.Stderr, "failed to add apiextensionsv1 scheme: %v\n", err)
		os.Exit(1)
	}

	testEnv = &envtest.Environment{
		CRDDirectoryPaths: []string{
			filepath.Join("..", "..", "config", "crd", "bases"),
			// Minimal ConsoleLink CRD (provided by OpenShift in production).
			filepath.Join("testdata", "crd"),
		},
		Scheme: s,
	}

	cfg, err := testEnv.Start()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to start envtest: %v\n", err)
		os.Exit(1)
	}
	restCfg = cfg

	k8sClient, err = client.New(cfg, client.Options{Scheme: s})
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to create client: %v\n", err)
		_ = testEnv.Stop()
		os.Exit(1)
	}

	ctx := context.Background()
	ns := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: integrationNamespace}}
	if err := k8sClient.Create(ctx, ns); err != nil {
		fmt.Fprintf(os.Stderr, "failed to create test namespace: %v\n", err)
		_ = testEnv.Stop()
		os.Exit(1)
	}

	code := m.Run()

	if err := testEnv.Stop(); err != nil {
		fmt.Fprintf(os.Stderr, "failed to stop envtest: %v\n", err)
	}
	os.Exit(code)
}

// createIntegrationManifests builds a temp directory tree with minimal
// kustomize manifests for core + the requested module slugs.
func createIntegrationManifests(t *testing.T, moduleSlugs []string) string {
	t.Helper()

	base := t.TempDir()

	// Core overlay: basePath/odh/
	// The overlay path must match overlaysSourcePaths in support.go.
	overlay := filepath.Join(base, "odh")
	require.NoError(t, os.MkdirAll(overlay, 0755))
	require.NoError(t, os.WriteFile(filepath.Join(overlay, "kustomization.yaml"), []byte(`apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - configmap.yaml
`), 0644))
	require.NoError(t, os.WriteFile(filepath.Join(overlay, "configmap.yaml"), []byte(`apiVersion: v1
kind: ConfigMap
metadata:
  name: dashboard-core-config
data:
  key: value
`), 0644))
	require.NoError(t, os.WriteFile(filepath.Join(overlay, "params.env"), []byte(""), 0644))

	// Per-module manifests: basePath/modules/<slug>/
	// The module path must match deployModuleManifests in module_deploy.go.
	for _, slug := range moduleSlugs {
		moduleDir := filepath.Join(base, "modules", slug)
		require.NoError(t, os.MkdirAll(moduleDir, 0755))

		require.NoError(t, os.WriteFile(filepath.Join(moduleDir, "kustomization.yaml"), []byte(`apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
`), 0644))

		deployment := fmt.Sprintf(`apiVersion: apps/v1
kind: Deployment
metadata:
  name: %[1]s-ui
spec:
  replicas: 1
  selector:
    matchLabels:
      app: %[1]s-ui
  template:
    metadata:
      labels:
        app: %[1]s-ui
    spec:
      containers:
      - name: %[1]s-ui
        image: registry.example.com/%[1]s:latest
        ports:
        - containerPort: 8080
`, slug)

		service := fmt.Sprintf(`apiVersion: v1
kind: Service
metadata:
  name: %[1]s-ui
spec:
  selector:
    app: %[1]s-ui
  ports:
  - port: 8080
    targetPort: 8080
`, slug)

		require.NoError(t, os.WriteFile(filepath.Join(moduleDir, "deployment.yaml"), []byte(deployment), 0644))
		require.NoError(t, os.WriteFile(filepath.Join(moduleDir, "service.yaml"), []byte(service), 0644))
		require.NoError(t, os.WriteFile(filepath.Join(moduleDir, "params.env"), []byte(""), 0644))
	}

	return base
}

func newDashboard(spec v1alpha1.DashboardSpec) *v1alpha1.Dashboard {
	return &v1alpha1.Dashboard{
		ObjectMeta: metav1.ObjectMeta{
			Name: v1alpha1.DashboardInstanceName,
		},
		Spec: spec,
	}
}

func reconcile(t *testing.T, r *ctrlpkg.DashboardReconciler) ctrl.Result {
	t.Helper()
	ctx := context.Background()
	req := ctrl.Request{NamespacedName: types.NamespacedName{Name: v1alpha1.DashboardInstanceName}}

	result, err := r.Reconcile(ctx, req)
	require.NoError(t, err)

	return result
}

func getDashboard(t *testing.T) *v1alpha1.Dashboard {
	t.Helper()
	dashboard := &v1alpha1.Dashboard{}
	err := k8sClient.Get(context.Background(), types.NamespacedName{Name: v1alpha1.DashboardInstanceName}, dashboard)
	require.NoError(t, err)

	return dashboard
}

func deleteDashboard(t *testing.T) {
	t.Helper()
	ctx := context.Background()

	dashboard := &v1alpha1.Dashboard{}
	err := k8sClient.Get(ctx, types.NamespacedName{Name: v1alpha1.DashboardInstanceName}, dashboard)
	if err != nil {
		return
	}

	// Remove finalizer so the CR can be fully deleted (no controller loop to handle it).
	if len(dashboard.Finalizers) > 0 {
		dashboard.Finalizers = nil
		if updateErr := k8sClient.Update(ctx, dashboard); updateErr != nil {
			t.Logf("warning: failed to remove finalizers: %v", updateErr)
		}
	}

	_ = k8sClient.Delete(ctx, dashboard)

	for range 50 {
		if getErr := k8sClient.Get(ctx, types.NamespacedName{Name: v1alpha1.DashboardInstanceName}, &v1alpha1.Dashboard{}); getErr != nil {
			return
		}
		time.Sleep(100 * time.Millisecond)
	}
	t.Fatal("Dashboard CR still exists after polling — subsequent tests will fail on Create")
}

func cleanupModuleResources(t *testing.T) {
	t.Helper()
	ctx := context.Background()

	matchLabels := client.MatchingLabels{
		labels.PlatformPartOf: "dashboard",
	}
	inNs := client.InNamespace(integrationNamespace)

	var deployments appsv1.DeploymentList
	if err := k8sClient.List(ctx, &deployments, matchLabels, inNs); err == nil {
		for i := range deployments.Items {
			_ = k8sClient.Delete(ctx, &deployments.Items[i])
		}
	}

	var services corev1.ServiceList
	if err := k8sClient.List(ctx, &services, matchLabels, inNs); err == nil {
		for i := range services.Items {
			_ = k8sClient.Delete(ctx, &services.Items[i])
		}
	}

	var configmaps corev1.ConfigMapList
	if err := k8sClient.List(ctx, &configmaps, matchLabels, inNs); err == nil {
		for i := range configmaps.Items {
			_ = k8sClient.Delete(ctx, &configmaps.Items[i])
		}
	}
}

func listDeployments(t *testing.T, componentLabel string) []appsv1.Deployment {
	t.Helper()
	var deployments appsv1.DeploymentList
	err := k8sClient.List(context.Background(), &deployments,
		client.InNamespace(integrationNamespace),
		client.MatchingLabels{
			labels.PlatformPartOf:         "dashboard",
			"app.kubernetes.io/component": componentLabel,
		},
	)
	require.NoError(t, err)

	return deployments.Items
}

func listServices(t *testing.T, componentLabel string) []corev1.Service {
	t.Helper()
	var services corev1.ServiceList
	err := k8sClient.List(context.Background(), &services,
		client.InNamespace(integrationNamespace),
		client.MatchingLabels{
			labels.PlatformPartOf:         "dashboard",
			"app.kubernetes.io/component": componentLabel,
		},
	)
	require.NoError(t, err)

	return services.Items
}

func getFederationConfigMap(t *testing.T) *corev1.ConfigMap {
	t.Helper()
	cm := &corev1.ConfigMap{}
	err := k8sClient.Get(context.Background(), types.NamespacedName{
		Name:      "federation-config",
		Namespace: integrationNamespace,
	}, cm)
	if err != nil {
		return nil
	}

	return cm
}

type federationEntry struct {
	Name    string      `json:"name"`
	Enabled bool        `json:"enabled"`
	Service *serviceRef `json:"service,omitempty"`
}

type serviceRef struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Port      int32  `json:"port"`
}

func parseFederationEntries(t *testing.T, cm *corev1.ConfigMap) []federationEntry {
	t.Helper()
	require.NotNil(t, cm)
	data, ok := cm.Data["module-federation-config.json"]
	require.True(t, ok, "federation ConfigMap missing module-federation-config.json key")

	var entries []federationEntry
	require.NoError(t, json.Unmarshal([]byte(data), &entries))

	return entries
}

func findFederationEntry(entries []federationEntry, name string) *federationEntry {
	for i := range entries {
		if entries[i].Name == name {
			return &entries[i]
		}
	}

	return nil
}

// disableAllModulesExcept returns a Modules map where every registered
// module except the listed ones is explicitly disabled.
func disableAllModulesExcept(enabled ...string) map[string]v1alpha1.ModuleOverride {
	enabledSet := make(map[string]bool, len(enabled))
	for _, name := range enabled {
		enabledSet[name] = true
	}

	modules := make(map[string]v1alpha1.ModuleOverride)
	for _, name := range ctrlpkg.ModuleNames() {
		if !enabledSet[name] {
			modules[name] = v1alpha1.ModuleOverride{State: v1alpha1.ModuleDisabled}
		}
	}

	return modules
}

// writeMaasConsumerPortalManifest writes the portal ConsoleLink kustomize bundle
// into base/maas-consumer-portal-consolelink/rhoai so the reconciler can render it.
func writeMaasConsumerPortalManifest(t *testing.T, base string) {
	t.Helper()

	dir := filepath.Join(base, "maas-consumer-portal-consolelink", "rhoai")
	require.NoError(t, os.MkdirAll(dir, 0755))

	require.NoError(t, os.WriteFile(filepath.Join(dir, "kustomization.yaml"), []byte(`apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - consolelink.yaml
configMapGenerator:
  - name: maas-consumer-portal-params
    env: params.env
generatorOptions:
  disableNameSuffixHash: true
replacements:
  - source:
      kind: ConfigMap
      name: maas-consumer-portal-params
      fieldPath: data.section-title
    targets:
      - select:
          kind: ConsoleLink
          name: maas-consumer-portal-link
        fieldPaths:
          - spec.applicationMenu.section
  - source:
      kind: ConfigMap
      name: maas-consumer-portal-params
      fieldPath: data.maas-consumer-portal-url
    targets:
      - select:
          kind: ConsoleLink
          name: maas-consumer-portal-link
        fieldPaths:
          - spec.href
`), 0644))

	require.NoError(t, os.WriteFile(filepath.Join(dir, "consolelink.yaml"), []byte(`apiVersion: console.openshift.io/v1
kind: ConsoleLink
metadata:
  name: maas-consumer-portal-link
spec:
  applicationMenu:
    section: section-title
    imageURL: data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=
  href: maas-consumer-portal-url
  location: ApplicationMenu
  text: MaaS Consumer Portal
`), 0644))

	require.NoError(t, os.WriteFile(filepath.Join(dir, "params.env"), []byte("maas-consumer-portal-url=\nsection-title=\n"), 0644))
}

// getConsoleLink fetches a cluster-scoped ConsoleLink by name, returning nil
// when it does not exist.
func getConsoleLink(t *testing.T, name string) *unstructured.Unstructured {
	t.Helper()

	cl := &unstructured.Unstructured{}
	cl.SetGroupVersionKind(ctrlpkg.ConsoleLinkGVK)
	err := k8sClient.Get(context.Background(), types.NamespacedName{Name: name}, cl)
	if err != nil {
		return nil
	}

	return cl
}

func deleteConsoleLinkIfExists(t *testing.T, name string) {
	t.Helper()

	cl := &unstructured.Unstructured{}
	cl.SetGroupVersionKind(ctrlpkg.ConsoleLinkGVK)
	cl.SetName(name)
	_ = k8sClient.Delete(context.Background(), cl)
}

// conditionStatus returns the status of the named condition on the Dashboard,
// or an empty string when the condition is absent.
func conditionStatus(dashboard *v1alpha1.Dashboard, conditionType string) metav1.ConditionStatus {
	for i := range dashboard.Status.Conditions {
		if dashboard.Status.Conditions[i].Type == conditionType {
			return dashboard.Status.Conditions[i].Status
		}
	}

	return ""
}

func TestIntegration_MaasConsumerPortalConsoleLink(t *testing.T) {
	base := createIntegrationManifests(t, []string{"model-registry"})
	writeMaasConsumerPortalManifest(t, base)

	r := &ctrlpkg.DashboardReconciler{
		Client:                k8sClient,
		Scheme:                k8sClient.Scheme(),
		ManifestsBasePath:     base,
		Platform:              cluster.OpenDataHub,
		Namespace:             integrationNamespace,
		ApplicationsNamespace: integrationNamespace,
	}

	dashboard := newDashboard(v1alpha1.DashboardSpec{
		Gateway:            &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Modules:            disableAllModulesExcept("modelRegistry"),
		MaasConsumerPortal: &v1alpha1.MaasConsumerPortalSpec{ManagementState: "Managed"},
	})

	ctx := context.Background()
	require.NoError(t, k8sClient.Create(ctx, dashboard))

	t.Cleanup(func() {
		deleteDashboard(t)
		cleanupModuleResources(t)
		deleteConsoleLinkIfExists(t, ctrlpkg.MaasConsumerPortalConsoleLinkName)
	})

	reconcile(t, r)
	reconcile(t, r)

	// ConsoleLink is created with the derived href.
	cl := getConsoleLink(t, ctrlpkg.MaasConsumerPortalConsoleLinkName)
	require.NotNil(t, cl, "maas-consumer-portal-link ConsoleLink should be created when enabled")

	href, found, err := unstructured.NestedString(cl.Object, "spec", "href")
	require.NoError(t, err)
	require.True(t, found)
	assert.Equal(t, "https://maas-consumer-portal.test.example.com/", href)

	// ownerReference points to the Dashboard CR (for GC on CR deletion).
	owners := cl.GetOwnerReferences()
	require.Len(t, owners, 1, "ConsoleLink should have exactly one owner reference")
	assert.Equal(t, v1alpha1.DashboardKind, owners[0].Kind)
	assert.Equal(t, v1alpha1.DashboardInstanceName, owners[0].Name)

	// The portal carries a distinct part-of label so the core dashboard teardown
	// (which selects part-of=dashboard) never touches it. This makes the portal
	// an independent operand — see TestIntegration_MaasConsumerPortalConsoleLinkPreservedWhenCoreRemoved.
	assert.Equal(t, "maas-consumer-portal", cl.GetLabels()[labels.PlatformPartOf],
		"portal ConsoleLink must carry part-of=maas-consumer-portal, not part-of=dashboard")

	// Disable the portal — the ConsoleLink is removed.
	dashboard = getDashboard(t)
	dashboard.Spec.MaasConsumerPortal = &v1alpha1.MaasConsumerPortalSpec{ManagementState: "Removed"}
	require.NoError(t, k8sClient.Update(ctx, dashboard))

	reconcile(t, r)

	cl = getConsoleLink(t, ctrlpkg.MaasConsumerPortalConsoleLinkName)
	assert.Nil(t, cl, "maas-consumer-portal-link ConsoleLink should be deleted when disabled")
}

// TestIntegration_MaasConsumerPortalConsoleLinkPreservedWhenCoreRemoved verifies
// that the portal ConsoleLink survives a core-dashboard teardown while the
// portal itself stays enabled — the portal is independent of the core
// dashboard's managementState, so core `managementState: Removed` with
// `maasConsumerPortal.managementState: Managed` must keep the link visible.
func TestIntegration_MaasConsumerPortalConsoleLinkPreservedWhenCoreRemoved(t *testing.T) {
	base := createIntegrationManifests(t, []string{"model-registry"})
	writeMaasConsumerPortalManifest(t, base)

	r := &ctrlpkg.DashboardReconciler{
		Client:                k8sClient,
		Scheme:                k8sClient.Scheme(),
		ManifestsBasePath:     base,
		Platform:              cluster.OpenDataHub,
		Namespace:             integrationNamespace,
		ApplicationsNamespace: integrationNamespace,
	}

	dashboard := newDashboard(v1alpha1.DashboardSpec{
		Gateway:            &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Modules:            disableAllModulesExcept("modelRegistry"),
		MaasConsumerPortal: &v1alpha1.MaasConsumerPortalSpec{ManagementState: "Managed"},
	})

	ctx := context.Background()
	require.NoError(t, k8sClient.Create(ctx, dashboard))

	t.Cleanup(func() {
		deleteDashboard(t)
		cleanupModuleResources(t)
		deleteConsoleLinkIfExists(t, ctrlpkg.MaasConsumerPortalConsoleLinkName)
	})

	reconcile(t, r)
	reconcile(t, r)

	require.NotNil(t, getConsoleLink(t, ctrlpkg.MaasConsumerPortalConsoleLinkName),
		"ConsoleLink should exist before Removed")

	// Core dashboard is torn down but the portal stays enabled, so its
	// ConsoleLink must be preserved.
	dashboard = getDashboard(t)
	dashboard.Spec.ManagementState = "Removed"
	require.NoError(t, k8sClient.Update(ctx, dashboard))

	reconcile(t, r)

	assert.NotNil(t, getConsoleLink(t, ctrlpkg.MaasConsumerPortalConsoleLinkName),
		"ConsoleLink should be preserved when core is Removed but portal stays enabled")

	updated := getDashboard(t)
	assert.Equal(t, metav1.ConditionTrue, conditionStatus(updated, "MaasConsumerPortalAvailable"),
		"MaasConsumerPortalAvailable should be True while the portal stays enabled")
}

// TestIntegration_MaasConsumerPortalConsoleLinkRemovedWhenDisabled verifies that a
// core-dashboard teardown with the portal disabled removes the portal
// ConsoleLink along with the rest of the managed resources.
func TestIntegration_MaasConsumerPortalConsoleLinkRemovedWhenDisabled(t *testing.T) {
	base := createIntegrationManifests(t, []string{"model-registry"})
	writeMaasConsumerPortalManifest(t, base)

	r := &ctrlpkg.DashboardReconciler{
		Client:                k8sClient,
		Scheme:                k8sClient.Scheme(),
		ManifestsBasePath:     base,
		Platform:              cluster.OpenDataHub,
		Namespace:             integrationNamespace,
		ApplicationsNamespace: integrationNamespace,
	}

	dashboard := newDashboard(v1alpha1.DashboardSpec{
		Gateway:            &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Modules:            disableAllModulesExcept("modelRegistry"),
		MaasConsumerPortal: &v1alpha1.MaasConsumerPortalSpec{ManagementState: "Managed"},
	})

	ctx := context.Background()
	require.NoError(t, k8sClient.Create(ctx, dashboard))

	t.Cleanup(func() {
		deleteDashboard(t)
		cleanupModuleResources(t)
		deleteConsoleLinkIfExists(t, ctrlpkg.MaasConsumerPortalConsoleLinkName)
	})

	reconcile(t, r)
	reconcile(t, r)

	require.NotNil(t, getConsoleLink(t, ctrlpkg.MaasConsumerPortalConsoleLinkName),
		"ConsoleLink should exist before Removed")

	// Portal disabled AND core Removed: nothing should keep the link alive.
	dashboard = getDashboard(t)
	dashboard.Spec.ManagementState = "Removed"
	dashboard.Spec.MaasConsumerPortal = &v1alpha1.MaasConsumerPortalSpec{ManagementState: "Removed"}
	require.NoError(t, k8sClient.Update(ctx, dashboard))

	reconcile(t, r)

	assert.Nil(t, getConsoleLink(t, ctrlpkg.MaasConsumerPortalConsoleLinkName),
		"ConsoleLink should be removed when managementState is Removed and portal is disabled")
}

// newManifestReconciler builds a DashboardReconciler wired to the shared k8sClient.
func newManifestReconciler(manifests string) *ctrlpkg.DashboardReconciler {
	return newReconcilerWithClient(k8sClient, manifests)
}

// newReconcilerWithClient builds a DashboardReconciler with an explicit client.
// The observability _Deployed test uses this to inject an isolated client whose
// RESTMapper has been warmed with the Perses CRD.
func newReconcilerWithClient(cli client.Client, manifests string) *ctrlpkg.DashboardReconciler {
	return &ctrlpkg.DashboardReconciler{
		Client:                cli,
		Scheme:                cli.Scheme(),
		ManifestsBasePath:     manifests,
		Platform:              cluster.OpenDataHub,
		Namespace:             integrationNamespace,
		ApplicationsNamespace: integrationNamespace,
	}
}

// deleteIgnoreNotFound deletes each object via the shared client, ignoring NotFound.
func deleteIgnoreNotFound(t *testing.T, objs ...client.Object) {
	t.Helper()
	ctx := context.Background()
	for _, o := range objs {
		if err := k8sClient.Delete(ctx, o); client.IgnoreNotFound(err) != nil {
			t.Logf("warning: failed to delete %T %s: %v", o, o.GetName(), err)
		}
	}
}

// newIsolatedClient builds a fresh client with its own RESTMapper. The
// observability _Deployed test uses it so that listing PersesDashboards (which
// caches a positive REST mapping once the CRD exists) never poisons the shared
// client's mapper that _PersesCRDNotFound relies on staying empty.
func newIsolatedClient(t *testing.T) client.Client {
	t.Helper()
	c, err := client.New(restCfg, client.Options{Scheme: k8sClient.Scheme()})
	require.NoError(t, err)

	return c
}

// readParamsEnv parses a KEY=VALUE params.env file into a map, mirroring the
// controller's own readExistingParams (blank and comment lines skipped). Used to
// assert the inter-BFF service-discovery env vars the reconciler writes.
func readParamsEnv(t *testing.T, path string) map[string]string {
	t.Helper()
	params := map[string]string{}
	data, err := os.ReadFile(path)
	require.NoError(t, err)
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		if k, v, ok := strings.Cut(line, "="); ok {
			params[k] = v
		}
	}

	return params
}

func TestIntegration_StandaloneEnableModule(t *testing.T) {
	manifests := createIntegrationManifests(t, []string{"model-registry"})

	r := &ctrlpkg.DashboardReconciler{
		Client:                k8sClient,
		Scheme:                k8sClient.Scheme(),
		ManifestsBasePath:     manifests,
		Platform:              cluster.OpenDataHub,
		Namespace:             integrationNamespace,
		ApplicationsNamespace: integrationNamespace,
	}

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

	// First reconcile adds the finalizer and returns early.
	reconcile(t, r)
	// Second reconcile executes the full deployment pipeline.
	reconcile(t, r)

	// Verify module Deployment was created with correct labels.
	deps := listDeployments(t, "model-registry")
	require.Len(t, deps, 1, "expected exactly one model-registry Deployment")

	// Verify module Service was created.
	svcs := listServices(t, "model-registry")
	require.Len(t, svcs, 1, "expected exactly one model-registry Service")

	// Verify federation ConfigMap contains the modelRegistry entry.
	fedCM := getFederationConfigMap(t)
	require.NotNil(t, fedCM, "federation-config ConfigMap should exist")

	entries := parseFederationEntries(t, fedCM)
	entry := findFederationEntry(entries, "modelRegistry")
	require.NotNil(t, entry, "modelRegistry should be in federation config")
	// envtest has no kubelet so pods never become ready — module phase is
	// Degraded not Deployed, meaning entry.Enabled is false. The important
	// check is that the service reference is correct.
	require.NotNil(t, entry.Service, "federation entry should include a service reference")
	assert.Equal(t, "odh-dashboard-model-registry-ui", entry.Service.Name)
	assert.Equal(t, integrationNamespace, entry.Service.Namespace)
	assert.Equal(t, int32(8043), entry.Service.Port)

	// Verify Dashboard status has modelRegistry deployed or degraded.
	dashboard = getDashboard(t)
	require.Contains(t, dashboard.Status.ModuleStatuses, "modelRegistry")
	// overlayStandaloneReadiness will mark Degraded because envtest has no kubelet,
	// but the module should not be Disabled or NotDeployed.
	status := dashboard.Status.ModuleStatuses["modelRegistry"]
	assert.NotEqual(t, v1alpha1.ModulePhaseDisabled, status.Phase,
		"modelRegistry should not be Disabled")
	assert.NotEqual(t, v1alpha1.ModulePhaseNotDeployed, status.Phase,
		"modelRegistry should not be NotDeployed")

	// Verify URL was extracted from Gateway.Domain.
	assert.Equal(t, "https://test.example.com/", dashboard.Status.URL)
}

func TestIntegration_StandaloneDisableModule(t *testing.T) {
	manifests := createIntegrationManifests(t, []string{"model-registry"})

	r := &ctrlpkg.DashboardReconciler{
		Client:                k8sClient,
		Scheme:                k8sClient.Scheme(),
		ManifestsBasePath:     manifests,
		Platform:              cluster.OpenDataHub,
		Namespace:             integrationNamespace,
		ApplicationsNamespace: integrationNamespace,
	}

	// Create Dashboard with modelRegistry enabled.
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

	// Sanity: module resources exist after enable.
	deps := listDeployments(t, "model-registry")
	require.Len(t, deps, 1, "model-registry Deployment should exist before disabling")

	// Disable modelRegistry.
	dashboard = getDashboard(t)
	dashboard.Spec.Modules = disableAllModulesExcept() // disable everything
	require.NoError(t, k8sClient.Update(ctx, dashboard))

	reconcile(t, r)

	// Verify module resources have been cleaned up.
	deps = listDeployments(t, "model-registry")
	assert.Empty(t, deps, "model-registry Deployment should be deleted after disabling")

	svcs := listServices(t, "model-registry")
	assert.Empty(t, svcs, "model-registry Service should be deleted after disabling")

	// Verify federation ConfigMap no longer contains modelRegistry.
	fedCM := getFederationConfigMap(t)
	require.NotNil(t, fedCM)
	entries := parseFederationEntries(t, fedCM)
	entry := findFederationEntry(entries, "modelRegistry")
	assert.Nil(t, entry, "modelRegistry should not be in federation config after disabling")

	// Verify status shows Disabled.
	dashboard = getDashboard(t)
	require.Contains(t, dashboard.Status.ModuleStatuses, "modelRegistry")
	assert.Equal(t, v1alpha1.ModulePhaseDisabled, dashboard.Status.ModuleStatuses["modelRegistry"].Phase)
}

func TestIntegration_InterModuleDependency(t *testing.T) {
	manifests := createIntegrationManifests(t, []string{"gen-ai", "autorag"})

	r := &ctrlpkg.DashboardReconciler{
		Client:                k8sClient,
		Scheme:                k8sClient.Scheme(),
		ManifestsBasePath:     manifests,
		Platform:              cluster.OpenDataHub,
		Namespace:             integrationNamespace,
		ApplicationsNamespace: integrationNamespace,
	}

	ctx := context.Background()

	t.Cleanup(func() {
		deleteDashboard(t)
		cleanupModuleResources(t)
	})

	t.Run("autorag_disabled_when_genAi_disabled", func(t *testing.T) {
		// Enable autorag but disable genAi — autorag depends on genAi.
		// Also skip DSC gate by leaving Components nil.
		modules := disableAllModulesExcept("autorag")
		dashboard := newDashboard(v1alpha1.DashboardSpec{
			Gateway: &v1alpha1.GatewaySpec{Domain: "test.example.com"},
			Modules: modules,
		})
		require.NoError(t, k8sClient.Create(ctx, dashboard))

		reconcile(t, r)
		reconcile(t, r)

		dashboard = getDashboard(t)
		require.Contains(t, dashboard.Status.ModuleStatuses, "autorag")
		status := dashboard.Status.ModuleStatuses["autorag"]
		assert.Equal(t, v1alpha1.ModulePhaseDisabled, status.Phase,
			"autorag should be Disabled when genAi is disabled")
		assert.Equal(t, "DependencyNotMet", status.Reason)

		// autorag resources should NOT be deployed.
		deps := listDeployments(t, "autorag")
		assert.Empty(t, deps, "autorag Deployment should not exist when genAi is disabled")
	})

	deleteDashboard(t)
	cleanupModuleResources(t)

	t.Run("autorag_deployed_when_genAi_enabled", func(t *testing.T) {
		modules := disableAllModulesExcept("autorag", "genAi")
		dashboard := newDashboard(v1alpha1.DashboardSpec{
			Gateway: &v1alpha1.GatewaySpec{Domain: "test.example.com"},
			Modules: modules,
		})
		require.NoError(t, k8sClient.Create(ctx, dashboard))

		reconcile(t, r)
		reconcile(t, r)

		// Both genAi and autorag should have deployments.
		genAiDeps := listDeployments(t, "gen-ai")
		assert.NotEmpty(t, genAiDeps, "genAi Deployment should exist")

		autoragDeps := listDeployments(t, "autorag")
		assert.NotEmpty(t, autoragDeps, "autorag Deployment should exist when genAi is enabled")

		dashboard = getDashboard(t)
		require.Contains(t, dashboard.Status.ModuleStatuses, "autorag")
		assert.NotEqual(t, v1alpha1.ModulePhaseDisabled, dashboard.Status.ModuleStatuses["autorag"].Phase)
	})
}

func TestIntegration_DSCComponentGate(t *testing.T) {
	manifests := createIntegrationManifests(t, []string{"model-registry"})

	r := &ctrlpkg.DashboardReconciler{
		Client:                k8sClient,
		Scheme:                k8sClient.Scheme(),
		ManifestsBasePath:     manifests,
		Platform:              cluster.OpenDataHub,
		Namespace:             integrationNamespace,
		ApplicationsNamespace: integrationNamespace,
	}

	ctx := context.Background()

	t.Cleanup(func() {
		deleteDashboard(t)
		cleanupModuleResources(t)
	})

	// Create Dashboard with DSC Components map that does NOT include
	// "modelregistry" — the component required by the modelRegistry module.
	dashboard := newDashboard(v1alpha1.DashboardSpec{
		Gateway: &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Modules: disableAllModulesExcept("modelRegistry"),
		Components: map[string]v1alpha1.ComponentAvailability{
			"kserve": {ManagementState: "Managed"},
		},
	})
	require.NoError(t, k8sClient.Create(ctx, dashboard))

	reconcile(t, r)
	reconcile(t, r)

	// modelRegistry should be Disabled because its required DSC component
	// "modelregistry" is missing from the Components map.
	dashboard = getDashboard(t)
	require.Contains(t, dashboard.Status.ModuleStatuses, "modelRegistry")
	status := dashboard.Status.ModuleStatuses["modelRegistry"]
	assert.Equal(t, v1alpha1.ModulePhaseDisabled, status.Phase)
	assert.Equal(t, "ComponentNotAvailable", status.Reason)

	deps := listDeployments(t, "model-registry")
	assert.Empty(t, deps, "model-registry Deployment should not exist without DSC component")
}
