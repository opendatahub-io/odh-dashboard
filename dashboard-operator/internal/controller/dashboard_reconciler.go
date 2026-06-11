package controller

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
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

	dashboard.Status.ObservedGeneration = dashboard.Generation

	cfg := readOperatorConfig(ctx, r.Client, r.Namespace)

	// Ready is the rollup condition — auto-derived by the Manager from
	// ProvisioningSucceeded and Degraded. It is never set explicitly.
	cm := conditions.NewManager(
		dashboard,
		string(common.ConditionTypeReady),
		string(common.ConditionTypeProvisioningSucceeded),
		string(common.ConditionTypeDegraded),
	)

	result, err := r.reconcile(ctx, dashboard, cm, cfg)

	dashboard.SetReleaseStatus(common.ComponentReleaseStatus{
		Releases: []common.ComponentRelease{{
			Name:    v1alpha1.DashboardComponentName,
			Version: Version,
		}},
	})

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

	url, err := extractDashboardURL(ctx, r.Client, r.ApplicationsNamespace, r.Platform)

	var requeueAfter time.Duration

	// URL is intentionally not cleared on error — "last known good" semantic.
	// Conditions (Ready, Degraded) communicate the actual state.
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
		requeueAfter = 10 * time.Second
	case err != nil:
		cm.MarkFalse(string(common.ConditionTypeDegraded),
			conditions.WithReason("URLExtractionFailed"),
			conditions.WithError(err),
			conditions.WithSeverity(common.ConditionSeverityInfo))
		cm.MarkFalse(string(common.ConditionTypeReady),
			conditions.WithReason("URLExtractionFailed"),
			conditions.WithError(err))
		logger.Error(err, "Failed to extract dashboard URL")

		return ctrl.Result{}, fmt.Errorf("failed to extract dashboard URL: %w", err)
	default:
		cm.MarkFalse(string(common.ConditionTypeDegraded),
			conditions.WithReason("NoDegradation"),
			conditions.WithMessage("All sub-modules healthy"),
			conditions.WithSeverity(common.ConditionSeverityInfo))
		dashboard.Status.URL = url
	}

	nextStatuses := resolveModuleStatuses(&dashboard.Spec)
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

// TODO(RHOAIENG-59938): delete Perses monitoring resources in the observability namespace
// and any SSA-adopted resources not covered by ownerReference GC.
func (r *DashboardReconciler) cleanupCrossNamespaceResources(ctx context.Context, _ *v1alpha1.Dashboard) error {
	logger := log.FromContext(ctx)
	logger.Info("Cleaning up cross-namespace resources")

	return nil
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

	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.Dashboard{}).
		Complete(r)
}
