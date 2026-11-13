package controller

import (
	"context"
	"time"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/controller/conditions"
	"sigs.k8s.io/controller-runtime/pkg/log"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

const observabilityRetryInterval = 5 * time.Minute

// resolveObservabilityConfiguration resolves the effective observability
// configuration, using the temporary Perses configuration projection when the
// CR has no explicit configuration. XKS has no observability operand and does
// not call this helper.
func (r *DashboardReconciler) resolveObservabilityConfiguration(ctx context.Context, dashboard *v1alpha1.Dashboard, cm *conditions.Manager) error {
	if err := r.autoDetectObservability(ctx, dashboard); err != nil {
		severity := common.ConditionSeverityInfo
		if dashboard.Spec.ManagementState == common.Removed {
			severity = common.ConditionSeverityError
		}
		cm.MarkFalse(conditionObservabilityAvailable,
			conditions.WithError(err),
			conditions.WithReason("DetectionFailed"),
			conditions.WithSeverity(severity))
		log.FromContext(ctx).Error(err, "Failed to auto-detect observability, preserving its resources and Perses federation entry")
		return err
	}
	return nil
}
