package controller

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	policyv1 "k8s.io/api/policy/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/render"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/render/kustomize"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

func TestXKSLifecycleUsesRHAIIManifestBundle(t *testing.T) {
	dir := t.TempDir()
	bundle := filepath.Join(dir, "distributions", "rhaii")
	require.NoError(t, os.MkdirAll(bundle, 0755))
	require.NoError(t, os.WriteFile(filepath.Join(bundle, "params.env"), []byte("rhaii-dashboard-image=quay.io/opendatahub/rhaii-dashboard:main\ngateway-name=rh-ai-gateway\n"), 0644))
	t.Setenv("RELATED_IMAGE_ODH_RHAII_DASHBOARD_IMAGE", "quay.io/example/rhaii-dashboard@sha256:abc123")
	t.Setenv("RELATED_IMAGE_ODH_DASHBOARD_IMAGE", "quay.io/example/odh-dashboard@sha256:def456")

	// The XKS lifecycle owns this selection rather than the shared OpenShift
	// rendering helper. Keep the manifest construction local to that contract.
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
	assert.Equal(t, "quay.io/opendatahub/rhaii-dashboard:REPLACE_WITH_IMMUTABLE_TAG", container["image"])
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
}

func TestDeleteXKSIngressResources(t *testing.T) {
	scheme := runtime.NewScheme()
	require.NoError(t, policyv1.AddToScheme(scheme))
	require.NoError(t, gatewayv1.Install(scheme))

	managedLabels := map[string]string{labels.PlatformPartOf: "dashboard"}
	managedPDB := &policyv1.PodDisruptionBudget{ObjectMeta: metav1.ObjectMeta{Name: "rhaii-dashboard", Namespace: "applications", Labels: managedLabels}}
	managedRoute := &gatewayv1.HTTPRoute{ObjectMeta: metav1.ObjectMeta{Name: "rhaii-dashboard", Namespace: "applications", Labels: managedLabels}}
	unrelatedPDB := &policyv1.PodDisruptionBudget{ObjectMeta: metav1.ObjectMeta{Name: "unrelated", Namespace: "applications"}}

	cli := fake.NewClientBuilder().WithScheme(scheme).WithObjects(managedPDB, managedRoute, unrelatedPDB).Build()
	r := &DashboardReconciler{Client: cli, ApplicationsNamespace: "applications"}
	require.NoError(t, xksDashboardLifecycle{reconciler: r}.deleteRHAIIIngressResources(context.Background()))

	assertResourceAbsent(t, cli, managedPDB)
	assertResourceAbsent(t, cli, managedRoute)
	assertResourcePresent(t, cli, unrelatedPDB)
}

func assertResourceAbsent(t *testing.T, cli client.Client, obj client.Object) {
	t.Helper()
	err := cli.Get(context.Background(), client.ObjectKeyFromObject(obj), obj.DeepCopyObject().(client.Object))
	assert.True(t, apierrors.IsNotFound(err), "expected %T to be absent, got %v", obj, err)
}

func assertResourcePresent(t *testing.T, cli client.Client, obj client.Object) {
	t.Helper()
	err := cli.Get(context.Background(), client.ObjectKeyFromObject(obj), obj.DeepCopyObject().(client.Object))
	assert.NoError(t, err)
}
