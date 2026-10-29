//go:build integration

package controller_test

import (
	"context"
	"testing"

	routev1 "github.com/openshift/api/route/v1"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

func TestIntegration_LegacyRedirectsCleanedWhenDashboardDeleted(t *testing.T) {
	ctx := context.Background()
	r := newManifestReconciler(createIntegrationManifests(t, nil))
	r.Platform = cluster.SelfManagedRhoai
	r.RouteAPIAvailable = true

	dashboard := newDashboard(v1alpha1.DashboardSpec{
		Gateway: &v1alpha1.GatewaySpec{Domain: "rh-ai.apps.example.com"},
		LegacyRedirects: &v1alpha1.LegacyRedirectsSpec{
			ManagementSpec: common.ManagementSpec{ManagementState: common.Managed},
		},
		Modules: disableAllModulesExcept(),
	})
	require.NoError(t, k8sClient.Create(ctx, dashboard))
	t.Cleanup(func() {
		deleteDashboard(t)
		cleanupModuleResources(t)
	})

	// Add the finalizer, then create the redirect resources.
	reconcile(t, r)
	reconcile(t, r)
	require.NoError(t, k8sClient.Get(ctx, types.NamespacedName{Name: "dashboard-redirect-config", Namespace: integrationNamespace}, &corev1.ConfigMap{}))

	require.NoError(t, k8sClient.Delete(ctx, getDashboard(t)))
	_, err := r.Reconcile(ctx, ctrl.Request{NamespacedName: types.NamespacedName{Name: v1alpha1.DashboardInstanceName}})
	require.NoError(t, err)

	for _, object := range []client.Object{
		&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "dashboard-redirect-config", Namespace: integrationNamespace}},
		&corev1.Service{ObjectMeta: metav1.ObjectMeta{Name: "dashboard-redirect", Namespace: integrationNamespace}},
		&appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Name: "dashboard-redirect", Namespace: integrationNamespace}},
		&routev1.Route{ObjectMeta: metav1.ObjectMeta{Name: "rhods-dashboard", Namespace: integrationNamespace}},
		&routev1.Route{ObjectMeta: metav1.ObjectMeta{Name: "data-science-gateway", Namespace: integrationNamespace}},
	} {
		assert.True(t, apierrors.IsNotFound(k8sClient.Get(ctx, client.ObjectKeyFromObject(object), object)), "%T should be deleted with the Dashboard", object)
	}
}

func TestIntegration_LegacyRedirectsAdoptGatewayOwnedResourcesInPlace(t *testing.T) {
	ctx := context.Background()
	manifests := createIntegrationManifests(t, nil)
	r := newManifestReconciler(manifests)
	r.Platform = cluster.SelfManagedRhoai
	r.RouteAPIAvailable = true

	dashboard := newDashboard(v1alpha1.DashboardSpec{
		Gateway: &v1alpha1.GatewaySpec{Domain: "rh-ai.apps.example.com"},
		LegacyRedirects: &v1alpha1.LegacyRedirectsSpec{
			ManagementSpec: common.ManagementSpec{ManagementState: common.Managed},
		},
		Modules: disableAllModulesExcept(),
	})
	require.NoError(t, k8sClient.Create(ctx, dashboard))

	gatewayController := true
	legacyOwner := metav1.OwnerReference{
		APIVersion: "services.platform.opendatahub.io/v1alpha1",
		Kind:       "GatewayConfig",
		Name:       "default-gateway",
		UID:        types.UID("legacy-gateway-uid"),
		Controller: &gatewayController,
	}
	replicas := int32(2)
	legacyObjects := []client.Object{
		&corev1.ConfigMap{
			ObjectMeta: metav1.ObjectMeta{Name: "dashboard-redirect-config", Namespace: integrationNamespace, OwnerReferences: []metav1.OwnerReference{legacyOwner}},
			Data:       map[string]string{"redirect.conf": "return 301 https://old.example.com$request_uri;"},
		},
		&corev1.Service{
			ObjectMeta: metav1.ObjectMeta{Name: "dashboard-redirect", Namespace: integrationNamespace, OwnerReferences: []metav1.OwnerReference{legacyOwner}},
			Spec:       corev1.ServiceSpec{Selector: map[string]string{"app": "dashboard-redirect"}, Ports: []corev1.ServicePort{{Name: "http", Port: 8080}}},
		},
		&appsv1.Deployment{
			ObjectMeta: metav1.ObjectMeta{Name: "dashboard-redirect", Namespace: integrationNamespace, OwnerReferences: []metav1.OwnerReference{legacyOwner}},
			Spec: appsv1.DeploymentSpec{
				Replicas: &replicas,
				Selector: &metav1.LabelSelector{MatchLabels: map[string]string{"app": "dashboard-redirect"}},
				Template: corev1.PodTemplateSpec{
					ObjectMeta: metav1.ObjectMeta{Labels: map[string]string{"app": "dashboard-redirect"}},
					Spec:       corev1.PodSpec{Containers: []corev1.Container{{Name: "nginx", Image: "registry.example.com/legacy-nginx:latest"}}},
				},
			},
		},
		&routev1.Route{
			ObjectMeta: metav1.ObjectMeta{Name: "rhods-dashboard", Namespace: integrationNamespace, OwnerReferences: []metav1.OwnerReference{legacyOwner}},
			Spec:       routev1.RouteSpec{Host: "rhods-dashboard.apps.example.com"},
		},
		&routev1.Route{ObjectMeta: metav1.ObjectMeta{Name: "data-science-gateway", Namespace: integrationNamespace, OwnerReferences: []metav1.OwnerReference{legacyOwner}}},
	}
	for _, object := range legacyObjects {
		require.NoError(t, k8sClient.Create(ctx, object))
	}
	legacyServiceClusterIP := legacyObjects[1].(*corev1.Service).Spec.ClusterIP
	require.NotEmpty(t, legacyServiceClusterIP)

	uids := make(map[client.Object]types.UID, len(legacyObjects))
	for _, object := range legacyObjects {
		uids[object] = object.GetUID()
	}

	t.Cleanup(func() {
		deleteDashboard(t)
		cleanupModuleResources(t)
		for _, object := range legacyObjects {
			deleteIgnoreNotFound(t, object)
		}
	})

	// First reconciliation adds the finalizer; the second performs the handoff.
	reconcile(t, r)
	reconcile(t, r)

	currentDashboard := getDashboard(t)
	for _, object := range legacyObjects {
		current := object.DeepCopyObject().(client.Object)
		require.NoError(t, k8sClient.Get(ctx, client.ObjectKeyFromObject(object), current))
		assert.Equal(t, uids[object], current.GetUID(), "%T should be adopted in place", object)
		require.Len(t, current.GetOwnerReferences(), 1)
		owner := current.GetOwnerReferences()[0]
		assert.Equal(t, v1alpha1.DashboardKind, owner.Kind)
		assert.Equal(t, currentDashboard.UID, owner.UID)
		assert.Equal(t, "dashboard", current.GetLabels()["platform.opendatahub.io/part-of"])
	}

	config := &corev1.ConfigMap{}
	require.NoError(t, k8sClient.Get(ctx, types.NamespacedName{Name: "dashboard-redirect-config", Namespace: integrationNamespace}, config))
	assert.Contains(t, config.Data["redirect.conf"], `if ($http_accept ~* "text/html")`)
	assert.Contains(t, config.Data["deprecation.html"], "You will be redirected in 10 seconds")

	dashboardRoute := &routev1.Route{}
	require.NoError(t, k8sClient.Get(ctx, types.NamespacedName{Name: "rhods-dashboard", Namespace: integrationNamespace}, dashboardRoute))
	assert.Equal(t, "rhods-dashboard.apps.example.com", dashboardRoute.Spec.Host, "the admitted dashboard hostname must survive adoption")

	redirectService := &corev1.Service{}
	require.NoError(t, k8sClient.Get(ctx, types.NamespacedName{Name: "dashboard-redirect", Namespace: integrationNamespace}, redirectService))
	assert.Equal(t, legacyServiceClusterIP, redirectService.Spec.ClusterIP, "the allocated Service ClusterIP must survive adoption")
}
