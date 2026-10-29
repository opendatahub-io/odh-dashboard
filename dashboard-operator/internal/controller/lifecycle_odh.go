package controller

import (
	"context"
	"fmt"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/controller/conditions"
	ctrl "sigs.k8s.io/controller-runtime"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

func (odhDashboardLifecycle) readyDependents() []string {
	return openShiftReadyDependents()
}

func (odhDashboardLifecycle) availabilityTarget() dashboardAvailabilityTarget {
	return dashboardAvailabilityTarget{deploymentName: odhDashboardResourceName, httpRouteName: odhDashboardResourceName}
}

func (l odhDashboardLifecycle) Reconcile(ctx context.Context, dashboard *v1alpha1.Dashboard, cm *conditions.Manager, cfg OperatorConfig) (ctrl.Result, error) {
	r := l.reconciler
	observabilityConfigErr := r.resolveObservabilityConfiguration(ctx, dashboard, cm)
	observabilityConfigResolved := observabilityConfigErr == nil
	l.reportUnsupportedMaaSPortalRequest(dashboard, cm)
	coreManifest := openShiftManifestInfo(r.ManifestsBasePath, r.Platform)
	observabilityManifest := openShiftObservabilityManifestInfo(r.ManifestsBasePath, r.Platform)
	if err := r.reconcileOpenShiftCore(ctx, dashboard, cm, coreManifest); err != nil {
		return ctrl.Result{}, err
	}
	features, err := r.reconcileOpenShiftFeatures(ctx, dashboard, cm, observabilityConfigResolved, observabilityManifest)
	if err != nil {
		return ctrl.Result{}, err
	}
	return r.completeOpenShiftReconcile(ctx, dashboard, cm, cfg, features, 0, l.availabilityTarget())
}

func (l odhDashboardLifecycle) Remove(ctx context.Context, dashboard *v1alpha1.Dashboard, previousStatus *v1alpha1.DashboardStatus, cm *conditions.Manager) (ctrl.Result, error) {
	r := l.reconciler
	l.reportUnsupportedMaaSPortalRequest(dashboard, cm)
	// Preserve the resolved module statuses during soft removal. Consumers use
	// them to distinguish operands that were intentionally removed from ones
	// that failed to deploy.
	statuses, err := r.reconcileModuleResources(ctx, dashboard)
	if err != nil {
		r.persistRemovedFailureStatus(ctx, dashboard, previousStatus, cm, "ModuleDeployFailed", err)
		return ctrl.Result{}, fmt.Errorf("failed to reconcile ODH module resources: %w", err)
	}
	preserveModuleStatusTransitionTimes(dashboard.Status.ModuleStatuses, statuses)
	dashboard.Status.ModuleStatuses = statuses

	teardown, err := r.teardownManagedResources(ctx, dashboard, statuses, false, true)
	if err != nil {
		r.persistRemovedFailureStatus(ctx, dashboard, previousStatus, cm, "TeardownFailed", err)
		return ctrl.Result{}, fmt.Errorf("failed to tear down ODH dashboard resources: %w", err)
	}
	if teardown.Pending {
		if err := r.persistDashboardRemovalPendingStatus(ctx, dashboard, previousStatus, cm); err != nil {
			return ctrl.Result{}, fmt.Errorf("failed to update removal-in-progress status: %w", err)
		}
		return ctrl.Result{RequeueAfter: teardownRetryInterval}, nil
	}

	cm.MarkFalse(string(common.ConditionTypeProvisioningSucceeded), conditions.WithReason(conditionReasonRemoved), conditions.WithMessage("Dashboard has been removed via managementState"), conditions.WithSeverity(common.ConditionSeverityInfo))
	cm.MarkFalse(string(common.ConditionTypeDegraded), conditions.WithReason(conditionReasonRemoved), conditions.WithMessage("Dashboard has been removed"), conditions.WithSeverity(common.ConditionSeverityInfo))
	cm.MarkFalse(conditionDashboardAvailable, conditions.WithReason(conditionReasonRemoved), conditions.WithMessage("Dashboard has been removed"), conditions.WithSeverity(common.ConditionSeverityInfo))
	cm.MarkFalse(conditionObservabilityAvailable, conditions.WithReason(conditionReasonRemoved), conditions.WithMessage("Dashboard has been removed"), conditions.WithSeverity(common.ConditionSeverityInfo))
	cm.MarkFalse(string(common.ConditionTypeReady), conditions.WithReason(conditionReasonRemoved), conditions.WithMessage("Dashboard has been removed via managementState"))
	if cm.IsHappy() {
		dashboard.Status.Phase = common.PhaseReady
	} else {
		dashboard.Status.Phase = common.PhaseNotReady
	}
	if err := l.reconciler.persistDashboardRemovalStatus(ctx, dashboard, previousStatus, cm); err != nil {
		return ctrl.Result{}, fmt.Errorf("failed to update removal status: %w", err)
	}
	return ctrl.Result{}, nil
}

// reportUnsupportedMaaSPortalRequest preserves the projected-CR validation
// contract without granting ODH ownership of MaaS Portal resources.
func (l odhDashboardLifecycle) reportUnsupportedMaaSPortalRequest(dashboard *v1alpha1.Dashboard, cm *conditions.Manager) bool {
	portal := effectiveMaaSPortal(dashboard.Spec)
	if portal == nil || portal.ManagementState != "Managed" {
		cm.ClearCondition(conditionMaaSPortalAvailable)
		return false
	}
	markMaaSPortalUnsupported(dashboard, cm)
	return true
}

func (l odhDashboardLifecycle) Finalize(ctx context.Context, dashboard *v1alpha1.Dashboard) (ctrl.Result, error) {
	if err := l.reconciler.cleanupCrossNamespaceResources(ctx, dashboard, false); err != nil {
		return ctrl.Result{}, fmt.Errorf("failed to cleanup ODH cross-namespace resources: %w", err)
	}
	return ctrl.Result{}, nil
}
