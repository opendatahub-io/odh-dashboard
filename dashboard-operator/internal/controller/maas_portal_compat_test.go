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

func TestBackfillMaaSPortalURLFromLegacyStatus(t *testing.T) {
	tests := []struct {
		name         string
		canonicalURL string
		legacyURL    string
		expectedURL  string
	}{
		{name: "legacy URL is backfilled", legacyURL: "https://legacy.example.com/", expectedURL: "https://legacy.example.com/"},
		{name: "canonical URL wins", canonicalURL: "https://portal.example.com/", legacyURL: "https://legacy.example.com/", expectedURL: "https://portal.example.com/"},
		{name: "no URL remains empty", expectedURL: ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			status := &v1alpha1.DashboardStatus{
				MaaSPortalURL:         tt.canonicalURL,
				MaaSConsumerPortalURL: tt.legacyURL,
			}

			backfillMaaSPortalURL(status)

			require.Equal(t, tt.expectedURL, status.MaaSPortalURL)
		})
	}
}
