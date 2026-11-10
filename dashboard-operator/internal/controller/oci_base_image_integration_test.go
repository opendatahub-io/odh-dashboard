//go:build integration

package controller_test

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/controller/conditions"
)

func createOCIBaseImageIntegrationManifests(t *testing.T) string {
	t.Helper()
	manifests := createIntegrationManifests(t, []string{"model-registry", "gen-ai"})
	overlay := filepath.Join(manifests, "odh")
	require.NoError(t, os.WriteFile(filepath.Join(overlay, "params.env"), []byte("images-jobs-async-upload=registry.example.com/upload:1\n"), 0644))
	require.NoError(t, os.WriteFile(filepath.Join(overlay, "kustomization.yaml"), []byte(`apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - configmap.yaml
  - upload-config.yaml
configMapGenerator:
  - name: dashboard-params
    env: params.env
generatorOptions:
  disableNameSuffixHash: true
replacements:
  - source:
      kind: ConfigMap
      name: dashboard-params
      fieldPath: data.images-jobs-async-upload
    targets:
      - select:
          kind: ConfigMap
          name: model-registry-ui-config
        fieldPaths:
          - data.images-jobs-async-upload
  - source:
      kind: ConfigMap
      name: dashboard-params
      fieldPath: data.images-oci-base-image
    targets:
      - select:
          kind: ConfigMap
          name: model-registry-ui-config
        fieldPaths:
          - data.images-oci-base-image
  - source:
      kind: ConfigMap
      name: dashboard-params
      fieldPath: data.gateway-domain
    targets:
      - select:
          kind: ConfigMap
          name: dashboard-core-config
        fieldPaths:
          - data.gateway-domain
`), 0644))
	require.NoError(t, os.WriteFile(filepath.Join(overlay, "configmap.yaml"), []byte(`apiVersion: v1
kind: ConfigMap
metadata:
  name: dashboard-core-config
data:
  gateway-domain: placeholder
`), 0644))
	require.NoError(t, os.WriteFile(filepath.Join(overlay, "upload-config.yaml"), []byte(`apiVersion: v1
kind: ConfigMap
metadata:
  name: model-registry-ui-config
data:
  images-oci-base-image: placeholder
  images-jobs-async-upload: registry.example.com/upload:1
`), 0644))
	return manifests
}

// TestIntegration_OCIBaseImageReconcile checks the real upload ConfigMap's
// independent lifecycle, preservation on invalid input, and drift repair.
func TestIntegration_OCIBaseImageReconcile(t *testing.T) {
	t.Setenv("RELATED_IMAGE_ODH_MODEL_REGISTRY_JOB_ASYNC_UPLOAD_IMAGE", "registry.example.com/upload:1")
	manifests := createOCIBaseImageIntegrationManifests(t)
	ctx := context.Background()
	dashboard := newDashboard(v1alpha1.DashboardSpec{
		Gateway:                   &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Modules:                   disableAllModulesExcept("modelRegistry"),
		ModelRegistryOCIBaseImage: "mirror.example.com/Busybox:1",
	})
	require.NoError(t, k8sClient.Create(ctx, dashboard))
	t.Cleanup(func() {
		deleteDashboard(t)
		cleanupModuleResources(t)
	})
	r := newManifestReconciler(manifests)
	reconcile(t, r) // finalizer
	_, err := r.Reconcile(ctx, ctrl.Request{NamespacedName: types.NamespacedName{Name: v1alpha1.DashboardInstanceName}})
	require.NoError(t, err)
	assertExists(t, &corev1.ConfigMap{}, types.NamespacedName{Name: "dashboard-core-config", Namespace: integrationNamespace})
	assert.Len(t, listDeployments(t, "model-registry"), 1, "invalid initial OCI input must not block module deployment")
	initial := getConfigMap(t, "model-registry-ui-config")
	assert.Equal(t, "", initial.Data["images-oci-base-image"])
	assert.Equal(t, "registry.example.com/upload:1", initial.Data["images-jobs-async-upload"])
	assert.Equal(t, metav1.ConditionTrue, conditionStatus(getDashboard(t), string(common.ConditionTypeProvisioningSucceeded)))
	initialCondition := conditions.FindStatusCondition(getDashboard(t), "ModelRegistryConfigValid")
	require.NotNil(t, initialCondition)
	assert.Equal(t, metav1.ConditionFalse, initialCondition.Status)
	assert.Equal(t, common.ConditionSeverityInfo, initialCondition.Severity)
	dashboard = getDashboard(t)
	dashboard.Spec.ModelRegistryOCIBaseImage = "mirror.example.com/base:1"
	require.NoError(t, k8sClient.Update(ctx, dashboard))
	reconcile(t, r)
	assert.Nil(t, conditions.FindStatusCondition(getDashboard(t), "ModelRegistryConfigValid"))
	applied := getConfigMap(t, "model-registry-ui-config")
	assert.Equal(t, "mirror.example.com/base:1", applied.Data["images-oci-base-image"])
	assert.Equal(t, "dashboard", applied.Labels["platform.opendatahub.io/part-of"])
	require.Len(t, applied.OwnerReferences, 1)
	assert.Equal(t, dashboard.UID, applied.OwnerReferences[0].UID)

	dashboard = getDashboard(t)
	dashboard.Spec.ModelRegistryOCIBaseImage = "mirror.example.com/base:2"
	require.NoError(t, k8sClient.Update(ctx, dashboard))
	reconcile(t, r)
	assert.Equal(t, "mirror.example.com/base:2", getConfigMap(t, "model-registry-ui-config").Data["images-oci-base-image"])

	configMap := getConfigMap(t, "model-registry-ui-config")
	configMap.Data["images-oci-base-image"] = "drift.example.com/base:1"
	require.NoError(t, k8sClient.Update(ctx, configMap))
	reconcile(t, r)
	assert.Equal(t, "mirror.example.com/base:2", getConfigMap(t, "model-registry-ui-config").Data["images-oci-base-image"])

	configMap = getConfigMap(t, "model-registry-ui-config")
	require.NoError(t, k8sClient.Delete(ctx, configMap))
	reconcile(t, r)
	assert.Equal(t, "mirror.example.com/base:2", getConfigMap(t, "model-registry-ui-config").Data["images-oci-base-image"])

	dashboard = getDashboard(t)
	dashboard.Spec.ModelRegistryOCIBaseImage = "docker.io/busybox:latest"
	dashboard.Spec.Gateway.Domain = "updated.example.com"
	dashboard.Spec.Modules = disableAllModulesExcept("genAi")
	require.NoError(t, k8sClient.Update(ctx, dashboard))
	t.Setenv("RELATED_IMAGE_ODH_MODEL_REGISTRY_JOB_ASYNC_UPLOAD_IMAGE", "registry.example.com/upload:2")
	_, err = r.Reconcile(ctx, ctrl.Request{NamespacedName: types.NamespacedName{Name: v1alpha1.DashboardInstanceName}})
	require.NoError(t, err)
	condition := conditions.FindStatusCondition(getDashboard(t), "ModelRegistryConfigValid")
	require.NotNil(t, condition)
	assert.Equal(t, metav1.ConditionFalse, condition.Status)
	assert.Contains(t, condition.Message, "spec.modelRegistryOCIBaseImage")
	assert.Equal(t, "InvalidOCIBaseImage", condition.Reason)
	assert.Equal(t, common.ConditionSeverityInfo, condition.Severity)
	assert.Equal(t, metav1.ConditionTrue, conditionStatus(getDashboard(t), string(common.ConditionTypeProvisioningSucceeded)))
	assert.Equal(t, "updated.example.com", getConfigMap(t, "dashboard-core-config").Data["gateway-domain"])
	assert.Empty(t, listDeployments(t, "model-registry"), "disabled module cleanup must continue")
	assert.Len(t, listDeployments(t, "gen-ai"), 1, "unrelated module deployment must continue")
	assert.Equal(t, "registry.example.com/upload:2", getConfigMap(t, "model-registry-ui-config").Data["images-jobs-async-upload"], "invalid OCI input must not block upload Job image updates")
	params, readErr := os.ReadFile(filepath.Join(manifests, "odh", "params.env"))
	require.NoError(t, readErr)
	assert.NotContains(t, string(params), "docker.io/busybox:latest")
	assert.Equal(t, "mirror.example.com/base:2", getConfigMap(t, "model-registry-ui-config").Data["images-oci-base-image"])

	dashboard = getDashboard(t)
	dashboard.Spec.ModelRegistryOCIBaseImage = ""
	require.NoError(t, k8sClient.Update(ctx, dashboard))
	reconcile(t, r)
	assert.Equal(t, "", getConfigMap(t, "model-registry-ui-config").Data["images-oci-base-image"])
	assert.Nil(t, conditions.FindStatusCondition(getDashboard(t), "ModelRegistryConfigValid"))
	assert.Equal(t, metav1.ConditionTrue, conditionStatus(getDashboard(t), string(common.ConditionTypeProvisioningSucceeded)))
}

func TestIntegration_OCIBaseImageReadiness(t *testing.T) {
	t.Setenv("RELATED_IMAGE_ODH_MODEL_REGISTRY_JOB_ASYNC_UPLOAD_IMAGE", "registry.example.com/upload:1")
	manifests := createOCIBaseImageIntegrationManifests(t)
	ctx := context.Background()
	dashboard := newDashboard(v1alpha1.DashboardSpec{
		Gateway:                   &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Modules:                   disableAllModulesExcept(),
		ModelRegistryOCIBaseImage: "mirror.example.com/Busybox:1",
	})
	require.NoError(t, k8sClient.Create(ctx, dashboard))
	t.Cleanup(func() {
		deleteDashboard(t)
		cleanupModuleResources(t)
	})
	r := newManifestReconciler(manifests)
	reconcile(t, r) // finalizer
	reconcile(t, r) // invalid OCI input does not return an error or trigger failure backoff
	assertStatusHealthy(t, getDashboard(t))
	assert.NotNil(t, conditions.FindStatusCondition(getDashboard(t), "ModelRegistryConfigValid"))

	// A real ConfigMap update failure must still make provisioning fail and return
	// an error for controller-runtime to retry, even when OCI input is also invalid.
	configMap := getConfigMap(t, "model-registry-ui-config")
	immutable := true
	configMap.Immutable = &immutable
	require.NoError(t, k8sClient.Update(ctx, configMap))
	t.Setenv("RELATED_IMAGE_ODH_MODEL_REGISTRY_JOB_ASYNC_UPLOAD_IMAGE", "registry.example.com/upload:2")
	_, err := r.Reconcile(ctx, dashboardRequest())
	require.ErrorContains(t, err, "updating Model Registry upload ConfigMap")
	dashboard = getDashboard(t)
	provisioning := assertConditionStatus(t, dashboard, common.ConditionTypeProvisioningSucceeded, metav1.ConditionFalse)
	assert.Equal(t, "ModelRegistryConfigFailed", provisioning.Reason)
	assertConditionStatus(t, dashboard, common.ConditionTypeReady, metav1.ConditionFalse)
	assert.Equal(t, common.PhaseNotReady, dashboard.Status.Phase)
	assert.NotNil(t, conditions.FindStatusCondition(dashboard, "ModelRegistryConfigValid"))

	// Retrying after the API failure is resolved restores Ready while the invalid
	// OCI input remains visible as an independent informational condition.
	require.NoError(t, k8sClient.Delete(ctx, configMap))
	reconcile(t, r)
	assertStatusHealthy(t, getDashboard(t))
	assert.NotNil(t, conditions.FindStatusCondition(getDashboard(t), "ModelRegistryConfigValid"))

	// An unrelated deployment failure keeps its own reason alongside the OCI hint.
	require.NoError(t, os.WriteFile(filepath.Join(manifests, "modules", "gen-ai", "kustomization.yaml"), []byte("invalid: ["), 0644))
	dashboard = getDashboard(t)
	dashboard.Spec.Modules = disableAllModulesExcept("genAi")
	require.NoError(t, k8sClient.Update(ctx, dashboard))
	_, err = r.Reconcile(ctx, dashboardRequest())
	require.ErrorContains(t, err, "failed to render manifests for module genAi")
	dashboard = getDashboard(t)
	provisioning = assertConditionStatus(t, dashboard, common.ConditionTypeProvisioningSucceeded, metav1.ConditionFalse)
	assert.Equal(t, "ModuleDeployFailed", provisioning.Reason)
	assert.NotNil(t, conditions.FindStatusCondition(dashboard, "ModelRegistryConfigValid"))

	dashboard.Spec.ManagementState = "Removed"
	dashboard.Spec.Modules = disableAllModulesExcept()
	require.NoError(t, k8sClient.Update(ctx, dashboard))
	reconcile(t, r)
	assert.Nil(t, conditions.FindStatusCondition(getDashboard(t), "ModelRegistryConfigValid"))

	dashboard = getDashboard(t)
	dashboard.Spec.ManagementState = "Managed"
	require.NoError(t, k8sClient.Update(ctx, dashboard))
	reconcile(t, r)
	assertStatusHealthy(t, getDashboard(t))
	assert.NotNil(t, conditions.FindStatusCondition(getDashboard(t), "ModelRegistryConfigValid"))
	assert.Equal(t, "", getConfigMap(t, "model-registry-ui-config").Data["images-oci-base-image"])
	assert.Equal(t, "registry.example.com/upload:2", getConfigMap(t, "model-registry-ui-config").Data["images-jobs-async-upload"])
}

func TestIntegration_OCIBaseImageCRDValidation(t *testing.T) {
	for _, tt := range []struct {
		name    string
		image   string
		wantErr bool
	}{
		{name: "omitted"},
		{name: "tagged", image: "mirror.example.com/library/busybox:1.0"},
		{name: "Docker Hub shorthand", image: "docker.io/busybox:latest"},
		{name: "localhost with port", image: "localhost:5000/foo"},
		{name: "localhost", image: "localhost/busybox"},
		{name: "digest", image: "registry.example.com/library/busybox@sha256:" + strings.Repeat("a", 64)},
		{name: "unqualified", image: "busybox:latest", wantErr: true},
		{name: "missing registry", image: "library/busybox:latest", wantErr: true},
		{name: "invalid reference", image: "invalid-image", wantErr: true},
		{name: "missing repository", image: "mirror.example.com/", wantErr: true},
		{name: "blank", image: " ", wantErr: true},
		{name: "leading whitespace", image: " mirror.example.com/base:1", wantErr: true},
		{name: "trailing whitespace", image: "mirror.example.com/base:1 ", wantErr: true},
		{name: "embedded whitespace", image: "mirror.example.com/base:bad tag", wantErr: true},
		{name: "tab", image: "mirror.example.com/base:\t1", wantErr: true},
		{name: "carriage return", image: "mirror.example.com/base:1\r", wantErr: true},
		{name: "newline", image: "mirror.example.com/base:1\nimages-jobs-async-upload=bad", wantErr: true},
	} {
		t.Run(tt.name, func(t *testing.T) {
			dashboard := newDashboard(v1alpha1.DashboardSpec{
				ModelRegistryOCIBaseImage: tt.image,
			})
			err := k8sClient.Create(context.Background(), dashboard)
			if tt.wantErr {
				require.True(t, apierrors.IsInvalid(err), "expected admission rejection, got %v", err)
				require.ErrorContains(t, err, "modelRegistryOCIBaseImage")
				return
			}
			require.NoError(t, err)
			t.Cleanup(func() { deleteDashboard(t) })
			assert.Equal(t, tt.image, getDashboard(t).Spec.ModelRegistryOCIBaseImage)
		})
	}
}

func TestIntegration_OCIBaseImageCRDRejectsInvalidPatch(t *testing.T) {
	ctx := context.Background()
	dashboard := newDashboard(v1alpha1.DashboardSpec{
		ModelRegistryOCIBaseImage: "mirror.example.com/base:1",
	})
	require.NoError(t, k8sClient.Create(ctx, dashboard))
	t.Cleanup(func() { deleteDashboard(t) })

	before := dashboard.DeepCopy()
	dashboard.Spec.ModelRegistryOCIBaseImage = "busybox:latest"
	err := k8sClient.Patch(ctx, dashboard, client.MergeFrom(before))
	require.True(t, apierrors.IsInvalid(err), "expected admission rejection, got %v", err)
	require.ErrorContains(t, err, "modelRegistryOCIBaseImage")
	assert.Equal(t, before.Spec.ModelRegistryOCIBaseImage, getDashboard(t).Spec.ModelRegistryOCIBaseImage)
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
