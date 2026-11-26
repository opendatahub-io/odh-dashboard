package repositories

import (
	"context"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime"
	k8stesting "k8s.io/client-go/testing"
)

// A 405 means the API server rejected the method, not that the API is absent,
// so the bootstrap reads must surface it instead of serving defaults or [].
// The Auth and ClusterVersion reads already follow this rule.

func TestGetDashboardConfig_MethodNotSupportedIsAnError(t *testing.T) {
	for _, platform := range []config.PlatformType{config.PlatformXKS, config.PlatformOpenShift} {
		t.Run(string(platform), func(t *testing.T) {
			fakeDyn := newDashboardConfigClientWithoutInstance()
			fakeDyn.PrependReactor("get", models.DashboardConfigGVR.Resource, func(k8stesting.Action) (bool, runtime.Object, error) {
				return true, nil, k8serrors.NewMethodNotSupported(models.DashboardConfigGVR.GroupResource(), "get")
			})
			repo := NewDashboardConfigRepository(platform, fakeDyn)

			cfg, err := repo.GetDashboardConfig(context.Background(), "rhaii", "odh-dashboard-config", nil)

			require.Error(t, err)
			assert.Nil(t, cfg, "a rejected method must not become the default configuration")
			assert.True(t, k8serrors.IsMethodNotSupported(err), "the upstream status is preserved")
			for _, action := range fakeDyn.Actions() {
				assert.NotEqual(t, "create", action.GetVerb(), "an ambiguous read must not provision the CR")
			}
		})
	}
}

func TestListComponents_MethodNotSupportedIsAnError(t *testing.T) {
	fakeDyn := newFakeDynClientWithApps()
	fakeDyn.PrependReactor("list", models.OdhApplicationGVR.Resource, func(k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, k8serrors.NewMethodNotSupported(models.OdhApplicationGVR.GroupResource(), "list")
	})
	repo := NewComponentsRepository(fakeDyn, nil)

	components, err := repo.ListComponents(context.Background(), "rhaii", false)

	require.Error(t, err)
	assert.Nil(t, components, "a rejected method must not become an empty component list")
	assert.True(t, k8serrors.IsMethodNotSupported(err))
}
