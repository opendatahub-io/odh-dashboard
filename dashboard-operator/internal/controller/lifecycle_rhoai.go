package controller

import (
	"context"
	"fmt"
	"time"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/controller/conditions"
	ctrl "sigs.k8s.io/controller-runtime"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

func (rhoaiDashboardLifecycle) readyDependents() []string {
	return openShiftReadyDependents()
}

func (l rhoaiDashboardLifecycle) Reconcile(ctx context.Context, dashboard *v1alpha1.Dashboard, cm *conditions.Manager, cfg OperatorConfig) (ctrl.Result, error) {
	r := l.reconciler
	observabilityConfigErr := r.resolveObservabilityConfiguration(ctx, dashboard, cm)
	observabilityConfigResolved := observabilityConfigErr == nil
	// MaaS Portal reconciliation below establishes its current condition.
	cm.ClearCondition(conditionMaaSPortalAvailable)
	coreManifest := openShiftManifestInfo(r.ManifestsBasePath, r.Platform)
	observabilityManifest := openShiftObservabilityManifestInfo(r.ManifestsBasePath, r.Platform)
	if err := r.reconcileOpenShiftCore(ctx, dashboard, cm, coreManifest); err != nil {
		return ctrl.Result{}, err
	}
	configRetryAfter, err := r.reconcileSelfManagedRHOAIDashboardConfigDefaults(ctx)
	if err != nil {
		cm.MarkFalse(string(common.ConditionTypeProvisioningSucceeded), conditions.WithReason("DashboardConfigDefaultFailed"), conditions.WithError(err))
		return ctrl.Result{}, fmt.Errorf("failed to reconcile RHOAI dashboard config defaults: %w", err)
	}
	features, err := r.reconcileOpenShiftFeatures(ctx, dashboard, cm, observabilityConfigResolved, observabilityManifest)
	if err != nil {
		return ctrl.Result{}, err
	}
	r.setMaaSPortalModuleCondition(cm, dashboard, features.statuses)
	portalRetryAfter := r.reconcileMaaSPortalOperand(ctx, dashboard, cm, features.statuses, observabilityConfigResolved)
	return r.completeOpenShiftReconcile(ctx, dashboard, cm, cfg, features, minNonZeroDuration(portalRetryAfter, configRetryAfter))
}

func (l rhoaiDashboardLifecycle) Remove(ctx context.Context, dashboard *v1alpha1.Dashboard, previousStatus *v1alpha1.DashboardStatus, cm *conditions.Manager) (ctrl.Result, error) {
	r := l.reconciler
	portalManaged := r.maasPortalManaged(dashboard)
	// A managed MaaS Portal can retain observability resources after core
	// dashboard removal. Resolve its configuration before deciding whether to
	// preserve those resources and the existing Perses federation entry.
	var observabilityConfigErr error
	if portalManaged {
		observabilityConfigErr = r.resolveObservabilityConfiguration(ctx, dashboard, cm)
	}
	observabilityConfigResolved := observabilityConfigErr == nil
	// MaaS Portal reconciliation below establishes its current condition.
	cm.ClearCondition(conditionMaaSPortalAvailable)

	statuses, err := r.reconcileModuleResources(ctx, dashboard)
	if err != nil {
		r.persistRemovedFailureStatus(ctx, dashboard, previousStatus, cm, "ModuleDeployFailed", err)
		return ctrl.Result{}, fmt.Errorf("failed to reconcile MaaS Portal-required modules: %w", err)
	}
	preserveModuleStatusTransitionTimes(dashboard.Status.ModuleStatuses, statuses)
	dashboard.Status.ModuleStatuses = statuses
	r.setMaaSPortalModuleCondition(cm, dashboard, statuses)

	var observabilityRetryAfter time.Duration
	if observabilityConfigErr != nil {
		observabilityRetryAfter = observabilityRetryInterval
	} else if portalManaged {
		observabilityRetryAfter = r.reconcileObservability(ctx, dashboard, cm, openShiftObservabilityManifestInfo(r.ManifestsBasePath, r.Platform))
	}
	portalRetryAfter := r.reconcileMaaSPortalOperand(ctx, dashboard, cm, statuses, observabilityConfigResolved)
	portalRetryAfter = minNonZeroDuration(portalRetryAfter, observabilityRetryAfter)

	preserveObservability := portalManaged && (!observabilityConfigResolved || (dashboard.Spec.Observability != nil && dashboard.Spec.Observability.Enabled))
	if err := r.teardownManagedResources(ctx, dashboard, statuses, preserveObservability); err != nil {
		r.persistRemovedFailureStatus(ctx, dashboard, previousStatus, cm, "TeardownFailed", err)
		return ctrl.Result{}, fmt.Errorf("failed to tear down RHOAI dashboard resources: %w", err)
	}

	cm.MarkFalse(string(common.ConditionTypeProvisioningSucceeded), conditions.WithReason("Removed"), conditions.WithMessage("Dashboard has been removed via managementState"), conditions.WithSeverity(common.ConditionSeverityInfo))
	cm.MarkFalse(string(common.ConditionTypeDegraded), conditions.WithReason("Removed"), conditions.WithMessage("Dashboard has been removed"), conditions.WithSeverity(common.ConditionSeverityInfo))
	if !portalManaged {
		cm.MarkFalse(conditionObservabilityAvailable, conditions.WithReason("Removed"), conditions.WithMessage("Dashboard has been removed"), conditions.WithSeverity(common.ConditionSeverityInfo))
	}
	portal := effectiveMaaSPortal(dashboard.Spec)
	if portal == nil || portal.ManagementState != "Managed" {
		cm.MarkFalse(string(common.ConditionTypeReady), conditions.WithReason("Removed"), conditions.WithMessage("Dashboard has been removed via managementState"))
	}
	if cm.IsHappy() {
		dashboard.Status.Phase = common.PhaseReady
	} else {
		dashboard.Status.Phase = common.PhaseNotReady
	}
	if portalManaged && dashboard.Spec.Observability == nil && portalRetryAfter == 0 {
		portalRetryAfter = observabilityRetryInterval
	}
	if err := r.persistDashboardRemovalStatus(ctx, dashboard, previousStatus, cm); err != nil {
		return ctrl.Result{}, fmt.Errorf("failed to update status after RHOAI removal: %w", err)
	}
	return ctrl.Result{RequeueAfter: portalRetryAfter}, nil
}

func (l rhoaiDashboardLifecycle) Finalize(ctx context.Context, dashboard *v1alpha1.Dashboard) (ctrl.Result, error) {
	cleanup, err := l.reconciler.deleteMaaSPortalResources(ctx)
	if err != nil {
		return ctrl.Result{}, fmt.Errorf("failed to cleanup MaaS Portal resources: %w", err)
	}
	if cleanup.Pending {
		return ctrl.Result{RequeueAfter: maasPortalRetryInterval}, nil
	}
	if err := l.reconciler.cleanupCrossNamespaceResources(ctx, dashboard, false); err != nil {
		return ctrl.Result{}, fmt.Errorf("failed to cleanup RHOAI cross-namespace resources: %w", err)
	}
	return ctrl.Result{}, nil
}
