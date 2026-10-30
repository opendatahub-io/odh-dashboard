package controller

import (
	"github.com/opendatahub-io/odh-platform-utilities/pkg/controller/conditions"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

// Retained only to remove status written by earlier operator versions.
const legacyConditionMaaSConsumerPortalAvailable = "MaaSConsumerPortalAvailable"

// migrateMaaSPortalStatus preserves the legacy last-known-good URL and removes
// the retired availability condition. Call it before condition aggregation or
// any status-writing failure path, including core removal and unsupported platforms.
func migrateMaaSPortalStatus(dashboard *v1alpha1.Dashboard) {
	backfillMaaSPortalURL(&dashboard.Status)
	conditions.RemoveStatusCondition(dashboard, legacyConditionMaaSConsumerPortalAvailable)
}

// effectiveMaaSPortal returns the DSC-v3 spelling when present and falls back
// to the legacy spelling so existing Dashboard resources continue to work.
func effectiveMaaSPortal(spec v1alpha1.DashboardSpec) *v1alpha1.MaaSPortalSpec {
	if spec.MaaSPortal != nil {
		return spec.MaaSPortal
	}
	return spec.MaaSConsumerPortal
}

func setMaaSPortalURL(status *v1alpha1.DashboardStatus, url string) {
	status.MaaSPortalURL = url
	// Keep the legacy status field synchronized during the compatibility period.
	status.MaaSConsumerPortalURL = url
}

// backfillMaaSPortalURL preserves a legacy last-known-good URL while the
// controller is still reconciling the portal or waiting for it to become ready.
func backfillMaaSPortalURL(status *v1alpha1.DashboardStatus) {
	if status.MaaSPortalURL == "" && status.MaaSConsumerPortalURL != "" {
		status.MaaSPortalURL = status.MaaSConsumerPortalURL
	}
}
