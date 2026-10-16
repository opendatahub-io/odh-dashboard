package controller

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/controller/conditions"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/deploy"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/render"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/render/kustomize"
	policyv1 "k8s.io/api/policy/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

func (l xksDashboardLifecycle) Reconcile(ctx context.Context, dashboard *v1alpha1.Dashboard, cm *conditions.Manager, cfg OperatorConfig) (ctrl.Result, error) {
	return l.reconcileRHAIIDashboard(ctx, dashboard, cm, cfg)
}

func (l xksDashboardLifecycle) Remove(ctx context.Context, dashboard *v1alpha1.Dashboard, cm *conditions.Manager) (ctrl.Result, error) {
	return l.removeRHAIIDashboard(ctx, dashboard, cm)
}

// Finalize relies on owner references for the namespace-scoped RHAII bundle.
// Unlike the OpenShift lifecycles, it creates no MaaS, observability, module,
// or cross-namespace RBAC resources to clean up.
func (l xksDashboardLifecycle) Finalize(context.Context, *v1alpha1.Dashboard) (ctrl.Result, error) {
	return ctrl.Result{}, nil
}

// reconcileRHAIIDashboard manages only the standalone RHAII dashboard bundle.
// XKS does not use the OpenShift core dashboard overlay, federated BFF module
// operands, observability, or cross-namespace feature RBAC.
func (l xksDashboardLifecycle) reconcileRHAIIDashboard(
	ctx context.Context,
	dashboard *v1alpha1.Dashboard,
	cm *conditions.Manager,
	cfg OperatorConfig,
) (ctrl.Result, error) {
	r := l.reconciler
	manifests := []render.ManifestInfo{rhaiiManifestInfo(r.ManifestsBasePath)}
	if err := applyKustomizeParams(dashboard, manifests, r.Platform); err != nil {
		cm.MarkFalse(string(common.ConditionTypeProvisioningSucceeded),
			conditions.WithReason("KustomizeParamsFailed"),
			conditions.WithError(err))
		return ctrl.Result{}, fmt.Errorf("failed to apply XKS kustomize params: %w", err)
	}

	engine := kustomize.NewEngine()
	var resources []unstructured.Unstructured
	for _, manifest := range manifests {
		rendered, err := engine.Render(manifest.String(), kustomize.WithNamespace(r.ApplicationsNamespace))
		if err != nil {
			cm.MarkFalse(string(common.ConditionTypeProvisioningSucceeded),
				conditions.WithReason("RenderFailed"),
				conditions.WithError(err))
			return ctrl.Result{}, fmt.Errorf("failed to render XKS manifests from %s: %w", manifest, err)
		}
		resources = append(resources, rendered...)
	}

	if err := sanitizeDeploymentProbes(ctx, r.Client, resources); err != nil {
		cm.MarkFalse(string(common.ConditionTypeProvisioningSucceeded),
			conditions.WithReason("ProbeSanitizeFailed"),
			conditions.WithError(err))
		return ctrl.Result{}, fmt.Errorf("failed to sanitize XKS deployment probes: %w", err)
	}

	deployer := deploy.NewDeployer(
		deploy.WithFieldOwner(dashboardFieldOwner),
		deploy.WithLabel(labels.PlatformPartOf, strings.ToLower(v1alpha1.DashboardKind)),
		deploy.WithApplyOrder(),
		deploy.WithMergeStrategy(deploymentGVK, deploy.MergeDeployments),
	)
	if err := deployer.Deploy(ctx, deploy.DeployInput{
		Client:    r.Client,
		Owner:     dashboard,
		Release:   deploy.ReleaseInfo{Type: string(r.Platform)},
		Resources: resources,
	}); err != nil {
		cm.MarkFalse(string(common.ConditionTypeProvisioningSucceeded),
			conditions.WithReason("DeployFailed"),
			conditions.WithError(err))
		return ctrl.Result{}, fmt.Errorf("failed to deploy XKS dashboard: %w", err)
	}

	cm.MarkTrue(string(common.ConditionTypeProvisioningSucceeded),
		conditions.WithReason("ResourcesApplied"),
		conditions.WithMessage("RHAII dashboard manifests applied successfully"))

	// XKS intentionally does not wait for Gateway acceptance: the Gateway is
	// provisioned independently and the current platform contract treats a
	// successfully applied dashboard as Ready without an externally known URL.
	dashboard.Status.URL = ""
	cm.MarkFalse(string(common.ConditionTypeDegraded),
		conditions.WithReason("NoDegradation"),
		conditions.WithMessage("All XKS dashboard resources healthy"),
		conditions.WithSeverity(common.ConditionSeverityInfo))
	var requeueAfter time.Duration
	if requeueAfter == 0 && cfg.ReconcileInterval > 0 {
		requeueAfter = cfg.ReconcileInterval
	}

	log.FromContext(ctx).Info("RHAII dashboard reconciled successfully", "requeueAfter", requeueAfter)
	return ctrl.Result{RequeueAfter: requeueAfter}, nil
}

// removeRHAIIDashboard removes the standalone RHAII operand without invoking
// OpenShift-only module, observability, or MaaS Portal lifecycle logic.
func (l xksDashboardLifecycle) removeRHAIIDashboard(
	ctx context.Context,
	dashboard *v1alpha1.Dashboard,
	cm *conditions.Manager,
) (ctrl.Result, error) {
	r := l.reconciler
	if err := r.teardownManagedResources(ctx, dashboard, nil, false); err != nil {
		r.persistRemovedFailureStatus(ctx, dashboard, cm, "TeardownFailed", err)
		return ctrl.Result{}, fmt.Errorf("failed to tear down XKS dashboard resources: %w", err)
	}
	if err := l.deleteRHAIIIngressResources(ctx); err != nil {
		r.persistRemovedFailureStatus(ctx, dashboard, cm, "TeardownFailed", err)
		return ctrl.Result{}, fmt.Errorf("failed to tear down XKS ingress resources: %w", err)
	}

	dashboard.Status.ObservedGeneration = dashboard.Generation
	dashboard.Status.URL = ""
	dashboard.Status.Distribution = nil
	dashboard.Status.ModuleStatuses = nil
	cm.MarkFalse(string(common.ConditionTypeProvisioningSucceeded),
		conditions.WithReason("Removed"),
		conditions.WithMessage("RHAII dashboard has been removed via managementState"),
		conditions.WithSeverity(common.ConditionSeverityInfo))
	cm.MarkFalse(string(common.ConditionTypeDegraded),
		conditions.WithReason("Removed"),
		conditions.WithMessage("RHAII dashboard has been removed"),
		conditions.WithSeverity(common.ConditionSeverityInfo))
	cm.MarkFalse(string(common.ConditionTypeReady),
		conditions.WithReason("Removed"),
		conditions.WithMessage("RHAII dashboard has been removed via managementState"))
	dashboard.Status.Phase = common.PhaseNotReady
	cm.Sort()

	if err := r.Status().Update(ctx, dashboard); err != nil {
		return ctrl.Result{}, fmt.Errorf("failed to update XKS removal status: %w", err)
	}

	return ctrl.Result{}, nil
}

// deleteRHAIIIngressResources handles resource types intentionally absent from
// the shared core-dashboard teardown. HTTPRoutes and PodDisruptionBudgets are
// both part of the standalone RHAII bundle and must be removed on soft stop.
// TODO: Standardize soft-removal cleanup in teardownManagedResources,
// including HTTPRoutes and PodDisruptionBudgets, across all lifecycles.
func (l xksDashboardLifecycle) deleteRHAIIIngressResources(ctx context.Context) error {
	r := l.reconciler
	matchLabels := client.MatchingLabels{labels.PlatformPartOf: strings.ToLower(v1alpha1.DashboardKind)}
	inNamespace := client.InNamespace(r.ApplicationsNamespace)

	pdbs := &policyv1.PodDisruptionBudgetList{}
	if err := r.List(ctx, pdbs, matchLabels, inNamespace); err != nil {
		return fmt.Errorf("listing PodDisruptionBudgets: %w", err)
	}
	for i := range pdbs.Items {
		if err := r.Delete(ctx, &pdbs.Items[i]); client.IgnoreNotFound(err) != nil {
			return fmt.Errorf("deleting PodDisruptionBudget %s: %w", pdbs.Items[i].Name, err)
		}
	}

	routes := &gatewayv1.HTTPRouteList{}
	if err := r.List(ctx, routes, matchLabels, inNamespace); err != nil {
		if meta.IsNoMatchError(err) {
			return nil
		}
		return fmt.Errorf("listing HTTPRoutes: %w", err)
	}
	for i := range routes.Items {
		if err := r.Delete(ctx, &routes.Items[i]); client.IgnoreNotFound(err) != nil {
			return fmt.Errorf("deleting HTTPRoute %s: %w", routes.Items[i].Name, err)
		}
	}

	return nil
}
