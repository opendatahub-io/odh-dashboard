//go:build integration

package controller_test

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/cache"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/envtest"
	metricsserver "sigs.k8s.io/controller-runtime/pkg/metrics/server"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	ctrlpkg "github.com/opendatahub-io/odh-dashboard/dashboard-operator/internal/controller"
)

var odhDashboardConfigGVK = schema.GroupVersionKind{
	Group: "opendatahub.io", Version: "v1alpha", Kind: "OdhDashboardConfig",
}

var odhDashboardConfigListGVK = schema.GroupVersionKind{
	Group: "opendatahub.io", Version: "v1alpha", Kind: "OdhDashboardConfigList",
}

func newUnstructuredOdhDashboardConfig(namespace, name string) *unstructured.Unstructured {
	config := &unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": "opendatahub.io/v1alpha",
		"kind":       "OdhDashboardConfig",
		"metadata": map[string]interface{}{
			"name":      name,
			"namespace": namespace,
		},
		"spec": map[string]interface{}{},
	}}
	config.SetGroupVersionKind(odhDashboardConfigGVK)
	return config
}

// TestIntegration_OdhDashboardConfigCacheIsScopedToTarget proves the dedicated
// cache only lists/watches the single target OdhDashboardConfig (applications
// namespace, name odh-dashboard-config). Objects in other namespaces or with
// other names must never enter the local store, so operator memory does not
// scale with the cluster-wide OdhDashboardConfig count.
func TestIntegration_OdhDashboardConfigCacheIsScopedToTarget(t *testing.T) {
	ctx := context.Background()

	target := newUnstructuredOdhDashboardConfig(integrationNamespace, ctrlpkg.OdhDashboardConfigName)
	require.NoError(t, k8sClient.Create(ctx, target))
	t.Cleanup(func() { deleteIgnoreNotFound(t, target) })

	// Decoy in a different namespace (same name) — out of the namespace scope.
	const decoyNamespace = "odh-dashboard-config-decoy"
	require.NoError(t, k8sClient.Create(ctx, &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: decoyNamespace}}))
	t.Cleanup(func() {
		_ = k8sClient.Delete(ctx, &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: decoyNamespace}})
	})
	decoyOtherNamespace := newUnstructuredOdhDashboardConfig(decoyNamespace, ctrlpkg.OdhDashboardConfigName)
	require.NoError(t, k8sClient.Create(ctx, decoyOtherNamespace))
	t.Cleanup(func() { deleteIgnoreNotFound(t, decoyOtherNamespace) })

	// Decoy in the target namespace with a different name — out of the name scope.
	decoyOtherName := newUnstructuredOdhDashboardConfig(integrationNamespace, "some-other-config")
	require.NoError(t, k8sClient.Create(ctx, decoyOtherName))
	t.Cleanup(func() { deleteIgnoreNotFound(t, decoyOtherName) })

	// Mirror the production cache.New options (Mapper + HTTPClient) so the test
	// exercises the same configuration as the operator.
	httpClient, err := rest.HTTPClientFor(restCfg)
	require.NoError(t, err)
	scopedCache, err := cache.New(restCfg, cache.Options{
		HTTPClient:                  httpClient,
		Scheme:                      k8sClient.Scheme(),
		Mapper:                      k8sClient.RESTMapper(),
		ReaderFailOnMissingInformer: true,
		ByObject:                    ctrlpkg.ScopedOdhDashboardConfigByObject(integrationNamespace),
	})
	require.NoError(t, err)

	cacheCtx, cancel := context.WithCancel(ctx)
	t.Cleanup(cancel)
	// Request the informer before starting (ReaderFailOnMissingInformer is on, so
	// the cache will not create it lazily) — mirrors the production watch wiring.
	_, err = scopedCache.GetInformer(cacheCtx, newUnstructuredOdhDashboardConfig(integrationNamespace, ctrlpkg.OdhDashboardConfigName))
	require.NoError(t, err)
	go func() { _ = scopedCache.Start(cacheCtx) }()
	require.True(t, scopedCache.WaitForCacheSync(cacheCtx), "scoped cache did not sync")

	// The target object is visible through the scoped cache.
	got := &unstructured.Unstructured{}
	got.SetGroupVersionKind(odhDashboardConfigGVK)
	require.NoError(t, scopedCache.Get(cacheCtx, types.NamespacedName{
		Namespace: integrationNamespace, Name: ctrlpkg.OdhDashboardConfigName,
	}, got))

	// A same-namespace object with a different name is excluded by the field selector.
	otherName := &unstructured.Unstructured{}
	otherName.SetGroupVersionKind(odhDashboardConfigGVK)
	err = scopedCache.Get(cacheCtx, types.NamespacedName{
		Namespace: integrationNamespace, Name: "some-other-config",
	}, otherName)
	assert.True(t, apierrors.IsNotFound(err), "differently-named config must not be cached, got: %v", err)

	// An object in a different namespace is excluded by the namespace scope.
	otherNamespace := &unstructured.Unstructured{}
	otherNamespace.SetGroupVersionKind(odhDashboardConfigGVK)
	err = scopedCache.Get(cacheCtx, types.NamespacedName{
		Namespace: decoyNamespace, Name: ctrlpkg.OdhDashboardConfigName,
	}, otherNamespace)
	// A single-namespace scoped cache rejects out-of-scope namespaces with a
	// distinct error (not NotFound); assert on it so a namespace-scope regression
	// cannot be masked by some other error.
	assert.ErrorContains(t, err, "unknown namespace for the cache",
		"config in an unscoped namespace must not be cached, got: %v", err)

	// A cache-wide list returns only the single target object.
	list := &unstructured.UnstructuredList{}
	list.SetGroupVersionKind(odhDashboardConfigListGVK)
	require.NoError(t, scopedCache.List(cacheCtx, list))
	require.Len(t, list.Items, 1, "scoped cache must only contain the target OdhDashboardConfig")
	assert.Equal(t, integrationNamespace, list.Items[0].GetNamespace())
	assert.Equal(t, ctrlpkg.OdhDashboardConfigName, list.Items[0].GetName())
}

// TestIntegration_RHOAIControllerStartsWithoutOdhDashboardConfigCRD guards the
// fresh-install path. The Dashboard controller must be able to reconcile and
// install its manifests before the optional OdhDashboardConfig watch exists.
func TestIntegration_RHOAIControllerStartsWithoutOdhDashboardConfigCRD(t *testing.T) {
	s := runtime.NewScheme()
	require.NoError(t, clientgoscheme.AddToScheme(s))
	require.NoError(t, v1alpha1.AddToScheme(s))
	require.NoError(t, apiextensionsv1.AddToScheme(s))
	require.NoError(t, gatewayv1.Install(s))

	localEnv := &envtest.Environment{
		CRDDirectoryPaths: []string{filepath.Join("..", "..", "config", "crd", "bases")},
		Scheme:            s,
	}
	cfg, err := localEnv.Start()
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, localEnv.Stop()) })

	const namespace = "startup-without-dashboard-config-crd"
	mgr, err := ctrl.NewManager(cfg, ctrl.Options{
		Scheme:                 s,
		NewCache:               ctrlpkg.NewManagerCache(namespace),
		Metrics:                metricsserver.Options{BindAddress: "0"},
		HealthProbeBindAddress: "0",
	})
	require.NoError(t, err)

	require.NoError(t, ctrlpkg.SetupWithManager(mgr, ctrlpkg.Options{
		ManifestsBasePath:     createIntegrationManifests(t, nil),
		Platform:              cluster.SelfManagedRhoai,
		Namespace:             namespace,
		ApplicationsNamespace: namespace,
	}))

	directClient, err := client.New(cfg, client.Options{Scheme: s})
	require.NoError(t, err)
	require.NoError(t, directClient.Create(context.Background(), &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{Name: namespace},
	}))
	dashboard := newDashboard(v1alpha1.DashboardSpec{
		Gateway: &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Modules: disableAllModulesExcept(),
	})
	require.NoError(t, directClient.Create(context.Background(), dashboard))

	ctx, cancel := context.WithCancel(context.Background())
	managerErr := make(chan error, 1)
	go func() { managerErr <- mgr.Start(ctx) }()
	t.Cleanup(func() {
		cancel()
		require.NoError(t, <-managerErr)
	})

	require.Eventually(t, func() bool {
		current := &v1alpha1.Dashboard{}
		if err := directClient.Get(context.Background(), types.NamespacedName{Name: v1alpha1.DashboardInstanceName}, current); err != nil {
			return false
		}
		return len(current.Finalizers) > 0
	}, 10*time.Second, 100*time.Millisecond, "Dashboard controller did not start without OdhDashboardConfig CRD")

	preserveUnknownFields := true
	configCRD := &apiextensionsv1.CustomResourceDefinition{
		ObjectMeta: metav1.ObjectMeta{Name: "odhdashboardconfigs.opendatahub.io"},
		Spec: apiextensionsv1.CustomResourceDefinitionSpec{
			Group: "opendatahub.io",
			Names: apiextensionsv1.CustomResourceDefinitionNames{
				Plural:   "odhdashboardconfigs",
				Singular: "odhdashboardconfig",
				Kind:     "OdhDashboardConfig",
				ListKind: "OdhDashboardConfigList",
			},
			Scope: apiextensionsv1.NamespaceScoped,
			Versions: []apiextensionsv1.CustomResourceDefinitionVersion{{
				Name:    "v1alpha",
				Served:  true,
				Storage: true,
				Schema: &apiextensionsv1.CustomResourceValidation{
					OpenAPIV3Schema: &apiextensionsv1.JSONSchemaProps{
						Type:                   "object",
						XPreserveUnknownFields: &preserveUnknownFields,
					},
				},
			}},
		},
	}
	require.NoError(t, directClient.Create(context.Background(), configCRD))
	require.Eventually(t, func() bool {
		current := &apiextensionsv1.CustomResourceDefinition{}
		if err := directClient.Get(context.Background(), types.NamespacedName{Name: configCRD.Name}, current); err != nil {
			return false
		}
		for _, condition := range current.Status.Conditions {
			if condition.Type == apiextensionsv1.Established && condition.Status == apiextensionsv1.ConditionTrue {
				return true
			}
		}
		return false
	}, 10*time.Second, 100*time.Millisecond, "OdhDashboardConfig CRD did not become established")

	config := &unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": "opendatahub.io/v1alpha",
		"kind":       "OdhDashboardConfig",
		"metadata": map[string]interface{}{
			"name":      "odh-dashboard-config",
			"namespace": namespace,
		},
		"spec": map[string]interface{}{
			"notebookController": map[string]interface{}{"enabled": true},
		},
	}}
	config.SetGroupVersionKind(odhDashboardConfigGVK)
	require.NoError(t, directClient.Create(context.Background(), config))

	require.Eventually(t, func() bool {
		current := &unstructured.Unstructured{}
		current.SetGroupVersionKind(odhDashboardConfigGVK)
		if err := directClient.Get(context.Background(), types.NamespacedName{
			Name: "odh-dashboard-config", Namespace: namespace,
		}, current); err != nil {
			return false
		}
		disableTracking, found, err := unstructured.NestedBool(
			current.Object, "spec", "dashboardConfig", "disableTracking",
		)
		return err == nil && found && !disableTracking
	}, 20*time.Second, 100*time.Millisecond, "late OdhDashboardConfig watch did not reconcile the RHOAI default")
}

// TestIntegration_RHOAIDashboardConfigDefault verifies the backend-first race:
// when another component has already created a sparse user-managed config, the
// dashboard operator initializes the RHOAI tracking default without replacing
// unrelated fields.
func TestIntegration_RHOAIDashboardConfigDefault(t *testing.T) {
	ctx := context.Background()
	manifests := createIntegrationManifests(t, nil)
	r := newManifestReconciler(manifests)
	r.Platform = cluster.SelfManagedRhoai

	config := &unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": "opendatahub.io/v1alpha",
		"kind":       "OdhDashboardConfig",
		"metadata": map[string]interface{}{
			"name":      "odh-dashboard-config",
			"namespace": integrationNamespace,
		},
		"spec": map[string]interface{}{
			"notebookController": map[string]interface{}{"enabled": true},
		},
	}}
	config.SetGroupVersionKind(odhDashboardConfigGVK)
	require.NoError(t, k8sClient.Create(ctx, config))

	dashboard := newDashboard(v1alpha1.DashboardSpec{
		Gateway: &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Modules: disableAllModulesExcept(),
	})
	require.NoError(t, k8sClient.Create(ctx, dashboard))

	t.Cleanup(func() {
		deleteDashboard(t)
		cleanupModuleResources(t)
		deleteIgnoreNotFound(t, config)
	})

	reconcile(t, r) // add the Dashboard finalizer
	reconcile(t, r) // deploy core resources and initialize the missing default

	updated := &unstructured.Unstructured{}
	updated.SetGroupVersionKind(odhDashboardConfigGVK)
	require.NoError(t, k8sClient.Get(ctx, types.NamespacedName{
		Name: "odh-dashboard-config", Namespace: integrationNamespace,
	}, updated))
	disableTracking, found, err := unstructured.NestedBool(
		updated.Object, "spec", "dashboardConfig", "disableTracking",
	)
	require.NoError(t, err)
	require.True(t, found)
	assert.False(t, disableTracking)
	notebookEnabled, found, err := unstructured.NestedBool(
		updated.Object, "spec", "notebookController", "enabled",
	)
	require.NoError(t, err)
	require.True(t, found)
	assert.True(t, notebookEnabled)

	resourceVersion := updated.GetResourceVersion()
	reconcile(t, r)
	require.NoError(t, k8sClient.Get(ctx, types.NamespacedName{
		Name: "odh-dashboard-config", Namespace: integrationNamespace,
	}, updated))
	assert.Equal(t, resourceVersion, updated.GetResourceVersion(), "the initialized value should be stable")
}
