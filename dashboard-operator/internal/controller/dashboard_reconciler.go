package controller

import (
	"context"
	"errors"
	"fmt"
	"maps"
	"os"
	"strings"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	policyv1 "k8s.io/api/policy/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/controller/conditions"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/deploy"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/annotations"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/render/kustomize"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

const dashboardFinalizer = "components.platform.opendatahub.io/cleanup"
const conditionObservabilityAvailable = "ObservabilityAvailable"

var operatorDeploymentName = getOperatorDeploymentName()

func getOperatorDeploymentName() string {
	return envOrDefault("OPERATOR_DEPLOYMENT_NAME", "dashboard-operator")
}

// operatorServiceAccountName and resolveDistributionConfigMapName resolve the names the operator's
// Helm chart rendered for its own ServiceAccount and config ConfigMap. Both derive from user-settable
// chart values (serviceAccount.name, config.name), so the chart plumbs the rendered names in via
// env — the Go side must not re-derive them by convention, or a non-default install would delete
// the operator's own resources during managementState: Removed teardown. Defaults match the chart.
func operatorServiceAccountName() string {
	// Defaults to the deployment name: the chart's default serviceAccount.name renders to exactly
	// that, and unit tests that override the deployment name expect the SA to track it.
	return envOrDefault("OPERATOR_SERVICE_ACCOUNT_NAME", operatorDeploymentName)
}

// resolveDistributionConfigMapName returns the name of the chart-rendered config ConfigMap
// (dashboard.configMapName / .Values.config.name, default odh-dashboard-config). This is the
// ConfigMap the operator reads for distribution identity and which teardown must preserve. Its
// name is user-settable, so the chart plumbs it in via OPERATOR_CONFIGMAP_NAME.
func resolveDistributionConfigMapName() string {
	return envOrDefault("OPERATOR_CONFIGMAP_NAME", distributionConfigMapName)
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// operatorOwnedResources returns the set of the operator's own resources that teardown must never
// delete, keyed by "<Kind>/<name>". Teardown selects resources by the part-of=dashboard label the
// chart's commonLabels stamp on everything it renders — including operator-owned resources — so
// these must be skipped by name. Keying on kind+name (not name alone) keeps a genuinely
// module-owned resource that happens to share a name (e.g. a module ConfigMap named
// odh-dashboard-config) from silently surviving teardown.
//
// The webhook serving-cert Secret is intentionally absent: cert-manager issues it from the chart's
// Certificate (which has no secretTemplate), so it never carries the part-of label and is never
// selected by teardown's label query — no skip entry is needed.
func operatorOwnedResources() map[string]bool {
	base := operatorDeploymentName
	return map[string]bool{
		"Deployment/" + base:                              true,
		"ServiceAccount/" + operatorServiceAccountName():  true,
		"Service/" + base + "-webhook":                    true, // dashboard.webhookServiceName
		"ConfigMap/" + resolveDistributionConfigMapName(): true, // dashboard.configMapName
		"ClusterRole/" + base + "-role":                   true,
		"ClusterRoleBinding/" + base + "-rolebinding":     true,
	}
}

// isOperatorOwned reports whether a resource of the given kind and name is one of the operator's
// own resources that teardown must preserve.
func isOperatorOwned(resources map[string]bool, kind, name string) bool {
	return resources[kind+"/"+name]
}

var persesdashboardGVK = schema.GroupVersionKind{
	Group:   "perses.dev",
	Version: "v1alpha1",
	Kind:    "PersesDashboardList",
}

var deploymentGVK = schema.GroupVersionKind{
	Group:   "apps",
	Version: "v1",
	Kind:    "Deployment",
}

var consoleLinkGVK = schema.GroupVersionKind{
	Group:   "console.openshift.io",
	Version: "v1",
	Kind:    "ConsoleLink",
}

var consoleLinkListGVK = schema.GroupVersionKind{
	Group:   "console.openshift.io",
	Version: "v1",
	Kind:    "ConsoleLinkList",
}

// Version is set at build time via -ldflags.
var Version = "unknown"

// Options configures the dashboard controller.
type Options struct {
	ManifestsBasePath     string
	Platform              cluster.Platform
	Namespace             string
	ApplicationsNamespace string
}

// DashboardReconciler reconciles a Dashboard object.
type DashboardReconciler struct {
	client.Client
	APIReader             client.Reader
	Scheme                *runtime.Scheme
	ManifestsBasePath     string
	Platform              cluster.Platform
	Namespace             string
	ApplicationsNamespace string
}

func (r *DashboardReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	logger := log.FromContext(ctx)

	dashboard := &v1alpha1.Dashboard{}
	if err := r.Get(ctx, req.NamespacedName, dashboard); err != nil {
		if k8serrors.IsNotFound(err) {
			return ctrl.Result{}, nil
		}

		return ctrl.Result{}, err
	}

	logger.Info("Reconciling Dashboard", "name", dashboard.Name)

	if !dashboard.DeletionTimestamp.IsZero() {
		if controllerutil.ContainsFinalizer(dashboard, dashboardFinalizer) {
			cleanup, err := r.deleteMaaSPortalResources(ctx)
			if err != nil {
				return ctrl.Result{}, fmt.Errorf("failed to cleanup MaaS Portal resources: %w", err)
			}
			if cleanup.Pending {
				return ctrl.Result{RequeueAfter: maasPortalRetryInterval}, nil
			}
			if err := r.cleanupCrossNamespaceResources(ctx, dashboard, false); err != nil {
				return ctrl.Result{}, fmt.Errorf("failed to cleanup cross-namespace resources: %w", err)
			}

			controllerutil.RemoveFinalizer(dashboard, dashboardFinalizer)
			if err := r.Update(ctx, dashboard); err != nil {
				return ctrl.Result{}, fmt.Errorf("failed to remove finalizer: %w", err)
			}
		}

		return ctrl.Result{}, nil
	}

	if !controllerutil.ContainsFinalizer(dashboard, dashboardFinalizer) {
		controllerutil.AddFinalizer(dashboard, dashboardFinalizer)
		if err := r.Update(ctx, dashboard); err != nil {
			return ctrl.Result{}, fmt.Errorf("failed to add finalizer: %w", err)
		}

		return ctrl.Result{}, nil
	}

	// Migrate the legacy last-known-good portal URL before any reconciliation
	// step can fail and persist status without reaching portal reconciliation.
	backfillMaaSPortalURL(&dashboard.Status)

	// Ready is the rollup condition — auto-derived by the Manager from
	// ProvisioningSucceeded, Degraded, ObservabilityAvailable, and
	// MaaSConsumerPortalAvailable. It is set explicitly only when both operands are
	// Removed. The manager is built
	// here, before the managementState branch, because the MaaS Portal is
	// reconciled unconditionally below regardless of the core dashboard's state.
	cm := conditions.NewManager(
		dashboard,
		string(common.ConditionTypeReady),
		string(common.ConditionTypeProvisioningSucceeded),
		string(common.ConditionTypeDegraded),
		conditionObservabilityAvailable,
		conditionMaaSPortalAvailable,
	)
	maasPortalManaged := r.maasPortalManaged(dashboard)
	var observabilityDetectionErr error
	if dashboard.Spec.ManagementState != "Removed" || maasPortalManaged {
		observabilityDetectionErr = r.autoDetectObservability(ctx, dashboard)
		if observabilityDetectionErr != nil {
			severity := common.ConditionSeverityError
			if dashboard.Spec.ManagementState != "Removed" {
				// Optional Perses detection must not change core dashboard readiness.
				// Portal-only operation still reports observability failures as errors.
				severity = common.ConditionSeverityInfo
			}
			cm.MarkFalse(conditionObservabilityAvailable,
				conditions.WithError(observabilityDetectionErr),
				conditions.WithReason("DetectionFailed"),
				conditions.WithSeverity(severity))
			logger.Error(observabilityDetectionErr, "Failed to auto-detect observability, preserving its resources and Perses federation entry")
		}
	}
	// MaaS Portal availability is recalculated from its managed resources on every
	// reconciliation. Clear a stale failure now; failures recorded later in this
	// cycle (for example federation ConfigMap reconciliation) remain intact.
	cm.ClearCondition(conditionMaaSPortalAvailable)

	if dashboard.Spec.ManagementState == "Removed" {
		logger.Info("ManagementState is Removed, tearing down resources")

		// MaaS and GenAI are shared dependencies. Reconcile their aggregate
		// demand before the core teardown so MaaS Portal-only operation retains them.
		nextStatuses, err := r.reconcileModuleDemand(ctx, dashboard)
		if err != nil {
			r.persistRemovedFailureStatus(ctx, dashboard, cm, "ModuleDeployFailed", err)
			return ctrl.Result{}, fmt.Errorf("failed to reconcile MaaS Portal-required modules: %w", err)
		}
		preserveModuleStatusTransitionTimes(dashboard.Status.ModuleStatuses, nextStatuses)
		dashboard.Status.ModuleStatuses = nextStatuses
		r.setMaaSPortalModuleCondition(cm, dashboard, nextStatuses)
		var observabilityRetryAfter time.Duration
		if observabilityDetectionErr != nil {
			observabilityRetryAfter = observabilityRetryInterval
		} else if maasPortalManaged {
			observabilityRetryAfter = r.reconcileObservability(ctx, dashboard, cm)
		}
		portalRetryAfter := r.reconcileMaaSPortalOperand(ctx, dashboard, cm, nextStatuses, observabilityDetectionErr == nil)
		portalRetryAfter = minNonZeroDuration(portalRetryAfter, observabilityRetryAfter)

		preserveObservability := maasPortalManaged && (observabilityDetectionErr != nil ||
			(dashboard.Spec.Observability != nil && dashboard.Spec.Observability.Enabled))
		if err := r.teardownManagedResources(ctx, dashboard, nextStatuses, preserveObservability); err != nil {
			r.persistRemovedFailureStatus(ctx, dashboard, cm, "TeardownFailed", err)
			return ctrl.Result{}, fmt.Errorf("failed to tear down resources: %w", err)
		}

		dashboard.Status.ObservedGeneration = dashboard.Generation
		dashboard.Status.URL = ""
		dashboard.Status.Distribution = nil

		// Core Dashboard removal is intentional. Treat its conditions as
		// informational so a Managed MaaS Portal can determine the
		// aggregate Dashboard readiness independently.
		cm.MarkFalse(string(common.ConditionTypeProvisioningSucceeded),
			conditions.WithReason("Removed"),
			conditions.WithMessage("Dashboard has been removed via managementState"),
			conditions.WithSeverity(common.ConditionSeverityInfo))
		cm.MarkFalse(string(common.ConditionTypeDegraded),
			conditions.WithReason("Removed"),
			conditions.WithMessage("Dashboard has been removed"),
			conditions.WithSeverity(common.ConditionSeverityInfo))
		if !maasPortalManaged {
			cm.MarkFalse(conditionObservabilityAvailable,
				conditions.WithReason("Removed"),
				conditions.WithMessage("Dashboard has been removed"),
				conditions.WithSeverity(common.ConditionSeverityInfo))
		}
		portal := effectiveMaaSPortal(dashboard.Spec)
		if portal == nil || portal.ManagementState != "Managed" {
			// With neither operand managed, retain the established Removed state.
			cm.MarkFalse(string(common.ConditionTypeReady),
				conditions.WithReason("Removed"),
				conditions.WithMessage("Dashboard has been removed via managementState"))
		}
		if cm.IsHappy() {
			dashboard.Status.Phase = common.PhaseReady
		} else {
			dashboard.Status.Phase = common.PhaseNotReady
		}
		cm.Sort()

		// Decide before the status write refreshes the spec from the API server
		// and clears any in-memory auto-detected observability configuration.
		if maasPortalManaged && dashboard.Spec.Observability == nil && portalRetryAfter == 0 {
			portalRetryAfter = observabilityRetryInterval
		}
		if statusErr := r.Status().Update(ctx, dashboard); statusErr != nil {
			logger.Error(statusErr, "Failed to update status after removal")

			return ctrl.Result{}, fmt.Errorf("failed to update status after removal: %w", statusErr)
		}

		return ctrl.Result{RequeueAfter: portalRetryAfter}, nil
	}

	dashboard.Status.ObservedGeneration = dashboard.Generation

	cfg := readOperatorConfig(ctx, r.Client, r.Namespace)

	if dist, distErr := readDistributionConfig(ctx, r.Client, r.Namespace); distErr != nil {
		logger.Error(distErr, "Failed to read distribution config, preserving last-known-good value")
	} else {
		dashboard.Status.Distribution = dist
	}

	platformVersion, pvErr := readPlatformVersion(ctx, r.Client, r.Namespace)
	if pvErr != nil {
		logger.Error(pvErr, "Failed to read platform version, skipping handshake")
	}

	result, err := r.reconcile(ctx, dashboard, cm, cfg, observabilityDetectionErr == nil)

	releases := []common.ComponentRelease{{
		Name:    v1alpha1.DashboardComponentName,
		Version: Version,
		RepoURL: "https://github.com/opendatahub-io/odh-dashboard",
	}}

	if platformVersion != "" {
		releases = append(releases, common.ComponentRelease{
			Name:    "platform",
			Version: platformVersion,
		})
	}

	dashboard.SetReleaseStatus(common.ComponentReleaseStatus{Releases: releases})

	if cm.IsHappy() {
		dashboard.Status.Phase = common.PhaseReady
	} else {
		dashboard.Status.Phase = common.PhaseNotReady
	}

	cm.Sort()

	if statusErr := r.Status().Update(ctx, dashboard); statusErr != nil {
		logger.Error(statusErr, "Failed to update status")
	}

	return result, err
}

// persistRemovedFailureStatus records a retryable failure that occurs before
// the normal Removed-state status update. A status-write failure is logged but
// does not replace the original reconciliation error.
func (r *DashboardReconciler) persistRemovedFailureStatus(
	ctx context.Context,
	dashboard *v1alpha1.Dashboard,
	cm *conditions.Manager,
	reason string,
	failure error,
) {
	cm.MarkFalse(string(common.ConditionTypeProvisioningSucceeded),
		conditions.WithReason(reason),
		conditions.WithMessage("Dashboard removal reconciliation failed: %s", failure))
	dashboard.Status.Phase = common.PhaseNotReady
	cm.Sort()
	if statusErr := r.Status().Update(ctx, dashboard); statusErr != nil {
		log.FromContext(ctx).Error(statusErr, "Failed to update status after removal failure")
	}
}

const observabilityRetryInterval = 5 * time.Minute

func (r *DashboardReconciler) reconcile(
	ctx context.Context,
	dashboard *v1alpha1.Dashboard,
	cm *conditions.Manager,
	cfg OperatorConfig,
	observabilityKnown bool,
) (ctrl.Result, error) {
	result, err := r.reconcileDeployment(ctx, dashboard, cm, cfg, observabilityKnown)

	if dashboard.Spec.Observability == nil && err == nil && result.RequeueAfter == 0 {
		result.RequeueAfter = observabilityRetryInterval
	}

	return result, err
}

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

func (r *DashboardReconciler) reconcileDeployment(
	ctx context.Context,
	dashboard *v1alpha1.Dashboard,
	cm *conditions.Manager,
	cfg OperatorConfig,
	observabilityKnown bool,
) (ctrl.Result, error) {
	logger := log.FromContext(ctx)

	if err := r.cleanupLegacyResources(ctx); err != nil {
		cm.MarkFalse(string(common.ConditionTypeProvisioningSucceeded),
			conditions.WithReason("LegacyCleanupFailed"),
			conditions.WithError(err))
		return ctrl.Result{}, fmt.Errorf("failed to clean up legacy resources: %w", err)
	}

	manifests := manifestSets(r.ManifestsBasePath, r.Platform)

	if err := applyKustomizeParams(dashboard, manifests, r.Platform); err != nil {
		cm.MarkFalse(string(common.ConditionTypeProvisioningSucceeded),
			conditions.WithReason("KustomizeParamsFailed"),
			conditions.WithError(err))
		return ctrl.Result{}, fmt.Errorf("failed to apply kustomize params: %w", err)
	}

	engine := kustomize.NewEngine()
	var allResources []unstructured.Unstructured
	for _, m := range manifests {
		rendered, err := engine.Render(m.String(), kustomize.WithNamespace(r.ApplicationsNamespace))
		if err != nil {
			cm.MarkFalse(string(common.ConditionTypeProvisioningSucceeded),
				conditions.WithReason("RenderFailed"),
				conditions.WithError(err))
			return ctrl.Result{}, fmt.Errorf("failed to render manifests from %s: %w", m, err)
		}
		allResources = append(allResources, rendered...)
	}

	remapRayDashboardGatewayRBAC(allResources)
	remapDataConnectHubGatewayRBAC(allResources, r.ApplicationsNamespace)

	if err := sanitizeDeploymentProbes(ctx, r.Client, allResources); err != nil {
		cm.MarkFalse(string(common.ConditionTypeProvisioningSucceeded),
			conditions.WithReason("ProbeSanitizeFailed"),
			conditions.WithError(err))
		return ctrl.Result{}, fmt.Errorf("failed to sanitize deployment probes: %w", err)
	}

	if err := removeStaleContainers(ctx, r.Client, allResources); err != nil {
		cm.MarkFalse(string(common.ConditionTypeProvisioningSucceeded),
			conditions.WithReason("StaleContainerRemovalFailed"),
			conditions.WithError(err))
		return ctrl.Result{}, fmt.Errorf("failed to remove stale containers: %w", err)
	}

	deployer := deploy.NewDeployer(
		deploy.WithFieldOwner("dashboard-operator"),
		deploy.WithLabel(labels.PlatformPartOf, strings.ToLower(v1alpha1.DashboardKind)),
		deploy.WithApplyOrder(),
		deploy.WithMergeStrategy(deploymentGVK, deploy.MergeDeployments),
	)

	if err := deployer.Deploy(ctx, deploy.DeployInput{
		Client:    r.Client,
		Owner:     dashboard,
		Release:   deploy.ReleaseInfo{Type: string(r.Platform)},
		Resources: allResources,
	}); err != nil {
		cm.MarkFalse(string(common.ConditionTypeProvisioningSucceeded),
			conditions.WithReason("DeployFailed"),
			conditions.WithError(err))
		return ctrl.Result{}, fmt.Errorf("failed to deploy resources: %w", err)
	}

	if err := r.reconcileRHOAIDashboardConfigDefaults(ctx); err != nil {
		cm.MarkFalse(string(common.ConditionTypeProvisioningSucceeded),
			conditions.WithReason("DashboardConfigDefaultFailed"),
			conditions.WithError(err))
		return ctrl.Result{}, fmt.Errorf("failed to reconcile dashboard config defaults: %w", err)
	}

	nextStatuses, err := r.reconcileModuleDemand(ctx, dashboard)
	if err != nil {
		cm.MarkFalse(string(common.ConditionTypeProvisioningSucceeded),
			conditions.WithReason("ModuleDeployFailed"),
			conditions.WithError(err))
		return ctrl.Result{}, fmt.Errorf("failed to deploy module manifests: %w", err)
	}

	cm.MarkTrue(string(common.ConditionTypeProvisioningSucceeded),
		conditions.WithReason("ResourcesApplied"),
		conditions.WithMessage("Dashboard and module manifests applied successfully"))

	// Persist module statuses now so early returns from steps 6-9 don't leave
	// stale status on the CR (the outer Reconcile always calls Status().Update).
	preserveModuleStatusTransitionTimes(dashboard.Status.ModuleStatuses, nextStatuses)
	dashboard.Status.ModuleStatuses = nextStatuses
	r.setMaaSPortalModuleCondition(cm, dashboard, nextStatuses)

	// Reconcile cross-namespace RBAC (notebooks, model-registry)
	rbacErr := r.reconcileNamespacedRBAC(ctx, dashboard)
	if rbacErr != nil {
		logger.Error(rbacErr, "Failed to reconcile namespaced RBAC")
		cm.MarkTrue(string(common.ConditionTypeDegraded),
			conditions.WithReason("NamespacedRBACFailed"),
			conditions.WithError(rbacErr))
	}

	// A failed lookup leaves observability unknown, not disabled. Preserve its
	// resources and Perses entry while reconciling the remaining federation entries.
	observabilityRetryAfter := observabilityRetryInterval
	if observabilityKnown {
		observabilityRetryAfter = r.reconcileObservability(ctx, dashboard, cm)
	}
	fedData, err := r.deployFederationConfigMap(ctx, nextStatuses, dashboard, observabilityKnown)
	if err != nil {
		cm.MarkTrue(string(common.ConditionTypeDegraded),
			conditions.WithReason("FederationConfigMapFailed"),
			conditions.WithError(err))
		logger.Error(err, "Failed to deploy federation ConfigMap")
		return ctrl.Result{}, fmt.Errorf("federation ConfigMap: %w", err)
	}
	portalRetryAfter := r.reconcileMaaSPortalOperand(ctx, dashboard, cm, nextStatuses, observabilityKnown)

	if err := r.patchDeploymentFederationHash(ctx, fedData); err != nil {
		logger.Error(err, "Failed to patch federation hash on deployment")
		return ctrl.Result{}, fmt.Errorf("patching federation hash: %w", err)
	}

	// URL extraction + degraded condition
	url, requeueAfter, urlErr := r.reconcileURL(ctx, dashboard, cm)
	if urlErr != nil {
		return ctrl.Result{}, urlErr
	}
	if requeueAfter == 0 {
		r.reconcileDegradedCondition(cm, nextStatuses)
	}
	// reconcileURL and reconcileDegradedCondition overwrite Degraded on success;
	// restore the RBAC failure so it is not silently cleared while cross-namespace
	// grants are still broken.
	if rbacErr != nil {
		cm.MarkTrue(string(common.ConditionTypeDegraded),
			conditions.WithReason("NamespacedRBACFailed"),
			conditions.WithError(rbacErr))
	}

	if requeueAfter > 0 {
		logger.Info("Dashboard reconcile cycle complete, requeuing", "requeueAfter", requeueAfter)
	} else {
		logger.Info("Dashboard reconciled successfully", "url", url, "modules", len(dashboard.Status.ModuleStatuses))
	}

	if requeueAfter == 0 && cfg.ReconcileInterval > 0 {
		requeueAfter = cfg.ReconcileInterval
	}

	requeueAfter = minNonZeroDuration(requeueAfter, portalRetryAfter, observabilityRetryAfter)
	return ctrl.Result{RequeueAfter: requeueAfter}, nil
}

// minNonZeroDuration returns the smallest positive duration, or zero if none exist.
func minNonZeroDuration(durations ...time.Duration) time.Duration {
	var minimum time.Duration
	for _, duration := range durations {
		if duration > 0 && (minimum == 0 || duration < minimum) {
			minimum = duration
		}
	}
	return minimum
}

func (r *DashboardReconciler) reconcileObservability(
	ctx context.Context,
	dashboard *v1alpha1.Dashboard,
	cm *conditions.Manager,
) time.Duration {
	logger := log.FromContext(ctx)

	switch obsErr := deployObservabilityManifests(ctx, r.Client, dashboard, r.ManifestsBasePath, r.Platform, r.ApplicationsNamespace); {
	case obsErr == nil:
		cm.MarkTrue(conditionObservabilityAvailable,
			conditions.WithReason("Deployed"),
			conditions.WithMessage("Observability manifests applied successfully"))
	case errors.Is(obsErr, ErrObservabilityDisabled):
		if err := r.cleanupManagedObservability(ctx, dashboard); err != nil {
			severity := common.ConditionSeverityError
			if dashboard.Spec.ManagementState != "Removed" {
				// Disabled observability must not affect core dashboard readiness,
				// even while its stale resources await cleanup.
				severity = common.ConditionSeverityInfo
			}
			cm.MarkFalse(conditionObservabilityAvailable,
				conditions.WithError(err),
				conditions.WithReason("CleanupFailed"),
				conditions.WithSeverity(severity))
			logger.Error(err, "Failed to clean up disabled observability resources")
			return observabilityRetryInterval
		}
		cm.MarkFalse(conditionObservabilityAvailable,
			conditions.WithReason("Disabled"),
			conditions.WithMessage("Observability is not enabled"),
			conditions.WithSeverity(common.ConditionSeverityInfo))
	case errors.Is(obsErr, ErrPersesServiceRequired):
		cm.MarkFalse(conditionObservabilityAvailable,
			conditions.WithReason("InvalidConfig"),
			conditions.WithError(obsErr))
		logger.Error(obsErr, "Observability is enabled but PersesService is not configured")
	case errors.Is(obsErr, ErrPersesCRDNotFound):
		cm.MarkFalse(conditionObservabilityAvailable,
			conditions.WithReason("PersesCRDNotFound"),
			conditions.WithMessage("PersesDashboard CRD is not installed; install Cluster Observability Operator"),
			conditions.WithSeverity(common.ConditionSeverityInfo))
		logger.Info("PersesDashboard CRD not found, skipping observability deployment")
		return observabilityRetryInterval
	default:
		cm.MarkFalse(conditionObservabilityAvailable,
			conditions.WithError(obsErr),
			conditions.WithReason("DeployFailed"))
		logger.Error(obsErr, "Failed to deploy observability manifests")
		return observabilityRetryInterval
	}
	return 0
}

func (r *DashboardReconciler) reconcileURL(
	ctx context.Context,
	dashboard *v1alpha1.Dashboard,
	cm *conditions.Manager,
) (string, time.Duration, error) {
	logger := log.FromContext(ctx)

	url, err := extractDashboardURL(ctx, r.Client, dashboard, r.ApplicationsNamespace, r.Platform)

	switch {
	case errors.Is(err, ErrDashboardRouteNotReady):
		cm.MarkFalse(string(common.ConditionTypeDegraded),
			conditions.WithReason("RouteNotReady"),
			conditions.WithMessage("Dashboard route is not yet admitted"),
			conditions.WithSeverity(common.ConditionSeverityInfo))
		cm.MarkFalse(string(common.ConditionTypeReady),
			conditions.WithReason("RouteNotReady"),
			conditions.WithMessage("Dashboard route is not yet admitted"))
		logger.Info("Dashboard route not yet available, requeuing")
		return "", 10 * time.Second, nil
	case err != nil:
		cm.MarkFalse(string(common.ConditionTypeDegraded),
			conditions.WithReason("URLExtractionFailed"),
			conditions.WithError(err),
			conditions.WithSeverity(common.ConditionSeverityInfo))
		cm.MarkFalse(string(common.ConditionTypeReady),
			conditions.WithReason("URLExtractionFailed"),
			conditions.WithError(err))
		logger.Error(err, "Failed to extract dashboard URL")
		return "", 0, fmt.Errorf("failed to extract dashboard URL: %w", err)
	default:
		cm.MarkFalse(string(common.ConditionTypeDegraded),
			conditions.WithReason("NoDegradation"),
			conditions.WithMessage("All sub-modules healthy"),
			conditions.WithSeverity(common.ConditionSeverityInfo))
		dashboard.Status.URL = url
		return url, 0, nil
	}
}

func (r *DashboardReconciler) reconcileDegradedCondition(
	cm *conditions.Manager,
	statuses map[string]v1alpha1.ModuleStatus,
) {
	degradedModules := 0
	for _, ns := range statuses {
		if ns.Phase == v1alpha1.ModulePhaseDegraded {
			degradedModules++
		}
	}
	if degradedModules > 0 {
		cm.MarkTrue(string(common.ConditionTypeDegraded),
			conditions.WithReason("ModulesDegraded"),
			conditions.WithMessage("%d module(s) degraded", degradedModules),
			conditions.WithSeverity(common.ConditionSeverityError))
		// Degraded is a negative-polarity condition. The condition manager only
		// rolls up false/unknown dependents, so explicitly make Ready unhappy when
		// Degraded=True.
		cm.MarkFalse(string(common.ConditionTypeReady),
			conditions.WithReason("ModulesDegraded"),
			conditions.WithMessage("%d module(s) degraded", degradedModules))
	}
}

// cleanupRayDashboardGatewayRBAC deletes the Gateway Role/RoleBinding remapped
// into openshift-ingress. OwnerReference GC does not run across namespaces, so
// these must be removed explicitly on Dashboard teardown.
func (r *DashboardReconciler) cleanupRayDashboardGatewayRBAC(ctx context.Context) error {
	logger := log.FromContext(ctx)

	role := &rbacv1.Role{}
	role.SetName(rayDataScienceGatewayRBACName)
	role.SetNamespace(dataScienceGatewayNamespace)
	logger.Info("Deleting remapped Ray Gateway Role", "name", role.GetName(), "namespace", role.GetNamespace())
	if err := r.Delete(ctx, role); client.IgnoreNotFound(err) != nil {
		return fmt.Errorf("deleting Role %s/%s: %w", dataScienceGatewayNamespace, rayDataScienceGatewayRBACName, err)
	}

	rb := &rbacv1.RoleBinding{}
	rb.SetName(rayDataScienceGatewayRBACName)
	rb.SetNamespace(dataScienceGatewayNamespace)
	logger.Info("Deleting remapped Ray Gateway RoleBinding", "name", rb.GetName(), "namespace", rb.GetNamespace())
	if err := r.Delete(ctx, rb); client.IgnoreNotFound(err) != nil {
		return fmt.Errorf("deleting RoleBinding %s/%s: %w", dataScienceGatewayNamespace, rayDataScienceGatewayRBACName, err)
	}

	return nil
}

// cleanupCrossNamespaceResources explicitly removes resources on soft removal
// as well as CR deletion. Observability remains shared while the portal needs it.
func (r *DashboardReconciler) cleanupCrossNamespaceResources(ctx context.Context, dashboard *v1alpha1.Dashboard, preserveObservability bool) error {
	if err := r.cleanupNamespacedRBAC(ctx); err != nil {
		return fmt.Errorf("namespaced RBAC cleanup: %w", err)
	}

	if err := r.cleanupRayDashboardGatewayRBAC(ctx); err != nil {
		return err
	}
	if err := r.cleanupDataConnectHubGatewayRBAC(ctx, ""); err != nil {
		return fmt.Errorf("DCH gateway RBAC cleanup: %w", err)
	}
	if preserveObservability {
		return nil
	}
	return r.cleanupManagedObservability(ctx, dashboard)
}

func (r *DashboardReconciler) cleanupManagedObservability(ctx context.Context, dashboard *v1alpha1.Dashboard) error {
	// The service reference may be removed when observability is disabled. Find
	// labeled resources across namespaces without relying on the current spec.
	if err := r.cleanupObservabilityResources(ctx, false, client.MatchingLabels{
		labels.PlatformPartOf: strings.ToLower(v1alpha1.DashboardKind),
		moduleComponentLabel:  observabilityComponent,
	}); err != nil {
		return err
	}
	// In the applications namespace, broad legacy-label cleanup would also
	// remove core resources. Limit it to known observability kinds and names.
	if r.ApplicationsNamespace != "" {
		if err := r.cleanupObservabilityResources(ctx, true, client.InNamespace(r.ApplicationsNamespace), client.MatchingLabels{
			labels.PlatformPartOf: strings.ToLower(v1alpha1.DashboardKind),
		}); err != nil {
			return err
		}
	}

	obsNS := ""
	if dashboard.Spec.Observability != nil &&
		dashboard.Spec.Observability.PersesService != nil {
		obsNS = dashboard.Spec.Observability.PersesService.Namespace
	}

	if obsNS == "" {
		obsNS = r.monitoringNamespace()
	}

	if obsNS == "" || obsNS == r.ApplicationsNamespace {
		return nil
	}

	// Older observability resources have no component label. The namespace may
	// also contain the operator or other dashboard resources, so recognize legacy
	// resources by kind and name just as in the applications namespace.
	legacySelector, err := metav1.LabelSelectorAsSelector(&metav1.LabelSelector{
		MatchLabels: map[string]string{
			labels.PlatformPartOf: strings.ToLower(v1alpha1.DashboardKind),
		},
		MatchExpressions: []metav1.LabelSelectorRequirement{{
			Key:      moduleComponentLabel,
			Operator: metav1.LabelSelectorOpDoesNotExist,
		}},
	})
	if err != nil {
		return fmt.Errorf("creating legacy observability selector: %w", err)
	}
	return r.cleanupObservabilityResources(ctx, true, client.InNamespace(obsNS), client.MatchingLabelsSelector{Selector: legacySelector})
}

// isLegacyObservabilityResource recognizes resources that predate the component
// label without treating other dashboard-owned resources as observability.
func isLegacyObservabilityResource(resource client.Object) bool {
	if resource.GetLabels()[labels.PlatformPartOf] != strings.ToLower(v1alpha1.DashboardKind) {
		return false
	}
	if _, labeled := resource.GetLabels()[moduleComponentLabel]; labeled {
		return false
	}
	switch obj := resource.(type) {
	case *corev1.Service:
		return obj.Name == persesServiceName
	case *corev1.ConfigMap:
		return obj.Name == "perses-dashboard-config"
	case *networkingv1.NetworkPolicy:
		return obj.Name == "dashboard-perses-access"
	case *unstructured.Unstructured:
		if obj.GroupVersionKind() != persesdashboardGVK.GroupVersion().WithKind("PersesDashboard") {
			return false
		}
		return obj.GetName() == "dashboard-0-cluster-admin" || obj.GetName() == "dashboard-1-model" || obj.GetName() == "dashboard-1-model-admin"
	default:
		return false
	}
}

func (r *DashboardReconciler) cleanupObservabilityResources(ctx context.Context, legacyOnly bool, opts ...client.ListOption) error {
	logger := log.FromContext(ctx)
	operatorResources := operatorOwnedResources()
	shouldDelete := func(resource client.Object, kind string) bool {
		// Chart resource names are configurable and may overlap observability
		// names. Never remove the operator's own resources, even if mislabeled.
		if resource.GetNamespace() == r.Namespace && isOperatorOwned(operatorResources, kind, resource.GetName()) {
			return false
		}
		return !legacyOnly || isLegacyObservabilityResource(resource)
	}

	var svcs corev1.ServiceList
	if err := r.List(ctx, &svcs, opts...); err != nil {
		return fmt.Errorf("listing observability services: %w", err)
	}
	for i := range svcs.Items {
		if !shouldDelete(&svcs.Items[i], "Service") {
			continue
		}
		obsNS := svcs.Items[i].Namespace
		logger.Info("Deleting cross-namespace service", "name", svcs.Items[i].Name, "namespace", obsNS)
		if err := r.Delete(ctx, &svcs.Items[i]); client.IgnoreNotFound(err) != nil {
			return fmt.Errorf("deleting service %s/%s: %w", obsNS, svcs.Items[i].Name, err)
		}
	}

	var cms corev1.ConfigMapList
	if err := r.List(ctx, &cms, opts...); err != nil {
		return fmt.Errorf("listing observability configmaps: %w", err)
	}
	for i := range cms.Items {
		if !shouldDelete(&cms.Items[i], "ConfigMap") {
			continue
		}
		obsNS := cms.Items[i].Namespace
		logger.Info("Deleting cross-namespace configmap", "name", cms.Items[i].Name, "namespace", obsNS)
		if err := r.Delete(ctx, &cms.Items[i]); client.IgnoreNotFound(err) != nil {
			return fmt.Errorf("deleting configmap %s/%s: %w", obsNS, cms.Items[i].Name, err)
		}
	}

	var netpols networkingv1.NetworkPolicyList
	if err := r.List(ctx, &netpols, opts...); err != nil {
		return fmt.Errorf("listing observability networkpolicies: %w", err)
	}
	for i := range netpols.Items {
		if !shouldDelete(&netpols.Items[i], "NetworkPolicy") {
			continue
		}
		obsNS := netpols.Items[i].Namespace
		logger.Info("Deleting cross-namespace networkpolicy", "name", netpols.Items[i].Name, "namespace", obsNS)
		if err := r.Delete(ctx, &netpols.Items[i]); client.IgnoreNotFound(err) != nil {
			return fmt.Errorf("deleting networkpolicy %s/%s: %w", obsNS, netpols.Items[i].Name, err)
		}
	}

	persesList := &unstructured.UnstructuredList{}
	persesList.SetGroupVersionKind(persesdashboardGVK)
	if err := r.List(ctx, persesList, opts...); err != nil {
		if !k8serrors.IsNotFound(err) && !meta.IsNoMatchError(err) {
			return fmt.Errorf("listing observability PersesDashboards: %w", err)
		}
	} else {
		for i := range persesList.Items {
			if !shouldDelete(&persesList.Items[i], "PersesDashboard") {
				continue
			}
			obsNS := persesList.Items[i].GetNamespace()
			logger.Info("Deleting cross-namespace PersesDashboard", "name", persesList.Items[i].GetName(), "namespace", obsNS)
			if err := r.Delete(ctx, &persesList.Items[i]); client.IgnoreNotFound(err) != nil {
				return fmt.Errorf("deleting PersesDashboard %s/%s: %w", obsNS, persesList.Items[i].GetName(), err)
			}
		}
	}

	return nil
}

// teardownManagedResources deletes all resources labeled with
// platform.opendatahub.io/part-of=dashboard in the applications namespace,
// and cleans up cross-namespace resources.
func (r *DashboardReconciler) teardownManagedResources(ctx context.Context, dashboard *v1alpha1.Dashboard, statuses map[string]v1alpha1.ModuleStatus, preserveObservability bool) error {
	logger := log.FromContext(ctx)
	maasPortalRequiredModules := maasPortalRequiredModuleSlugs(&dashboard.Spec, statuses)
	shouldPreserve := func(resource client.Object) bool {
		component := resource.GetLabels()[moduleComponentLabel]
		return maasPortalRequiredModules[component] || (preserveObservability &&
			(component == observabilityComponent || isLegacyObservabilityResource(resource)))
	}

	matchLabels := client.MatchingLabels{
		labels.PlatformPartOf: strings.ToLower(v1alpha1.DashboardKind),
	}
	inNamespace := client.InNamespace(r.ApplicationsNamespace)

	// The operator's own Helm chart stamps platform.opendatahub.io/part-of=dashboard
	// (commonLabels) onto every resource it renders — including the webhook Service and
	// the operator ConfigMap, both of which land in the applications namespace. Teardown
	// must skip these by kind+name so it never deletes operator-owned resources (e.g. deleting
	// the webhook Service breaks the failurePolicy: Fail ValidatingWebhookConfiguration).
	operatorResources := operatorOwnedResources()

	deleteTyped := func(list client.ObjectList, kind string, opts ...client.ListOption) error {
		if err := r.List(ctx, list, opts...); err != nil {
			return fmt.Errorf("listing %s: %w", kind, err)
		}

		items := extractItems(list)
		for i := range items {
			if isOperatorOwned(operatorResources, kind, items[i].GetName()) || shouldPreserve(items[i]) {
				continue
			}
			logger.Info("Deleting managed resource", "kind", kind, "name", items[i].GetName())
			if err := r.Delete(ctx, items[i]); client.IgnoreNotFound(err) != nil {
				return fmt.Errorf("deleting %s %s: %w", kind, items[i].GetName(), err)
			}
		}

		return nil
	}

	var deployments appsv1.DeploymentList
	if err := r.List(ctx, &deployments, matchLabels, inNamespace); err != nil {
		return fmt.Errorf("listing Deployments: %w", err)
	}
	for i := range deployments.Items {
		dep := &deployments.Items[i]
		if isOperatorOwned(operatorResources, "Deployment", dep.Name) || shouldPreserve(dep) {
			continue
		}
		logger.Info("Deleting managed resource", "kind", "Deployment", "name", dep.Name)
		if err := r.Delete(ctx, dep); client.IgnoreNotFound(err) != nil {
			return fmt.Errorf("deleting Deployment %s: %w", dep.Name, err)
		}
	}

	var services corev1.ServiceList
	if err := deleteTyped(&services, "Service", matchLabels, inNamespace); err != nil {
		return err
	}

	var configmaps corev1.ConfigMapList
	if err := deleteTyped(&configmaps, "ConfigMap", matchLabels, inNamespace); err != nil {
		return err
	}

	var serviceAccounts corev1.ServiceAccountList
	if err := r.List(ctx, &serviceAccounts, matchLabels, inNamespace); err != nil {
		return fmt.Errorf("listing ServiceAccounts: %w", err)
	}
	for i := range serviceAccounts.Items {
		sa := &serviceAccounts.Items[i]
		if isOperatorOwned(operatorResources, "ServiceAccount", sa.Name) || shouldPreserve(sa) {
			continue
		}
		logger.Info("Deleting managed resource", "kind", "ServiceAccount", "name", sa.Name)
		if err := r.Delete(ctx, sa); client.IgnoreNotFound(err) != nil {
			return fmt.Errorf("deleting ServiceAccount %s: %w", sa.Name, err)
		}
	}

	var secrets corev1.SecretList
	if err := deleteTyped(&secrets, "Secret", matchLabels, inNamespace); err != nil {
		return err
	}

	var networkPolicies networkingv1.NetworkPolicyList
	if err := deleteTyped(&networkPolicies, "NetworkPolicy", matchLabels, inNamespace); err != nil {
		return err
	}

	var roles rbacv1.RoleList
	if err := deleteTyped(&roles, "Role", matchLabels, inNamespace); err != nil {
		return err
	}

	var roleBindings rbacv1.RoleBindingList
	if err := deleteTyped(&roleBindings, "RoleBinding", matchLabels, inNamespace); err != nil {
		return err
	}

	var clusterRoles rbacv1.ClusterRoleList
	if err := r.List(ctx, &clusterRoles, matchLabels); err != nil {
		return fmt.Errorf("listing ClusterRoles: %w", err)
	}
	for i := range clusterRoles.Items {
		cr := &clusterRoles.Items[i]
		if isOperatorOwned(operatorResources, "ClusterRole", cr.Name) || shouldPreserve(cr) {
			continue
		}
		logger.Info("Deleting managed resource", "kind", "ClusterRole", "name", cr.Name)
		if err := r.Delete(ctx, cr); client.IgnoreNotFound(err) != nil {
			return fmt.Errorf("deleting ClusterRole %s: %w", cr.Name, err)
		}
	}

	var clusterRoleBindings rbacv1.ClusterRoleBindingList
	if err := r.List(ctx, &clusterRoleBindings, matchLabels); err != nil {
		return fmt.Errorf("listing ClusterRoleBindings: %w", err)
	}
	for i := range clusterRoleBindings.Items {
		crb := &clusterRoleBindings.Items[i]
		if isOperatorOwned(operatorResources, "ClusterRoleBinding", crb.Name) || shouldPreserve(crb) {
			continue
		}
		logger.Info("Deleting managed resource", "kind", "ClusterRoleBinding", "name", crb.Name)
		if err := r.Delete(ctx, crb); client.IgnoreNotFound(err) != nil {
			return fmt.Errorf("deleting ClusterRoleBinding %s: %w", crb.Name, err)
		}
	}

	// ConsoleLinks are cluster-scoped and have no Go type, so they are listed
	// as unstructured. Only the core dashboard link (rhodslink/odhlink) carries
	// part-of=dashboard and is matched here. Guard against clusters where the
	// ConsoleLink CRD is not installed (non-OpenShift).
	consoleLinks := &unstructured.UnstructuredList{}
	consoleLinks.SetGroupVersionKind(consoleLinkListGVK)
	if err := r.List(ctx, consoleLinks, matchLabels); err != nil {
		if !meta.IsNoMatchError(err) {
			return fmt.Errorf("listing ConsoleLinks: %w", err)
		}
	} else {
		for i := range consoleLinks.Items {
			cl := &consoleLinks.Items[i]
			logger.Info("Deleting managed resource", "kind", "ConsoleLink", "name", cl.GetName())
			if err := r.Delete(ctx, cl); client.IgnoreNotFound(err) != nil {
				return fmt.Errorf("deleting ConsoleLink %s: %w", cl.GetName(), err)
			}
		}
	}

	if err := r.cleanupCrossNamespaceResources(ctx, dashboard, preserveObservability); err != nil {
		return fmt.Errorf("cross-namespace cleanup: %w", err)
	}

	return nil
}

// extractItems returns the slice of client.Object from a supported list.
func extractItems(list client.ObjectList) []client.Object {
	switch l := list.(type) {
	case *unstructured.UnstructuredList:
		items := make([]client.Object, len(l.Items))
		for i := range l.Items {
			items[i] = &l.Items[i]
		}
		return items
	case *appsv1.DeploymentList:
		items := make([]client.Object, len(l.Items))
		for i := range l.Items {
			items[i] = &l.Items[i]
		}
		return items
	case *corev1.ServiceList:
		items := make([]client.Object, len(l.Items))
		for i := range l.Items {
			items[i] = &l.Items[i]
		}
		return items
	case *corev1.ConfigMapList:
		items := make([]client.Object, len(l.Items))
		for i := range l.Items {
			items[i] = &l.Items[i]
		}
		return items
	case *corev1.ServiceAccountList:
		items := make([]client.Object, len(l.Items))
		for i := range l.Items {
			items[i] = &l.Items[i]
		}
		return items
	case *corev1.SecretList:
		items := make([]client.Object, len(l.Items))
		for i := range l.Items {
			items[i] = &l.Items[i]
		}
		return items
	case *networkingv1.NetworkPolicyList:
		items := make([]client.Object, len(l.Items))
		for i := range l.Items {
			items[i] = &l.Items[i]
		}
		return items
	case *rbacv1.RoleList:
		items := make([]client.Object, len(l.Items))
		for i := range l.Items {
			items[i] = &l.Items[i]
		}
		return items
	case *rbacv1.RoleBindingList:
		items := make([]client.Object, len(l.Items))
		for i := range l.Items {
			items[i] = &l.Items[i]
		}
		return items
	case *rbacv1.ClusterRoleList:
		items := make([]client.Object, len(l.Items))
		for i := range l.Items {
			items[i] = &l.Items[i]
		}
		return items
	case *rbacv1.ClusterRoleBindingList:
		items := make([]client.Object, len(l.Items))
		for i := range l.Items {
			items[i] = &l.Items[i]
		}
		return items
	default:
		return nil
	}
}

// SetupWithManager registers the dashboard controller with the manager.
func SetupWithManager(mgr ctrl.Manager, opts Options) error {
	r := &DashboardReconciler{
		Client:                mgr.GetClient(),
		APIReader:             mgr.GetAPIReader(),
		Scheme:                mgr.GetScheme(),
		ManifestsBasePath:     opts.ManifestsBasePath,
		Platform:              opts.Platform,
		Namespace:             opts.Namespace,
		ApplicationsNamespace: opts.ApplicationsNamespace,
	}

	// Owns() watches ensure external modifications or deletions of managed
	// resources trigger re-reconciliation. During Removed state the extra
	// reconcile is harmless — teardown is idempotent and bounded by the
	// number of owned resources.
	//
	// Watches() on ConfigMap tracks the platform config ConfigMaps that feed
	// reconcile inputs but are not owned by the Dashboard CR (they are managed
	// by the platform operator). Without this, a platform-driven change such as
	// a platformVersion bump in odh-dashboard-config would not trigger a
	// reconcile, leaving status.releases[platform].version stale until an
	// unrelated event fired (RHOAIENG-81919).
	controllerBuilder := ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.Dashboard{}).
		Owns(&appsv1.Deployment{}).
		Owns(&corev1.Service{}).
		Owns(&corev1.ConfigMap{}).
		Owns(&corev1.ServiceAccount{}).
		Owns(&corev1.Secret{}).
		Owns(&networkingv1.NetworkPolicy{}).
		Owns(&rbacv1.ClusterRole{}).
		Owns(&rbacv1.ClusterRoleBinding{}).
		Owns(&rbacv1.Role{}).
		Owns(&rbacv1.RoleBinding{}).
		Owns(&policyv1.PodDisruptionBudget{}).
		Watches(
			&corev1.ConfigMap{},
			handler.EnqueueRequestsFromMapFunc(r.mapConfigMapToDashboard),
			builder.WithPredicates(r.configMapPredicate()),
		).
		Watches(
			&corev1.Namespace{},
			handler.EnqueueRequestsFromMapFunc(r.mapMaaSPortalOperatorNamespaceToDashboard),
			builder.WithPredicates(r.maasPortalOperatorNamespacePredicate()),
		)

	if err := addOptionalOwnedResourceWatches(mgr.GetRESTMapper(), controllerBuilder); err != nil {
		return err
	}
	dashboardController, err := controllerBuilder.Build(r)
	if err != nil {
		return err
	}

	return addOdhDashboardConfigWatch(mgr, dashboardController, r)
}

// addOptionalOwnedResourceWatches adds watches for APIs used only by the MaaS
// Portal. The Dashboard controller also runs on clusters where those
// APIs are not installed, so absent APIs must not prevent manager startup.
func addOptionalOwnedResourceWatches(mapper meta.RESTMapper, controllerBuilder *builder.Builder) error {
	resources, err := optionalOwnedResources(mapper)
	if err != nil {
		return err
	}
	for _, resource := range resources {
		controllerBuilder.Owns(resource)
	}
	return nil
}

func optionalOwnedResources(mapper meta.RESTMapper) ([]client.Object, error) {
	var resources []client.Object
	for _, resource := range []struct {
		gvk    schema.GroupVersionKind
		object client.Object
	}{
		{gvk: gatewayv1.SchemeGroupVersion.WithKind("HTTPRoute"), object: &gatewayv1.HTTPRoute{}},
		{gvk: consoleLinkGVK, object: newConsoleLinkObject()},
	} {
		available, err := apiResourceAvailable(mapper, resource.gvk)
		if err != nil {
			return nil, fmt.Errorf("discovering %s API: %w", resource.gvk, err)
		}
		if !available {
			ctrl.Log.Info("Optional API is unavailable; skipping owned-resource watch", "groupVersionKind", resource.gvk.String())
			continue
		}
		resources = append(resources, resource.object)
	}
	return resources, nil
}

func newConsoleLinkObject() *unstructured.Unstructured {
	consoleLink := &unstructured.Unstructured{}
	consoleLink.SetGroupVersionKind(consoleLinkGVK)
	return consoleLink
}

func apiResourceAvailable(mapper meta.RESTMapper, gvk schema.GroupVersionKind) (bool, error) {
	_, err := mapper.RESTMapping(gvk.GroupKind(), gvk.Version)
	if meta.IsNoMatchError(err) {
		return false, nil
	}
	return err == nil, err
}

// isWatchedConfigMap reports whether obj is one of the config ConfigMaps in the
// operator namespace whose contents feed reconcile inputs: platform version and
// distribution identity (the distribution config, odh-dashboard-config by
// default) and the reconcile interval (dashboard-operator-config). Changes to
// these must trigger a reconcile so the Dashboard status stays fresh even when
// nothing else touches the CR (RHOAIENG-81919).
//
// The distribution config name is user-settable (chart value config.name, plumbed
// in via OPERATOR_CONFIGMAP_NAME), so it is resolved through the same helper the
// readers use rather than compared against the hardcoded default — otherwise a
// non-default install would watch the wrong ConfigMap and status would go stale.
//
// Both the predicate and the map func route through this single helper so their
// nil handling and scoping cannot drift.
func (r *DashboardReconciler) isWatchedConfigMap(obj client.Object) bool {
	if obj == nil || obj.GetNamespace() != r.Namespace {
		return false
	}

	name := obj.GetName()

	return name == resolveDistributionConfigMapName() || name == operatorConfigMapName
}

// mapConfigMapToDashboard enqueues a reconcile for the singleton Dashboard when
// one of the watched config ConfigMaps in the operator namespace changes.
func (r *DashboardReconciler) mapConfigMapToDashboard(_ context.Context, obj client.Object) []reconcile.Request {
	if !r.isWatchedConfigMap(obj) {
		return nil
	}

	return []reconcile.Request{{
		NamespacedName: types.NamespacedName{Name: v1alpha1.DashboardInstanceName},
	}}
}

// configMapPredicate limits ConfigMap events to the watched config ConfigMaps in
// the operator namespace. For updates it fires only when Data or a consumed
// annotation (PlatformType / PlatformVersion — the distribution identity read by
// readDistributionConfig) actually changed. Only those two annotation keys are
// compared, not the whole map, so unrelated metadata churn — resourceVersion
// bumps, managed-field rewrites, GitOps/Helm bookkeeping annotations such as
// last-applied-configuration or meta.helm.sh/* — does not enqueue a no-op
// reconcile. The annotation comparison is scoped to the distribution config, the
// only ConfigMap those annotations are consumed from (resolved via the same helper
// the readers use, so a chart-customized name is honored); dashboard-operator-config
// contributes reconcile inputs through Data alone.
func (r *DashboardReconciler) configMapPredicate() predicate.Predicate {
	return predicate.Funcs{
		CreateFunc:  func(e event.CreateEvent) bool { return r.isWatchedConfigMap(e.Object) },
		DeleteFunc:  func(e event.DeleteEvent) bool { return r.isWatchedConfigMap(e.Object) },
		GenericFunc: func(e event.GenericEvent) bool { return r.isWatchedConfigMap(e.Object) },
		UpdateFunc: func(e event.UpdateEvent) bool {
			if !r.isWatchedConfigMap(e.ObjectNew) {
				return false
			}

			oldCM, oldOK := e.ObjectOld.(*corev1.ConfigMap)
			newCM, newOK := e.ObjectNew.(*corev1.ConfigMap)
			if !oldOK || !newOK {
				return true
			}

			// PlatformType / PlatformVersion annotations are read only from the
			// distribution config (readDistributionConfig). Restrict the annotation
			// comparison to that ConfigMap — resolved via the same helper the readers
			// use, so a chart-customized name is honored — so annotation churn on
			// dashboard-operator-config, which contributes only via Data, does not
			// enqueue a no-op reconcile.
			annotationChanged := newCM.Name == resolveDistributionConfigMapName() &&
				(oldCM.Annotations[annotations.PlatformType] != newCM.Annotations[annotations.PlatformType] ||
					oldCM.Annotations[annotations.PlatformVersion] != newCM.Annotations[annotations.PlatformVersion])

			return !maps.Equal(oldCM.Data, newCM.Data) || annotationChanged
		},
	}
}
