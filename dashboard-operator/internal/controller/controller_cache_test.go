package controller

import (
	"reflect"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	policyv1 "k8s.io/api/policy/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	k8slabels "k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/controller-runtime/pkg/cache"
	"sigs.k8s.io/controller-runtime/pkg/client"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"

	platformlabels "github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"
)

func TestManagerCacheOptions(t *testing.T) {
	const applicationsNamespace = "applications"
	mapper := meta.NewDefaultRESTMapper([]schema.GroupVersion{
		gatewayv1.SchemeGroupVersion,
		consoleLinkGVK.GroupVersion(),
	})
	mapper.Add(gatewayv1.SchemeGroupVersion.WithKind("HTTPRoute"), meta.RESTScopeNamespace)
	mapper.Add(consoleLinkGVK, meta.RESTScopeRoot)
	options, err := ManagerCacheOptions(applicationsNamespace, mapper)
	require.NoError(t, err)
	assert.True(t, options.ReaderFailOnMissingInformer)

	for _, object := range []client.Object{
		&appsv1.Deployment{},
		&corev1.Service{},
		&corev1.ServiceAccount{},
		&policyv1.PodDisruptionBudget{},
		&gatewayv1.HTTPRoute{},
	} {
		configuration := requireCacheConfiguration(t, options.ByObject, object)
		assert.Equal(t, map[string]cache.Config{applicationsNamespace: {}}, configuration.Namespaces)
		assertOwnedSelector(t, configuration.Label)
	}

	for _, object := range []client.Object{
		&networkingv1.NetworkPolicy{},
		&rbacv1.Role{},
		&rbacv1.RoleBinding{},
		&rbacv1.ClusterRole{},
		&rbacv1.ClusterRoleBinding{},
	} {
		configuration := requireCacheConfiguration(t, options.ByObject, object)
		assert.Nil(t, configuration.Namespaces)
		assertOwnedSelector(t, configuration.Label)
	}

	consoleLinkConfiguration := requireCacheConfiguration(t, options.ByObject, newConsoleLinkObject())
	assert.Nil(t, consoleLinkConfiguration.Namespaces)
	assert.True(t, consoleLinkConfiguration.Label.Matches(k8slabels.Set{platformlabels.PlatformPartOf: "dashboard"}))
	assert.False(t, consoleLinkConfiguration.Label.Matches(k8slabels.Set{platformlabels.PlatformPartOf: maasPortalPartOf}))

	for object := range options.ByObject {
		assert.NotEqual(t, reflect.TypeOf(&corev1.ConfigMap{}), reflect.TypeOf(object))
		assert.NotEqual(t, reflect.TypeOf(&corev1.Secret{}), reflect.TypeOf(object))
	}
}

func TestManagerCacheOptionsWithoutOptionalAPIs(t *testing.T) {
	options, err := ManagerCacheOptions("applications", meta.NewDefaultRESTMapper(nil))
	require.NoError(t, err)
	assert.True(t, options.ReaderFailOnMissingInformer)
	for object := range options.ByObject {
		assert.NotEqual(t, reflect.TypeOf(&gatewayv1.HTTPRoute{}), reflect.TypeOf(object))
		_, unstructuredObject := object.(*unstructured.Unstructured)
		assert.False(t, unstructuredObject)
	}
}

func requireCacheConfiguration(t *testing.T, configurations map[client.Object]cache.ByObject, wanted client.Object) cache.ByObject {
	t.Helper()
	for object, configuration := range configurations {
		if reflect.TypeOf(object) != reflect.TypeOf(wanted) {
			continue
		}
		if _, ok := wanted.(*unstructured.Unstructured); ok && object.GetObjectKind().GroupVersionKind() != wanted.GetObjectKind().GroupVersionKind() {
			continue
		}
		return configuration
	}
	require.FailNowf(t, "cache configuration not found", "object type %T", wanted)
	return cache.ByObject{}
}

func assertOwnedSelector(t *testing.T, selector k8slabels.Selector) {
	t.Helper()
	assert.True(t, selector.Matches(k8slabels.Set{platformlabels.PlatformPartOf: "dashboard"}))
	assert.True(t, selector.Matches(k8slabels.Set{platformlabels.PlatformPartOf: maasPortalPartOf}))
	assert.False(t, selector.Matches(k8slabels.Set{platformlabels.PlatformPartOf: "other"}))
	assert.False(t, selector.Matches(k8slabels.Set{}))
}
