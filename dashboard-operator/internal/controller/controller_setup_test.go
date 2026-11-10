package controller

import (
	"testing"

	routev1 "github.com/openshift/api/route/v1"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	policyv1 "k8s.io/api/policy/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/util/intstr"
	"sigs.k8s.io/controller-runtime/pkg/event"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"
)

func TestServiceChangedPredicate(t *testing.T) {
	p := serviceChangedPredicate()
	oldService := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{Name: "dashboard", Labels: map[string]string{"owned": "true"}},
		Spec:       corev1.ServiceSpec{Ports: []corev1.ServicePort{{Port: 8443}}},
	}

	statusOnly := oldService.DeepCopy()
	statusOnly.Status.LoadBalancer.Ingress = []corev1.LoadBalancerIngress{{IP: "192.0.2.1"}}
	assert.False(t, p.Update(event.UpdateEvent{ObjectOld: oldService, ObjectNew: statusOnly}))

	specChanged := oldService.DeepCopy()
	specChanged.Spec.Ports[0].TargetPort = intstr.FromInt32(8443)
	assert.True(t, p.Update(event.UpdateEvent{ObjectOld: oldService, ObjectNew: specChanged}))

	metadataChanged := oldService.DeepCopy()
	metadataChanged.Labels["changed"] = "true"
	assert.True(t, p.Update(event.UpdateEvent{ObjectOld: oldService, ObjectNew: metadataChanged}))
	assert.True(t, p.Create(event.CreateEvent{Object: oldService}))
	assert.True(t, p.Delete(event.DeleteEvent{Object: oldService}))
	assert.True(t, p.Generic(event.GenericEvent{Object: oldService}))
}

func TestPodDisruptionBudgetChangedPredicate(t *testing.T) {
	p := podDisruptionBudgetChangedPredicate()
	oldPDB := &policyv1.PodDisruptionBudget{
		ObjectMeta: metav1.ObjectMeta{Name: "dashboard", Annotations: map[string]string{"owned": "true"}},
		Spec:       policyv1.PodDisruptionBudgetSpec{MinAvailable: intOrStringPtr(intstr.FromInt32(1))},
	}

	statusOnly := oldPDB.DeepCopy()
	statusOnly.Status.CurrentHealthy = 1
	assert.False(t, p.Update(event.UpdateEvent{ObjectOld: oldPDB, ObjectNew: statusOnly}))

	specChanged := oldPDB.DeepCopy()
	specChanged.Spec.MinAvailable = intOrStringPtr(intstr.FromInt32(2))
	assert.True(t, p.Update(event.UpdateEvent{ObjectOld: oldPDB, ObjectNew: specChanged}))

	metadataChanged := oldPDB.DeepCopy()
	metadataChanged.Annotations["changed"] = "true"
	assert.True(t, p.Update(event.UpdateEvent{ObjectOld: oldPDB, ObjectNew: metadataChanged}))
	assert.True(t, p.Create(event.CreateEvent{Object: oldPDB}))
	assert.True(t, p.Delete(event.DeleteEvent{Object: oldPDB}))
	assert.True(t, p.Generic(event.GenericEvent{Object: oldPDB}))
}

func intOrStringPtr(value intstr.IntOrString) *intstr.IntOrString {
	return &value
}

func TestAPIResourceAvailable(t *testing.T) {
	availableGVK := schema.GroupVersionKind{Group: "example.com", Version: "v1", Kind: "Available"}
	mapper := meta.NewDefaultRESTMapper([]schema.GroupVersion{availableGVK.GroupVersion()})
	mapper.Add(availableGVK, meta.RESTScopeNamespace)

	available, err := apiResourceAvailable(mapper, availableGVK)
	assert.NoError(t, err)
	assert.True(t, available)

	available, err = apiResourceAvailable(mapper, schema.GroupVersionKind{Group: "example.com", Version: "v1", Kind: "Unavailable"})
	assert.NoError(t, err)
	assert.False(t, available)
}

func TestOptionalOwnedResources(t *testing.T) {
	httpRouteGVK := gatewayv1.SchemeGroupVersion.WithKind("HTTPRoute")
	routeGVK := routev1.SchemeGroupVersion.WithKind("Route")
	mapper := meta.NewDefaultRESTMapper([]schema.GroupVersion{
		httpRouteGVK.GroupVersion(),
		routeGVK.GroupVersion(),
		consoleLinkGVK.GroupVersion(),
	})
	mapper.Add(httpRouteGVK, meta.RESTScopeNamespace)
	mapper.Add(routeGVK, meta.RESTScopeNamespace)
	mapper.Add(consoleLinkGVK, meta.RESTScopeRoot)

	resources, err := optionalOwnedResources(mapper)
	require.NoError(t, err)
	require.Len(t, resources, 3)
	assert.IsType(t, &gatewayv1.HTTPRoute{}, resources[0])
	assert.IsType(t, &routev1.Route{}, resources[1])
	assert.Equal(t, consoleLinkGVK, resources[2].GetObjectKind().GroupVersionKind())

	resources, err = optionalOwnedResources(meta.NewDefaultRESTMapper(nil))
	require.NoError(t, err)
	assert.Empty(t, resources)
}
