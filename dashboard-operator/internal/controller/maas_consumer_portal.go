package controller

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/controller/conditions"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

const conditionMaasConsumerPortalAvailable = "MaasConsumerPortalAvailable"

// maasConsumerPortalUnavailable reports whether an earlier reconciliation step
// has already recorded the primary reason the portal is unavailable.
func maasConsumerPortalUnavailable(cm *conditions.Manager) bool {
	condition := cm.GetCondition(conditionMaasConsumerPortalAvailable)
	return condition != nil && condition.Status == metav1.ConditionFalse
}

// setMaasConsumerPortalModuleCondition makes missing MaaS Consumer Portal dependencies
// actionable without coupling shared-module logic to a URL model.
func (r *DashboardReconciler) setMaasConsumerPortalModuleCondition(
	cm *conditions.Manager,
	dashboard *v1alpha1.Dashboard,
	statuses map[string]v1alpha1.ModuleStatus,
) {
	if dashboard.Spec.MaasConsumerPortal == nil || dashboard.Spec.MaasConsumerPortal.ManagementState != "Managed" {
		return
	}
	if maasConsumerPortalUnavailable(cm) {
		return
	}
	for _, name := range maasConsumerPortalRequiredModuleNames() {
		status := statuses[name]
		if status.Phase == v1alpha1.ModulePhaseDeployed {
			continue
		}
		cm.MarkFalse(conditionMaasConsumerPortalAvailable,
			conditions.WithReason("RequiredModuleUnavailable"),
			conditions.WithMessage("Required module %q is unavailable: %s", name, status.Message),
			conditions.WithSeverity(common.ConditionSeverityInfo))
		return
	}
}

func (r *DashboardReconciler) markMaasConsumerPortalFederationConfigMapFailed(cm *conditions.Manager, err error) {
	if maasConsumerPortalUnavailable(cm) {
		return
	}
	cm.MarkFalse(conditionMaasConsumerPortalAvailable,
		conditions.WithReason("MaasConsumerPortalFederationConfigMapFailed"),
		conditions.WithMessage("MaaS Consumer Portal federation ConfigMap reconciliation failed: %s", err),
		conditions.WithSeverity(common.ConditionSeverityInfo))
}
