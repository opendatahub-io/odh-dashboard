package repositories

import (
	"context"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	dynamicfake "k8s.io/client-go/dynamic/fake"
)

func newFakeDynClientWithApps(apps ...*unstructured.Unstructured) *dynamicfake.FakeDynamicClient {
	scheme := runtime.NewScheme()
	objs := make([]runtime.Object, len(apps))
	for i, a := range apps {
		objs[i] = a
	}
	return dynamicfake.NewSimpleDynamicClientWithCustomListKinds(
		scheme,
		map[schema.GroupVersionResource]string{
			models.OdhApplicationGVR: "OdhApplicationList",
		},
		objs...,
	)
}

func odhApp(name string, shownOnEnabledPage bool) *unstructured.Unstructured {
	return &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "dashboard.opendatahub.io/v1",
			"kind":       "OdhApplication",
			"metadata": map[string]interface{}{
				"name":      name,
				"namespace": "test-ns",
			},
			"spec": map[string]interface{}{
				"shownOnEnabledPage": shownOnEnabledPage,
			},
		},
	}
}

func TestListComponents_InstalledOnly_FiltersCorrectly(t *testing.T) {
	fakeDyn := newFakeDynClientWithApps(
		odhApp("visible-app", true),
		odhApp("hidden-app", false),
	)
	repo := NewComponentsRepository(fakeDyn, nil)

	t.Run("installedOnly=true returns only shownOnEnabledPage apps", func(t *testing.T) {
		result, err := repo.ListComponents(context.Background(), "test-ns", true)
		require.NoError(t, err)
		assert.Len(t, result, 1)
		meta := result[0]["metadata"].(map[string]interface{})
		assert.Equal(t, "visible-app", meta["name"])
	})

	t.Run("installedOnly=false returns all apps", func(t *testing.T) {
		result, err := repo.ListComponents(context.Background(), "test-ns", false)
		require.NoError(t, err)
		assert.Len(t, result, 2)
	})
}
