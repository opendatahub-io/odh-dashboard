package v1alpha1_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

// Compile-time assertion: Dashboard must implement PlatformObject.
var _ common.PlatformObject = &v1alpha1.Dashboard{}

func TestDashboard_GetStatus(t *testing.T) {
	d := &v1alpha1.Dashboard{}
	d.Status.Phase = common.PhaseReady

	s := d.GetStatus()
	require.NotNil(t, s)
	assert.Equal(t, common.PhaseReady, s.Phase)

	s.Phase = common.PhaseNotReady
	assert.Equal(t, common.PhaseNotReady, d.Status.Phase, "GetStatus must return a pointer to the actual status")
}

func TestDashboard_GetSetConditions(t *testing.T) {
	d := &v1alpha1.Dashboard{}
	assert.Empty(t, d.GetConditions())

	conds := []common.Condition{
		{
			Type:   string(common.ConditionTypeReady),
			Status: metav1.ConditionTrue,
			Reason: "AllGood",
		},
		{
			Type:   string(common.ConditionTypeProvisioningSucceeded),
			Status: metav1.ConditionTrue,
			Reason: "Applied",
		},
	}

	d.SetConditions(conds)
	got := d.GetConditions()
	require.Len(t, got, 2)
	assert.Equal(t, string(common.ConditionTypeReady), got[0].Type)
	assert.Equal(t, metav1.ConditionTrue, got[0].Status)
}

func TestDashboard_GetSetReleaseStatus(t *testing.T) {
	d := &v1alpha1.Dashboard{}
	assert.Empty(t, d.GetReleaseStatus().Releases)

	rs := common.ComponentReleaseStatus{
		Releases: []common.ComponentRelease{
			{Name: "dashboard", Version: "1.0.0"},
		},
	}

	d.SetReleaseStatus(rs)
	got := d.GetReleaseStatus()
	require.Len(t, got.Releases, 1)
	assert.Equal(t, "dashboard", got.Releases[0].Name)
	assert.Equal(t, "1.0.0", got.Releases[0].Version)
}

func TestDashboard_Constants(t *testing.T) {
	assert.Equal(t, "default-dashboard", v1alpha1.DashboardInstanceName)
	assert.Equal(t, "Dashboard", v1alpha1.DashboardKind)
	assert.Equal(t, "dashboard", v1alpha1.DashboardComponentName)
}
