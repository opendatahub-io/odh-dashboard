package controller

import (
	"context"
	"errors"
	"fmt"
	"maps"
	"path/filepath"
	"strings"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
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

const conditionMaaSConsumerPortalAvailable = "MaaSConsumerPortalAvailable"

const (
	maasConsumerPortalConsoleLinkName = "maas-consumer-portal-link"
	maasConsumerPortalDeploymentName  = "maas-consumer-portal"
	maasConsumerPortalPartOf          = maasConsumerPortalDeploymentName
	maasConsumerPortalHostPrefix      = maasConsumerPortalDeploymentName
	maasConsumerPortalGatewayName     = "data-science-gateway"
)

var ErrMaaSConsumerPortalUnsupportedPlatform = errors.New("maas consumer portal is supported only on RHOAI")

func maasConsumerPortalManifestInfo(basePath string) render.ManifestInfo {
	return render.ManifestInfo{
		Path:       basePath,
		ContextDir: "distributions",
		SourcePath: maasConsumerPortalDeploymentName,
	}
}

func maasConsumerPortalURL(domain string) (string, bool) {
	if domain == "" {
		return "", false
	}
	return fmt.Sprintf("https://%s.%s/", maasConsumerPortalHostPrefix, domain), true
}

// reconcileMaaSConsumerPortal independently manages the portal bundle. Its resources
// are deliberately labeled separately from the dashboard so core teardown cannot prune
// a portal that remains desired.
func (r *DashboardReconciler) reconcileMaaSConsumerPortal(ctx context.Context, dashboard *v1alpha1.Dashboard, cm *conditions.Manager, statuses map[string]v1alpha1.ModuleStatus) time.Duration {
	if dashboard.Spec.MaaSConsumerPortal == nil || dashboard.Spec.MaaSConsumerPortal.ManagementState != "Managed" {
		return r.reconcileRemovedMaaSConsumerPortal(ctx, dashboard, cm)
	}
	if !maasConsumerPortalSupportedPlatform(r.Platform) {
		return r.reconcileUnsupportedMaaSConsumerPortal(ctx, dashboard, cm)
	}
	url, ok := maasConsumerPortalURL(portalGatewayDomain(dashboard))
	if !ok {
		cm.MarkFalse(conditionMaaSConsumerPortalAvailable, conditions.WithReason("MaaSConsumerPortalDomainRequired"), conditions.WithMessage("MaaS Consumer Portal is enabled but gateway domain is not set"))
		return 0
	}
	if err := r.deployMaaSConsumerPortalBundle(ctx, dashboard, url); err != nil {
		// The module and federation steps run before the bundle. Preserve their
		// specific failure conditions instead of replacing them with a generic
		// bundle-apply failure, while still applying the portal's desired bundle.
		if maasConsumerPortalUnavailable(cm) {
			log.FromContext(ctx).Error(err, "MaaS Consumer Portal bundle deploy failed (prior condition takes precedence)")
			return maasConsumerPortalRetryInterval
		}
		cm.MarkFalse(conditionMaaSConsumerPortalAvailable,
			conditions.WithReason("MaaSConsumerPortalDeployFailed"),
			conditions.WithMessage("MaaS Consumer Portal deployment failed: %s", err))
		return maasConsumerPortalRetryInterval
	}
	// Do not publish a newly derived URL until all portal readiness checks pass.
	// This preserves the previous endpoint while an update is still unavailable.
	retryAfter := r.reconcileMaaSConsumerPortalAvailability(ctx, dashboard, cm, statuses)
	if retryAfter == 0 {
		dashboard.Status.MaaSConsumerPortalURL = url
	}
	return retryAfter
}

func (r *DashboardReconciler) reconcileRemovedMaaSConsumerPortal(ctx context.Context, dashboard *v1alpha1.Dashboard, cm *conditions.Manager) time.Duration {
	if err := r.deleteMaaSConsumerPortalResources(ctx); err != nil {
		cm.MarkFalse(conditionMaaSConsumerPortalAvailable,
			conditions.WithReason("MaaSConsumerPortalCleanupFailed"),
			conditions.WithMessage("MaaS Consumer Portal cleanup failed: %s", err),
			conditions.WithSeverity(common.ConditionSeverityInfo))
		return maasConsumerPortalRetryInterval
	}
	dashboard.Status.MaaSConsumerPortalURL = ""
	cm.MarkFalse(conditionMaaSConsumerPortalAvailable, conditions.WithReason("Disabled"), conditions.WithMessage("MaaS Consumer Portal is not enabled"), conditions.WithSeverity(common.ConditionSeverityInfo))
	return 0
}

func (r *DashboardReconciler) reconcileUnsupportedMaaSConsumerPortal(ctx context.Context, dashboard *v1alpha1.Dashboard, cm *conditions.Manager) time.Duration {
	if err := r.deleteMaaSConsumerPortalResources(ctx); err != nil {
		cm.MarkFalse(conditionMaaSConsumerPortalAvailable,
			conditions.WithReason("MaaSConsumerPortalCleanupFailed"),
			conditions.WithMessage("MaaS Consumer Portal cleanup failed: %s", err),
			conditions.WithSeverity(common.ConditionSeverityInfo))
		return maasConsumerPortalRetryInterval
	}
	dashboard.Status.MaaSConsumerPortalURL = ""
	cm.MarkFalse(conditionMaaSConsumerPortalAvailable,
		conditions.WithReason("UnsupportedPlatform"),
		conditions.WithMessage("%s", ErrMaaSConsumerPortalUnsupportedPlatform),
		conditions.WithSeverity(common.ConditionSeverityInfo))
	return 0
}

func (r *DashboardReconciler) reconcileMaaSConsumerPortalAvailability(ctx context.Context, dashboard *v1alpha1.Dashboard, cm *conditions.Manager, statuses map[string]v1alpha1.ModuleStatus) time.Duration {
	r.setMaaSConsumerPortalModuleCondition(cm, dashboard, statuses)
	if maasConsumerPortalUnavailable(cm) {
		return maasConsumerPortalRetryInterval
	}
	var route gatewayv1.HTTPRoute
	if err := r.Get(ctx, client.ObjectKey{Name: maasConsumerPortalHostPrefix, Namespace: r.ApplicationsNamespace}, &route); err != nil {
		cm.MarkFalse(conditionMaaSConsumerPortalAvailable,
			conditions.WithReason("MaaSConsumerPortalRouteUnavailable"),
			conditions.WithMessage("getting MaaS Consumer Portal HTTPRoute: %s", err))
		return maasConsumerPortalRetryInterval
	}
	if !portalRouteReady(&route) {
		cm.MarkFalse(conditionMaaSConsumerPortalAvailable,
			conditions.WithReason("MaaSConsumerPortalRouteNotReady"),
			conditions.WithMessage("MaaS Consumer Portal HTTPRoute is not accepted and resolved by Gateway %q", maasConsumerPortalGatewayName))
		return maasConsumerPortalRetryInterval
	}
	var dep appsv1.Deployment
	if err := r.Get(ctx, client.ObjectKey{Name: maasConsumerPortalHostPrefix, Namespace: r.ApplicationsNamespace}, &dep); err != nil || !deploymentAvailable(&dep) {
		if err == nil {
			err = errors.New("deployment is not Available")
		}
		cm.MarkFalse(conditionMaaSConsumerPortalAvailable,
			conditions.WithReason("MaaSConsumerPortalDeploymentUnavailable"),
			conditions.WithMessage("MaaS Consumer Portal Deployment is unavailable: %s", err))
		return maasConsumerPortalRetryInterval
	}
	cm.MarkTrue(conditionMaaSConsumerPortalAvailable, conditions.WithReason("Deployed"), conditions.WithMessage("MaaS Consumer Portal is available"))
	return 0
}

func maasConsumerPortalSupportedPlatform(platform cluster.Platform) bool {
	return platform == cluster.SelfManagedRhoai || platform == cluster.ManagedRhoai
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

func (r *DashboardReconciler) deployMaaSConsumerPortalBundle(ctx context.Context, dashboard *v1alpha1.Dashboard, url string) error {
	m := maasConsumerPortalManifestInfo(r.ManifestsBasePath)
	params := readExistingParams(filepath.Join(m.String(), "params.env"))
	maps.Copy(params, resolveImageParams())
	params["dashboard-namespace"] = r.ApplicationsNamespace
	params["gateway-name"] = maasConsumerPortalGatewayName
	params["maas-consumer-portal-federation-config"] = maasConsumerPortalFederationConfigMapName
	params["maas-consumer-portal-hostname"] = strings.TrimSuffix(strings.TrimPrefix(url, "https://"), "/")
	params["maas-consumer-portal-url"] = url
	params["section-title"] = sectionTitle[r.Platform]
	if err := writeParamsEnv(m.String(), params); err != nil {
		return fmt.Errorf("writing MaaS Consumer Portal params: %w", err)
	}
	rendered, err := kustomize.NewEngine().Render(m.String(), kustomize.WithNamespace(r.ApplicationsNamespace))
	if err != nil {
		return fmt.Errorf("rendering MaaS Consumer Portal bundle: %w", err)
	}
	resources := make([]unstructured.Unstructured, 0, len(rendered))
	for i := range rendered {
		if rendered[i].GetKind() != "ConfigMap" || rendered[i].GetName() != "maas-consumer-portal-params" {
			resources = append(resources, rendered[i])
		}
	}
	if err := deploy.NewDeployer(deploy.WithFieldOwner("dashboard-operator"), deploy.WithLabel(labels.PlatformPartOf, maasConsumerPortalPartOf), deploy.WithApplyOrder()).Deploy(ctx, deploy.DeployInput{Client: r.Client, Owner: dashboard, Release: deploy.ReleaseInfo{Type: string(r.Platform)}, Resources: resources}); err != nil {
		return fmt.Errorf("deploying MaaS Consumer Portal bundle: %w", err)
	}
	cm := &corev1.ConfigMap{}
	if err := r.Get(ctx, client.ObjectKey{Name: maasConsumerPortalFederationConfigMapName, Namespace: r.ApplicationsNamespace}, cm); err != nil {
		if apierrors.IsNotFound(err) {
			// The federation ConfigMap is reconciled separately. Its hash will be
			// applied after it becomes available on a subsequent reconciliation.
			return nil
		}
		return fmt.Errorf("getting MaaS Consumer Portal federation ConfigMap: %w", err)
	}
	if err := r.patchMaaSConsumerPortalDeploymentFederationHash(ctx, cm.Data[federationConfigKey]); err != nil {
		return err
	}
	return nil
}

func (r *DashboardReconciler) deleteMaaSConsumerPortalResources(ctx context.Context) error {
	return errors.Join(
		r.deleteLabeledMaaSConsumerPortalNamespacedResources(ctx),
		r.deleteLabeledMaaSConsumerPortalRBACResources(ctx),
		r.deleteMaaSConsumerPortalServingCertificate(ctx),
		r.deleteLabeledMaaSConsumerPortalCustomResources(ctx),
	)
}

func (r *DashboardReconciler) deleteLabeledMaaSConsumerPortalNamespacedResources(ctx context.Context) error {
	var errs []error
	for _, list := range []client.ObjectList{
		&appsv1.DeploymentList{},
		&corev1.ServiceList{},
		&networkingv1.NetworkPolicyList{},
		&corev1.ConfigMapList{},
	} {
		errs = append(errs, r.deleteLabeledMaaSConsumerPortalResourceList(ctx, list, client.InNamespace(r.ApplicationsNamespace)))
	}
	return errors.Join(errs...)
}

func (r *DashboardReconciler) deleteLabeledMaaSConsumerPortalRBACResources(ctx context.Context) error {
	return errors.Join(
		r.deleteLabeledMaaSConsumerPortalResourceList(ctx, &rbacv1.ClusterRoleList{}),
		r.deleteLabeledMaaSConsumerPortalResourceList(ctx, &rbacv1.ClusterRoleBindingList{}),
	)
}

func (r *DashboardReconciler) deleteMaaSConsumerPortalServingCertificate(ctx context.Context) error {
	// service-ca creates this Secret without an owner reference or portal labels.
	// Delete it explicitly rather than relying on label selection or garbage collection.
	return r.deleteMaaSConsumerPortalObjects(ctx,
		&corev1.Secret{ObjectMeta: metav1.ObjectMeta{
			Name:      maasConsumerPortalHostPrefix + "-tls",
			Namespace: r.ApplicationsNamespace,
		}},
	)
}

func (r *DashboardReconciler) deleteLabeledMaaSConsumerPortalCustomResources(ctx context.Context) error {
	var errs []error
	routes := &unstructured.UnstructuredList{}
	routes.SetAPIVersion("gateway.networking.k8s.io/v1")
	routes.SetKind("HTTPRouteList")
	if err := r.List(ctx, routes, client.MatchingLabels{labels.PlatformPartOf: maasConsumerPortalPartOf}, client.InNamespace(r.ApplicationsNamespace)); err != nil {
		if !meta.IsNoMatchError(err) {
			errs = append(errs, err)
		}
	} else {
		errs = append(errs, r.deleteMaaSConsumerPortalUnstructuredItems(ctx, routes.Items))
	}
	consoleLinks := &unstructured.UnstructuredList{}
	consoleLinks.SetGroupVersionKind(consoleLinkListGVK)
	if err := r.List(ctx, consoleLinks, client.MatchingLabels{labels.PlatformPartOf: maasConsumerPortalPartOf}); err != nil {
		if !meta.IsNoMatchError(err) {
			errs = append(errs, err)
		}
	} else {
		errs = append(errs, r.deleteMaaSConsumerPortalUnstructuredItems(ctx, consoleLinks.Items))
	}
	return errors.Join(errs...)
}

func (r *DashboardReconciler) deleteLabeledMaaSConsumerPortalResourceList(ctx context.Context, list client.ObjectList, options ...client.ListOption) error {
	if err := r.List(ctx, list, append(options, client.MatchingLabels{labels.PlatformPartOf: maasConsumerPortalPartOf})...); err != nil {
		return err
	}
	return r.deleteMaaSConsumerPortalObjects(ctx, extractItems(list)...)
}

func (r *DashboardReconciler) deleteMaaSConsumerPortalUnstructuredItems(ctx context.Context, items []unstructured.Unstructured) error {
	objects := make([]client.Object, 0, len(items))
	for i := range items {
		objects = append(objects, &items[i])
	}
	return r.deleteMaaSConsumerPortalObjects(ctx, objects...)
}

func (r *DashboardReconciler) deleteMaaSConsumerPortalObjects(ctx context.Context, objects ...client.Object) error {
	var errs []error
	for _, obj := range objects {
		if err := r.Delete(ctx, obj); client.IgnoreNotFound(err) != nil {
			errs = append(errs, err)
		}
	}
	return errors.Join(errs...)
}

// maasConsumerPortalUnavailable reports whether an earlier reconciliation step
// has already recorded the primary reason the portal is unavailable.
func maasConsumerPortalUnavailable(cm *conditions.Manager) bool {
	condition := cm.GetCondition(conditionMaaSConsumerPortalAvailable)
	return condition != nil && condition.Status == metav1.ConditionFalse
}

// setMaaSConsumerPortalModuleCondition makes missing MaaS Consumer Portal dependencies
// actionable without coupling shared-module logic to a URL model.
func (r *DashboardReconciler) setMaaSConsumerPortalModuleCondition(
	cm *conditions.Manager,
	dashboard *v1alpha1.Dashboard,
	statuses map[string]v1alpha1.ModuleStatus,
) {
	if dashboard.Spec.MaaSConsumerPortal == nil || dashboard.Spec.MaaSConsumerPortal.ManagementState != "Managed" {
		return
	}
	if maasConsumerPortalUnavailable(cm) {
		return
	}
	for _, name := range maasConsumerPortalRequiredModuleNames() {
		status := statuses[name]
		if moduleHealthy(status.Phase) {
			continue
		}
		cm.MarkFalse(conditionMaaSConsumerPortalAvailable,
			conditions.WithReason("RequiredModuleUnavailable"),
			conditions.WithMessage("Required module %q is unavailable: %s", name, status.Message))
		return
	}
}

func (r *DashboardReconciler) markMaaSConsumerPortalFederationConfigMapFailed(cm *conditions.Manager, err error) {
	if maasConsumerPortalUnavailable(cm) {
		return
	}
	cm.MarkFalse(conditionMaaSConsumerPortalAvailable,
		conditions.WithReason("MaaSConsumerPortalFederationConfigMapFailed"),
		conditions.WithMessage("MaaS Consumer Portal federation ConfigMap reconciliation failed: %s", err))
}
