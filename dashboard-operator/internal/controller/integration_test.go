//go:build integration

package controller_test

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"testing"

	routev1 "github.com/openshift/api/route/v1"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
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

	testEnv = &envtest.Environment{
		CRDDirectoryPaths: []string{
			filepath.Join("..", "..", "config", "crd", "bases"),
		},
		Scheme: s,
	}

	cfg, err := testEnv.Start()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to start envtest: %v\n", err)
		os.Exit(1)
	}

	k8sClient, err = client.New(cfg, client.Options{Scheme: s})
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to create client: %v\n", err)
		testEnv.Stop()
		os.Exit(1)
	}

	ctx := context.Background()
	ns := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: integrationNamespace}}
	if err := k8sClient.Create(ctx, ns); err != nil {
		fmt.Fprintf(os.Stderr, "failed to create test namespace: %v\n", err)
		testEnv.Stop()
		os.Exit(1)
	}

	code := m.Run()

	testEnv.Stop()
	os.Exit(code)
}

// createIntegrationManifests builds a temp directory tree with minimal
// kustomize manifests for core + the requested module slugs.
func createIntegrationManifests(t *testing.T, moduleSlugs []string) string {
	t.Helper()

	base := t.TempDir()

	// Core overlay: basePath/odh/
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

	// Modular-architecture base
	modArch := filepath.Join(base, "modular-architecture")
	require.NoError(t, os.MkdirAll(modArch, 0755))
	require.NoError(t, os.WriteFile(filepath.Join(modArch, "params.env"), []byte(""), 0644))

	// Per-module manifests
	for _, slug := range moduleSlugs {
		moduleDir := filepath.Join(modArch, "modules", slug)
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
	}
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

const dashboardFinalizer = "components.platform.opendatahub.io/cleanup"

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
		DeploymentMode: v1alpha1.DeploymentModeStandalone,
		Gateway:        &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Modules:        disableAllModulesExcept("modelRegistry"),
	})

	ctx := context.Background()
	require.NoError(t, k8sClient.Create(ctx, dashboard))

	t.Cleanup(func() {
		deleteDashboard(t)
		cleanupModuleResources(t)
	})

	// First reconcile adds the finalizer and returns early.
	reconcile(t, r)
	// Second reconcile executes the full standalone pipeline.
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
		DeploymentMode: v1alpha1.DeploymentModeStandalone,
		Gateway:        &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Modules:        disableAllModulesExcept("modelRegistry"),
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
			DeploymentMode: v1alpha1.DeploymentModeStandalone,
			Gateway:        &v1alpha1.GatewaySpec{Domain: "test.example.com"},
			Modules:        modules,
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
			DeploymentMode: v1alpha1.DeploymentModeStandalone,
			Gateway:        &v1alpha1.GatewaySpec{Domain: "test.example.com"},
			Modules:        modules,
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
		DeploymentMode: v1alpha1.DeploymentModeStandalone,
		Gateway:        &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Modules:        disableAllModulesExcept("modelRegistry"),
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
