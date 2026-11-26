//go:build integration

package controller_test

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	policyv1 "k8s.io/api/policy/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
	"k8s.io/utils/ptr"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	controllerconfig "sigs.k8s.io/controller-runtime/pkg/config"
	metricsserver "sigs.k8s.io/controller-runtime/pkg/metrics/server"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	ctrlpkg "github.com/opendatahub-io/odh-dashboard/dashboard-operator/internal/controller"
)

// TestIntegration_ProductionWatchEventsEnqueue proves the event-to-reconcile
// boundary through SetupWithManager, rather than invoking predicates directly.
func TestIntegration_ProductionWatchEventsEnqueue(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())

	requests := make(chan ctrl.Request, 32)
	mgr, err := ctrl.NewManager(restCfg, ctrl.Options{
		Scheme:                 k8sClient.Scheme(),
		NewCache:               ctrlpkg.NewManagerCache(integrationNamespace),
		Controller:             controllerconfig.Controller{SkipNameValidation: ptr.To(true)},
		Metrics:                metricsserver.Options{BindAddress: "0"},
		HealthProbeBindAddress: "0",
	})
	require.NoError(t, err)
	for _, object := range []client.Object{
		&v1alpha1.Dashboard{}, &appsv1.Deployment{}, &corev1.Service{},
		&corev1.ServiceAccount{}, &policyv1.PodDisruptionBudget{},
	} {
		_, err = mgr.GetCache().GetInformer(ctx, object)
		require.NoErrorf(t, err, "registering informer for %T", object)
	}
	require.NoError(t, ctrlpkg.SetupWithManager(mgr, ctrlpkg.Options{
		Platform:              cluster.OpenDataHub,
		Namespace:             integrationNamespace,
		ApplicationsNamespace: integrationNamespace,
		ReconcileObserver: func(req ctrl.Request) {
			select {
			case requests <- req:
			default:
			}
		},
		ReconcileObserverOnly: true,
	}))

	managerErr := make(chan error, 1)
	go func() { managerErr <- mgr.Start(ctx) }()
	t.Cleanup(func() {
		cancel()
		require.NoError(t, <-managerErr)
	})

	dashboard := newDashboard(v1alpha1.DashboardSpec{
		ManagementSpec: common.ManagementSpec{ManagementState: "Removed"},
	})
	require.NoError(t, k8sClient.Create(ctx, dashboard))
	t.Cleanup(func() { deleteIgnoreNotFound(t, dashboard) })
	waitForDashboardRequest(t, requests)
	settleDashboardRequests(requests)

	owner := *metav1.NewControllerRef(dashboard, v1alpha1.GroupVersion.WithKind("Dashboard"))
	labels := map[string]string{"platform.opendatahub.io/part-of": "dashboard"}

	deployment := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{Name: "production-event-deployment", Namespace: integrationNamespace, Labels: labels, OwnerReferences: []metav1.OwnerReference{owner}},
		Spec: appsv1.DeploymentSpec{
			Selector: &metav1.LabelSelector{MatchLabels: map[string]string{"app": "production-event"}},
			Template: corev1.PodTemplateSpec{ObjectMeta: metav1.ObjectMeta{Labels: map[string]string{"app": "production-event"}}, Spec: corev1.PodSpec{Containers: []corev1.Container{{Name: "app", Image: "example.invalid/app"}}}},
		},
	}
	require.NoError(t, k8sClient.Create(ctx, deployment))
	t.Cleanup(func() { deleteIgnoreNotFound(t, deployment) })
	waitForDashboardRequest(t, requests)
	settleDashboardRequests(requests)

	filtered := deployment.DeepCopy()
	filtered.Name = "production-event-filtered"
	filtered.Labels = map[string]string{"platform.opendatahub.io/part-of": "other"}
	filtered.OwnerReferences = nil
	filtered.ResourceVersion = ""
	filtered.UID = ""
	filtered.CreationTimestamp = metav1.Time{}
	filtered.ManagedFields = nil
	require.NoError(t, k8sClient.Create(ctx, filtered))
	t.Cleanup(func() { deleteIgnoreNotFound(t, filtered) })
	assertNoDashboardRequest(t, requests)

	service := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{Name: "production-event-service", Namespace: integrationNamespace, Labels: labels, OwnerReferences: []metav1.OwnerReference{owner}},
		Spec:       corev1.ServiceSpec{Type: corev1.ServiceTypeLoadBalancer, Ports: []corev1.ServicePort{{Port: 8080}}},
	}
	require.NoError(t, k8sClient.Create(ctx, service))
	t.Cleanup(func() { deleteIgnoreNotFound(t, service) })
	waitForDashboardRequest(t, requests)
	settleDashboardRequests(requests)

	currentService := &corev1.Service{}
	require.NoError(t, k8sClient.Get(ctx, client.ObjectKeyFromObject(service), currentService))
	currentService.Status.LoadBalancer.Ingress = []corev1.LoadBalancerIngress{{IP: "192.0.2.1"}}
	require.NoError(t, k8sClient.Status().Update(ctx, currentService))
	assertNoDashboardRequest(t, requests)

	require.NoError(t, k8sClient.Get(ctx, client.ObjectKeyFromObject(service), currentService))
	currentService.Spec.Ports[0].Port = 8443
	require.NoError(t, k8sClient.Update(ctx, currentService))
	waitForDashboardRequest(t, requests)
	settleDashboardRequests(requests)

	pdb := &policyv1.PodDisruptionBudget{
		ObjectMeta: metav1.ObjectMeta{Name: "production-event-pdb", Namespace: integrationNamespace, Labels: labels, OwnerReferences: []metav1.OwnerReference{owner}},
		Spec:       policyv1.PodDisruptionBudgetSpec{MinAvailable: intOrStringPtr(1)},
	}
	require.NoError(t, k8sClient.Create(ctx, pdb))
	t.Cleanup(func() { deleteIgnoreNotFound(t, pdb) })
	waitForDashboardRequest(t, requests)
	settleDashboardRequests(requests)

	currentPDB := &policyv1.PodDisruptionBudget{}
	require.NoError(t, k8sClient.Get(ctx, client.ObjectKeyFromObject(pdb), currentPDB))
	currentPDB.Status.CurrentHealthy = 1
	require.NoError(t, k8sClient.Status().Update(ctx, currentPDB))
	assertNoDashboardRequest(t, requests)

	config := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "odh-dashboard-config", Namespace: integrationNamespace}, Data: map[string]string{"platformVersion": "1"}}
	require.NoError(t, k8sClient.Create(ctx, config))
	t.Cleanup(func() { deleteIgnoreNotFound(t, config) })
	waitForDashboardRequest(t, requests)
	settleDashboardRequests(requests)
	currentConfig := &corev1.ConfigMap{}
	require.NoError(t, k8sClient.Get(ctx, client.ObjectKeyFromObject(config), currentConfig))
	currentConfig.Data["platformVersion"] = "2"
	require.NoError(t, k8sClient.Update(ctx, currentConfig))
	waitForDashboardRequest(t, requests)
	settleDashboardRequests(requests)

	unrelatedConfig := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "unrelated-production-config", Namespace: integrationNamespace}, Data: map[string]string{"value": "1"}}
	require.NoError(t, k8sClient.Create(ctx, unrelatedConfig))
	t.Cleanup(func() { deleteIgnoreNotFound(t, unrelatedConfig) })
	assertNoDashboardRequest(t, requests)

	route := &gatewayv1.HTTPRoute{ObjectMeta: metav1.ObjectMeta{Name: "production-event-route", Namespace: integrationNamespace, Labels: labels, OwnerReferences: []metav1.OwnerReference{owner}}}
	require.NoError(t, k8sClient.Create(ctx, route))
	t.Cleanup(func() { deleteIgnoreNotFound(t, route) })
	waitForDashboardRequest(t, requests)
}

func waitForDashboardRequest(t *testing.T, requests <-chan ctrl.Request) {
	t.Helper()
	select {
	case req := <-requests:
		assert.Equal(t, v1alpha1.DashboardInstanceName, req.Name)
	case <-time.After(10 * time.Second):
		t.Fatal("timed out waiting for Dashboard reconcile request")
	}
}

func settleDashboardRequests(requests <-chan ctrl.Request) {
	timer := time.NewTimer(750 * time.Millisecond)
	defer timer.Stop()
	for {
		select {
		case <-requests:
		case <-timer.C:
			return
		}
	}
}

func assertNoDashboardRequest(t *testing.T, requests <-chan ctrl.Request) {
	t.Helper()
	select {
	case req := <-requests:
		t.Fatalf("unexpected Dashboard reconcile request for %s", req.Name)
	case <-time.After(750 * time.Millisecond):
	}
}

func intOrStringPtr(value int) *intstr.IntOrString {
	result := intstr.FromInt(value)
	return &result
}
