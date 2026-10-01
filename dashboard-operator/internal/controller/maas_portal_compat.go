package controller

import v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"

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
