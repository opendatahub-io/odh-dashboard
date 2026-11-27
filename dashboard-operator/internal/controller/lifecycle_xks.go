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
	platformresources "github.com/opendatahub-io/odh-platform-utilities/pkg/resources"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/log"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

func (xksDashboardLifecycle) readyDependents() []string {
	return []string{
		string(common.ConditionTypeProvisioningSucceeded),
		conditionDashboardAvailable,
		string(common.ConditionTypeDegraded),
	}
}

func (xksDashboardLifecycle) availabilityTarget() dashboardAvailabilityTarget {
	return dashboardAvailabilityTarget{deploymentName: rhaiiDashboardResourceName, httpRouteName: rhaiiDashboardResourceName}
}

func (l xksDashboardLifecycle) Reconcile(ctx context.Context, dashboard *v1alpha1.Dashboard, cm *conditions.Manager, cfg OperatorConfig) (ctrl.Result, error) {
	return l.reconcileRHAIIDashboard(ctx, dashboard, cm, cfg)
}

// networkPoliciesBeforeWorkloads moves NetworkPolicies ahead of the first
// workload in an apply-ordered list. The shared apply order lists Deployment
// explicitly and sorts NetworkPolicy among the unlisted kinds after it, so a
// failure between the two (for example a missing Certificate CRD) would leave
// the dashboard pods without their ingress policy until a later pass.
func networkPoliciesBeforeWorkloads(_ context.Context, objects []unstructured.Unstructured) ([]unstructured.Unstructured, error) {
	ordered := make([]unstructured.Unstructured, 0, len(objects))
	var policies []unstructured.Unstructured
	for i := range objects {
		if objects[i].GetKind() == "NetworkPolicy" {
			policies = append(policies, objects[i])
		}
	}
	inserted := false
	for i := range objects {
		switch objects[i].GetKind() {
		case "NetworkPolicy":
			continue
		case "Deployment", "StatefulSet", "DaemonSet", "ReplicaSet", "Pod", "Job", "CronJob":
			if !inserted {
				ordered = append(ordered, policies...)
				inserted = true
			}
		}
		ordered = append(ordered, objects[i])
	}
	if !inserted {
		ordered = append(ordered, policies...)
	}
	return ordered, nil
}

// xksRequiredAPIRetryInterval bounds the retry while cert-manager or Gateway API
// CRDs are missing; their arrival triggers no watch event.
const xksRequiredAPIRetryInterval = 30 * time.Second

func (l xksDashboardLifecycle) Remove(ctx context.Context, dashboard *v1alpha1.Dashboard, previousStatus *v1alpha1.DashboardStatus, cm *conditions.Manager) (ctrl.Result, error) {
	return l.removeRHAIIDashboard(ctx, dashboard, previousStatus, cm)
}

// Finalize removes the XKS bundle in dependency order before releasing the
// Dashboard finalizer. In particular, NetworkPolicies remain in place until
// direct reads confirm that selected workload Pods have terminated. XKS has no
// OpenShift cross-namespace resources to clean up.
func (l xksDashboardLifecycle) Finalize(ctx context.Context, dashboard *v1alpha1.Dashboard) (ctrl.Result, error) {
	teardown, err := l.reconciler.teardownManagedResources(ctx, dashboard, nil, false, false)
	if err != nil {
		return ctrl.Result{}, fmt.Errorf("failed to finalize XKS dashboard resources: %w", err)
	}
	if teardown.Pending {
		return ctrl.Result{RequeueAfter: teardownRetryInterval}, nil
	}
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
	certManagerConfig, err := readCertManagerConfig(ctx, r.apiReader(), r.Namespace)
	if err != nil {
		cm.MarkFalse(string(common.ConditionTypeProvisioningSucceeded),
			conditions.WithReason("CertManagerConfigUnavailable"),
			conditions.WithError(err))
		return ctrl.Result{}, fmt.Errorf("reading XKS cert-manager configuration: %w", err)
	}
	if err := applyKustomizeParamsWithOverrides(dashboard, manifests, r.Platform, map[string]string{
		"certificate-issuer-name":   certManagerConfig.IssuerRefName,
		"certificate-issuer-kind":   certManagerConfig.IssuerRefKind,
		"certificate-issuer-group":  certManagerConfig.IssuerRefGroup,
		"rhaii-dashboard-namespace": r.ApplicationsNamespace,
	}); err != nil {
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
	if err := revertServicePortDrift(ctx, r.apiReader(), r.Client, resources); err != nil {
		cm.MarkFalse(string(common.ConditionTypeProvisioningSucceeded),
			conditions.WithReason("ServicePortDriftRepairFailed"),
			conditions.WithError(err))
		return ctrl.Result{}, fmt.Errorf("failed to repair XKS Service port drift: %w", err)
	}

	deployer := deploy.NewDeployer(
		deploy.WithFieldOwner(dashboardFieldOwner),
		deploy.WithLabel(labels.PlatformPartOf, strings.ToLower(v1alpha1.DashboardKind)),
		deploy.WithSortFn(deploy.SortFn(platformresources.SortByApplyOrder).Then(networkPoliciesBeforeWorkloads)),
		deploy.WithMergeStrategy(deploymentGVK, deploy.MergeDeployments),
	)
	if err := deployer.Deploy(ctx, deploy.DeployInput{
		Client:    r.Client,
		Owner:     dashboard,
		Release:   deploy.ReleaseInfo{Type: string(r.Platform)},
		Resources: resources,
	}); err != nil {
		if meta.IsNoMatchError(err) {
			// A required API (cert-manager Certificate, Gateway API HTTPRoute) is not
			// installed yet. Nothing watches for its CRD, and error backoff would grow
			// to many minutes before the next attempt, so retry on a bounded interval.
			cm.MarkFalse(string(common.ConditionTypeProvisioningSucceeded),
				conditions.WithReason("RequiredAPIUnavailable"),
				conditions.WithMessage("Waiting for a required API to be installed: %v", err))
			log.FromContext(ctx).Info("Required API for the XKS bundle is not installed; retrying", "requeueAfter", xksRequiredAPIRetryInterval, "error", err.Error())
			return ctrl.Result{RequeueAfter: xksRequiredAPIRetryInterval}, nil
		}
		cm.MarkFalse(string(common.ConditionTypeProvisioningSucceeded),
			conditions.WithReason("DeployFailed"),
			conditions.WithError(err))
		return ctrl.Result{}, fmt.Errorf("failed to deploy XKS dashboard: %w", err)
	}

	cm.MarkTrue(string(common.ConditionTypeProvisioningSucceeded),
		conditions.WithReason("ResourcesApplied"),
		conditions.WithMessage("RHAII dashboard manifests applied successfully"))

	availabilityRetryAfter, err := r.reconcileDashboardAvailability(ctx, dashboard, cm, l.availabilityTarget())
	if err != nil {
		return ctrl.Result{}, err
	}

	dashboard.Status.URL = ""
	cm.MarkFalse(string(common.ConditionTypeDegraded),
		conditions.WithReason("NoDegradation"),
		conditions.WithMessage("No Dashboard degradation has been observed"),
		conditions.WithSeverity(common.ConditionSeverityInfo))
	requeueAfter := availabilityRetryAfter
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
	previousStatus *v1alpha1.DashboardStatus,
	cm *conditions.Manager,
) (ctrl.Result, error) {
	r := l.reconciler
	teardown, err := r.teardownManagedResources(ctx, dashboard, nil, false, false)
	if err != nil {
		r.persistRemovedFailureStatus(ctx, dashboard, previousStatus, cm, "TeardownFailed", err)
		return ctrl.Result{}, fmt.Errorf("failed to tear down XKS dashboard resources: %w", err)
	}
	if teardown.Pending {
		if err := r.persistDashboardRemovalPendingStatus(ctx, dashboard, previousStatus, cm); err != nil {
			return ctrl.Result{}, fmt.Errorf("failed to update removal-in-progress status: %w", err)
		}
		return ctrl.Result{RequeueAfter: teardownRetryInterval}, nil
	}

	dashboard.Status.ModuleStatuses = nil
	cm.MarkFalse(string(common.ConditionTypeProvisioningSucceeded),
		conditions.WithReason(conditionReasonRemoved),
		conditions.WithMessage("RHAII dashboard has been removed via managementState"),
		conditions.WithSeverity(common.ConditionSeverityInfo))
	cm.MarkFalse(string(common.ConditionTypeDegraded),
		conditions.WithReason(conditionReasonRemoved),
		conditions.WithMessage("RHAII dashboard has been removed"),
		conditions.WithSeverity(common.ConditionSeverityInfo))
	cm.MarkFalse(conditionDashboardAvailable,
		conditions.WithReason(conditionReasonRemoved),
		conditions.WithMessage("RHAII dashboard has been removed"),
		conditions.WithSeverity(common.ConditionSeverityInfo))
	cm.MarkFalse(string(common.ConditionTypeReady),
		conditions.WithReason(conditionReasonRemoved),
		conditions.WithMessage("RHAII dashboard has been removed via managementState"))
	dashboard.Status.Phase = common.PhaseNotReady

	if err := r.persistDashboardRemovalStatus(ctx, dashboard, previousStatus, cm, nil); err != nil {
		return ctrl.Result{}, fmt.Errorf("failed to update XKS removal status: %w", err)
	}

	return ctrl.Result{}, nil
}
