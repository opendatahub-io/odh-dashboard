package controller

import (
	"context"
	"testing"

	routev1 "github.com/openshift/api/route/v1"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

func TestLegacyGatewayHostname(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		host string
		want string
		err  bool
	}{
		{name: "default gateway", host: "rh-ai.apps.example.com", want: "data-science-gateway.apps.example.com"},
		{name: "custom gateway", host: "custom.apps.example.com", want: "data-science-gateway.apps.example.com"},
		{name: "already legacy", host: "data-science-gateway.apps.example.com"},
		{name: "invalid", host: "localhost", err: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got, err := legacyGatewayHostname(tt.host)
			if tt.err {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestDashboardRedirectResourcesPreserveCurrentBehavior(t *testing.T) {
	t.Setenv("RELATED_IMAGE_NGINX_126_IMAGE", "registry.example.com/nginx@sha256:test")

	r := &DashboardReconciler{
		Platform:              cluster.SelfManagedRhoai,
		ApplicationsNamespace: "redhat-ods-applications",
	}
	data, err := r.dashboardRedirectData("rh-ai.apps.example.com")
	require.NoError(t, err)
	assert.Equal(t, dashboardRouteNameRHOAI, data.DashboardRouteName)
	assert.Equal(t, "OpenShift AI", data.ProductName)
	assert.Equal(t, "registry.example.com/nginx@sha256:test", data.Image)
	assert.NotEmpty(t, data.ConfigHash)

	resources, err := renderDashboardRedirectResources(data)
	require.NoError(t, err)
	require.Len(t, resources, 5)

	byKindName := make(map[string]map[string]any, len(resources))
	for i := range resources {
		resource := &resources[i]
		byKindName[resource.GetKind()+"/"+resource.GetName()] = resource.Object
		assert.Equal(t, "dashboard", resource.GetLabels()["app.kubernetes.io/part-of"])
	}

	config := byKindName["ConfigMap/"+dashboardRedirectConfigMapName]
	dataMap, found, err := unstructuredNestedStringMap(config, "data")
	require.NoError(t, err)
	require.True(t, found)
	assert.Contains(t, dataMap["redirect.conf"], `if ($http_accept ~* "text/html")`)
	assert.Contains(t, dataMap["redirect.conf"], "return 301 https://rh-ai.apps.example.com$request_uri")
	assert.Contains(t, dataMap["deprecation.html"], "You will be redirected in 10 seconds")
	assert.Contains(t, dataMap["deprecation.html"], "window.location.replace(destination.href)")
	assert.Equal(t, dashboardRedirectConfigHash(dataMap), data.ConfigHash)

	legacyRoute := byKindName["Route/"+legacyGatewayRouteName]
	host, found, err := unstructuredNestedString(legacyRoute, "spec", "host")
	require.NoError(t, err)
	require.True(t, found)
	assert.Equal(t, "data-science-gateway.apps.example.com", host)
}

func TestDashboardRedirectResourcesOmitRedundantLegacyRoute(t *testing.T) {
	r := &DashboardReconciler{Platform: cluster.OpenDataHub, ApplicationsNamespace: "opendatahub"}
	data, err := r.dashboardRedirectData("data-science-gateway.apps.example.com")
	require.NoError(t, err)
	resources, err := renderDashboardRedirectResources(data)
	require.NoError(t, err)
	assert.Len(t, resources, 4)
	assert.Equal(t, dashboardRouteNameODH, data.DashboardRouteName)
	assert.Equal(t, "Open Data Hub", data.ProductName)
}

func TestLegacyRedirectHandoffAbsentIsNoOp(t *testing.T) {
	scheme := legacyRedirectTestScheme(t)
	legacy := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{
		Name: dashboardRedirectConfigMapName, Namespace: "applications",
		OwnerReferences: []metav1.OwnerReference{{
			APIVersion: gatewayConfigGVK.GroupVersion().String(), Kind: gatewayConfigGVK.Kind,
			Name: "default-gateway", UID: "gateway-uid", Controller: ptr(true),
		}},
	}}
	cli := fake.NewClientBuilder().WithScheme(scheme).WithObjects(legacy).Build()
	r := &DashboardReconciler{Client: cli, ApplicationsNamespace: "applications", RouteAPIAvailable: true}
	dashboard := &v1alpha1.Dashboard{Spec: v1alpha1.DashboardSpec{Gateway: &v1alpha1.GatewaySpec{Domain: "rh-ai.apps.example.com"}}}

	require.NoError(t, r.reconcileLegacyRedirects(context.Background(), dashboard))
	current := &corev1.ConfigMap{}
	require.NoError(t, cli.Get(context.Background(), client.ObjectKeyFromObject(legacy), current))
	require.Len(t, current.OwnerReferences, 1)
	assert.Equal(t, "GatewayConfig", current.OwnerReferences[0].Kind)
}

func TestLegacyRedirectClientReadsThroughAPIReader(t *testing.T) {
	scheme := legacyRedirectTestScheme(t)
	legacy := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{
		Name: dashboardRedirectConfigMapName, Namespace: "applications",
	}}
	cachedClient := fake.NewClientBuilder().WithScheme(scheme).Build()
	directReader := fake.NewClientBuilder().WithScheme(scheme).WithObjects(legacy).Build()
	r := &DashboardReconciler{Client: cachedClient, APIReader: directReader}

	current := &corev1.ConfigMap{}
	require.NoError(t, r.legacyRedirectClient().Get(context.Background(), client.ObjectKeyFromObject(legacy), current))
	assert.Equal(t, legacy.Name, current.Name)
}

func TestLegacyRedirectRemovedCleansAllResources(t *testing.T) {
	scheme := legacyRedirectTestScheme(t)
	objects := []client.Object{
		&appsv1.Deployment{ObjectMeta: legacyRedirectOwnedMetadata(dashboardRedirectName)},
		&corev1.Service{ObjectMeta: legacyRedirectOwnedMetadata(dashboardRedirectName)},
		&corev1.ConfigMap{ObjectMeta: legacyRedirectOwnedMetadata(dashboardRedirectConfigMapName)},
		&routev1.Route{ObjectMeta: legacyRedirectOwnedMetadata(dashboardRouteNameODH)},
		&routev1.Route{ObjectMeta: legacyRedirectOwnedMetadata(dashboardRouteNameRHOAI)},
		&routev1.Route{ObjectMeta: legacyRedirectOwnedMetadata(legacyGatewayRouteName)},
	}
	cli := fake.NewClientBuilder().WithScheme(scheme).WithObjects(objects...).Build()
	r := &DashboardReconciler{Client: cli, ApplicationsNamespace: "applications", RouteAPIAvailable: true}
	dashboard := &v1alpha1.Dashboard{Spec: v1alpha1.DashboardSpec{
		LegacyRedirects: &v1alpha1.LegacyRedirectsSpec{ManagementSpec: common.ManagementSpec{ManagementState: common.Removed}},
	}}

	require.NoError(t, r.reconcileLegacyRedirects(context.Background(), dashboard))
	for _, object := range objects {
		err := cli.Get(context.Background(), client.ObjectKeyFromObject(object), object)
		assert.Error(t, err)
	}
}

func TestLegacyRedirectCleanupPreservesUnownedResources(t *testing.T) {
	scheme := legacyRedirectTestScheme(t)
	objects := []client.Object{
		&appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Name: dashboardRedirectName, Namespace: "applications"}},
		&corev1.Service{ObjectMeta: metav1.ObjectMeta{Name: dashboardRedirectName, Namespace: "applications"}},
		&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: dashboardRedirectConfigMapName, Namespace: "applications"}},
		&routev1.Route{ObjectMeta: metav1.ObjectMeta{Name: dashboardRouteNameODH, Namespace: "applications"}},
		&routev1.Route{ObjectMeta: metav1.ObjectMeta{Name: dashboardRouteNameRHOAI, Namespace: "applications"}},
		&routev1.Route{ObjectMeta: metav1.ObjectMeta{Name: legacyGatewayRouteName, Namespace: "applications"}},
	}
	cli := fake.NewClientBuilder().WithScheme(scheme).WithObjects(objects...).Build()
	r := &DashboardReconciler{Client: cli, ApplicationsNamespace: "applications", RouteAPIAvailable: true}

	require.NoError(t, r.cleanupLegacyRedirects(context.Background()))
	for _, object := range objects {
		require.NoError(t, cli.Get(context.Background(), client.ObjectKeyFromObject(object), object), "%T should be preserved", object)
	}
}

func TestLegacyRedirectOwnershipRecognizesHandoffOwners(t *testing.T) {
	controller := true
	for _, kind := range []string{v1alpha1.DashboardKind, gatewayConfigGVK.Kind} {
		object := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{OwnerReferences: []metav1.OwnerReference{{
			Kind: kind, Controller: &controller,
		}}}}
		assert.True(t, isOwnedLegacyRedirect(object), "%s controller ownership should be recognized", kind)
	}
	assert.True(t, isOwnedLegacyRedirect(&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{
		Labels: map[string]string{labels.PlatformPartOf: "dashboard"},
	}}))
}

func legacyRedirectOwnedMetadata(name string) metav1.ObjectMeta {
	return metav1.ObjectMeta{
		Name: name, Namespace: "applications",
		Labels: map[string]string{labels.PlatformPartOf: "dashboard"},
	}
}

func legacyRedirectTestScheme(t *testing.T) *runtime.Scheme {
	t.Helper()
	scheme := runtime.NewScheme()
	require.NoError(t, corev1.AddToScheme(scheme))
	require.NoError(t, appsv1.AddToScheme(scheme))
	require.NoError(t, routev1.AddToScheme(scheme))
	require.NoError(t, v1alpha1.AddToScheme(scheme))
	return scheme
}

func ptr[T any](value T) *T { return &value }

func unstructuredNestedStringMap(object map[string]any, fields ...string) (map[string]string, bool, error) {
	return unstructured.NestedStringMap(object, fields...)
}

func unstructuredNestedString(object map[string]any, fields ...string) (string, bool, error) {
	return unstructured.NestedString(object, fields...)
}
