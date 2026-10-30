package controller

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/render"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/render/kustomize"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

func TestApplyKustomizeParamsOverridesRHAIIImage(t *testing.T) {
	dir := t.TempDir()
	bundle := filepath.Join(dir, "distributions", "rhaii")
	require.NoError(t, os.MkdirAll(bundle, 0755))
	require.NoError(t, os.WriteFile(filepath.Join(bundle, "params.env"), []byte("rhaii-dashboard-image=quay.io/opendatahub/rhaii-dashboard:main\ngateway-name=rh-ai-gateway\n"), 0644))
	t.Setenv("RELATED_IMAGE_ODH_RHAII_DASHBOARD_IMAGE", "quay.io/example/rhaii-dashboard@sha256:abc123")
	t.Setenv("RELATED_IMAGE_ODH_DASHBOARD_IMAGE", "quay.io/example/odh-dashboard@sha256:def456")

	manifests := []render.ManifestInfo{rhaiiManifestInfo(dir)}
	require.NoError(t, applyKustomizeParams(&v1alpha1.Dashboard{}, manifests, cluster.XKS))

	data, err := os.ReadFile(filepath.Join(bundle, "params.env"))
	require.NoError(t, err)
	assert.Contains(t, string(data), "rhaii-dashboard-image=quay.io/example/rhaii-dashboard@sha256:abc123")
	assert.Contains(t, string(data), "gateway-name=rh-ai-gateway")
	assert.NotContains(t, string(data), "odh-dashboard-image=quay.io/example/odh-dashboard@sha256:def456")
}

func TestRenderRHAIIDashboardManifestBundle(t *testing.T) {
	source := filepath.Join("..", "..", "..", "manifests", "distributions", "rhaii")
	engine := kustomize.NewEngine()
	rendered, err := engine.Render(source, kustomize.WithNamespace("redhat-ods-applications"))
	require.NoError(t, err)

	resources := make(map[string]*unstructured.Unstructured, len(rendered))
	for i := range rendered {
		resource := &rendered[i]
		resources[resource.GetKind()+"/"+resource.GetName()] = resource
	}

	deployment := resources["Deployment/rhaii-dashboard"]
	require.NotNil(t, deployment)
	containers, found, err := unstructured.NestedSlice(deployment.Object, "spec", "template", "spec", "containers")
	require.NoError(t, err)
	require.True(t, found)
	container := namedManifestObject(t, containers, "rhaii-dashboard")
	assert.Equal(t, "quay.io/opendatahub/rhaii-dashboard:main", container["image"])
	assert.Contains(t, container["args"], "--platform-type=XKS")
	assert.Equal(t, "dashboard", container["ports"].([]interface{})[0].(map[string]interface{})["name"])

	route := resources["HTTPRoute/rhaii-dashboard"]
	require.NotNil(t, route)
	parents, found, err := unstructured.NestedSlice(route.Object, "spec", "parentRefs")
	require.NoError(t, err)
	require.True(t, found)
	require.Len(t, parents, 1)
	assert.Equal(t, "rh-ai-gateway", parents[0].(map[string]interface{})["name"])
	assert.Equal(t, "rh-ai-gateway", parents[0].(map[string]interface{})["namespace"])

	for _, kind := range []string{"ServiceAccount", "Role", "RoleBinding", "ClusterRole", "ClusterRoleBinding", "Service", "NetworkPolicy", "PodDisruptionBudget"} {
		assert.Contains(t, resources, kind+"/rhaii-dashboard")
	}

	serviceAccount := resources["ServiceAccount/rhaii-dashboard"]
	require.NotNil(t, serviceAccount)
	assert.Equal(t, "redhat-ods-applications", serviceAccount.GetNamespace())

	for _, kind := range []string{"RoleBinding", "ClusterRoleBinding"} {
		binding := resources[kind+"/rhaii-dashboard"]
		require.NotNil(t, binding)
		subjects, found, err := unstructured.NestedSlice(binding.Object, "subjects")
		require.NoError(t, err)
		require.True(t, found)
		subject := namedManifestObject(t, subjects, "rhaii-dashboard")
		assert.Equal(t, "redhat-ods-applications", subject["namespace"])
	}
}
