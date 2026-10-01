package controller

import (
	"testing"

	"github.com/stretchr/testify/require"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

func TestEffectiveMaaSPortal(t *testing.T) {
	legacy := &v1alpha1.MaaSPortalSpec{ManagementState: "Managed"}
	current := &v1alpha1.MaaSPortalSpec{ManagementState: "Removed"}

	require.Equal(t, legacy, effectiveMaaSPortal(v1alpha1.DashboardSpec{MaaSConsumerPortal: legacy}))
	require.Equal(t, current, effectiveMaaSPortal(v1alpha1.DashboardSpec{
		MaaSPortal:         current,
		MaaSConsumerPortal: legacy,
	}))
}

func TestSetMaaSPortalURLKeepsLegacyStatusSynchronized(t *testing.T) {
	status := &v1alpha1.DashboardStatus{}
	setMaaSPortalURL(status, "https://portal.example.com/")

	require.Equal(t, "https://portal.example.com/", status.MaaSPortalURL)
	require.Equal(t, status.MaaSPortalURL, status.MaaSConsumerPortalURL)
}
