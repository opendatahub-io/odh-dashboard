//go:build integration

package controller_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	policyv1 "k8s.io/api/policy/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/intstr"
	"k8s.io/client-go/util/workqueue"
	"sigs.k8s.io/controller-runtime/pkg/event"
	ctrlreconcile "sigs.k8s.io/controller-runtime/pkg/reconcile"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	ctrlpkg "github.com/opendatahub-io/odh-dashboard/dashboard-operator/internal/controller"
)

func TestIntegration_EventEnqueueMatrix(t *testing.T) {
	ctx := context.Background()
	r := &ctrlpkg.DashboardReconciler{Namespace: integrationNamespace, ApplicationsNamespace: integrationNamespace}

	owner := &v1alpha1.Dashboard{ObjectMeta: metav1.ObjectMeta{Name: v1alpha1.DashboardInstanceName, UID: types.UID("event-dashboard")}}
	ownerReference := *metav1.NewControllerRef(owner, v1alpha1.GroupVersion.WithKind("Dashboard"))
	ownedDeployment := &appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Name: "event-owned-deployment", Namespace: integrationNamespace, OwnerReferences: []metav1.OwnerReference{ownerReference}}}
	ownedQueue := workqueue.NewTypedRateLimitingQueue(workqueue.DefaultTypedControllerRateLimiter[ctrlreconcile.Request]())
	ctrlpkg.OwnedResourceEventHandler(k8sClient.Scheme(), k8sClient.RESTMapper()).Create(ctx, event.CreateEvent{Object: ownedDeployment}, ownedQueue)
	require.Equal(t, 1, ownedQueue.Len(), "owned resource create must enqueue the Dashboard")
	request, shutdown := ownedQueue.Get()
	assert.False(t, shutdown)
	assert.Equal(t, v1alpha1.DashboardInstanceName, request.Name)
	ownedQueue.Done(request)
	ownedQueue.ShutDown()

	filteredDeployment := ownedDeployment.DeepCopy()
	filteredDeployment.OwnerReferences = nil
	filteredQueue := workqueue.NewTypedRateLimitingQueue(workqueue.DefaultTypedControllerRateLimiter[ctrlreconcile.Request]())
	ctrlpkg.OwnedResourceEventHandler(k8sClient.Scheme(), k8sClient.RESTMapper()).Create(ctx, event.CreateEvent{Object: filteredDeployment}, filteredQueue)
	assert.Equal(t, 0, filteredQueue.Len(), "unowned resource create must not enqueue the Dashboard")
	filteredQueue.ShutDown()

	ownedRoute := &gatewayv1.HTTPRoute{ObjectMeta: metav1.ObjectMeta{Name: "event-owned-route", Namespace: integrationNamespace, OwnerReferences: []metav1.OwnerReference{ownerReference}}}
	routeQueue := workqueue.NewTypedRateLimitingQueue(workqueue.DefaultTypedControllerRateLimiter[ctrlreconcile.Request]())
	ctrlpkg.OwnedResourceEventHandler(k8sClient.Scheme(), k8sClient.RESTMapper()).Create(ctx, event.CreateEvent{Object: ownedRoute}, routeQueue)
	assert.Equal(t, 1, routeQueue.Len(), "owned HTTPRoute create must enqueue the Dashboard")
	routeQueue.ShutDown()

	service := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{Name: "event-service", Namespace: integrationNamespace},
		Spec:       corev1.ServiceSpec{Ports: []corev1.ServicePort{{Port: 8080}}},
	}
	require.NoError(t, k8sClient.Create(ctx, service))
	t.Cleanup(func() { deleteIgnoreNotFound(t, service) })
	serviceOld := service.DeepCopy()
	serviceStatus := service.DeepCopy()
	serviceStatus.Status.LoadBalancer.Ingress = []corev1.LoadBalancerIngress{{IP: "192.0.2.1"}}
	assert.False(t, ctrlpkg.ServiceChangedPredicate().Update(event.UpdateEvent{ObjectOld: serviceOld, ObjectNew: serviceStatus}), "Service status-only updates must be filtered")
	serviceSpec := service.DeepCopy()
	serviceSpec.Spec.Ports[0].Port = 8443
	assert.True(t, ctrlpkg.ServiceChangedPredicate().Update(event.UpdateEvent{ObjectOld: serviceOld, ObjectNew: serviceSpec}), "Service spec changes must enqueue")

	pdb := &policyv1.PodDisruptionBudget{
		ObjectMeta: metav1.ObjectMeta{Name: "event-pdb", Namespace: integrationNamespace},
		Spec:       policyv1.PodDisruptionBudgetSpec{MinAvailable: intOrStringPtr(1)},
	}
	require.NoError(t, k8sClient.Create(ctx, pdb))
	t.Cleanup(func() { deleteIgnoreNotFound(t, pdb) })
	pdbOld := pdb.DeepCopy()
	pdbStatus := pdb.DeepCopy()
	pdbStatus.Status.CurrentHealthy = 1
	assert.False(t, ctrlpkg.PodDisruptionBudgetChangedPredicate().Update(event.UpdateEvent{ObjectOld: pdbOld, ObjectNew: pdbStatus}), "PDB status-only updates must be filtered")
	pdbSpec := pdb.DeepCopy()
	pdbSpec.Spec.MinAvailable = intOrStringPtr(2)
	assert.True(t, ctrlpkg.PodDisruptionBudgetChangedPredicate().Update(event.UpdateEvent{ObjectOld: pdbOld, ObjectNew: pdbSpec}), "PDB spec changes must enqueue")

	watchedConfig := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "odh-dashboard-config", Namespace: integrationNamespace}, Data: map[string]string{"platformVersion": "1"}}
	configPredicate := r.ConfigMapUpdatePredicate()
	configChanged := watchedConfig.DeepCopy()
	configChanged.Data["platformVersion"] = "2"
	assert.True(t, configPredicate.Update(event.TypedUpdateEvent[*corev1.ConfigMap]{ObjectOld: watchedConfig, ObjectNew: configChanged}), "watched ConfigMap data changes must enqueue")
	assert.Len(t, r.MapConfigMapToDashboard(ctx, watchedConfig), 1)
	unrelatedConfig := watchedConfig.DeepCopy()
	unrelatedConfig.Name = "unrelated-config"
	assert.False(t, configPredicate.Update(event.TypedUpdateEvent[*corev1.ConfigMap]{ObjectOld: unrelatedConfig, ObjectNew: unrelatedConfig}), "unrelated ConfigMaps must be filtered")
	assert.Empty(t, r.MapConfigMapToDashboard(ctx, unrelatedConfig))

	targetNamespace := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "redhat-ods-operator"}}
	namespacePredicate := r.MaaSPortalOperatorNamespacePredicate()
	assert.True(t, namespacePredicate.Create(event.CreateEvent{Object: targetNamespace}))
	assert.Len(t, r.MapMaaSPortalOperatorNamespaceToDashboard(ctx, targetNamespace), 1)
	unrelatedNamespace := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "unrelated-event-namespace"}}
	assert.False(t, namespacePredicate.Create(event.CreateEvent{Object: unrelatedNamespace}))
	assert.Empty(t, r.MapMaaSPortalOperatorNamespaceToDashboard(ctx, unrelatedNamespace))

	dashboardConfig := newUnstructuredOdhDashboardConfig(integrationNamespace, ctrlpkg.OdhDashboardConfigName)
	dashboardConfigPredicate := r.OdhDashboardConfigPredicate()
	assert.True(t, dashboardConfigPredicate.Create(event.CreateEvent{Object: dashboardConfig}))
	assert.Len(t, r.MapOdhDashboardConfigToDashboard(ctx, dashboardConfig), 1)
	wrongName := dashboardConfig.DeepCopy()
	wrongName.SetName("other-config")
	assert.False(t, dashboardConfigPredicate.Create(event.CreateEvent{Object: wrongName}))
	assert.Empty(t, r.MapOdhDashboardConfigToDashboard(ctx, wrongName))
	wrongNamespace := dashboardConfig.DeepCopy()
	wrongNamespace.SetNamespace("other-namespace")
	assert.False(t, dashboardConfigPredicate.Create(event.CreateEvent{Object: wrongNamespace}))
}

func intOrStringPtr(value int) *intstr.IntOrString {
	result := intstr.FromInt(value)
	return &result
}
