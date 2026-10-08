package controller

import (
	"context"
	"errors"
	"fmt"
	"slices"

	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

const (
	maasPortalRhodsOperatorNamespace                      = "redhat-ods-operator"
	maasPortalOpenDataHubOperatorNamespace                = "opendatahub-operator"
	maasPortalRhodsOperatorSubscriptionResourceName       = "maas-consumer-portal-rhods-operator-subscription"
	maasPortalOpenDataHubOperatorSubscriptionResourceName = "maas-consumer-portal-opendatahub-operator-subscription"
)

var maasPortalOperatorSubscriptionNamespaces = map[string]string{
	"Role/" + maasPortalRhodsOperatorSubscriptionResourceName:              maasPortalRhodsOperatorNamespace,
	"RoleBinding/" + maasPortalRhodsOperatorSubscriptionResourceName:       maasPortalRhodsOperatorNamespace,
	"Role/" + maasPortalOpenDataHubOperatorSubscriptionResourceName:        maasPortalOpenDataHubOperatorNamespace,
	"RoleBinding/" + maasPortalOpenDataHubOperatorSubscriptionResourceName: maasPortalOpenDataHubOperatorNamespace,
}

var maasPortalOperatorNamespaces = []string{
	maasPortalRhodsOperatorNamespace,
	maasPortalOpenDataHubOperatorNamespace,
	"openshift-operators",
}

func (r *DashboardReconciler) maasPortalSubscriptionNamespaces() []string {
	namespaces := slices.Clone(maasPortalOperatorNamespaces)
	if r.Namespace != "" && !slices.Contains(namespaces, r.Namespace) {
		namespaces = append(namespaces, r.Namespace)
	}
	return namespaces
}

func (r *DashboardReconciler) isMaaSPortalOperatorNamespace(obj client.Object) bool {
	if obj == nil {
		return false
	}

	return slices.Contains(r.maasPortalSubscriptionNamespaces(), obj.GetName())
}

func (r *DashboardReconciler) maasPortalOperatorNamespacePredicate() predicate.Predicate {
	return predicate.NewPredicateFuncs(r.isMaaSPortalOperatorNamespace)
}

func (r *DashboardReconciler) mapMaaSPortalOperatorNamespaceToDashboard(_ context.Context, obj client.Object) []reconcile.Request {
	if !r.isMaaSPortalOperatorNamespace(obj) {
		return nil
	}

	return []reconcile.Request{{NamespacedName: client.ObjectKey{Name: v1alpha1.DashboardInstanceName}}}
}

func (r *DashboardReconciler) existingMaaSPortalOperatorNamespaces(ctx context.Context) (map[string]struct{}, error) {
	existing := make(map[string]struct{}, len(maasPortalOperatorNamespaces))
	for _, namespace := range r.maasPortalSubscriptionNamespaces() {
		if err := r.Get(ctx, client.ObjectKey{Name: namespace}, &corev1.Namespace{}); err != nil {
			if apierrors.IsNotFound(err) {
				continue
			}
			return nil, err
		}
		existing[namespace] = struct{}{}
	}
	return existing, nil
}

func (r *DashboardReconciler) deleteLabeledMaaSPortalOperatorSubscriptionRBACResources(ctx context.Context) error {
	var errs []error
	// Include grants in formerly configured namespaces during portal removal.
	for _, list := range []client.ObjectList{&rbacv1.RoleList{}, &rbacv1.RoleBindingList{}} {
		if err := r.List(ctx, list, client.MatchingLabels{labels.PlatformPartOf: maasPortalPartOf}); err != nil {
			errs = append(errs, fmt.Errorf("listing MaaS Portal subscription RBAC: %w", err))
			continue
		}
		for _, resource := range extractItems(list) {
			if resource.GetName() != maasPortalRhodsOperatorSubscriptionResourceName &&
				resource.GetName() != maasPortalOpenDataHubOperatorSubscriptionResourceName {
				continue
			}
			errs = append(errs, r.deleteMaaSPortalObjects(ctx, resource))
		}
	}
	return errors.Join(errs...)
}

func filterMaaSPortalResources(resources []unstructured.Unstructured, operatorNamespaces map[string]struct{}) []unstructured.Unstructured {
	filtered := make([]unstructured.Unstructured, 0, len(resources))
	for i := range resources {
		resource := resources[i]
		if resource.GetKind() == "ConfigMap" && resource.GetName() == maasPortalParamsConfigMapName {
			continue
		}
		if namespace, isOperatorSubscriptionRBAC := maasPortalOperatorSubscriptionNamespaces[resource.GetKind()+"/"+resource.GetName()]; isOperatorSubscriptionRBAC {
			if resource.GetNamespace() != "" {
				namespace = resource.GetNamespace()
			}
			if _, exists := operatorNamespaces[namespace]; !exists {
				continue
			}
		}
		filtered = append(filtered, resource)
	}
	return filtered
}

func setMaaSPortalOperatorSubscriptionNamespaces(resources []unstructured.Unstructured, operatorNamespace string) []unstructured.Unstructured {
	var extra []unstructured.Unstructured
	for i := range resources {
		if namespace, ok := maasPortalOperatorSubscriptionNamespaces[resources[i].GetKind()+"/"+resources[i].GetName()]; ok {
			resources[i].SetNamespace(namespace)
			namespaces := []string{operatorNamespace}
			if namespace == maasPortalOpenDataHubOperatorNamespace {
				namespaces = append(namespaces, "openshift-operators")
			}
			seen := map[string]bool{namespace: true, "": true}
			for _, target := range namespaces {
				if seen[target] {
					continue
				}
				seen[target] = true
				resourceCopy := resources[i].DeepCopy()
				resourceCopy.SetNamespace(target)
				extra = append(extra, *resourceCopy)
			}
		}
	}
	return append(resources, extra...)
}
