package controller

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/controller/conditions"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/deploy"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/render"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/render/kustomize"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

// cleanupLegacyResources removes resources that are no longer rendered by the
// current manifests. It is kept for upgrade safety and is idempotent.
func (r *DashboardReconciler) cleanupLegacyResources(ctx context.Context) error {
	logger := log.FromContext(ctx)
	ns := r.ApplicationsNamespace
	var errs []error

	type namedResource struct {
		obj  client.Object
		name string
	}
	namespacedResources := []namedResource{
		{&corev1.ServiceAccount{}, "odh-dashboard-modules"},
		{&corev1.Secret{}, "odh-dashboard-modules-token"},
		{&networkingv1.NetworkPolicy{}, "odh-dashboard-allow-ports"},
		{&corev1.ConfigMap{}, "sidecar-params"},
	}
	for _, nr := range namespacedResources {
		nr.obj.SetName(nr.name)
		nr.obj.SetNamespace(ns)
		if err := r.Delete(ctx, nr.obj); client.IgnoreNotFound(err) != nil {
			errs = append(errs, fmt.Errorf("deleting %T %s: %w", nr.obj, nr.name, err))
		}
	}

	clusterResources := []namedResource{
		{&rbacv1.ClusterRole{}, "odh-dashboard-modules"},
		{&rbacv1.ClusterRoleBinding{}, "odh-dashboard-modules"},
		{&rbacv1.ClusterRoleBinding{}, "odh-dashboard-monitoring"},
		{&rbacv1.ClusterRoleBinding{}, "rhods-dashboard-monitoring"},
	}
	for _, nr := range clusterResources {
		nr.obj.SetName(nr.name)
		if err := r.Delete(ctx, nr.obj); client.IgnoreNotFound(err) != nil {
			errs = append(errs, fmt.Errorf("deleting %T %s: %w", nr.obj, nr.name, err))
		}
	}
	if len(errs) == 0 {
		logger.Info("Cleaned up legacy resources")
	}
	return errors.Join(errs...)
}

// reconcileOpenShiftCore applies only the dashboard's core manifest overlay.
// Feature operands are composed by the ODH and RHOAI lifecycles afterwards.
func (r *DashboardReconciler) reconcileOpenShiftCore(ctx context.Context, dashboard *v1alpha1.Dashboard, cm *conditions.Manager, manifest render.ManifestInfo) error {
	if err := r.cleanupLegacyResources(ctx); err != nil {
		cm.MarkFalse(string(common.ConditionTypeProvisioningSucceeded), conditions.WithReason("LegacyCleanupFailed"), conditions.WithError(err))
		return fmt.Errorf("failed to clean up legacy resources: %w", err)
	}

	manifests := []render.ManifestInfo{manifest}
	if err := applyKustomizeParams(dashboard, manifests, r.Platform); err != nil {
		cm.MarkFalse(string(common.ConditionTypeProvisioningSucceeded), conditions.WithReason("KustomizeParamsFailed"), conditions.WithError(err))
		return fmt.Errorf("failed to apply kustomize params: %w", err)
	}

	engine := kustomize.NewEngine()
	var allResources []unstructured.Unstructured
	for _, m := range manifests {
		rendered, err := engine.Render(m.String(), kustomize.WithNamespace(r.ApplicationsNamespace))
		if err != nil {
			cm.MarkFalse(string(common.ConditionTypeProvisioningSucceeded), conditions.WithReason("RenderFailed"), conditions.WithError(err))
			return fmt.Errorf("failed to render manifests from %s: %w", m, err)
		}
		allResources = append(allResources, rendered...)
	}

	remapRayDashboardGatewayRBAC(allResources)
	remapDataConnectHubGatewayRBAC(allResources, r.ApplicationsNamespace)
	if err := sanitizeDeploymentProbes(ctx, r.Client, allResources); err != nil {
		cm.MarkFalse(string(common.ConditionTypeProvisioningSucceeded), conditions.WithReason("ProbeSanitizeFailed"), conditions.WithError(err))
		return fmt.Errorf("failed to sanitize deployment probes: %w", err)
	}
	if err := removeStaleContainers(ctx, r.Client, allResources); err != nil {
		cm.MarkFalse(string(common.ConditionTypeProvisioningSucceeded), conditions.WithReason("StaleContainerRemovalFailed"), conditions.WithError(err))
		return fmt.Errorf("failed to remove stale containers: %w", err)
	}

	deployer := deploy.NewDeployer(
		deploy.WithFieldOwner(dashboardFieldOwner),
		deploy.WithLabel(labels.PlatformPartOf, strings.ToLower(v1alpha1.DashboardKind)),
		deploy.WithApplyOrder(),
		deploy.WithMergeStrategy(deploymentGVK, deploy.MergeDeployments),
	)
	if err := deployer.Deploy(ctx, deploy.DeployInput{Client: r.Client, Owner: dashboard, Release: deploy.ReleaseInfo{Type: string(r.Platform)}, Resources: allResources}); err != nil {
		cm.MarkFalse(string(common.ConditionTypeProvisioningSucceeded), conditions.WithReason("DeployFailed"), conditions.WithError(err))
		return fmt.Errorf("failed to deploy resources: %w", err)
	}
	return nil
}

type openShiftFeatureState struct {
	statuses                map[string]v1alpha1.ModuleStatus
	federationData          string
	rbacErr                 error
	observabilityRetryAfter time.Duration
}

// reconcileOpenShiftFeatures reconciles features shared by the ODH and RHOAI
// core dashboard. MaaS Consumer Portal is intentionally absent: it is a
// RHOAI lifecycle operand.
func (r *DashboardReconciler) reconcileOpenShiftFeatures(ctx context.Context, dashboard *v1alpha1.Dashboard, cm *conditions.Manager, observabilityConfigResolved bool, observabilityManifest render.ManifestInfo) (openShiftFeatureState, error) {
	logger := log.FromContext(ctx)
	statuses, err := r.reconcileModuleResources(ctx, dashboard)
	if err != nil {
		cm.MarkFalse(string(common.ConditionTypeProvisioningSucceeded), conditions.WithReason("ModuleDeployFailed"), conditions.WithError(err))
		return openShiftFeatureState{}, fmt.Errorf("failed to deploy module manifests: %w", err)
	}
	cm.MarkTrue(string(common.ConditionTypeProvisioningSucceeded), conditions.WithReason("ResourcesApplied"), conditions.WithMessage("Dashboard and module manifests applied successfully"))
	preserveModuleStatusTransitionTimes(dashboard.Status.ModuleStatuses, statuses)
	dashboard.Status.ModuleStatuses = statuses

	state := openShiftFeatureState{statuses: statuses, observabilityRetryAfter: observabilityRetryInterval}
	state.rbacErr = r.reconcileNamespacedRBAC(ctx, dashboard)
	if state.rbacErr != nil {
		logger.Error(state.rbacErr, "Failed to reconcile namespaced RBAC")
		cm.MarkTrue(string(common.ConditionTypeDegraded), conditions.WithReason("NamespacedRBACFailed"), conditions.WithError(state.rbacErr))
	}
	if observabilityConfigResolved {
		state.observabilityRetryAfter = r.reconcileObservability(ctx, dashboard, cm, observabilityManifest)
	}
	state.federationData, err = r.deployFederationConfigMap(ctx, statuses, dashboard, observabilityConfigResolved)
	if err != nil {
		cm.MarkTrue(string(common.ConditionTypeDegraded), conditions.WithReason("FederationConfigMapFailed"), conditions.WithError(err))
		logger.Error(err, "Failed to deploy federation ConfigMap")
		return openShiftFeatureState{}, fmt.Errorf("federation ConfigMap: %w", err)
	}
	return state, nil
}

func (r *DashboardReconciler) completeOpenShiftReconcile(ctx context.Context, dashboard *v1alpha1.Dashboard, cm *conditions.Manager, cfg OperatorConfig, state openShiftFeatureState, extraRetryAfter time.Duration, availabilityTarget dashboardAvailabilityTarget) (ctrl.Result, error) {
	logger := log.FromContext(ctx)
	if err := r.patchDeploymentFederationHash(ctx, state.federationData); err != nil {
		logger.Error(err, "Failed to patch federation hash on deployment")
		return ctrl.Result{}, fmt.Errorf("patching federation hash: %w", err)
	}

	url := r.reconcileURL(ctx, dashboard, cm)
	availabilityRetryAfter, err := r.reconcileDashboardAvailability(ctx, dashboard, cm, availabilityTarget)
	if err != nil {
		return ctrl.Result{}, err
	}
	r.reconcileDegradedCondition(cm, state.statuses)
	if state.rbacErr != nil {
		cm.MarkTrue(string(common.ConditionTypeDegraded), conditions.WithReason("NamespacedRBACFailed"), conditions.WithError(state.rbacErr))
	}
	requeueAfter := minNonZeroDuration(cfg.ReconcileInterval, availabilityRetryAfter, extraRetryAfter, state.observabilityRetryAfter)
	if dashboard.Spec.Observability == nil && requeueAfter == 0 {
		requeueAfter = observabilityRetryInterval
	}
	if requeueAfter > 0 {
		logger.Info("Dashboard reconcile cycle complete, requeuing", "requeueAfter", requeueAfter)
	} else {
		logger.Info("Dashboard reconciled successfully", "url", url, "modules", len(dashboard.Status.ModuleStatuses))
	}
	return ctrl.Result{RequeueAfter: requeueAfter}, nil
}

// persistDashboardRemovalStatus applies status bookkeeping common to every
// dashboard removal lifecycle. Each lifecycle owns the conditions, phase, and
// retained operands it sets before calling this helper.
func (r *DashboardReconciler) persistDashboardRemovalStatus(ctx context.Context, dashboard *v1alpha1.Dashboard, previousStatus *v1alpha1.DashboardStatus, cm *conditions.Manager) error {
	dashboard.Status.ObservedGeneration = dashboard.Generation
	dashboard.Status.URL = ""
	dashboard.Status.Distribution = nil
	cm.Sort()
	return r.updateStatusIfChanged(ctx, dashboard, previousStatus)
}

// persistDashboardRemovalPendingStatus reports that ingress has been removed
// and waits for managed workloads to terminate before their NetworkPolicies can
// be safely deleted. Lifecycle-specific retained operand conditions are left
// intact so their current health remains visible during the requeue.
func (r *DashboardReconciler) persistDashboardRemovalPendingStatus(ctx context.Context, dashboard *v1alpha1.Dashboard, previousStatus *v1alpha1.DashboardStatus, cm *conditions.Manager) error {
	const message = "Dashboard removal is in progress; waiting for managed workloads to terminate"
	cm.MarkFalse(string(common.ConditionTypeProvisioningSucceeded), conditions.WithReason("RemovalInProgress"), conditions.WithMessage(message), conditions.WithSeverity(common.ConditionSeverityInfo))
	cm.MarkFalse(string(common.ConditionTypeDegraded), conditions.WithReason("RemovalInProgress"), conditions.WithMessage(message), conditions.WithSeverity(common.ConditionSeverityInfo))
	cm.MarkFalse(conditionDashboardAvailable, conditions.WithReason("RemovalInProgress"), conditions.WithMessage(message), conditions.WithSeverity(common.ConditionSeverityInfo))
	cm.MarkFalse(string(common.ConditionTypeReady), conditions.WithReason("RemovalInProgress"), conditions.WithMessage(message))
	dashboard.Status.Phase = common.PhaseNotReady
	return r.persistDashboardRemovalStatus(ctx, dashboard, previousStatus, cm)
}
