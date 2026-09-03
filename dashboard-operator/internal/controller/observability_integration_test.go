//go:build integration

package controller_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/controller/conditions"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

// conditionObservabilityAvailable mirrors the controller's condition type name.
const conditionObservabilityAvailable = "ObservabilityAvailable"

// persesDashboardListGVK matches the GVK the reconciler uses to probe for the
// PersesDashboard CRD. Listing this on a client caches its REST mapping, so it
// is only ever listed on the discardable isolated client (see _Deployed).
var persesDashboardListGVK = schema.GroupVersionKind{
	Group:   "perses.dev",
	Version: "v1alpha1",
	Kind:    "PersesDashboardList",
}

// TestIntegration_Observability_Disabled verifies that a Dashboard without an
// observability spec reports ObservabilityAvailable=False with reason Disabled.
// (RHOAIENG-83647)
func TestIntegration_Observability_Disabled(t *testing.T) {
	manifests := createIntegrationManifests(t, nil)
	r := newManifestReconciler(manifests)

	// No observability spec and no data-science-perses Service in the namespace,
	// so autoDetectObservability leaves the spec nil.
	dashboard := newDashboard(v1alpha1.DashboardSpec{
		Gateway: &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Modules: disableAllModulesExcept(),
	})

	ctx := context.Background()
	require.NoError(t, k8sClient.Create(ctx, dashboard))

	t.Cleanup(func() {
		deleteDashboard(t)
		cleanupModuleResources(t)
	})

	reconcile(t, r)
	reconcile(t, r)

	cond := conditions.FindStatusCondition(getDashboard(t), conditionObservabilityAvailable)
	require.NotNil(t, cond, "ObservabilityAvailable condition should be present")
	assert.Equal(t, metav1.ConditionFalse, cond.Status)
	assert.Equal(t, "Disabled", cond.Reason)
}

// TestIntegration_Observability_PersesCRDNotFound verifies that when observability
// is enabled but the PersesDashboard CRD is absent, the reconciler reports
// ObservabilityAvailable=False with reason PersesCRDNotFound (rather than failing
// the whole reconcile). Uses the shared client so its RESTMapper stays free of a
// perses mapping. (RHOAIENG-83647)
func TestIntegration_Observability_PersesCRDNotFound(t *testing.T) {
	manifests := createIntegrationManifests(t, nil)
	r := newManifestReconciler(manifests)

	dashboard := newDashboard(v1alpha1.DashboardSpec{
		Gateway: &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Modules: disableAllModulesExcept(),
		Observability: &v1alpha1.ObservabilitySpec{
			Enabled: true,
			PersesService: &v1alpha1.ServiceTarget{
				Name:      "perses",
				Namespace: integrationNamespace,
				Port:      8080,
			},
		},
	})

	ctx := context.Background()
	require.NoError(t, k8sClient.Create(ctx, dashboard))

	t.Cleanup(func() {
		deleteDashboard(t)
		cleanupModuleResources(t)
	})

	reconcile(t, r)
	reconcile(t, r)

	cond := conditions.FindStatusCondition(getDashboard(t), conditionObservabilityAvailable)
	require.NotNil(t, cond, "ObservabilityAvailable condition should be present")
	assert.Equal(t, metav1.ConditionFalse, cond.Status)
	assert.Equal(t, "PersesCRDNotFound", cond.Reason)
}

// TestIntegration_Observability_Deployed verifies the happy path: with the
// PersesDashboard CRD installed and observability manifests present, the reconciler
// renders and deploys them, adds the perses federation entry, and reports
// ObservabilityAvailable=True with reason Deployed.
//
// It runs last (source + file order) and uses an isolated client so that listing
// PersesDashboards — which caches a positive REST mapping once the CRD exists —
// never poisons the shared client's mapper that _PersesCRDNotFound relies on.
// (RHOAIENG-83647)
func TestIntegration_Observability_Deployed(t *testing.T) {
	manifests := createIntegrationManifests(t, nil)
	writeObservabilityOverlay(t, manifests)
	installPersesCRD(t)

	// Isolated client whose RESTMapper we deliberately warm with the perses
	// mapping; the shared k8sClient must never learn it.
	persesClient := newIsolatedClient(t)
	require.Eventually(t, func() bool {
		list := &unstructured.UnstructuredList{}
		list.SetGroupVersionKind(persesDashboardListGVK)

		return persesClient.List(context.Background(), list) == nil
	}, 30*time.Second, 200*time.Millisecond, "isolated client should discover the PersesDashboard CRD")

	r := newReconcilerWithClient(persesClient, manifests)

	dashboard := newDashboard(v1alpha1.DashboardSpec{
		Gateway: &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Modules: disableAllModulesExcept(),
		Observability: &v1alpha1.ObservabilitySpec{
			Enabled: true,
			PersesService: &v1alpha1.ServiceTarget{
				Name:      "perses",
				Namespace: integrationNamespace,
				Port:      8080,
			},
		},
	})

	ctx := context.Background()
	require.NoError(t, k8sClient.Create(ctx, dashboard))

	t.Cleanup(func() {
		deleteDashboard(t)
		cleanupModuleResources(t)
	})

	reconcile(t, r)
	reconcile(t, r)

	cond := conditions.FindStatusCondition(getDashboard(t), conditionObservabilityAvailable)
	require.NotNil(t, cond, "ObservabilityAvailable condition should be present")
	assert.Equal(t, metav1.ConditionTrue, cond.Status)
	assert.Equal(t, "Deployed", cond.Reason)

	// The rendered observability ConfigMap should have been applied. This is the signal that
	// distinguishes the Deployed path: the perses federation entry is driven by the spec and is
	// present in the _PersesCRDNotFound case too, so asserting on it here would prove nothing.
	require.NoError(t, k8sClient.Get(ctx, types.NamespacedName{
		Name:      "perses-dashboard-config",
		Namespace: integrationNamespace,
	}, &corev1.ConfigMap{}), "observability ConfigMap should be deployed")
}

// writeObservabilityOverlay writes a minimal observability kustomize overlay at
// <base>/observability/odh producing a perses-dashboard-config ConfigMap — the
// path observabilityManifestInfo resolves for the OpenDataHub platform.
func writeObservabilityOverlay(t *testing.T, base string) {
	t.Helper()

	overlay := filepath.Join(base, "observability", "odh")
	require.NoError(t, os.MkdirAll(overlay, 0755))
	require.NoError(t, os.WriteFile(filepath.Join(overlay, "kustomization.yaml"), []byte(`apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - configmap.yaml
`), 0644))
	require.NoError(t, os.WriteFile(filepath.Join(overlay, "configmap.yaml"), []byte(`apiVersion: v1
kind: ConfigMap
metadata:
  name: perses-dashboard-config
data:
  key: value
`), 0644))
}

// installPersesCRD creates the PersesDashboard CRD via the shared client (creating
// the CRD object exercises only the apiextensions mapping, which is safe on the
// shared client) and waits for it to become Established. Cleanup removes it so the
// shared client's mapper never sees a perses mapping after this test.
func installPersesCRD(t *testing.T) {
	t.Helper()
	ctx := context.Background()

	preserveUnknown := true
	crd := &apiextensionsv1.CustomResourceDefinition{
		ObjectMeta: metav1.ObjectMeta{Name: "persesdashboards.perses.dev"},
		Spec: apiextensionsv1.CustomResourceDefinitionSpec{
			Group: "perses.dev",
			Names: apiextensionsv1.CustomResourceDefinitionNames{
				Plural:   "persesdashboards",
				Singular: "persesdashboard",
				Kind:     "PersesDashboard",
				ListKind: "PersesDashboardList",
			},
			Scope: apiextensionsv1.NamespaceScoped,
			Versions: []apiextensionsv1.CustomResourceDefinitionVersion{{
				Name:    "v1alpha1",
				Served:  true,
				Storage: true,
				Schema: &apiextensionsv1.CustomResourceValidation{
					OpenAPIV3Schema: &apiextensionsv1.JSONSchemaProps{
						Type:                   "object",
						XPreserveUnknownFields: &preserveUnknown,
					},
				},
			}},
		},
	}

	require.NoError(t, k8sClient.Create(ctx, crd))
	t.Cleanup(func() { deleteIgnoreNotFound(t, crd) })

	require.Eventually(t, func() bool {
		got := &apiextensionsv1.CustomResourceDefinition{}
		if err := k8sClient.Get(ctx, types.NamespacedName{Name: crd.Name}, got); err != nil {
			return false
		}
		for _, c := range got.Status.Conditions {
			if c.Type == apiextensionsv1.Established && c.Status == apiextensionsv1.ConditionTrue {
				return true
			}
		}

		return false
	}, 30*time.Second, 200*time.Millisecond, "PersesDashboard CRD should become Established")
}
