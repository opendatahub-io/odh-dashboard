package repositories

import (
	"context"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	dynamicfake "k8s.io/client-go/dynamic/fake"
	k8stesting "k8s.io/client-go/testing"
)

func newDashboardConfigClientWithoutInstance() *dynamicfake.FakeDynamicClient {
	return dynamicfake.NewSimpleDynamicClientWithCustomListKinds(
		runtime.NewScheme(),
		map[schema.GroupVersionResource]string{models.DashboardConfigGVR: "OdhDashboardConfigList"},
	)
}

// AC (RHOAIENG-101219): bootstrap configuration reads are read-only. On xKS the
// OdhDashboardConfig CR is outside the selected profile, so a missing instance
// falls back to defaults instead of the dashboard provisioning it for the
// installation owner.
func TestGetDashboardConfig_XKSBootstrapIsReadOnly(t *testing.T) {
	fakeDyn := newDashboardConfigClientWithoutInstance()
	repo := NewDashboardConfigRepository(config.PlatformXKS, fakeDyn)

	cfg, err := repo.GetDashboardConfig(context.Background(), "rhaii", "odh-dashboard-config", nil)
	require.NoError(t, err)
	require.NotNil(t, cfg)
	assert.True(t, cfg.Spec.DashboardConfig.DisableProjects, "xKS defaults still apply")

	_, getErr := fakeDyn.Resource(models.DashboardConfigGVR).Namespace("rhaii").Get(
		context.Background(), "odh-dashboard-config", metav1.GetOptions{},
	)
	assert.True(t, k8serrors.IsNotFound(getErr), "xKS bootstrap must not create the CR")

	for _, action := range fakeDyn.Actions() {
		assert.NotContains(t, []string{"create", "update", "patch", "delete"}, action.GetVerb(),
			"xKS bootstrap performed a write: %s", action.GetVerb())
	}
}

// OpenShift keeps the RHOAI auto-create behaviour, so the existing deployment
// path is unchanged.
func TestGetDashboardConfig_OpenShiftStillProvisionsTheCR(t *testing.T) {
	fakeDyn := newDashboardConfigClientWithoutInstance()
	repo := NewDashboardConfigRepository(config.PlatformOpenShift, fakeDyn)

	_, err := repo.GetDashboardConfig(context.Background(), "test-ns", "odh-dashboard-config", nil)
	require.NoError(t, err)

	_, getErr := fakeDyn.Resource(models.DashboardConfigGVR).Namespace("test-ns").Get(
		context.Background(), "odh-dashboard-config", metav1.GetOptions{},
	)
	require.NoError(t, getErr)
}

// AC: reduced service-account RBAC must not lock out an authorized user. On xKS
// a forbidden read degrades to defaults; on OpenShift it stays an error so the
// misconfiguration is visible.
func TestGetDashboardConfig_ForbiddenReadBehaviourPerPlatform(t *testing.T) {
	forbidden := k8serrors.NewForbidden(
		models.DashboardConfigGVR.GroupResource(), "odh-dashboard-config", assert.AnError)

	newClient := func() *dynamicfake.FakeDynamicClient {
		c := newDashboardConfigClientWithoutInstance()
		c.PrependReactor("get", "odhdashboardconfigs", func(k8stesting.Action) (bool, runtime.Object, error) {
			return true, nil, forbidden
		})
		return c
	}

	t.Run("xKS degrades to defaults", func(t *testing.T) {
		repo := NewDashboardConfigRepository(config.PlatformXKS, newClient())

		cfg, err := repo.GetDashboardConfig(context.Background(), "rhaii", "odh-dashboard-config", nil)

		require.NoError(t, err)
		require.NotNil(t, cfg)
		assert.True(t, cfg.Spec.DashboardConfig.DisableProjects)
	})

	t.Run("OpenShift surfaces the error", func(t *testing.T) {
		repo := NewDashboardConfigRepository(config.PlatformOpenShift, newClient())

		_, err := repo.GetDashboardConfig(context.Background(), "test-ns", "odh-dashboard-config", nil)

		require.Error(t, err)
		assert.Contains(t, err.Error(), "failed to get dashboard config")
	})
}
