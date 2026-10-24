//go:build integration

package controller_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/controller/conditions"
)

// TestIntegration_OCIBaseImageReconcile covers updates, drift correction,
// deletion, and an invalid update against the same managed ConfigMap.
func TestIntegration_OCIBaseImageReconcile(t *testing.T) {
	manifests := createIntegrationManifests(t, nil)
	overlay := filepath.Join(manifests, "odh")
	require.NoError(t, os.WriteFile(filepath.Join(overlay, "kustomization.yaml"), []byte(`apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - configmap.yaml
configMapGenerator:
  - name: dashboard-params
    env: params.env
generatorOptions:
  disableNameSuffixHash: true
replacements:
  - source:
      kind: ConfigMap
      name: dashboard-params
      fieldPath: data.images-oci-base-image
    targets:
      - select:
          kind: ConfigMap
          name: dashboard-core-config
        fieldPaths:
          - data.images-oci-base-image
`), 0644))
	require.NoError(t, os.WriteFile(filepath.Join(overlay, "configmap.yaml"), []byte(`apiVersion: v1
kind: ConfigMap
metadata:
  name: dashboard-core-config
data:
  images-oci-base-image: placeholder
`), 0644))

	ctx := context.Background()
	dashboard := newDashboard(v1alpha1.DashboardSpec{
		Gateway:                   &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Modules:                   disableAllModulesExcept(),
		ModelRegistryOCIBaseImage: "mirror.example.com/base:1",
	})
	require.NoError(t, k8sClient.Create(ctx, dashboard))
	t.Cleanup(func() {
		deleteDashboard(t)
		cleanupModuleResources(t)
	})
	r := newManifestReconciler(manifests)
	reconcile(t, r)
	reconcile(t, r)
	assert.Equal(t, "mirror.example.com/base:1", getConfigMap(t, "dashboard-core-config").Data["images-oci-base-image"])

	dashboard = getDashboard(t)
	dashboard.Spec.ModelRegistryOCIBaseImage = "mirror.example.com/base:2"
	require.NoError(t, k8sClient.Update(ctx, dashboard))
	reconcile(t, r)
	assert.Equal(t, "mirror.example.com/base:2", getConfigMap(t, "dashboard-core-config").Data["images-oci-base-image"])

	configMap := getConfigMap(t, "dashboard-core-config")
	configMap.Data["images-oci-base-image"] = "drift.example.com/base:1"
	require.NoError(t, k8sClient.Update(ctx, configMap))
	reconcile(t, r)
	assert.Equal(t, "mirror.example.com/base:2", getConfigMap(t, "dashboard-core-config").Data["images-oci-base-image"])

	dashboard = getDashboard(t)
	dashboard.Spec.ModelRegistryOCIBaseImage = "invalid-image"
	require.NoError(t, k8sClient.Update(ctx, dashboard))
	_, err := r.Reconcile(ctx, ctrl.Request{NamespacedName: types.NamespacedName{Name: v1alpha1.DashboardInstanceName}})
	require.ErrorContains(t, err, "spec.modelRegistryOCIBaseImage")
	condition := conditions.FindStatusCondition(getDashboard(t), string(common.ConditionTypeProvisioningSucceeded))
	require.NotNil(t, condition)
	assert.Equal(t, metav1.ConditionFalse, condition.Status)
	assert.Contains(t, condition.Message, "spec.modelRegistryOCIBaseImage")
	assert.Equal(t, "mirror.example.com/base:2", getConfigMap(t, "dashboard-core-config").Data["images-oci-base-image"])

	dashboard = getDashboard(t)
	dashboard.Spec.ModelRegistryOCIBaseImage = ""
	require.NoError(t, k8sClient.Update(ctx, dashboard))
	reconcile(t, r)
	assert.Equal(t, "", getConfigMap(t, "dashboard-core-config").Data["images-oci-base-image"])
}

func TestIntegration_OCIBaseImageCRDRejectsNewline(t *testing.T) {
	dashboard := newDashboard(v1alpha1.DashboardSpec{
		ModelRegistryOCIBaseImage: "mirror.example.com/base:1\nimages-jobs-async-upload=bad",
	})
	err := k8sClient.Create(context.Background(), dashboard)
	require.ErrorContains(t, err, "modelRegistryOCIBaseImage")
}

// TestIntegration_OCIBaseImageSurvivesPlatformApply simulates the platform
// operator's field-manager applying only the CR fields it constructs.
func TestIntegration_OCIBaseImageSurvivesPlatformApply(t *testing.T) {
	ctx := context.Background()
	dashboard := newDashboard(v1alpha1.DashboardSpec{
		Gateway: &v1alpha1.GatewaySpec{Domain: "old.example.com"},
	})
	require.NoError(t, k8sClient.Create(ctx, dashboard))
	t.Cleanup(func() { deleteDashboard(t) })

	dashboard = getDashboard(t)
	before := dashboard.DeepCopy()
	dashboard.Spec.ModelRegistryOCIBaseImage = "mirror.example.com/base:1"
	require.NoError(t, k8sClient.Patch(ctx, dashboard, client.MergeFrom(before), client.FieldOwner("administrator")))

	platformApply := []byte(`{"apiVersion":"components.platform.opendatahub.io/v1alpha1","kind":"Dashboard","metadata":{"name":"default-dashboard"},"spec":{"gateway":{"domain":"new.example.com"}}}`)
	require.NoError(t, k8sClient.Patch(ctx, dashboard, client.RawPatch(types.ApplyPatchType, platformApply),
		client.FieldOwner("opendatahub-operator"), client.ForceOwnership))
	dashboard = getDashboard(t)
	assert.Equal(t, "new.example.com", dashboard.Spec.Gateway.Domain)
	assert.Equal(t, "mirror.example.com/base:1", dashboard.Spec.ModelRegistryOCIBaseImage)
}
