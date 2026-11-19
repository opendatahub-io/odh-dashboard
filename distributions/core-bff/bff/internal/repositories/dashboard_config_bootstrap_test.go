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

// A platform guessed after an inconclusive startup probe authorizes neither
// contract: it must not auto-create (that needs confirmed OpenShift) and must
// not silently treat reduced RBAC as the xKS steady state.
func TestGetDashboardConfig_UnconfirmedPlatformNeverWrites(t *testing.T) {
	t.Run("missing instance serves defaults without a write", func(t *testing.T) {
		fakeDyn := newDashboardConfigClientWithoutInstance()
		repo := newDashboardConfigRepository(config.PlatformXKS, false, fakeDyn)

		cfg, err := repo.GetDashboardConfig(context.Background(), "ns", "odh-dashboard-config", nil)
		require.NoError(t, err)
		require.NotNil(t, cfg)

		for _, action := range fakeDyn.Actions() {
			assert.NotContains(t, []string{"create", "update", "patch", "delete"}, action.GetVerb(),
				"an unconfirmed platform performed a write: %s", action.GetVerb())
		}
	})

	t.Run("forbidden read surfaces the error", func(t *testing.T) {
		c := newDashboardConfigClientWithoutInstance()
		c.PrependReactor("get", "odhdashboardconfigs", func(k8stesting.Action) (bool, runtime.Object, error) {
			return true, nil, k8serrors.NewForbidden(models.DashboardConfigGVR.GroupResource(), "odh-dashboard-config", assert.AnError)
		})
		repo := newDashboardConfigRepository(config.PlatformXKS, false, c)

		_, err := repo.GetDashboardConfig(context.Background(), "ns", "odh-dashboard-config", nil)
		require.Error(t, err)
	})
}

// A discovery-style 404 (no resource name) also satisfies IsNotFound. It must be
// classified as CRD absence, not as a missing instance that OpenShift would
// then try to create.
func TestGetDashboardConfig_DiscoveryNotFoundIsCRDAbsence(t *testing.T) {
	c := newDashboardConfigClientWithoutInstance()
	c.PrependReactor("get", "odhdashboardconfigs", func(k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, &k8serrors.StatusError{ErrStatus: metav1.Status{
			Status: metav1.StatusFailure, Code: 404, Reason: metav1.StatusReasonNotFound,
		}}
	})
	repo := NewDashboardConfigRepository(config.PlatformOpenShift, c)

	cfg, err := repo.GetDashboardConfig(context.Background(), "ns", "odh-dashboard-config", nil)
	require.NoError(t, err)
	require.NotNil(t, cfg)
	for _, action := range c.Actions() {
		assert.NotEqual(t, "create", action.GetVerb(), "CRD absence must not trigger auto-create")
	}
}
