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
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

const (
	maasConsumerPortalRhodsOperatorNamespace                      = "redhat-ods-operator"
	maasConsumerPortalOpenDataHubOperatorNamespace                = "opendatahub-operator"
	maasConsumerPortalRhodsOperatorSubscriptionResourceName       = "maas-consumer-portal-rhods-operator-subscription"
	maasConsumerPortalOpenDataHubOperatorSubscriptionResourceName = "maas-consumer-portal-opendatahub-operator-subscription"
)

var maasConsumerPortalOperatorSubscriptionNamespaces = map[string]string{
	"Role/" + maasConsumerPortalRhodsOperatorSubscriptionResourceName:              maasConsumerPortalRhodsOperatorNamespace,
	"RoleBinding/" + maasConsumerPortalRhodsOperatorSubscriptionResourceName:       maasConsumerPortalRhodsOperatorNamespace,
	"Role/" + maasConsumerPortalOpenDataHubOperatorSubscriptionResourceName:        maasConsumerPortalOpenDataHubOperatorNamespace,
	"RoleBinding/" + maasConsumerPortalOpenDataHubOperatorSubscriptionResourceName: maasConsumerPortalOpenDataHubOperatorNamespace,
}

var maasConsumerPortalOperatorNamespaces = []string{
	maasConsumerPortalRhodsOperatorNamespace,
	maasConsumerPortalOpenDataHubOperatorNamespace,
	"openshift-operators",
}

func (r *DashboardReconciler) maasConsumerPortalSubscriptionNamespaces() []string {
	namespaces := slices.Clone(maasConsumerPortalOperatorNamespaces)
	if r.Namespace != "" && !slices.Contains(namespaces, r.Namespace) {
		namespaces = append(namespaces, r.Namespace)
	}
	return namespaces
}

func (r *DashboardReconciler) isMaaSConsumerPortalOperatorNamespace(obj client.Object) bool {
	if obj == nil {
		return false
	}

	return slices.Contains(r.maasConsumerPortalSubscriptionNamespaces(), obj.GetName())
}

func (r *DashboardReconciler) mapMaaSConsumerPortalOperatorNamespaceToDashboard(_ context.Context, obj client.Object) []reconcile.Request {
	if !r.isMaaSConsumerPortalOperatorNamespace(obj) {
		return nil
	}

	return []reconcile.Request{{NamespacedName: client.ObjectKey{Name: v1alpha1.DashboardInstanceName}}}
}

func (r *DashboardReconciler) existingMaaSConsumerPortalOperatorNamespaces(ctx context.Context) (map[string]struct{}, error) {
	existing := make(map[string]struct{}, len(maasConsumerPortalOperatorNamespaces))
	for _, namespace := range r.maasConsumerPortalSubscriptionNamespaces() {
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

func (r *DashboardReconciler) deleteLabeledMaaSConsumerPortalOperatorSubscriptionRBACResources(ctx context.Context) error {
	operatorNamespaces, err := r.existingMaaSConsumerPortalOperatorNamespaces(ctx)
	if err != nil {
		return fmt.Errorf("getting operator namespaces: %w", err)
	}
	var errs []error
	for _, namespace := range r.maasConsumerPortalSubscriptionNamespaces() {
		if _, exists := operatorNamespaces[namespace]; !exists {
			continue
		}
		errs = append(errs,
			r.deleteLabeledMaaSConsumerPortalResourceList(ctx, &rbacv1.RoleList{}, client.InNamespace(namespace)),
			r.deleteLabeledMaaSConsumerPortalResourceList(ctx, &rbacv1.RoleBindingList{}, client.InNamespace(namespace)),
		)
	}
	return errors.Join(errs...)
}

func filterMaaSConsumerPortalResources(resources []unstructured.Unstructured, operatorNamespaces map[string]struct{}) []unstructured.Unstructured {
	filtered := make([]unstructured.Unstructured, 0, len(resources))
	for i := range resources {
		resource := resources[i]
		if resource.GetKind() == "ConfigMap" && resource.GetName() == maasConsumerPortalParamsConfigMapName {
			continue
		}
		if namespace, isOperatorSubscriptionRBAC := maasConsumerPortalOperatorSubscriptionNamespaces[resource.GetKind()+"/"+resource.GetName()]; isOperatorSubscriptionRBAC {
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

func setMaaSConsumerPortalOperatorSubscriptionNamespaces(resources []unstructured.Unstructured, operatorNamespace string) []unstructured.Unstructured {
	var extra []unstructured.Unstructured
	for i := range resources {
		if namespace, ok := maasConsumerPortalOperatorSubscriptionNamespaces[resources[i].GetKind()+"/"+resources[i].GetName()]; ok {
			resources[i].SetNamespace(namespace)
			namespaces := []string{operatorNamespace}
			if namespace == maasConsumerPortalOpenDataHubOperatorNamespace {
				namespaces = append(namespaces, "openshift-operators")
			}
			seen := map[string]bool{namespace: true, "": true}
			for _, target := range namespaces {
				if seen[target] {
					continue
				}
				seen[target] = true
				copy := resources[i].DeepCopy()
				copy.SetNamespace(target)
				extra = append(extra, *copy)
			}
		}
	}
	return append(resources, extra...)
}
