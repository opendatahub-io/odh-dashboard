//go:build integration

package controller_test

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/interceptor"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	ctrlpkg "github.com/opendatahub-io/odh-dashboard/dashboard-operator/internal/controller"
)

// writeMaaSConsumerPortalManifest copies the portal distribution bundle into the
// integration fixture because reconciliation writes its params.env at runtime.
func writeMaaSConsumerPortalManifest(t *testing.T, base string) {
	t.Helper()

	source := filepath.Join("..", "..", "..", "manifests", "distributions", "maas-consumer-portal")
	destination := filepath.Join(base, "distributions", "maas-consumer-portal")
	require.NoError(t, os.CopyFS(destination, os.DirFS(source)))
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

func cleanupMaaSConsumerPortalResources(t *testing.T, r *ctrlpkg.DashboardReconciler) {
	t.Helper()
	require.NoError(t, r.DeleteMaaSConsumerPortalResources(context.Background()))
	require.NoError(t, client.IgnoreNotFound(k8sClient.Delete(context.Background(), &corev1.ServiceAccount{ObjectMeta: metav1.ObjectMeta{Name: "maas-consumer-portal", Namespace: integrationNamespace}})))
}

func getPortalResource(t *testing.T, apiVersion, kind, name string) *unstructured.Unstructured {
	t.Helper()
	resource := &unstructured.Unstructured{}
	resource.SetAPIVersion(apiVersion)
	resource.SetKind(kind)
	err := k8sClient.Get(context.Background(), types.NamespacedName{Name: name, Namespace: integrationNamespace}, resource)
	if err != nil {
		return nil
	}
	return resource
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

func conditionReason(dashboard *v1alpha1.Dashboard, conditionType string) string {
	for i := range dashboard.Status.Conditions {
		if dashboard.Status.Conditions[i].Type == conditionType {
			return dashboard.Status.Conditions[i].Reason
		}
	}

	return ""
}

func TestIntegration_MaaSConsumerPortalConsoleLink(t *testing.T) {
	base := createIntegrationManifests(t, []string{"maas", "gen-ai"})
	writeMaaSConsumerPortalManifest(t, base)

	r := &ctrlpkg.DashboardReconciler{
		Client:                k8sClient,
		Scheme:                k8sClient.Scheme(),
		ManifestsBasePath:     base,
		Platform:              cluster.SelfManagedRhoai,
		Namespace:             integrationNamespace,
		ApplicationsNamespace: integrationNamespace,
	}

	dashboard := newDashboard(v1alpha1.DashboardSpec{
		ManagementSpec:     common.ManagementSpec{ManagementState: "Removed"},
		Gateway:            &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Modules:            disableAllModulesExcept("maas", "genAi"),
		MaaSConsumerPortal: &v1alpha1.MaaSConsumerPortalSpec{ManagementState: "Managed"},
	})

	ctx := context.Background()
	require.NoError(t, k8sClient.Create(ctx, dashboard))

	t.Cleanup(func() {
		deleteDashboard(t)
		cleanupMaaSConsumerPortalResources(t, r)
		cleanupModuleResources(t)
	})

	reconcile(t, r)
	reconcile(t, r)

	// ConsoleLink is created with the derived href.
	cl := getConsoleLink(t, ctrlpkg.MaaSConsumerPortalConsoleLinkName)
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
	// an independent operand — see TestIntegration_MaaSConsumerPortalConsoleLinkPreservedWhenCoreRemoved.
	assert.Equal(t, "maas-consumer-portal", cl.GetLabels()[labels.PlatformPartOf],
		"portal ConsoleLink must carry part-of=maas-consumer-portal, not part-of=dashboard")
	for _, resource := range []struct{ apiVersion, kind, name string }{
		{"apps/v1", "Deployment", "maas-consumer-portal"},
		{"v1", "Service", "maas-consumer-portal"},
		{"v1", "ServiceAccount", "maas-consumer-portal"},
		{"networking.k8s.io/v1", "NetworkPolicy", "maas-consumer-portal"},
		{"v1", "ConfigMap", "maas-consumer-portal-federation-config"},
		{"gateway.networking.k8s.io/v1", "HTTPRoute", "maas-consumer-portal"},
		{"rbac.authorization.k8s.io/v1", "ClusterRole", "maas-consumer-portal"},
		{"rbac.authorization.k8s.io/v1", "ClusterRoleBinding", "maas-consumer-portal"},
	} {
		assert.NotNil(t, getPortalResource(t, resource.apiVersion, resource.kind, resource.name), "%s/%s should be deployed", resource.kind, resource.name)
	}
	assert.Empty(t, getDashboard(t).Status.MaaSConsumerPortalURL,
		"the URL is not published before the portal is available")

	// Report the normally controller-managed Deployment and HTTPRoute status so
	// this envtest can verify the aggregate Ready condition for portal-only use.
	deployment := &appsv1.Deployment{}
	require.NoError(t, k8sClient.Get(ctx, types.NamespacedName{Name: "maas-consumer-portal", Namespace: integrationNamespace}, deployment))
	deployment.Status.ObservedGeneration = deployment.Generation
	deployment.Status.Conditions = []appsv1.DeploymentCondition{{Type: appsv1.DeploymentAvailable, Status: corev1.ConditionTrue}}
	require.NoError(t, k8sClient.Status().Update(ctx, deployment))
	for _, name := range []string{"maas-ui", "gen-ai-ui"} {
		moduleDeployment := &appsv1.Deployment{}
		require.NoError(t, k8sClient.Get(ctx, types.NamespacedName{Name: name, Namespace: integrationNamespace}, moduleDeployment))
		moduleDeployment.Status.Replicas = 1
		moduleDeployment.Status.ReadyReplicas = 1
		moduleDeployment.Status.Conditions = []appsv1.DeploymentCondition{{Type: appsv1.DeploymentAvailable, Status: corev1.ConditionTrue}}
		require.NoError(t, k8sClient.Status().Update(ctx, moduleDeployment))
	}
	route := &gatewayv1.HTTPRoute{}
	require.NoError(t, k8sClient.Get(ctx, types.NamespacedName{Name: "maas-consumer-portal", Namespace: integrationNamespace}, route))
	route.Status.Parents = []gatewayv1.RouteParentStatus{{Conditions: []metav1.Condition{
		{Type: string(gatewayv1.RouteConditionAccepted), Status: metav1.ConditionTrue, ObservedGeneration: route.Generation},
		{Type: string(gatewayv1.RouteConditionResolvedRefs), Status: metav1.ConditionTrue, ObservedGeneration: route.Generation},
	}}}
	require.NoError(t, k8sClient.Status().Update(ctx, route))
	reconcile(t, r)

	updated := getDashboard(t)
	assert.Equal(t, common.PhaseReady, updated.Status.Phase)
	assert.Equal(t, metav1.ConditionTrue, conditionStatus(updated, string(common.ConditionTypeReady)))
	assert.Equal(t, metav1.ConditionTrue, conditionStatus(updated, "MaaSConsumerPortalAvailable"))
	assert.Equal(t, "https://maas-consumer-portal.test.example.com/", updated.Status.MaaSConsumerPortalURL)

	// Updating a portal input reapplies the complete bundle, but retains the
	// previous URL until the Deployment and HTTPRoute have observed the update.
	t.Setenv("RELATED_IMAGE_ODH_CORE_BFF_IMAGE", "registry.example.com/odh-core-bff:updated")
	updated.Spec.Gateway.Domain = "updated.example.com"
	require.NoError(t, k8sClient.Update(ctx, updated))
	reconcile(t, r)
	deployment = &appsv1.Deployment{}
	require.NoError(t, k8sClient.Get(ctx, types.NamespacedName{Name: "maas-consumer-portal", Namespace: integrationNamespace}, deployment))
	require.Len(t, deployment.Spec.Template.Spec.Containers, 1)
	assert.Equal(t, "registry.example.com/odh-core-bff:updated", deployment.Spec.Template.Spec.Containers[0].Image)
	route = &gatewayv1.HTTPRoute{}
	require.NoError(t, k8sClient.Get(ctx, types.NamespacedName{Name: "maas-consumer-portal", Namespace: integrationNamespace}, route))
	assert.Equal(t, []gatewayv1.Hostname{"maas-consumer-portal.updated.example.com"}, route.Spec.Hostnames)
	cl = getConsoleLink(t, ctrlpkg.MaaSConsumerPortalConsoleLinkName)
	require.NotNil(t, cl)
	href, found, err = unstructured.NestedString(cl.Object, "spec", "href")
	require.NoError(t, err)
	require.True(t, found)
	assert.Equal(t, "https://maas-consumer-portal.updated.example.com/", href)
	assert.Equal(t, "https://maas-consumer-portal.test.example.com/", getDashboard(t).Status.MaaSConsumerPortalURL)

	deployment.Status.ObservedGeneration = deployment.Generation
	require.NoError(t, k8sClient.Status().Update(ctx, deployment))
	for i := range route.Status.Parents[0].Conditions {
		route.Status.Parents[0].Conditions[i].ObservedGeneration = route.Generation
	}
	require.NoError(t, k8sClient.Status().Update(ctx, route))
	reconcile(t, r)
	assert.Equal(t, "https://maas-consumer-portal.updated.example.com/", getDashboard(t).Status.MaaSConsumerPortalURL)

	// A transient bundle apply error reports an actionable condition, requests a
	// retry, and retains the previously verified endpoint.
	updated = getDashboard(t)
	updated.Spec.Gateway.Domain = "failed.example.com"
	require.NoError(t, k8sClient.Update(ctx, updated))
	watchClient, err := client.NewWithWatch(restCfg, client.Options{Scheme: k8sClient.Scheme()})
	require.NoError(t, err)
	failingReconciler := *r
	failingReconciler.Client = interceptor.NewClient(watchClient, interceptor.Funcs{
		Apply: func(ctx context.Context, delegate client.WithWatch, configuration runtime.ApplyConfiguration, options ...client.ApplyOption) error {
			data, err := json.Marshal(configuration)
			if err != nil {
				return err
			}
			if strings.Contains(string(data), `"kind":"Deployment"`) && strings.Contains(string(data), `"name":"maas-consumer-portal"`) {
				return errors.New("simulated MaaS Consumer Portal apply failure")
			}
			return delegate.Apply(ctx, configuration, options...)
		},
	})
	result := reconcile(t, &failingReconciler)
	assert.Equal(t, ctrlpkg.MaaSConsumerPortalRetryInterval, result.RequeueAfter)
	updated = getDashboard(t)
	assert.Equal(t, "MaaSConsumerPortalDeployFailed", conditionReason(updated, "MaaSConsumerPortalAvailable"))
	assert.Equal(t, "https://maas-consumer-portal.updated.example.com/", updated.Status.MaaSConsumerPortalURL)

	// service-ca normally creates this unlabelled Secret; model it explicitly to
	// verify portal removal does not rely on owner-reference garbage collection.
	require.NoError(t, k8sClient.Create(ctx, &corev1.Secret{ObjectMeta: metav1.ObjectMeta{Name: "maas-consumer-portal-tls", Namespace: integrationNamespace}}))

	// Disable the portal — the ConsoleLink is removed.
	dashboard = getDashboard(t)
	dashboard.Spec.MaaSConsumerPortal = &v1alpha1.MaaSConsumerPortalSpec{ManagementState: "Removed"}
	require.NoError(t, k8sClient.Update(ctx, dashboard))

	reconcile(t, r)

	cl = getConsoleLink(t, ctrlpkg.MaaSConsumerPortalConsoleLinkName)
	assert.Nil(t, cl, "maas-consumer-portal-link ConsoleLink should be deleted when disabled")
	for _, resource := range []struct{ apiVersion, kind, name string }{
		{"apps/v1", "Deployment", "maas-consumer-portal"},
		{"v1", "Service", "maas-consumer-portal"},
		{"networking.k8s.io/v1", "NetworkPolicy", "maas-consumer-portal"},
		{"v1", "ConfigMap", "maas-consumer-portal-federation-config"},
		{"gateway.networking.k8s.io/v1", "HTTPRoute", "maas-consumer-portal"},
		{"rbac.authorization.k8s.io/v1", "ClusterRole", "maas-consumer-portal"},
		{"rbac.authorization.k8s.io/v1", "ClusterRoleBinding", "maas-consumer-portal"},
		{"v1", "Secret", "maas-consumer-portal-tls"},
	} {
		assert.Nil(t, getPortalResource(t, resource.apiVersion, resource.kind, resource.name), "%s/%s should be removed", resource.kind, resource.name)
	}
	assert.NotNil(t, getPortalResource(t, "v1", "ServiceAccount", "maas-consumer-portal"), "ServiceAccount is retained for platforms that protect ServiceAccounts")
	assert.Empty(t, getDashboard(t).Status.MaaSConsumerPortalURL)
}

// TestIntegration_MaaSConsumerPortalConsoleLinkPreservedWhenCoreRemoved verifies
// that the portal ConsoleLink survives a core-dashboard teardown while the
// portal itself stays enabled — the portal is independent of the core
// dashboard's managementState, so core `managementState: Removed` with
// `maasConsumerPortal.managementState: Managed` must keep the link visible.
func TestIntegration_MaaSConsumerPortalConsoleLinkPreservedWhenCoreRemoved(t *testing.T) {
	base := createIntegrationManifests(t, []string{"maas", "gen-ai"})
	writeMaaSConsumerPortalManifest(t, base)

	r := &ctrlpkg.DashboardReconciler{
		Client:                k8sClient,
		Scheme:                k8sClient.Scheme(),
		ManifestsBasePath:     base,
		Platform:              cluster.SelfManagedRhoai,
		Namespace:             integrationNamespace,
		ApplicationsNamespace: integrationNamespace,
	}

	dashboard := newDashboard(v1alpha1.DashboardSpec{
		ManagementSpec:     common.ManagementSpec{ManagementState: "Removed"},
		Gateway:            &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Modules:            disableAllModulesExcept("maas", "genAi"),
		MaaSConsumerPortal: &v1alpha1.MaaSConsumerPortalSpec{ManagementState: "Managed"},
	})

	ctx := context.Background()
	require.NoError(t, k8sClient.Create(ctx, dashboard))

	t.Cleanup(func() {
		deleteDashboard(t)
		cleanupMaaSConsumerPortalResources(t, r)
		cleanupModuleResources(t)
	})

	reconcile(t, r)
	reconcile(t, r)

	require.NotNil(t, getConsoleLink(t, ctrlpkg.MaaSConsumerPortalConsoleLinkName),
		"ConsoleLink should exist before Removed")

	// Core dashboard is torn down but the portal stays enabled, so its
	// ConsoleLink must be preserved.
	dashboard = getDashboard(t)
	dashboard.Spec.ManagementState = "Removed"
	require.NoError(t, k8sClient.Update(ctx, dashboard))

	reconcile(t, r)

	assert.NotNil(t, getConsoleLink(t, ctrlpkg.MaaSConsumerPortalConsoleLinkName),
		"ConsoleLink should be preserved when core is Removed but portal stays enabled")

	updated := getDashboard(t)
	assert.Equal(t, metav1.ConditionFalse, conditionStatus(updated, "MaaSConsumerPortalAvailable"),
		"MaaS Consumer Portal must report unavailable when its explicitly disabled MaaS/GenAI dependencies are missing")
	assert.Equal(t, "RequiredModuleUnavailable", conditionReason(updated, "MaaSConsumerPortalAvailable"))
}

// TestIntegration_MaaSConsumerPortalConsoleLinkRemovedWhenDisabled verifies that a
// core-dashboard teardown with the portal disabled removes the portal
// ConsoleLink along with the rest of the managed resources.
func TestIntegration_MaaSConsumerPortalConsoleLinkRemovedWhenDisabled(t *testing.T) {
	base := createIntegrationManifests(t, []string{"maas", "gen-ai"})
	writeMaaSConsumerPortalManifest(t, base)

	r := &ctrlpkg.DashboardReconciler{
		Client:                k8sClient,
		Scheme:                k8sClient.Scheme(),
		ManifestsBasePath:     base,
		Platform:              cluster.SelfManagedRhoai,
		Namespace:             integrationNamespace,
		ApplicationsNamespace: integrationNamespace,
	}

	dashboard := newDashboard(v1alpha1.DashboardSpec{
		ManagementSpec:     common.ManagementSpec{ManagementState: "Removed"},
		Gateway:            &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Modules:            disableAllModulesExcept("maas", "genAi"),
		MaaSConsumerPortal: &v1alpha1.MaaSConsumerPortalSpec{ManagementState: "Managed"},
	})

	ctx := context.Background()
	require.NoError(t, k8sClient.Create(ctx, dashboard))

	t.Cleanup(func() {
		deleteDashboard(t)
		cleanupMaaSConsumerPortalResources(t, r)
		cleanupModuleResources(t)
	})

	reconcile(t, r)
	reconcile(t, r)

	require.NotNil(t, getConsoleLink(t, ctrlpkg.MaaSConsumerPortalConsoleLinkName),
		"ConsoleLink should exist before Removed")

	// Portal disabled AND core Removed: nothing should keep the link alive.
	dashboard = getDashboard(t)
	dashboard.Spec.ManagementState = "Removed"
	dashboard.Spec.MaaSConsumerPortal = &v1alpha1.MaaSConsumerPortalSpec{ManagementState: "Removed"}
	require.NoError(t, k8sClient.Update(ctx, dashboard))

	reconcile(t, r)

	assert.Nil(t, getConsoleLink(t, ctrlpkg.MaaSConsumerPortalConsoleLinkName),
		"ConsoleLink should be removed when managementState is Removed and portal is disabled")
}

func TestIntegration_MaaSConsumerPortalModuleDemandMatrix(t *testing.T) {
	tests := []struct {
		name                         string
		coreState                    string
		maasConsumerPortalState      string
		wantSharedBFFs               bool
		wantMaaSConsumerPortalConfig bool
	}{
		{name: "Core Dashboard only", coreState: "Managed", maasConsumerPortalState: "Removed", wantSharedBFFs: true},
		{name: "Core Dashboard and MaaS Consumer Portal", coreState: "Managed", maasConsumerPortalState: "Managed", wantSharedBFFs: true, wantMaaSConsumerPortalConfig: true},
		{name: "MaaS Consumer Portal only", coreState: "Removed", maasConsumerPortalState: "Managed", wantSharedBFFs: true, wantMaaSConsumerPortalConfig: true},
		{name: "both operands removed", coreState: "Removed", maasConsumerPortalState: "Removed"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			base := createIntegrationManifests(t, []string{"maas", "gen-ai"})
			writeMaaSConsumerPortalManifest(t, base)
			r := &ctrlpkg.DashboardReconciler{Client: k8sClient, Scheme: k8sClient.Scheme(), ManifestsBasePath: base, Platform: cluster.SelfManagedRhoai, Namespace: integrationNamespace, ApplicationsNamespace: integrationNamespace}
			dashboard := newDashboard(v1alpha1.DashboardSpec{ManagementSpec: common.ManagementSpec{ManagementState: common.ManagementState(tt.coreState)}, Gateway: &v1alpha1.GatewaySpec{Domain: "test.example.com"}, Modules: disableAllModulesExcept("maas", "genAi"), MaaSConsumerPortal: &v1alpha1.MaaSConsumerPortalSpec{ManagementState: tt.maasConsumerPortalState}})
			require.NoError(t, k8sClient.Create(context.Background(), dashboard))
			t.Cleanup(func() {
				deleteDashboard(t)
				cleanupMaaSConsumerPortalResources(t, r)
				cleanupModuleResources(t)
			})
			reconcile(t, r)
			reconcile(t, r)

			if tt.wantSharedBFFs {
				assert.Len(t, listDeployments(t, "maas"), 1, "one MaaS BFF Deployment")
				assert.Len(t, listServices(t, "maas"), 1, "one MaaS BFF Service")
				assert.Len(t, listDeployments(t, "gen-ai"), 1, "one GenAI BFF Deployment")
				assert.Len(t, listServices(t, "gen-ai"), 1, "one GenAI BFF Service")
			} else {
				assert.Empty(t, listDeployments(t, "maas"))
				assert.Empty(t, listServices(t, "maas"))
				assert.Empty(t, listDeployments(t, "gen-ai"))
				assert.Empty(t, listServices(t, "gen-ai"))
			}

			maasConsumerPortalConfig := getConfigMap(t, "maas-consumer-portal-federation-config")
			if !tt.wantMaaSConsumerPortalConfig {
				assert.Nil(t, maasConsumerPortalConfig)
				return
			}
			require.NotNil(t, maasConsumerPortalConfig)
			assert.Equal(t, "maas-consumer-portal", maasConsumerPortalConfig.Labels[labels.PlatformPartOf])
			entries := parseFederationEntries(t, maasConsumerPortalConfig)
			require.Len(t, entries, 2)
			assert.NotNil(t, findFederationEntry(entries, "maas"))
			assert.NotNil(t, findFederationEntry(entries, "genAi"))
		})
	}
}
