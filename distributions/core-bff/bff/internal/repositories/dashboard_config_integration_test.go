package repositories

import (
	"context"
	"testing"

	"fmt"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	dynamicfake "k8s.io/client-go/dynamic/fake"
	k8stesting "k8s.io/client-go/testing"
)

func newFakeDynClientWithDashboardConfig(disableProjects bool) *dynamicfake.FakeDynamicClient {
	scheme := runtime.NewScheme()

	cr := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "opendatahub.io/v1alpha",
			"kind":       "OdhDashboardConfig",
			"metadata": map[string]interface{}{
				"name":      "odh-dashboard-config",
				"namespace": "test-ns",
			},
			"spec": map[string]interface{}{
				"dashboardConfig": map[string]interface{}{
					"disableProjects": disableProjects,
					"disableKServe":   true,
				},
			},
		},
	}

	return dynamicfake.NewSimpleDynamicClientWithCustomListKinds(
		scheme,
		map[schema.GroupVersionResource]string{
			models.DashboardConfigGVR: "OdhDashboardConfigList",
		},
		cr,
	)
}

func TestGetDashboardConfig_PrivilegedRead_ReturnsRealConfig(t *testing.T) {
	fakeDyn := newFakeDynClientWithDashboardConfig(true)
	repo := NewDashboardConfigRepository(false, fakeDyn)

	config, err := repo.GetDashboardConfig(context.Background(), "test-ns", "odh-dashboard-config", nil)
	require.NoError(t, err)
	require.NotNil(t, config)

	// The real CR has disableKServe=true, which differs from the default (false).
	// This proves the SA client reads the real config, not just defaults.
	assert.True(t, config.Spec.DashboardConfig.DisableKServe)

	// disableProjects=true from the CR is preserved
	assert.True(t, config.Spec.DashboardConfig.DisableProjects)

	// Defaults are merged in for fields not in the CR
	assert.True(t, config.Spec.DashboardConfig.Enablement)
}

func TestGetDashboardConfig_CRDAbsent_FallsBackToDefaults(t *testing.T) {
	scheme := runtime.NewScheme()
	emptyDyn := dynamicfake.NewSimpleDynamicClientWithCustomListKinds(
		scheme,
		map[schema.GroupVersionResource]string{
			models.DashboardConfigGVR: "OdhDashboardConfigList",
		},
	)
	emptyDyn.PrependReactor("get", "odhdashboardconfigs", func(action k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, fmt.Errorf("the server could not find the requested resource")
	})
	repo := NewDashboardConfigRepository(false, emptyDyn)

	config, err := repo.GetDashboardConfig(context.Background(), "test-ns", "odh-dashboard-config", nil)
	require.NoError(t, err)
	require.NotNil(t, config)

	// Falls back to BlankDashboardCR defaults
	assert.True(t, config.Spec.DashboardConfig.Enablement)
	assert.False(t, config.Spec.DashboardConfig.DisableKServe)
}

func TestGetDashboardConfig_AutoCreatesWhenInstanceMissing(t *testing.T) {
	// Fake client with the GVR registered but no CR instance - simulates "CRD exists but instance missing"
	scheme := runtime.NewScheme()
	fakeDyn := dynamicfake.NewSimpleDynamicClientWithCustomListKinds(
		scheme,
		map[schema.GroupVersionResource]string{
			models.DashboardConfigGVR: "OdhDashboardConfigList",
		},
	)
	repo := NewDashboardConfigRepository(false, fakeDyn)

	config, err := repo.GetDashboardConfig(context.Background(), "test-ns", "odh-dashboard-config", nil)
	require.NoError(t, err)
	require.NotNil(t, config)

	// Should get merged defaults since auto-create fallback returns defaults
	assert.True(t, config.Spec.DashboardConfig.Enablement)
	assert.Equal(t, "OdhDashboardConfig", config.Kind)

	// Verify the CR was actually persisted in the cluster
	persisted, getErr := fakeDyn.Resource(models.DashboardConfigGVR).Namespace("test-ns").Get(
		context.Background(), "odh-dashboard-config", metav1.GetOptions{},
	)
	require.NoError(t, getErr)
	require.NotNil(t, persisted)

	// Persisted CR is deliberately sparse (no spec.dashboardConfig).
	// Defaults are applied at read time via deepMerge, not persisted.
	spec, ok := persisted.Object["spec"].(map[string]interface{})
	require.True(t, ok, "persisted CR should have spec")

	_, hasDC := spec["dashboardConfig"]
	assert.False(t, hasDC, "persisted CR should NOT contain spec.dashboardConfig")

	nc, ok := spec["notebookController"].(map[string]interface{})
	require.True(t, ok, "persisted CR should have spec.notebookController")
	assert.Equal(t, true, nc["enabled"])

	gasc, ok := spec["genAiStudioConfig"].(map[string]interface{})
	require.True(t, ok, "persisted CR should have spec.genAiStudioConfig")
	endpoints, ok := gasc["aiAssetCustomEndpoints"].(map[string]interface{})
	require.True(t, ok, "genAiStudioConfig should have aiAssetCustomEndpoints")
	assert.Equal(t, false, endpoints["externalProviders"])
}

func TestGetDashboardConfig_IndependentCRDHandling(t *testing.T) {
	// DashboardConfig CRD present with a real CR
	fakeDyn := newFakeDynClientWithDashboardConfig(false)
	repo := NewDashboardConfigRepository(false, fakeDyn)

	// This should succeed even though Auth CRD and OdhApplication CRD are absent
	config, err := repo.GetDashboardConfig(context.Background(), "test-ns", "odh-dashboard-config", nil)
	require.NoError(t, err)
	require.NotNil(t, config)

	// Auth CRD absent should not affect config
	authRepo := NewAuthRepository(newFakeDynClientCRDAbsent())
	auth, err := authRepo.GetAuth(context.Background())
	require.NoError(t, err)
	assert.Nil(t, auth)

	// Components CRD absent should not affect config or auth
	emptyCompDyn := dynamicfake.NewSimpleDynamicClientWithCustomListKinds(
		runtime.NewScheme(),
		map[schema.GroupVersionResource]string{
			models.OdhApplicationGVR: "OdhApplicationList",
		},
	)
	compRepo := NewComponentsRepository(emptyCompDyn, nil)
	components, err := compRepo.ListComponents(context.Background(), "test-ns", false)
	require.NoError(t, err)
	assert.Empty(t, components)

	// All three operate independently - config got real data, auth and components degraded gracefully
	assert.NotNil(t, config)
}

func TestGetDashboardConfig_XKSPlatform_OverridesCRValues(t *testing.T) {
	// CR has disableProjects=false, but XKS platform should force it to true
	fakeDyn := newFakeDynClientWithDashboardConfig(false)
	repo := NewDashboardConfigRepository(true, fakeDyn)

	config, err := repo.GetDashboardConfig(context.Background(), "test-ns", "odh-dashboard-config", nil)
	require.NoError(t, err)
	require.NotNil(t, config)

	assert.True(t, config.Spec.DashboardConfig.DisableProjects)
	assert.True(t, config.Spec.DashboardConfig.DisableBYONImageStream)
}
