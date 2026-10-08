package controller

import (
	"context"
	"errors"
	"fmt"
	"maps"
	"path/filepath"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/controller/conditions"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/deploy"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/render"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/render/kustomize"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

const conditionMaaSPortalAvailable = "MaaSConsumerPortalAvailable"
const maasPortalRetryInterval = time.Minute

const (
	maasPortalDeploymentName      = "maas-portal"
	maasPortalSourceDirectory     = "maas-portal"
	maasPortalParamsConfigMapName = "maas-portal-params"
	maasPortalPartOf              = maasPortalDeploymentName
	maasPortalGatewayName         = "data-science-gateway"
	maasPortalBasePath            = "/maas-consumer-portal/"
)

var ErrMaaSPortalUnsupportedPlatform = errors.New("MaaS Portal is supported only on RHOAI")

func maasPortalManifestInfo(basePath string) render.ManifestInfo {
	return render.ManifestInfo{
		Path:       basePath,
		ContextDir: "distributions",
		SourcePath: maasPortalSourceDirectory,
	}
}

func maasPortalURL(domain string) (string, bool) {
	if domain == "" {
		return "", false
	}
	return fmt.Sprintf("https://%s%s", domain, maasPortalBasePath), true
}

// reconcileMaaSPortalOperand applies federation configuration before
// reconciling the portal bundle and availability in either core management state.
// If observability detection failed, preserve only the existing Perses entry.
func (r *DashboardReconciler) reconcileMaaSPortalOperand(
	ctx context.Context,
	dashboard *v1alpha1.Dashboard,
	cm *conditions.Manager,
	statuses map[string]v1alpha1.ModuleStatus,
	observabilityKnown bool,
) time.Duration {
	if err := r.deployMaaSPortalFederationConfigMap(ctx, dashboard, statuses, observabilityKnown); err != nil {
		r.markMaaSPortalFederationConfigMapFailed(cm, err)
		log.FromContext(ctx).Error(err, "Failed to deploy MaaS Portal federation ConfigMap")
	}
	return r.reconcileMaaSPortal(ctx, dashboard, cm, statuses)
}

// reconcileMaaSPortal independently manages the portal bundle. Its resources
// are deliberately labeled separately from the dashboard so core teardown cannot prune
// a portal that remains desired.
func (r *DashboardReconciler) reconcileMaaSPortal(ctx context.Context, dashboard *v1alpha1.Dashboard, cm *conditions.Manager, statuses map[string]v1alpha1.ModuleStatus) time.Duration {
	portal := effectiveMaaSPortal(dashboard.Spec)
	backfillMaaSPortalURL(&dashboard.Status)
	if portal == nil || portal.ManagementState != "Managed" {
		return r.reconcileRemovedMaaSPortal(ctx, dashboard, cm)
	}
	if !maasPortalSupportedPlatform(r.Platform) {
		return r.reconcileUnsupportedMaaSPortal(ctx, dashboard, cm)
	}
	gatewayDomain := portalGatewayDomain(dashboard)
	url, ok := maasPortalURL(gatewayDomain)
	if !ok {
		cm.MarkFalse(conditionMaaSPortalAvailable, conditions.WithReason("MaaSConsumerPortalDomainRequired"), conditions.WithMessage("MaaS Portal is enabled but gateway domain is not set"))
		return maasPortalRetryInterval
	}
	migration, err := r.deployMaaSPortalBundle(ctx, dashboard)
	if err != nil {
		// The module and federation steps run before the bundle. Preserve their
		// specific failure conditions instead of replacing them with a generic
		// bundle-apply failure, while still applying the portal's desired bundle.
		if maasPortalUnavailable(cm) {
			log.FromContext(ctx).Error(err, "MaaS Portal bundle deploy failed (prior condition takes precedence)")
			return maasPortalRetryInterval
		}
		cm.MarkFalse(conditionMaaSPortalAvailable,
			conditions.WithReason("MaaSConsumerPortalDeployFailed"),
			conditions.WithMessage("MaaS Portal deployment failed: %s", err))
		return maasPortalRetryInterval
	}
	if migration.Pending {
		if !maasPortalUnavailable(cm) {
			cm.MarkFalse(conditionMaaSPortalAvailable, conditions.WithReason("MigrationPending"),
				conditions.WithMessage("Waiting for the updated MaaS Portal rollout or legacy HTTPRoute deletion"))
		}
		return maasPortalRetryInterval
	}
	// Do not publish a newly derived URL until all portal readiness checks pass.
	// This preserves the previous endpoint while an update is still unavailable.
	retryAfter := r.reconcileMaaSPortalAvailability(ctx, dashboard, cm, statuses)
	if retryAfter == 0 {
		legacyDeployment, err := legacyMaaSPortalDeploymentExists(ctx, r.Client, r.ApplicationsNamespace)
		if err == nil {
			migration, err = r.deleteLegacyMaaSPortalResources(ctx)
		}
		if err != nil {
			cm.MarkFalse(conditionMaaSPortalAvailable,
				conditions.WithReason("MaaSPortalMigrationCleanupFailed"),
				conditions.WithMessage("Legacy MaaS Portal cleanup failed: %s", err))
			return maasPortalRetryInterval
		}
		if migration.Pending {
			cm.MarkFalse(conditionMaaSPortalAvailable, conditions.WithReason("MigrationPending"),
				conditions.WithMessage("Waiting for deletion of legacy MaaS Portal resources"))
			return maasPortalRetryInterval
		}
		setMaaSPortalURL(&dashboard.Status, url)
		if legacyDeployment {
			// Re-render shared policies without temporary legacy peers even if
			// the old Deployment had no owner reference to trigger a watch.
			return maasPortalRetryInterval
		}
	}
	return retryAfter
}

func (r *DashboardReconciler) reconcileRemovedMaaSPortal(ctx context.Context, dashboard *v1alpha1.Dashboard, cm *conditions.Manager) time.Duration {
	backfillMaaSPortalURL(&dashboard.Status)
	cleanup, err := r.deleteMaaSPortalResources(ctx)
	if err != nil {
		cm.MarkFalse(conditionMaaSPortalAvailable,
			conditions.WithReason("MaaSConsumerPortalCleanupFailed"),
			conditions.WithMessage("MaaS Portal cleanup failed: %s", err),
			conditions.WithSeverity(common.ConditionSeverityInfo))
		return maasPortalRetryInterval
	}
	if cleanup.Pending {
		cm.MarkFalse(conditionMaaSPortalAvailable, conditions.WithReason("CleanupPending"),
			conditions.WithMessage("Waiting for deletion of legacy MaaS Portal resources"),
			conditions.WithSeverity(common.ConditionSeverityInfo))
		return maasPortalRetryInterval
	}
	setMaaSPortalURL(&dashboard.Status, "")
	cm.MarkFalse(conditionMaaSPortalAvailable, conditions.WithReason("Disabled"), conditions.WithMessage("MaaS Portal is not enabled"), conditions.WithSeverity(common.ConditionSeverityInfo))
	return 0
}

func (r *DashboardReconciler) reconcileUnsupportedMaaSPortal(ctx context.Context, dashboard *v1alpha1.Dashboard, cm *conditions.Manager) time.Duration {
	backfillMaaSPortalURL(&dashboard.Status)
	cleanup, err := r.deleteMaaSPortalResources(ctx)
	if err != nil {
		cm.MarkFalse(conditionMaaSPortalAvailable,
			conditions.WithReason("MaaSConsumerPortalCleanupFailed"),
			conditions.WithMessage("MaaS Portal cleanup failed: %s", err),
			conditions.WithSeverity(common.ConditionSeverityInfo))
		return maasPortalRetryInterval
	}
	if cleanup.Pending {
		cm.MarkFalse(conditionMaaSPortalAvailable, conditions.WithReason("CleanupPending"),
			conditions.WithMessage("Waiting for deletion of legacy MaaS Portal resources"),
			conditions.WithSeverity(common.ConditionSeverityInfo))
		return maasPortalRetryInterval
	}
	setMaaSPortalURL(&dashboard.Status, "")
	cm.MarkFalse(conditionMaaSPortalAvailable,
		conditions.WithReason("UnsupportedPlatform"),
		conditions.WithMessage("%s", ErrMaaSPortalUnsupportedPlatform),
		conditions.WithSeverity(common.ConditionSeverityInfo))
	return 0
}

func (r *DashboardReconciler) reconcileMaaSPortalAvailability(ctx context.Context, dashboard *v1alpha1.Dashboard, cm *conditions.Manager, statuses map[string]v1alpha1.ModuleStatus) time.Duration {
	r.setMaaSPortalModuleCondition(cm, dashboard, statuses)
	if maasPortalUnavailable(cm) {
		return maasPortalRetryInterval
	}
	var route gatewayv1.HTTPRoute
	if err := r.Get(ctx, client.ObjectKey{Name: maasPortalDeploymentName, Namespace: r.ApplicationsNamespace}, &route); err != nil {
		cm.MarkFalse(conditionMaaSPortalAvailable,
			conditions.WithReason("MaaSConsumerPortalRouteUnavailable"),
			conditions.WithMessage("getting MaaS Portal HTTPRoute: %s", err))
		return maasPortalRetryInterval
	}
	if !portalRouteReady(&route) {
		cm.MarkFalse(conditionMaaSPortalAvailable,
			conditions.WithReason("MaaSConsumerPortalRouteNotReady"),
			conditions.WithMessage("MaaS Portal HTTPRoute is not accepted and resolved by Gateway %q", maasPortalGatewayName))
		return maasPortalRetryInterval
	}
	var dep appsv1.Deployment
	if err := r.Get(ctx, client.ObjectKey{Name: maasPortalDeploymentName, Namespace: r.ApplicationsNamespace}, &dep); err != nil || !deploymentAvailable(&dep) {
		if err == nil {
			err = errors.New("deployment is not Available")
		}
		cm.MarkFalse(conditionMaaSPortalAvailable,
			conditions.WithReason("MaaSConsumerPortalDeploymentUnavailable"),
			conditions.WithMessage("MaaS Portal Deployment is unavailable: %s", err))
		return maasPortalRetryInterval
	}
	cm.MarkTrue(conditionMaaSPortalAvailable, conditions.WithReason("Deployed"), conditions.WithMessage("MaaS Portal is available"))
	return 0
}

func maasPortalSupportedPlatform(platform cluster.Platform) bool {
	return platform == cluster.SelfManagedRhoai || platform == cluster.ManagedRhoai
}

func (r *DashboardReconciler) maasPortalManaged(dashboard *v1alpha1.Dashboard) bool {
	portal := effectiveMaaSPortal(dashboard.Spec)
	return portal != nil && portal.ManagementState == "Managed" &&
		maasPortalSupportedPlatform(r.Platform)
}

func portalGatewayDomain(d *v1alpha1.Dashboard) string {
	if d.Spec.Gateway != nil {
		return d.Spec.Gateway.Domain
	}
	return ""
}

func deploymentAvailable(dep *appsv1.Deployment) bool {
	if dep.Status.ObservedGeneration != dep.Generation {
		return false
	}
	for _, c := range dep.Status.Conditions {
		if c.Type == appsv1.DeploymentAvailable && c.Status == corev1.ConditionTrue {
			return true
		}
	}
	return false
}
func portalRouteReady(route *gatewayv1.HTTPRoute) bool {
	for _, p := range route.Status.Parents {
		accepted, resolved := false, false
		for _, c := range p.Conditions {
			if c.Type == string(gatewayv1.RouteConditionAccepted) && c.Status == metav1.ConditionTrue && c.ObservedGeneration == route.Generation {
				accepted = true
			}
			if c.Type == string(gatewayv1.RouteConditionResolvedRefs) && c.Status == metav1.ConditionTrue && c.ObservedGeneration == route.Generation {
				resolved = true
			}
		}
		if accepted && resolved {
			return true
		}
	}
	return false
}

func (r *DashboardReconciler) deployMaaSPortalBundle(ctx context.Context, dashboard *v1alpha1.Dashboard) (maasPortalMigrationResult, error) {
	resources, err := r.renderMaaSPortalBundle(ctx, dashboard)
	if err != nil {
		return maasPortalMigrationResult{}, err
	}
	workloads, routes := splitMaaSPortalRoutes(resources)
	// Apply the desired image and federation hash before checking the rollout
	// through the API reader. Cutover must wait for this revision's replicas,
	// rather than availability supplied by pods from an earlier revision.
	if err := r.deployMaaSPortalResources(ctx, dashboard, workloads); err != nil {
		return maasPortalMigrationResult{}, fmt.Errorf("deploying MaaS Portal bundle: %w", err)
	}
	if err := r.syncMaaSPortalDeploymentFederationHash(ctx); err != nil {
		return maasPortalMigrationResult{}, err
	}
	return r.deployMaaSPortalRoute(ctx, dashboard, routes)
}

func (r *DashboardReconciler) renderMaaSPortalBundle(ctx context.Context, dashboard *v1alpha1.Dashboard) ([]unstructured.Unstructured, error) {
	m := maasPortalManifestInfo(r.ManifestsBasePath)
	params := readExistingParams(filepath.Join(m.String(), "params.env"))
	maps.Copy(params, resolveImageParams())
	params["dashboard-namespace"] = r.ApplicationsNamespace
	params["operator-namespace"] = r.Namespace
	params["perses-namespace"] = r.maasPortalPersesNamespace(dashboard)
	params["gateway-name"] = maasPortalGatewayName
	params["maas-portal-federation-config"] = maasPortalFederationConfigMapName
	if err := writeParamsEnv(m.String(), params); err != nil {
		return nil, fmt.Errorf("writing MaaS Portal params: %w", err)
	}
	rendered, err := kustomize.NewEngine().Render(m.String(), kustomize.WithNamespace(r.ApplicationsNamespace))
	if err != nil {
		return nil, fmt.Errorf("rendering MaaS Portal bundle: %w", err)
	}
	operatorNamespaces, err := r.existingMaaSPortalOperatorNamespaces(ctx)
	if err != nil {
		return nil, fmt.Errorf("getting operator namespaces: %w", err)
	}
	rendered = setMaaSPortalOperatorSubscriptionNamespaces(rendered, r.Namespace)
	return filterMaaSPortalResources(rendered, operatorNamespaces), nil
}

func splitMaaSPortalRoutes(resources []unstructured.Unstructured) (workloads, routes []unstructured.Unstructured) {
	for i := range resources {
		if resources[i].GetKind() == "HTTPRoute" {
			routes = append(routes, resources[i])
		} else {
			workloads = append(workloads, resources[i])
		}
	}
	return workloads, routes
}

func (r *DashboardReconciler) deployMaaSPortalResources(ctx context.Context, dashboard *v1alpha1.Dashboard, resources []unstructured.Unstructured) error {
	deployer := deploy.NewDeployer(deploy.WithFieldOwner("dashboard-operator"), deploy.WithLabel(labels.PlatformPartOf, maasPortalPartOf), deploy.WithApplyOrder())
	return deployer.Deploy(ctx, deploy.DeployInput{Client: r.Client, Owner: dashboard,
		Release: deploy.ReleaseInfo{Type: string(r.Platform)}, Resources: resources})
}

func (r *DashboardReconciler) maasPortalPersesNamespace(dashboard *v1alpha1.Dashboard) string {
	if dashboard.Spec.Observability != nil && dashboard.Spec.Observability.PersesService != nil &&
		dashboard.Spec.Observability.PersesService.Namespace != "" {
		return dashboard.Spec.Observability.PersesService.Namespace
	}

	return r.monitoringNamespace()
}

// setMaaSPortalPersesIngressNamespace updates only the portal peer;
// the policy itself remains in the Perses namespace.
func setMaaSPortalPersesIngressNamespace(resources []unstructured.Unstructured, applicationsNamespace string) error {
	if applicationsNamespace == "" {
		return fmt.Errorf("observability applications namespace must not be empty")
	}
	for i := range resources {
		resource := &resources[i]
		if resource.GetKind() != "NetworkPolicy" || resource.GetName() != "dashboard-perses-access" {
			continue
		}
		var policy networkingv1.NetworkPolicy
		if err := runtime.DefaultUnstructuredConverter.FromUnstructured(resource.Object, &policy); err != nil {
			return err
		}
		for _, ingress := range policy.Spec.Ingress {
			for _, peer := range ingress.From {
				if peer.PodSelector != nil && peer.NamespaceSelector != nil &&
					peer.PodSelector.MatchLabels["app.kubernetes.io/part-of"] == maasPortalDeploymentName {
					if peer.NamespaceSelector.MatchLabels == nil {
						peer.NamespaceSelector.MatchLabels = make(map[string]string)
					}
					peer.NamespaceSelector.MatchLabels["kubernetes.io/metadata.name"] = applicationsNamespace
				}
			}
		}
		object, err := runtime.DefaultUnstructuredConverter.ToUnstructured(&policy)
		if err != nil {
			return err
		}
		resource.Object = object
	}
	return nil
}

func (r *DashboardReconciler) deleteMaaSPortalResources(ctx context.Context) (maasPortalMigrationResult, error) {
	result, err := r.deleteLegacyMaaSPortalResources(ctx)
	return result, errors.Join(
		err,
		r.deleteLabeledMaaSPortalNamespacedResources(ctx),
		r.deleteLabeledMaaSPortalRBACResources(ctx),
		r.deleteMaaSPortalServingCertificate(ctx),
		r.deleteLabeledMaaSPortalCustomResources(ctx),
	)
}

func (r *DashboardReconciler) deleteLabeledMaaSPortalNamespacedResources(ctx context.Context) error {
	var errs []error
	for _, list := range []client.ObjectList{
		&appsv1.DeploymentList{},
		&corev1.ServiceList{},
		&corev1.ServiceAccountList{},
		&networkingv1.NetworkPolicyList{},
		&corev1.ConfigMapList{},
	} {
		errs = append(errs, r.deleteLabeledMaaSPortalResourceList(ctx, list, client.InNamespace(r.ApplicationsNamespace)))
	}
	return errors.Join(errs...)
}

func (r *DashboardReconciler) deleteLabeledMaaSPortalRBACResources(ctx context.Context) error {
	return errors.Join(
		r.deleteLabeledMaaSPortalResourceList(ctx, &rbacv1.ClusterRoleList{}),
		r.deleteLabeledMaaSPortalResourceList(ctx, &rbacv1.ClusterRoleBindingList{}),
		r.deleteLabeledMaaSPortalOperatorSubscriptionRBACResources(ctx),
	)
}

func (r *DashboardReconciler) deleteMaaSPortalServingCertificate(ctx context.Context) error {
	// service-ca creates this Secret without an owner reference or portal labels.
	// Delete it explicitly rather than relying on label selection or garbage collection.
	return r.deleteMaaSPortalObjects(ctx,
		&corev1.Secret{ObjectMeta: metav1.ObjectMeta{
			Name:      maasPortalDeploymentName + "-tls",
			Namespace: r.ApplicationsNamespace,
		}},
	)
}

func (r *DashboardReconciler) deleteLabeledMaaSPortalCustomResources(ctx context.Context) error {
	var errs []error
	routes := &unstructured.UnstructuredList{}
	routes.SetAPIVersion("gateway.networking.k8s.io/v1")
	routes.SetKind("HTTPRouteList")
	if err := r.List(ctx, routes, client.MatchingLabels{labels.PlatformPartOf: maasPortalPartOf}, client.InNamespace(r.ApplicationsNamespace)); err != nil {
		if !meta.IsNoMatchError(err) {
			errs = append(errs, err)
		}
	} else {
		errs = append(errs, r.deleteMaaSPortalUnstructuredItems(ctx, routes.Items))
	}
	return errors.Join(errs...)
}

func (r *DashboardReconciler) deleteLabeledMaaSPortalResourceList(ctx context.Context, list client.ObjectList, options ...client.ListOption) error {
	if err := r.List(ctx, list, append(options, client.MatchingLabels{labels.PlatformPartOf: maasPortalPartOf})...); err != nil {
		return err
	}
	return r.deleteMaaSPortalObjects(ctx, extractItems(list)...)
}

func (r *DashboardReconciler) deleteMaaSPortalUnstructuredItems(ctx context.Context, items []unstructured.Unstructured) error {
	objects := make([]client.Object, 0, len(items))
	for i := range items {
		objects = append(objects, &items[i])
	}
	return r.deleteMaaSPortalObjects(ctx, objects...)
}

func (r *DashboardReconciler) deleteMaaSPortalObjects(ctx context.Context, objects ...client.Object) error {
	var errs []error
	for _, obj := range objects {
		if err := r.Delete(ctx, obj); client.IgnoreNotFound(err) != nil {
			errs = append(errs, err)
		}
	}
	return errors.Join(errs...)
}

// maasPortalUnavailable reports whether an earlier reconciliation step
// has already recorded the primary reason the portal is unavailable.
func maasPortalUnavailable(cm *conditions.Manager) bool {
	condition := cm.GetCondition(conditionMaaSPortalAvailable)
	return condition != nil && condition.Status == metav1.ConditionFalse
}

// setMaaSPortalModuleCondition makes missing MaaS Portal dependencies
// actionable without coupling shared-module logic to a URL model.
func (r *DashboardReconciler) setMaaSPortalModuleCondition(
	cm *conditions.Manager,
	dashboard *v1alpha1.Dashboard,
	statuses map[string]v1alpha1.ModuleStatus,
) {
	portal := effectiveMaaSPortal(dashboard.Spec)
	if portal == nil || portal.ManagementState != "Managed" {
		return
	}
	if maasPortalUnavailable(cm) {
		return
	}
	for _, name := range maasPortalRequiredModuleNames() {
		status := statuses[name]
		if moduleHealthy(status.Phase) {
			continue
		}
		cm.MarkFalse(conditionMaaSPortalAvailable,
			conditions.WithReason("RequiredModuleUnavailable"),
			conditions.WithMessage("Required module %q is unavailable: %s", name, status.Message))
		return
	}
}

func (r *DashboardReconciler) markMaaSPortalFederationConfigMapFailed(cm *conditions.Manager, err error) {
	if maasPortalUnavailable(cm) {
		return
	}
	cm.MarkFalse(conditionMaaSPortalAvailable,
		conditions.WithReason("MaaSConsumerPortalFederationConfigMapFailed"),
		conditions.WithMessage("MaaS Portal federation ConfigMap reconciliation failed: %s", err))
}
