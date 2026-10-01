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
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	ctrlpkg "github.com/opendatahub-io/odh-dashboard/dashboard-operator/internal/controller"
)

func TestIntegration_MaaSConsumerPortalObservabilityLifecycle(t *testing.T) {
	installPersesCRD(t)
	for _, tt := range []struct {
		name        string
		namespace   string
		autoDetect  bool
		initialCore common.ManagementState
	}{
		{name: "portal only auto-detects Perses", namespace: "redhat-ods-monitoring", autoDetect: true, initialCore: "Removed"},
		{name: "core removal preserves cross-namespace observability", namespace: "portal-observability-test", initialCore: "Managed"},
		{name: "core removal preserves observability in applications namespace", namespace: integrationNamespace, initialCore: "Managed"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			persesClient := newIsolatedClient(t)
			require.Eventually(t, func() bool {
				list := &unstructured.UnstructuredList{}
				list.SetGroupVersionKind(persesDashboardListGVK)
				return persesClient.List(ctx, list) == nil
			}, 30*time.Second, 100*time.Millisecond)
			if tt.namespace != integrationNamespace {
				namespace := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: tt.namespace}}
				require.NoError(t, persesClient.Create(ctx, namespace))
				t.Cleanup(func() { deleteIgnoreNotFound(t, namespace) })
			}
			service := &corev1.Service{
				ObjectMeta: metav1.ObjectMeta{Name: "data-science-perses", Namespace: tt.namespace},
				Spec:       corev1.ServiceSpec{Ports: []corev1.ServicePort{{Port: 8080}}},
			}
			require.NoError(t, persesClient.Create(ctx, service))
			t.Cleanup(func() { deleteIgnoreNotFound(t, service) })

			base := createIntegrationManifests(t, []string{"maas", "gen-ai"})
			writeMaaSConsumerPortalManifest(t, base)
			writePortalObservabilityOverlay(t, base)
			r := &ctrlpkg.DashboardReconciler{
				Client: persesClient, Scheme: persesClient.Scheme(), ManifestsBasePath: base,
				Platform: cluster.SelfManagedRhoai, Namespace: integrationNamespace, ApplicationsNamespace: integrationNamespace,
			}
			dashboard := newDashboard(v1alpha1.DashboardSpec{
				ManagementSpec:     common.ManagementSpec{ManagementState: tt.initialCore},
				Gateway:            &v1alpha1.GatewaySpec{Domain: "test.example.com"},
				Modules:            disableAllModulesExcept("maas", "genAi"),
				MaaSConsumerPortal: &v1alpha1.MaaSConsumerPortalSpec{ManagementState: "Managed"},
			})
			if !tt.autoDetect {
				dashboard.Spec.Observability = &v1alpha1.ObservabilitySpec{
					Enabled: true, PersesService: &v1alpha1.ServiceTarget{Name: service.Name, Namespace: service.Namespace, Port: 8080},
				}
			}
			require.NoError(t, persesClient.Create(ctx, dashboard))
			resources := []client.Object{
				&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "perses-dashboard-config", Namespace: tt.namespace}},
				&unstructured.Unstructured{Object: map[string]any{
					"apiVersion": "networking.k8s.io/v1", "kind": "NetworkPolicy",
					"metadata": map[string]any{"name": "dashboard-perses-access", "namespace": tt.namespace},
				}},
				&unstructured.Unstructured{Object: map[string]any{
					"apiVersion": "perses.dev/v1alpha1", "kind": "PersesDashboard",
					"metadata": map[string]any{"name": "portal-test-dashboard", "namespace": tt.namespace},
				}},
			}
			t.Cleanup(func() {
				deleteDashboard(t)
				cleanupMaaSConsumerPortalResources(t, r)
				cleanupModuleResources(t)
				for _, resource := range resources {
					require.NoError(t, client.IgnoreNotFound(persesClient.Delete(ctx, resource)))
				}
			})

			reconcile(t, r)
			reconcile(t, r)
			originalUIDs := make([]types.UID, len(resources))
			for i, resource := range resources {
				require.NoError(t, persesClient.Get(ctx, client.ObjectKeyFromObject(resource), resource))
				originalUIDs[i] = resource.GetUID()
			}
			policy := resources[1].(*unstructured.Unstructured)
			ingress, found, err := unstructured.NestedSlice(policy.Object, "spec", "ingress")
			require.NoError(t, err)
			require.True(t, found)
			require.Len(t, ingress, 1)
			peers := ingress[0].(map[string]interface{})["from"].([]interface{})
			require.Len(t, peers, 2)
			portalPeer := peers[1].(map[string]interface{})
			podLabel, found, err := unstructured.NestedString(portalPeer, "podSelector", "matchLabels", "app.kubernetes.io/part-of")
			require.NoError(t, err)
			require.True(t, found)
			require.Equal(t, "maas-consumer-portal", podLabel)
			namespace, found, err := unstructured.NestedString(portalPeer, "namespaceSelector", "matchLabels", "kubernetes.io/metadata.name")
			require.NoError(t, err)
			require.True(t, found)
			assert.Equal(t, integrationNamespace, namespace, "Perses must allow ingress from the configured portal namespace")
			coreNamespace, found, err := unstructured.NestedString(peers[0].(map[string]interface{}), "namespaceSelector", "matchLabels", "kubernetes.io/metadata.name")
			require.NoError(t, err)
			require.True(t, found)
			assert.Equal(t, "redhat-ods-applications", coreNamespace, "core dashboard ingress must remain unchanged")
			dashboard = getDashboard(t)
			if tt.autoDetect {
				assert.Nil(t, dashboard.Spec.Observability, "auto-detection must remain in memory")
			}
			dashboard.Spec.ManagementState = "Removed"
			require.NoError(t, persesClient.Update(ctx, dashboard))
			reconcile(t, r)
			for i, resource := range resources {
				require.NoError(t, persesClient.Get(ctx, client.ObjectKeyFromObject(resource), resource))
				assert.Equal(t, originalUIDs[i], resource.GetUID(), "observability must be retained through core removal")
			}
			assert.Equal(t, metav1.ConditionTrue, conditionStatus(getDashboard(t), conditionObservabilityAvailable))
			entries := parseFederationEntries(t, getConfigMap(t, "maas-consumer-portal-federation-config"))
			require.NotNil(t, findFederationEntry(entries, "perses"))
			assert.True(t, apierrors.IsNotFound(persesClient.Get(ctx, client.ObjectKey{Name: "dashboard-core-config", Namespace: integrationNamespace}, &corev1.ConfigMap{})))

			// Make the portal healthy so its own readiness retry cannot mask an
			// observability failure that otherwise would never be retried.
			for _, name := range []string{"maas-consumer-portal", "maas-ui", "gen-ai-ui"} {
				deployment := &appsv1.Deployment{}
				require.NoError(t, persesClient.Get(ctx, client.ObjectKey{Name: name, Namespace: integrationNamespace}, deployment))
				deployment.Status.ObservedGeneration = deployment.Generation
				deployment.Status.Replicas = 1
				deployment.Status.ReadyReplicas = 1
				deployment.Status.Conditions = []appsv1.DeploymentCondition{{Type: appsv1.DeploymentAvailable, Status: corev1.ConditionTrue}}
				require.NoError(t, persesClient.Status().Update(ctx, deployment))
			}
			route := &gatewayv1.HTTPRoute{}
			require.NoError(t, persesClient.Get(ctx, client.ObjectKey{Name: "maas-consumer-portal", Namespace: integrationNamespace}, route))
			route.Status.Parents = []gatewayv1.RouteParentStatus{{Conditions: []metav1.Condition{
				{Type: string(gatewayv1.RouteConditionAccepted), Status: metav1.ConditionTrue, ObservedGeneration: route.Generation},
				{Type: string(gatewayv1.RouteConditionResolvedRefs), Status: metav1.ConditionTrue, ObservedGeneration: route.Generation},
			}}}
			require.NoError(t, persesClient.Status().Update(ctx, route))
			assert.Zero(t, reconcile(t, r).RequeueAfter)

			// An invalid data key reaches the API server and fails resource apply.
			configMapPath := filepath.Join(base, "observability", "rhoai", "configmap.yaml")
			validManifest, err := os.ReadFile(configMapPath)
			require.NoError(t, err)
			require.NoError(t, os.WriteFile(configMapPath, append(validManifest, []byte("  invalid key: rejected\n")...), 0644))
			federation := getConfigMap(t, "maas-consumer-portal-federation-config")
			assert.Equal(t, ctrlpkg.ObservabilityRetryInterval, reconcile(t, r).RequeueAfter)
			failedDashboard := getDashboard(t)
			assert.Equal(t, "DeployFailed", conditionReason(failedDashboard, conditionObservabilityAvailable))
			for _, condition := range failedDashboard.Status.Conditions {
				if condition.Type == conditionObservabilityAvailable {
					assert.Contains(t, condition.Message, "is invalid")
					assert.Contains(t, condition.Message, "data[invalid key]")
				}
			}
			assert.Equal(t, metav1.ConditionTrue, conditionStatus(failedDashboard, ctrlpkg.ConditionMaaSConsumerPortalAvailable))
			assert.Equal(t, federation.Data, getConfigMap(t, federation.Name).Data)
			for i, resource := range resources {
				require.NoError(t, persesClient.Get(ctx, client.ObjectKeyFromObject(resource), resource))
				assert.Equal(t, originalUIDs[i], resource.GetUID())
			}
			require.NoError(t, os.WriteFile(configMapPath, validManifest, 0644))
			assert.Zero(t, reconcile(t, r).RequeueAfter)
			assert.Equal(t, metav1.ConditionTrue, conditionStatus(getDashboard(t), conditionObservabilityAvailable))

			// An explicit opt-out also releases observability while keeping the portal.
			dashboard = getDashboard(t)
			configuredObservability := dashboard.Spec.Observability
			dashboard.Spec.Observability = &v1alpha1.ObservabilitySpec{Enabled: false}
			if configuredObservability != nil {
				dashboard.Spec.Observability.PersesService = configuredObservability.PersesService
			}
			require.NoError(t, persesClient.Update(ctx, dashboard))
			reconcile(t, r)
			for _, resource := range resources {
				assert.True(t, apierrors.IsNotFound(persesClient.Get(ctx, client.ObjectKeyFromObject(resource), resource)), resource.GetName())
			}
			assert.Equal(t, "Disabled", conditionReason(getDashboard(t), conditionObservabilityAvailable))
			entries = parseFederationEntries(t, getConfigMap(t, "maas-consumer-portal-federation-config"))
			assert.Nil(t, findFederationEntry(entries, "perses"))
			dashboard = getDashboard(t)
			dashboard.Spec.Observability = configuredObservability
			require.NoError(t, persesClient.Update(ctx, dashboard))
			reconcile(t, r)
			for _, resource := range resources {
				require.NoError(t, persesClient.Get(ctx, client.ObjectKeyFromObject(resource), resource))
			}

			// Removing the remaining consumer releases all shared observability resources.
			dashboard = getDashboard(t)
			dashboard.Spec.MaaSConsumerPortal.ManagementState = "Removed"
			require.NoError(t, persesClient.Update(ctx, dashboard))
			reconcile(t, r)
			for _, resource := range resources {
				assert.True(t, apierrors.IsNotFound(persesClient.Get(ctx, client.ObjectKeyFromObject(resource), resource)), resource.GetName())
			}

			// CR deletion must clean up even while the portal is still desired.
			dashboard = getDashboard(t)
			dashboard.Spec.MaaSConsumerPortal.ManagementState = "Managed"
			require.NoError(t, persesClient.Update(ctx, dashboard))
			reconcile(t, r)
			for _, resource := range resources {
				require.NoError(t, persesClient.Get(ctx, client.ObjectKeyFromObject(resource), resource))
			}
			require.NoError(t, persesClient.Delete(ctx, getDashboard(t)))
			reconcile(t, r)
			for _, resource := range resources {
				assert.True(t, apierrors.IsNotFound(persesClient.Get(ctx, client.ObjectKeyFromObject(resource), resource)), resource.GetName())
			}
		})
	}
}

func writePortalObservabilityOverlay(t *testing.T, base string) {
	t.Helper()
	writeObservabilityOverlay(t, base)
	overlay := filepath.Join(base, "observability", "rhoai")
	require.NoError(t, os.CopyFS(overlay, os.DirFS(filepath.Join(base, "observability", "odh"))))
	require.NoError(t, os.WriteFile(filepath.Join(overlay, "kustomization.yaml"), []byte(`apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - configmap.yaml
  - network-policy.yaml
  - dashboard.yaml
`), 0644))
	policy, err := os.ReadFile(filepath.Join("..", "..", "..", "manifests", "observability", "rhoai", "network-policy.yaml"))
	require.NoError(t, err)
	require.NoError(t, os.WriteFile(filepath.Join(overlay, "network-policy.yaml"), policy, 0644))
	require.NoError(t, os.WriteFile(filepath.Join(overlay, "dashboard.yaml"), []byte(`apiVersion: perses.dev/v1alpha1
kind: PersesDashboard
metadata:
  name: portal-test-dashboard
spec: {}
`), 0644))
}
