package controller

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/controller/conditions"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/deploy"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/render/kustomize"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

const dashboardFinalizer = "components.platform.opendatahub.io/cleanup"
const conditionObservabilityAvailable = "ObservabilityAvailable"

var operatorDeploymentName = getOperatorDeploymentName()

func getOperatorDeploymentName() string {
	if name := os.Getenv("OPERATOR_DEPLOYMENT_NAME"); name != "" {
		return name
	}
	return "dashboard-operator"
}

func operatorOwnedResourceNames() map[string]bool {
	base := operatorDeploymentName
	return map[string]bool{
		base:                  true,
		base + "-role":        true,
		base + "-rolebinding": true,
	}
}

var persesdashboardGVK = schema.GroupVersionKind{
	Group:   "perses.dev",
	Version: "v1alpha1",
	Kind:    "PersesDashboardList",
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
			if err := r.cleanupCrossNamespaceResources(ctx, dashboard); err != nil {
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

	if dashboard.Spec.ManagementState == "Removed" {
		logger.Info("ManagementState is Removed, tearing down resources")

		if err := r.teardownManagedResources(ctx, dashboard); err != nil {
			return ctrl.Result{}, fmt.Errorf("failed to tear down resources: %w", err)
		}

		dashboard.Status.ObservedGeneration = dashboard.Generation
		dashboard.Status.Phase = common.PhaseNotReady
		dashboard.Status.URL = ""
		dashboard.Status.ModuleStatuses = nil
		dashboard.Status.Distribution = nil

		cm := conditions.NewManager(
			dashboard,
			string(common.ConditionTypeReady),
			string(common.ConditionTypeProvisioningSucceeded),
			string(common.ConditionTypeDegraded),
			conditionObservabilityAvailable,
		)
		cm.MarkFalse(string(common.ConditionTypeProvisioningSucceeded),
			conditions.WithReason("Removed"),
			conditions.WithMessage("Dashboard has been removed via managementState"))
		cm.MarkFalse(string(common.ConditionTypeDegraded),
			conditions.WithReason("Removed"),
			conditions.WithMessage("Dashboard has been removed"),
			conditions.WithSeverity(common.ConditionSeverityInfo))
		cm.MarkFalse(conditionObservabilityAvailable,
			conditions.WithReason("Removed"),
			conditions.WithMessage("Dashboard has been removed"),
			conditions.WithSeverity(common.ConditionSeverityInfo))
		cm.MarkFalse(string(common.ConditionTypeReady),
			conditions.WithReason("Removed"),
			conditions.WithMessage("Dashboard has been removed via managementState"))
		cm.Sort()

		if statusErr := r.Status().Update(ctx, dashboard); statusErr != nil {
			logger.Error(statusErr, "Failed to update status after removal")

			return ctrl.Result{}, fmt.Errorf("failed to update status after removal: %w", statusErr)
		}

		return ctrl.Result{}, nil
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

	// Ready is the rollup condition — auto-derived by the Manager from
	// ProvisioningSucceeded, Degraded, and ObservabilityAvailable.
	// It is never set explicitly.
	cm := conditions.NewManager(
		dashboard,
		string(common.ConditionTypeReady),
		string(common.ConditionTypeProvisioningSucceeded),
		string(common.ConditionTypeDegraded),
		conditionObservabilityAvailable,
	)

	result, err := r.reconcile(ctx, dashboard, cm, cfg)

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

func (r *DashboardReconciler) reconcile(
	ctx context.Context,
	dashboard *v1alpha1.Dashboard,
	cm *conditions.Manager,
	cfg OperatorConfig,
) (ctrl.Result, error) {
	mode := dashboard.Spec.DeploymentMode
	if mode == "" || mode == v1alpha1.DeploymentModeSidecar {
		return r.reconcileSidecar(ctx, dashboard, cm, cfg)
	}
	return r.reconcileStandalone(ctx, dashboard, cm, cfg)
}

func (r *DashboardReconciler) reconcileSidecar(
	ctx context.Context,
	dashboard *v1alpha1.Dashboard,
	cm *conditions.Manager,
	cfg OperatorConfig,
) (ctrl.Result, error) {
	logger := log.FromContext(ctx)

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

	deployer := deploy.NewDeployer(
		deploy.WithFieldOwner("dashboard-operator"),
		deploy.WithLabel(labels.PlatformPartOf, strings.ToLower(v1alpha1.DashboardKind)),
		deploy.WithApplyOrder(),
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

	cm.MarkTrue(string(common.ConditionTypeProvisioningSucceeded),
		conditions.WithReason("ResourcesApplied"),
		conditions.WithMessage("Dashboard manifests applied successfully"))

	r.reconcileObservability(ctx, dashboard, cm)

	url, requeueAfter, err := r.reconcileURL(ctx, dashboard, cm)
	if err != nil {
		return ctrl.Result{}, err
	}

	nextStatuses := resolveModuleStatuses(&dashboard.Spec)

	var podList corev1.PodList
	if err := r.List(ctx, &podList,
		client.InNamespace(r.ApplicationsNamespace),
		client.MatchingLabels{"app.kubernetes.io/part-of": "odh-dashboard"},
	); err != nil {
		cm.MarkFalse(string(common.ConditionTypeDegraded),
			conditions.WithReason("PodListFailed"),
			conditions.WithError(err),
			conditions.WithSeverity(common.ConditionSeverityError))

		return ctrl.Result{}, fmt.Errorf("failed to list dashboard pods: %w", err)
	}

	overlayContainerReadiness(nextStatuses, podList.Items)

	for name, next := range nextStatuses {
		if prev, ok := dashboard.Status.ModuleStatuses[name]; ok &&
			prev.Phase == next.Phase &&
			prev.Reason == next.Reason &&
			prev.Message == next.Message {
			next.LastTransitionTime = prev.LastTransitionTime
			nextStatuses[name] = next
		}
	}
	dashboard.Status.ModuleStatuses = nextStatuses

	if requeueAfter > 0 {
		logger.Info("Dashboard reconcile cycle complete, requeuing", "requeueAfter", requeueAfter, "modules", len(dashboard.Status.ModuleStatuses))
	} else {
		logger.Info("Dashboard reconciled successfully", "url", url, "modules", len(dashboard.Status.ModuleStatuses))
	}

	if requeueAfter == 0 && cfg.ReconcileInterval > 0 {
		requeueAfter = cfg.ReconcileInterval
	}

	return ctrl.Result{RequeueAfter: requeueAfter}, nil
}

func (r *DashboardReconciler) reconcileStandalone(
	ctx context.Context,
	dashboard *v1alpha1.Dashboard,
	cm *conditions.Manager,
	cfg OperatorConfig,
) (ctrl.Result, error) {
	logger := log.FromContext(ctx)

	// Step 1: Deploy core manifests (main dashboard deployment without sidecar patches)
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
			return ctrl.Result{}, fmt.Errorf("failed to render core manifests from %s: %w", m, err)
		}
		allResources = append(allResources, rendered...)
	}

	deployer := deploy.NewDeployer(
		deploy.WithFieldOwner("dashboard-operator"),
		deploy.WithLabel(labels.PlatformPartOf, strings.ToLower(v1alpha1.DashboardKind)),
		deploy.WithApplyOrder(),
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
		return ctrl.Result{}, fmt.Errorf("failed to deploy core resources: %w", err)
	}

	// Step 2: Resolve module statuses
	nextStatuses := resolveModuleStatuses(&dashboard.Spec)

	// Step 3: Deploy enabled modules
	if err := r.deployModuleManifests(ctx, dashboard, nextStatuses); err != nil {
		cm.MarkFalse(string(common.ConditionTypeProvisioningSucceeded),
			conditions.WithReason("ModuleDeployFailed"),
			conditions.WithError(err))
		return ctrl.Result{}, fmt.Errorf("failed to deploy module manifests: %w", err)
	}

	// Step 4: GC disabled modules
	if err := r.deleteModuleResources(ctx, nextStatuses); err != nil {
		logger.Error(err, "Failed to clean up disabled module resources")
	}

	cm.MarkTrue(string(common.ConditionTypeProvisioningSucceeded),
		conditions.WithReason("ResourcesApplied"),
		conditions.WithMessage("Dashboard and module manifests applied successfully"))

	// Step 5: Overlay readiness from standalone deployments (before federation ConfigMap
	// so the ConfigMap reflects actual deployment health, e.g. Degraded modules)
	r.overlayStandaloneReadiness(ctx, nextStatuses)

	// Persist module statuses now so early returns from steps 6-8 don't leave
	// stale status on the CR (the outer Reconcile always calls Status().Update).
	for name, next := range nextStatuses {
		if prev, ok := dashboard.Status.ModuleStatuses[name]; ok &&
			prev.Phase == next.Phase &&
			prev.Reason == next.Reason &&
			prev.Message == next.Message {
			next.LastTransitionTime = prev.LastTransitionTime
			nextStatuses[name] = next
		}
	}
	dashboard.Status.ModuleStatuses = nextStatuses

	// Step 6: Deploy observability
	r.reconcileObservability(ctx, dashboard, cm)

	// Step 7: Build and deploy federation ConfigMap (critical for standalone routing)
	if err := r.deployFederationConfigMap(ctx, nextStatuses, dashboard); err != nil {
		cm.MarkTrue(string(common.ConditionTypeDegraded),
			conditions.WithReason("FederationConfigMapFailed"),
			conditions.WithError(err))
		logger.Error(err, "Failed to deploy federation ConfigMap")
		return ctrl.Result{}, fmt.Errorf("federation ConfigMap: %w", err)
	}

	// Step 8: URL extraction + degraded condition
	url, requeueAfter, urlErr := r.reconcileURL(ctx, dashboard, cm)
	if urlErr != nil {
		return ctrl.Result{}, urlErr
	}
	if requeueAfter == 0 {
		r.reconcileDegradedCondition(cm, nextStatuses)
	}

	if requeueAfter > 0 {
		logger.Info("Standalone reconcile cycle complete, requeuing", "requeueAfter", requeueAfter)
	} else {
		logger.Info("Standalone mode reconciled successfully", "url", url, "modules", len(dashboard.Status.ModuleStatuses))
	}

	if requeueAfter == 0 && cfg.ReconcileInterval > 0 {
		requeueAfter = cfg.ReconcileInterval
	}

	return ctrl.Result{RequeueAfter: requeueAfter}, nil
}

func (r *DashboardReconciler) reconcileObservability(
	ctx context.Context,
	dashboard *v1alpha1.Dashboard,
	cm *conditions.Manager,
) {
	logger := log.FromContext(ctx)

	switch obsErr := deployObservabilityManifests(ctx, r.Client, dashboard, r.ManifestsBasePath, r.Platform); {
	case obsErr == nil:
		cm.MarkTrue(conditionObservabilityAvailable,
			conditions.WithReason("Deployed"),
			conditions.WithMessage("Observability manifests applied successfully"))
	case errors.Is(obsErr, ErrObservabilityDisabled):
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
	default:
		cm.MarkFalse(conditionObservabilityAvailable,
			conditions.WithReason("DeployFailed"),
			conditions.WithError(obsErr))
		logger.Error(obsErr, "Failed to deploy observability manifests")
	}
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
			conditions.WithError(fmt.Errorf("%d module(s) degraded", degradedModules)),
			conditions.WithSeverity(common.ConditionSeverityInfo))
	}
}

// cleanupCrossNamespaceResources deletes Perses monitoring resources in the
// observability namespace. OwnerReference GC only works within the same
// namespace (or for cluster-scoped owners referencing cluster-scoped children),
// so resources deployed to a different namespace need explicit cleanup.
func (r *DashboardReconciler) cleanupCrossNamespaceResources(ctx context.Context, dashboard *v1alpha1.Dashboard) error {
	logger := log.FromContext(ctx)

	obsNS := ""
	if dashboard.Spec.Observability != nil &&
		dashboard.Spec.Observability.PersesService != nil {
		obsNS = dashboard.Spec.Observability.PersesService.Namespace
	}

	if obsNS == "" || obsNS == r.ApplicationsNamespace {
		logger.Info("No cross-namespace resources to clean up")
		return nil
	}

	logger.Info("Cleaning up cross-namespace resources", "namespace", obsNS)

	matchLabels := client.MatchingLabels{
		labels.PlatformPartOf: strings.ToLower(v1alpha1.DashboardKind),
	}
	inNamespace := client.InNamespace(obsNS)

	var svcs corev1.ServiceList
	if err := r.List(ctx, &svcs, matchLabels, inNamespace); err != nil {
		return fmt.Errorf("listing services in %s: %w", obsNS, err)
	}
	for i := range svcs.Items {
		logger.Info("Deleting cross-namespace service", "name", svcs.Items[i].Name, "namespace", obsNS)
		if err := r.Delete(ctx, &svcs.Items[i]); client.IgnoreNotFound(err) != nil {
			return fmt.Errorf("deleting service %s/%s: %w", obsNS, svcs.Items[i].Name, err)
		}
	}

	var cms corev1.ConfigMapList
	if err := r.List(ctx, &cms, matchLabels, inNamespace); err != nil {
		return fmt.Errorf("listing configmaps in %s: %w", obsNS, err)
	}
	for i := range cms.Items {
		logger.Info("Deleting cross-namespace configmap", "name", cms.Items[i].Name, "namespace", obsNS)
		if err := r.Delete(ctx, &cms.Items[i]); client.IgnoreNotFound(err) != nil {
			return fmt.Errorf("deleting configmap %s/%s: %w", obsNS, cms.Items[i].Name, err)
		}
	}

	var netpols networkingv1.NetworkPolicyList
	if err := r.List(ctx, &netpols, matchLabels, inNamespace); err != nil {
		return fmt.Errorf("listing networkpolicies in %s: %w", obsNS, err)
	}
	for i := range netpols.Items {
		logger.Info("Deleting cross-namespace networkpolicy", "name", netpols.Items[i].Name, "namespace", obsNS)
		if err := r.Delete(ctx, &netpols.Items[i]); client.IgnoreNotFound(err) != nil {
			return fmt.Errorf("deleting networkpolicy %s/%s: %w", obsNS, netpols.Items[i].Name, err)
		}
	}

	persesList := &unstructured.UnstructuredList{}
	persesList.SetGroupVersionKind(persesdashboardGVK)
	if err := r.List(ctx, persesList, matchLabels, inNamespace); err != nil {
		if !k8serrors.IsNotFound(err) && !meta.IsNoMatchError(err) {
			return fmt.Errorf("listing PersesDashboards in %s: %w", obsNS, err)
		}
	} else {
		for i := range persesList.Items {
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
func (r *DashboardReconciler) teardownManagedResources(ctx context.Context, dashboard *v1alpha1.Dashboard) error {
	logger := log.FromContext(ctx)

	matchLabels := client.MatchingLabels{
		labels.PlatformPartOf: strings.ToLower(v1alpha1.DashboardKind),
	}
	inNamespace := client.InNamespace(r.ApplicationsNamespace)

	deleteTyped := func(list client.ObjectList, kind string, opts ...client.ListOption) error {
		if err := r.List(ctx, list, opts...); err != nil {
			return fmt.Errorf("listing %s: %w", kind, err)
		}

		items := extractItems(list)
		for i := range items {
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
		if dep.Name == operatorDeploymentName {
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

	operatorResources := operatorOwnedResourceNames()

	var serviceAccounts corev1.ServiceAccountList
	if err := r.List(ctx, &serviceAccounts, matchLabels, inNamespace); err != nil {
		return fmt.Errorf("listing ServiceAccounts: %w", err)
	}
	for i := range serviceAccounts.Items {
		sa := &serviceAccounts.Items[i]
		if operatorResources[sa.Name] {
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
		if operatorResources[cr.Name] {
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
		if operatorResources[crb.Name] {
			continue
		}
		logger.Info("Deleting managed resource", "kind", "ClusterRoleBinding", "name", crb.Name)
		if err := r.Delete(ctx, crb); client.IgnoreNotFound(err) != nil {
			return fmt.Errorf("deleting ClusterRoleBinding %s: %w", crb.Name, err)
		}
	}

	if err := r.cleanupCrossNamespaceResources(ctx, dashboard); err != nil {
		return fmt.Errorf("cross-namespace cleanup: %w", err)
	}

	return nil
}

// extractItems returns the slice of client.Object from a typed list.
func extractItems(list client.ObjectList) []client.Object {
	switch l := list.(type) {
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
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.Dashboard{}).
		Owns(&appsv1.Deployment{}).
		Owns(&corev1.Service{}).
		Owns(&corev1.ConfigMap{}).
		Complete(r)
}
