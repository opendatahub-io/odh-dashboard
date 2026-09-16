package controller_test

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	ctrlpkg "github.com/opendatahub-io/odh-dashboard/dashboard-operator/internal/controller"
)

func TestBuildMaaSConsumerPortalFederationConfigMap(t *testing.T) {
	scheme := testScheme(t)
	reconciler := &ctrlpkg.DashboardReconciler{
		Client:                fake.NewClientBuilder().WithScheme(scheme).Build(),
		Scheme:                scheme,
		Platform:              cluster.OpenDataHub,
		ApplicationsNamespace: testNamespace,
	}
	statuses := allDeployedStatuses()
	statuses["maas"] = v1alpha1.ModuleStatus{Phase: v1alpha1.ModulePhaseDegraded}
	statuses["genAi"] = v1alpha1.ModuleStatus{Phase: v1alpha1.ModulePhaseDisabled}

	configMap, err := ctrlpkg.BuildMaaSConsumerPortalFederationConfigMap(reconciler, statuses)
	require.NoError(t, err)
	assert.Equal(t, "maas-consumer-portal-federation-config", configMap.Name)
	assert.Equal(t, "maas-consumer-portal", configMap.Labels["platform.opendatahub.io/part-of"])
	assert.Equal(t, "maas-consumer-portal", configMap.Labels["app.kubernetes.io/part-of"])
	assert.Equal(t, "maas-consumer-portal", configMap.Labels["app.kubernetes.io/component"])

	var entries []map[string]interface{}
	require.NoError(t, json.Unmarshal([]byte(configMap.Data["module-federation-config.json"]), &entries))
	require.Len(t, entries, 1)
	assert.Equal(t, "maas", entries[0]["name"])
	assert.Equal(t, "/maas/api", entries[0]["proxy"].([]any)[0].(map[string]any)["path"])
}

func TestBuildMaaSConsumerPortalFederationConfigMap_IncludesHealthyDependencies(t *testing.T) {
	scheme := testScheme(t)
	reconciler := &ctrlpkg.DashboardReconciler{Client: fake.NewClientBuilder().WithScheme(scheme).Build(), Scheme: scheme, Platform: cluster.OpenDataHub, ApplicationsNamespace: testNamespace}
	configMap, err := ctrlpkg.BuildMaaSConsumerPortalFederationConfigMap(reconciler, allDeployedStatuses())
	require.NoError(t, err)
	var entries []map[string]any
	require.NoError(t, json.Unmarshal([]byte(configMap.Data["module-federation-config.json"]), &entries))
	require.Len(t, entries, 2)
	assert.Equal(t, "genAi", entries[0]["name"])
	assert.Equal(t, "maas", entries[1]["name"])
	assert.Equal(t, float64(8143), entries[0]["service"].(map[string]any)["port"])
	assert.Equal(t, float64(8243), entries[1]["service"].(map[string]any)["port"])
}

func TestDeployMaaSConsumerPortalFederationConfigMap_RemovedDeletesConfigMap(t *testing.T) {
	scheme := testScheme(t)
	configMap := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "maas-consumer-portal-federation-config", Namespace: testNamespace}}
	client := fake.NewClientBuilder().WithScheme(scheme).WithObjects(configMap).Build()
	reconciler := &ctrlpkg.DashboardReconciler{Client: client, Scheme: scheme, ApplicationsNamespace: testNamespace}
	dashboard := &v1alpha1.Dashboard{Spec: v1alpha1.DashboardSpec{MaaSConsumerPortal: &v1alpha1.MaaSConsumerPortalSpec{ManagementState: "Removed"}}}
	require.NoError(t, reconciler.DeployMaaSConsumerPortalFederationConfigMap(context.Background(), dashboard, nil))
	assert.Error(t, client.Get(context.Background(), types.NamespacedName{Name: configMap.Name, Namespace: testNamespace}, &corev1.ConfigMap{}))
}

func TestDeployMaaSConsumerPortalFederationConfigMap_ManagedCreatesConfigMap(t *testing.T) {
	scheme := testScheme(t)
	client := fake.NewClientBuilder().WithScheme(scheme).Build()
	reconciler := &ctrlpkg.DashboardReconciler{Client: client, Scheme: scheme, Platform: cluster.SelfManagedRhoai, ApplicationsNamespace: testNamespace}
	dashboard := &v1alpha1.Dashboard{Spec: v1alpha1.DashboardSpec{MaaSConsumerPortal: &v1alpha1.MaaSConsumerPortalSpec{ManagementState: "Managed"}}}
	require.NoError(t, reconciler.DeployMaaSConsumerPortalFederationConfigMap(context.Background(), dashboard, allDeployedStatuses()))
	configMap := &corev1.ConfigMap{}
	require.NoError(t, client.Get(context.Background(), types.NamespacedName{Name: "maas-consumer-portal-federation-config", Namespace: testNamespace}, configMap))
	assert.Equal(t, "maas-consumer-portal", configMap.Labels["platform.opendatahub.io/part-of"])
	assert.NotEmpty(t, configMap.Data["module-federation-config.json"])
}

func TestDeployMaaSConsumerPortalFederationConfigMap_DoesNotPatchDeployment(t *testing.T) {
	scheme := testScheme(t)
	deployment := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{Name: "maas-consumer-portal", Namespace: testNamespace},
		Spec:       appsv1.DeploymentSpec{Template: corev1.PodTemplateSpec{}},
	}
	client := fake.NewClientBuilder().WithScheme(scheme).WithObjects(deployment).Build()
	reconciler := &ctrlpkg.DashboardReconciler{Client: client, Scheme: scheme, Platform: cluster.SelfManagedRhoai, ApplicationsNamespace: testNamespace}
	dashboard := &v1alpha1.Dashboard{Spec: v1alpha1.DashboardSpec{MaaSConsumerPortal: &v1alpha1.MaaSConsumerPortalSpec{ManagementState: "Managed"}}}

	require.NoError(t, reconciler.DeployMaaSConsumerPortalFederationConfigMap(context.Background(), dashboard, allDeployedStatuses()))
	updated := &appsv1.Deployment{}
	require.NoError(t, client.Get(context.Background(), types.NamespacedName{Name: deployment.Name, Namespace: deployment.Namespace}, updated))
	assert.Empty(t, updated.Spec.Template.Annotations)
}

func TestPatchMaaSConsumerPortalDeploymentFederationHash(t *testing.T) {
	const annotation = "dashboard.opendatahub.io/maas-consumer-portal-federation-config-hash"
	newDeployment := func(annotations map[string]string) *appsv1.Deployment {
		return &appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Name: "maas-consumer-portal", Namespace: testNamespace}, Spec: appsv1.DeploymentSpec{Template: corev1.PodTemplateSpec{ObjectMeta: metav1.ObjectMeta{Annotations: annotations}}}}
	}
	tests := []struct{ name, oldHash, data string }{
		{name: "creates annotation", data: `[{"name":"maas"}]`},
		{name: "updates changed annotation", oldHash: "old", data: `[{"name":"genAi"}]`},
		{name: "does not fail when deployment is absent", data: `[]`},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			scheme := testScheme(t)
			builder := fake.NewClientBuilder().WithScheme(scheme)
			if tt.name != "does not fail when deployment is absent" {
				builder = builder.WithObjects(newDeployment(map[string]string{annotation: tt.oldHash}))
			}
			client := builder.Build()
			reconciler := &ctrlpkg.DashboardReconciler{Client: client, Scheme: scheme, ApplicationsNamespace: testNamespace}
			require.NoError(t, reconciler.PatchMaaSConsumerPortalDeploymentFederationHash(context.Background(), tt.data))
			if tt.name == "does not fail when deployment is absent" {
				return
			}
			updated := &appsv1.Deployment{}
			require.NoError(t, client.Get(context.Background(), types.NamespacedName{Name: "maas-consumer-portal", Namespace: testNamespace}, updated))
			assert.Equal(t, ctrlpkg.ComputeFederationConfigHash(tt.data), updated.Spec.Template.Annotations[annotation])
		})
	}
}
