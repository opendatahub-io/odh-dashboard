package controller

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/deploy"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/render/kustomize"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

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

	manifests := manifestSets(r.ManifestsBasePath, r.Platform)

	if err := applyKustomizeParams(dashboard, manifests, r.Platform); err != nil {
		setReadyCondition(dashboard, metav1.ConditionFalse, "KustomizeParamsFailed", err.Error())

		if statusErr := r.Status().Update(ctx, dashboard); statusErr != nil {
			logger.Error(statusErr, "Failed to update status after kustomize params failure")
		}

		return ctrl.Result{}, fmt.Errorf("failed to apply kustomize params: %w", err)
	}

	engine := kustomize.NewEngine()

	var allResources []unstructured.Unstructured
	for _, m := range manifests {
		rendered, err := engine.Render(m.String(), kustomize.WithNamespace(r.Namespace))
		if err != nil {
			setReadyCondition(dashboard, metav1.ConditionFalse, "RenderFailed", err.Error())

			if statusErr := r.Status().Update(ctx, dashboard); statusErr != nil {
				logger.Error(statusErr, "Failed to update status after render failure")
			}

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
		setReadyCondition(dashboard, metav1.ConditionFalse, "DeployFailed", err.Error())

		if statusErr := r.Status().Update(ctx, dashboard); statusErr != nil {
			logger.Error(statusErr, "Failed to update status after deploy failure")
		}

		return ctrl.Result{}, fmt.Errorf("failed to deploy resources: %w", err)
	}

	url, err := extractDashboardURL(ctx, r.Client, r.Namespace)

	var requeueAfter time.Duration

	switch {
	case errors.Is(err, ErrDashboardRouteNotReady):
		logger.Info("Dashboard route not yet available, requeuing")
		requeueAfter = 10 * time.Second
	case err != nil:
		logger.Error(err, "Failed to extract dashboard URL")
		setReadyCondition(dashboard, metav1.ConditionFalse, "URLExtractionFailed", err.Error())

		if statusErr := r.Status().Update(ctx, dashboard); statusErr != nil {
			logger.Error(statusErr, "Failed to update status after URL extraction failure")
		}

		return ctrl.Result{}, fmt.Errorf("failed to extract dashboard URL: %w", err)
	default:
		dashboard.Status.URL = url
	}

	dashboard.Status.ObservedGeneration = dashboard.Generation
	setReadyCondition(dashboard, metav1.ConditionTrue, "ReconcileSuccess", "Dashboard reconciled successfully")

	if err := r.Status().Update(ctx, dashboard); err != nil {
		return ctrl.Result{}, fmt.Errorf("failed to update status: %w", err)
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
