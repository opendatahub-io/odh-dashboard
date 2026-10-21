package controller

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/runtime/schema"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"
)

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
	mapper := meta.NewDefaultRESTMapper([]schema.GroupVersion{
		httpRouteGVK.GroupVersion(),
		consoleLinkGVK.GroupVersion(),
	})
	mapper.Add(httpRouteGVK, meta.RESTScopeNamespace)
	mapper.Add(consoleLinkGVK, meta.RESTScopeRoot)

	resources, err := optionalOwnedResources(mapper)
	require.NoError(t, err)
	require.Len(t, resources, 2)
	assert.IsType(t, &gatewayv1.HTTPRoute{}, resources[0])
	assert.Equal(t, consoleLinkGVK, resources[1].GetObjectKind().GroupVersionKind())

	resources, err = optionalOwnedResources(meta.NewDefaultRESTMapper(nil))
	require.NoError(t, err)
	assert.Empty(t, resources)
}
