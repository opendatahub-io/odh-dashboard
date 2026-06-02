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
	"sigs.k8s.io/controller-runtime/pkg/log"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/controller/conditions"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/deploy"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/render/kustomize"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

// Version is set at build time via -ldflags.
var Version = "unknown"

// Options configures the dashboard controller.
type Options struct {
	ManifestsBasePath string
	Platform          cluster.Platform
	Namespace         string
}

// DashboardReconciler reconciles a Dashboard object.
type DashboardReconciler struct {
	client.Client
	Scheme            *runtime.Scheme
	ManifestsBasePath string
	Platform          cluster.Platform
	Namespace         string
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

	dashboard.Status.ObservedGeneration = dashboard.Generation

	// Ready is the rollup condition — auto-derived by the Manager from
	// ProvisioningSucceeded and Degraded. It is never set explicitly.
	cm := conditions.NewManager(
		dashboard,
		string(common.ConditionTypeReady),
		string(common.ConditionTypeProvisioningSucceeded),
		string(common.ConditionTypeDegraded),
	)

	result, err := r.reconcile(ctx, dashboard, cm)

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
) (ctrl.Result, error) {
	logger := log.FromContext(ctx)
	dashboard.Status.URL = ""

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
		rendered, err := engine.Render(m.String(), kustomize.WithNamespace(r.Namespace))
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

	url, err := extractDashboardURL(ctx, r.Client, r.Namespace)

	var requeueAfter time.Duration

	switch {
	case errors.Is(err, ErrDashboardRouteNotReady):
		cm.MarkFalse(string(common.ConditionTypeDegraded),
			conditions.WithReason("RouteNotReady"),
			conditions.WithMessage("Dashboard route is not yet admitted"),
			conditions.WithSeverity(common.ConditionSeverityInfo))
		cm.MarkFalse(string(common.ConditionTypeReady),
			conditions.WithReason("RouteNotReady"),
			conditions.WithMessage("Dashboard route is not yet admitted"))
		dashboard.Status.URL = ""
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
		dashboard.Status.URL = ""
		logger.Error(err, "Failed to extract dashboard URL")

		return ctrl.Result{}, fmt.Errorf("failed to extract dashboard URL: %w", err)
	default:
		cm.MarkFalse(string(common.ConditionTypeDegraded),
			conditions.WithReason("NoDegradation"),
			conditions.WithMessage("All sub-modules healthy"),
			conditions.WithSeverity(common.ConditionSeverityInfo))
		dashboard.Status.URL = url
	}

	logger.Info("Dashboard reconciled successfully", "url", url)

	return ctrl.Result{RequeueAfter: requeueAfter}, nil
}

// SetupWithManager registers the dashboard controller with the manager.
func SetupWithManager(mgr ctrl.Manager, opts Options) error {
	r := &DashboardReconciler{
		Client:            mgr.GetClient(),
		Scheme:            mgr.GetScheme(),
		ManifestsBasePath: opts.ManifestsBasePath,
		Platform:          opts.Platform,
		Namespace:         opts.Namespace,
	}

	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.Dashboard{}).
		Complete(r)
}
