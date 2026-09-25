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
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/envtest"
	metricsserver "sigs.k8s.io/controller-runtime/pkg/metrics/server"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	ctrlpkg "github.com/opendatahub-io/odh-dashboard/dashboard-operator/internal/controller"
)

var odhDashboardConfigGVK = schema.GroupVersionKind{
	Group: "opendatahub.io", Version: "v1alpha", Kind: "OdhDashboardConfig",
}

// TestIntegration_RHOAIControllerStartsWithoutOdhDashboardConfigCRD guards the
// fresh-install path. The Dashboard controller must be able to reconcile and
// install its manifests before the optional OdhDashboardConfig watch exists.
func TestIntegration_RHOAIControllerStartsWithoutOdhDashboardConfigCRD(t *testing.T) {
	s := runtime.NewScheme()
	require.NoError(t, clientgoscheme.AddToScheme(s))
	require.NoError(t, v1alpha1.AddToScheme(s))
	require.NoError(t, apiextensionsv1.AddToScheme(s))

	localEnv := &envtest.Environment{
		CRDDirectoryPaths: []string{filepath.Join("..", "..", "config", "crd", "bases")},
		Scheme:            s,
	}
	cfg, err := localEnv.Start()
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, localEnv.Stop()) })

	mgr, err := ctrl.NewManager(cfg, ctrl.Options{
		Scheme:                 s,
		Metrics:                metricsserver.Options{BindAddress: "0"},
		HealthProbeBindAddress: "0",
	})
	require.NoError(t, err)

	const namespace = "startup-without-dashboard-config-crd"
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
