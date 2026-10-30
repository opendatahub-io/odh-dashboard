package controller

import (
	"context"
	"fmt"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/controller/conditions"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

const (
	conditionDashboardAvailable        = "DashboardAvailable"
	dashboardAvailabilityRetryInterval = 10 * time.Second
)

// dashboardAvailabilityTarget identifies the primary workload and ingress a
// lifecycle exposes as the Dashboard application.
type dashboardAvailabilityTarget struct {
	deploymentName string
	httpRouteName  string
}

// reconcileDashboardAvailability reports whether the primary Dashboard
// workload has rolled out and its Gateway API route is accepted by the
// configured Gateway. Applying manifests is deliberately tracked separately
// by ProvisioningSucceeded.
func (r *DashboardReconciler) reconcileDashboardAvailability(
	ctx context.Context,
	dashboard *v1alpha1.Dashboard,
	cm *conditions.Manager,
	target dashboardAvailabilityTarget,
) (time.Duration, error) {
	deployment := &appsv1.Deployment{}
	if err := r.Get(ctx, client.ObjectKey{Name: target.deploymentName, Namespace: r.ApplicationsNamespace}, deployment); err != nil {
		if k8serrors.IsNotFound(err) {
			cm.MarkFalse(conditionDashboardAvailable,
				conditions.WithReason("DeploymentNotFound"),
				conditions.WithMessage("Waiting for Dashboard Deployment %q", target.deploymentName))
			return dashboardAvailabilityRetryInterval, nil
		}
		cm.MarkFalse(conditionDashboardAvailable,
			conditions.WithError(err),
			conditions.WithReason("DeploymentReadFailed"))
		return 0, fmt.Errorf("getting Dashboard Deployment %q: %w", target.deploymentName, err)
	}
	if !deploymentAvailable(deployment) {
		cm.MarkFalse(conditionDashboardAvailable,
			conditions.WithReason("DeploymentNotAvailable"),
			conditions.WithMessage("Waiting for Dashboard Deployment %q to become Available", target.deploymentName))
		return dashboardAvailabilityRetryInterval, nil
	}

	route := &gatewayv1.HTTPRoute{}
	if err := r.Get(ctx, client.ObjectKey{Name: target.httpRouteName, Namespace: r.ApplicationsNamespace}, route); err != nil {
		if k8serrors.IsNotFound(err) {
			cm.MarkFalse(conditionDashboardAvailable,
				conditions.WithReason("HTTPRouteNotFound"),
				conditions.WithMessage("Waiting for Dashboard HTTPRoute %q", target.httpRouteName))
			return dashboardAvailabilityRetryInterval, nil
		}
		cm.MarkFalse(conditionDashboardAvailable,
			conditions.WithError(err),
			conditions.WithReason("HTTPRouteReadFailed"))
		return 0, fmt.Errorf("getting Dashboard HTTPRoute %q: %w", target.httpRouteName, err)
	}
	if !httpRouteAvailable(route) {
		cm.MarkFalse(conditionDashboardAvailable,
			conditions.WithReason("HTTPRouteNotAccepted"),
			conditions.WithMessage("Waiting for Dashboard HTTPRoute %q to be accepted with resolved references", target.httpRouteName))
		return dashboardAvailabilityRetryInterval, nil
	}

	cm.MarkTrue(conditionDashboardAvailable,
		conditions.WithReason("ResourcesAvailable"),
		conditions.WithMessage("Dashboard Deployment and HTTPRoute are available"))
	return 0, nil
}

func deploymentAvailable(deployment *appsv1.Deployment) bool {
	if deployment.Status.ObservedGeneration != deployment.Generation {
		return false
	}
	if deployment.Spec.Replicas != nil && *deployment.Spec.Replicas == 0 {
		return false
	}
	if deployment.Status.AvailableReplicas == 0 {
		return false
	}
	for _, condition := range deployment.Status.Conditions {
		if condition.Type == appsv1.DeploymentAvailable && condition.Status == corev1.ConditionTrue {
			return true
		}
	}
	return false
}

// httpRouteAvailable requires conditions for one of the HTTPRoute's declared
// parents. Status for an unrelated parent must not make the Dashboard Ready.
func httpRouteAvailable(route *gatewayv1.HTTPRoute) bool {
	for _, status := range route.Status.Parents {
		if !declaresRouteParent(route, status.ParentRef) {
			continue
		}
		accepted, resolvedRefs := false, false
		for _, condition := range status.Conditions {
			if condition.ObservedGeneration != route.Generation || condition.Status != metav1.ConditionTrue {
				continue
			}
			switch condition.Type {
			case string(gatewayv1.RouteConditionAccepted):
				accepted = true
			case string(gatewayv1.RouteConditionResolvedRefs):
				resolvedRefs = true
			}
		}
		if accepted && resolvedRefs {
			return true
		}
	}
	return false
}

func declaresRouteParent(route *gatewayv1.HTTPRoute, statusParent gatewayv1.ParentReference) bool {
	for _, declaredParent := range route.Spec.ParentRefs {
		if routeParentReferenceMatches(route.Namespace, declaredParent, statusParent) {
			return true
		}
	}
	return false
}

// routeParentReferenceMatches reports whether a status parent corresponds to a
// declared parent. A declared section or port constrains the attachment and
// must match exactly. When omitted, a Gateway implementation may report the
// concrete listener it selected for the broad parent reference.
func routeParentReferenceMatches(routeNamespace string, declared, reported gatewayv1.ParentReference) bool {
	want := normalizedRouteParentReference(routeNamespace, declared)
	got := normalizedRouteParentReference(routeNamespace, reported)
	if want.group != got.group || want.kind != got.kind || want.namespace != got.namespace || want.name != got.name {
		return false
	}
	if declared.SectionName != nil && want.sectionName != got.sectionName {
		return false
	}
	return declared.Port == nil || want.port == got.port
}

type routeParentIdentity struct {
	group       gatewayv1.Group
	kind        gatewayv1.Kind
	namespace   gatewayv1.Namespace
	name        gatewayv1.ObjectName
	sectionName string
	port        int32
}

func normalizedRouteParentReference(routeNamespace string, parent gatewayv1.ParentReference) routeParentIdentity {
	identity := routeParentIdentity{
		group:     gatewayv1.Group(gatewayv1.GroupName),
		kind:      gatewayv1.Kind("Gateway"),
		namespace: gatewayv1.Namespace(routeNamespace),
		name:      parent.Name,
	}
	if parent.Group != nil {
		identity.group = *parent.Group
	}
	if parent.Kind != nil {
		identity.kind = *parent.Kind
	}
	if parent.Namespace != nil {
		identity.namespace = *parent.Namespace
	}
	if parent.SectionName != nil {
		identity.sectionName = string(*parent.SectionName)
	}
	if parent.Port != nil {
		identity.port = int32(*parent.Port)
	}
	return identity
}
