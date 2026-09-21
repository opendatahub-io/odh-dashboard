package controller

import (
	"context"
	"errors"
	"fmt"
	"reflect"
	"strings"

	rbacv1 "k8s.io/api/rbac/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/util/retry"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

const (
	dashboardSANameODH   = "odh-dashboard"
	dashboardSANameRHOAI = "rhods-dashboard"

	namespacedRBACManagedLabel = "dashboard.opendatahub.io/namespaced-rbac"
)

// dashboardSAName returns the dashboard ServiceAccount name for the given platform.
func dashboardSAName(platform cluster.Platform) string {
	switch platform {
	case cluster.SelfManagedRhoai, cluster.ManagedRhoai:
		return dashboardSANameRHOAI
	default:
		return dashboardSANameODH
	}
}

// reconcileNamespacedRBAC creates or updates cross-namespace Roles and RoleBindings
// for the dashboard SA in the notebooks and model-registry namespaces, then GCs
// any resources left over in namespaces that are no longer in the desired set.
func (r *DashboardReconciler) reconcileNamespacedRBAC(ctx context.Context, dashboard *v1alpha1.Dashboard) error {
	saName := dashboardSAName(r.Platform)
	saNamespace := r.ApplicationsNamespace

	desired := map[string]bool{}

	if ns := dashboard.Spec.NotebooksNamespace; ns != "" {
		if err := r.applyNamespacedRBAC(ctx, saName, saNamespace, ns, "notebooks", notebooksRBACRules()); err != nil {
			return fmt.Errorf("notebooks namespace RBAC in %s: %w", ns, err)
		}
		desired[namespacedRBACKey(ns, "notebooks")] = true
	}

	if ns := dashboard.Spec.ModelRegistryNamespace; ns != "" {
		if err := r.applyNamespacedRBAC(ctx, saName, saNamespace, ns, "model-registry", modelRegistryRBACRules()); err != nil {
			return fmt.Errorf("model-registry namespace RBAC in %s: %w", ns, err)
		}
		desired[namespacedRBACKey(ns, "model-registry")] = true
	}

	return r.gcStaleNamespacedRBAC(ctx, desired)
}

// cleanupNamespacedRBAC deletes all cross-namespace Roles and RoleBindings previously
// created by reconcileNamespacedRBAC. Uses a cluster-wide label sweep so stale resources
// are removed even when the namespace field changed since the last reconcile.
// Called on Dashboard deletion and ManagementState=Removed.
func (r *DashboardReconciler) cleanupNamespacedRBAC(ctx context.Context) error {
	logger := log.FromContext(ctx)

	matchLabels := client.MatchingLabels{
		namespacedRBACManagedLabel: "true",
		labels.PlatformPartOf:      strings.ToLower(v1alpha1.DashboardKind),
	}

	var errs []error

	var roleList rbacv1.RoleList
	if err := r.List(ctx, &roleList, matchLabels); err != nil {
		errs = append(errs, fmt.Errorf("listing namespaced RBAC Roles: %w", err))
	} else {
		for i := range roleList.Items {
			logger.Info("Deleting namespaced RBAC Role", "name", roleList.Items[i].Name, "namespace", roleList.Items[i].Namespace)
			if err := r.Delete(ctx, &roleList.Items[i]); client.IgnoreNotFound(err) != nil {
				errs = append(errs, fmt.Errorf("deleting Role %s/%s: %w", roleList.Items[i].Namespace, roleList.Items[i].Name, err))
			}
		}
	}

	var rbList rbacv1.RoleBindingList
	if err := r.List(ctx, &rbList, matchLabels); err != nil {
		errs = append(errs, fmt.Errorf("listing namespaced RBAC RoleBindings: %w", err))
	} else {
		for i := range rbList.Items {
			logger.Info("Deleting namespaced RBAC RoleBinding", "name", rbList.Items[i].Name, "namespace", rbList.Items[i].Namespace)
			if err := r.Delete(ctx, &rbList.Items[i]); client.IgnoreNotFound(err) != nil {
				errs = append(errs, fmt.Errorf("deleting RoleBinding %s/%s: %w", rbList.Items[i].Namespace, rbList.Items[i].Name, err))
			}
		}
	}

	return errors.Join(errs...)
}

// namespacedRBACKey returns the composite GC key for a (namespace, suffix) pair.
// suffix is the component name used in role/rolebinding name generation (e.g. "notebooks").
func namespacedRBACKey(namespace, suffix string) string {
	return namespace + "/" + suffix
}

// gcStaleNamespacedRBAC removes managed Roles and RoleBindings whose (namespace, name)
// identity is not in the desired set. Keying by identity (not just namespace) ensures
// correct GC when two components share the same target namespace.
func (r *DashboardReconciler) gcStaleNamespacedRBAC(ctx context.Context, desired map[string]bool) error {
	logger := log.FromContext(ctx)

	matchLabels := client.MatchingLabels{
		namespacedRBACManagedLabel: "true",
		labels.PlatformPartOf:      strings.ToLower(v1alpha1.DashboardKind),
	}

	var errs []error

	var roleList rbacv1.RoleList
	if err := r.List(ctx, &roleList, matchLabels); err != nil {
		errs = append(errs, fmt.Errorf("listing namespaced RBAC Roles for GC: %w", err))
	} else {
		for i := range roleList.Items {
			ns := roleList.Items[i].Namespace
			name := roleList.Items[i].Name
			// Role names are "dashboard-<suffix>-role"; extract suffix to match desired key.
			suffix := roleNameSuffix(name)
			if desired[namespacedRBACKey(ns, suffix)] {
				continue
			}
			logger.Info("GC stale namespaced RBAC Role", "name", name, "namespace", ns)
			if err := r.Delete(ctx, &roleList.Items[i]); client.IgnoreNotFound(err) != nil {
				errs = append(errs, fmt.Errorf("deleting stale Role %s/%s: %w", ns, name, err))
			}
		}
	}

	var rbList rbacv1.RoleBindingList
	if err := r.List(ctx, &rbList, matchLabels); err != nil {
		errs = append(errs, fmt.Errorf("listing namespaced RBAC RoleBindings for GC: %w", err))
	} else {
		for i := range rbList.Items {
			ns := rbList.Items[i].Namespace
			name := rbList.Items[i].Name
			suffix := roleBindingNameSuffix(name)
			if desired[namespacedRBACKey(ns, suffix)] {
				continue
			}
			logger.Info("GC stale namespaced RBAC RoleBinding", "name", name, "namespace", ns)
			if err := r.Delete(ctx, &rbList.Items[i]); client.IgnoreNotFound(err) != nil {
				errs = append(errs, fmt.Errorf("deleting stale RoleBinding %s/%s: %w", ns, name, err))
			}
		}
	}

	return errors.Join(errs...)
}

// roleNameSuffix extracts the component suffix from "dashboard-<suffix>-role".
// Returns the full name unchanged for resources not following that convention.
func roleNameSuffix(name string) string {
	s := strings.TrimPrefix(name, "dashboard-")
	s = strings.TrimSuffix(s, "-role")
	return s
}

// roleBindingNameSuffix extracts the component suffix from "dashboard-<suffix>-rolebinding".
func roleBindingNameSuffix(name string) string {
	s := strings.TrimPrefix(name, "dashboard-")
	s = strings.TrimSuffix(s, "-rolebinding")
	return s
}

// applyNamespacedRBAC creates or updates a Role and RoleBinding in targetNamespace granting
// saName/saNamespace the given rules.
func (r *DashboardReconciler) applyNamespacedRBAC(
	ctx context.Context,
	saName, saNamespace, targetNamespace, suffix string,
	rules []rbacv1.PolicyRule,
) error {
	roleName := fmt.Sprintf("dashboard-%s-role", suffix)
	rbName := fmt.Sprintf("dashboard-%s-rolebinding", suffix)

	roleLabels := map[string]string{
		namespacedRBACManagedLabel: "true",
		labels.PlatformPartOf:      strings.ToLower(v1alpha1.DashboardKind),
	}
	rbLabels := map[string]string{
		namespacedRBACManagedLabel: "true",
		labels.PlatformPartOf:      strings.ToLower(v1alpha1.DashboardKind),
	}

	role := &rbacv1.Role{
		ObjectMeta: metav1.ObjectMeta{
			Name:      roleName,
			Namespace: targetNamespace,
			Labels:    roleLabels,
		},
		Rules: rules,
	}

	rb := &rbacv1.RoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name:      rbName,
			Namespace: targetNamespace,
			Labels:    rbLabels,
		},
		RoleRef: rbacv1.RoleRef{
			APIGroup: rbacv1.GroupName,
			Kind:     "Role",
			Name:     roleName,
		},
		Subjects: []rbacv1.Subject{{
			Kind:      rbacv1.ServiceAccountKind,
			Name:      saName,
			Namespace: saNamespace,
		}},
	}

	if err := r.applyRole(ctx, role); err != nil {
		return err
	}
	return r.applyRoleBinding(ctx, rb)
}

func (r *DashboardReconciler) applyRole(ctx context.Context, role *rbacv1.Role) error {
	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		existing := &rbacv1.Role{}
		err := r.Get(ctx, client.ObjectKeyFromObject(role), existing)
		if k8serrors.IsNotFound(err) {
			if createErr := r.Create(ctx, role); createErr != nil && !k8serrors.IsAlreadyExists(createErr) {
				return fmt.Errorf("creating Role %s/%s: %w", role.Namespace, role.Name, createErr)
			}
			return nil
		}
		if err != nil {
			return fmt.Errorf("getting Role %s/%s: %w", role.Namespace, role.Name, err)
		}
		mergedLabels := mergeLabels(existing.Labels, role.Labels)
		if reflect.DeepEqual(existing.Rules, role.Rules) && reflect.DeepEqual(existing.Labels, mergedLabels) {
			return nil
		}
		existing.Rules = role.Rules
		existing.Labels = mergedLabels
		return r.Update(ctx, existing)
	})
}

func (r *DashboardReconciler) applyRoleBinding(ctx context.Context, rb *rbacv1.RoleBinding) error {
	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		existing := &rbacv1.RoleBinding{}
		err := r.Get(ctx, client.ObjectKeyFromObject(rb), existing)
		if k8serrors.IsNotFound(err) {
			if createErr := r.Create(ctx, rb); createErr != nil && !k8serrors.IsAlreadyExists(createErr) {
				return fmt.Errorf("creating RoleBinding %s/%s: %w", rb.Namespace, rb.Name, createErr)
			}
			return nil
		}
		if err != nil {
			return fmt.Errorf("getting RoleBinding %s/%s: %w", rb.Namespace, rb.Name, err)
		}
		// RoleRef is immutable — delete and recreate if it drifted.
		if existing.RoleRef != rb.RoleRef {
			if err := r.Delete(ctx, existing); client.IgnoreNotFound(err) != nil {
				return fmt.Errorf("deleting drifted RoleBinding %s/%s: %w", rb.Namespace, rb.Name, err)
			}
			fresh := rb.DeepCopy()
			if createErr := r.Create(ctx, fresh); createErr != nil && !k8serrors.IsAlreadyExists(createErr) {
				return fmt.Errorf("recreating RoleBinding %s/%s: %w", rb.Namespace, rb.Name, createErr)
			}
			return nil
		}
		mergedLabels := mergeLabels(existing.Labels, rb.Labels)
		if reflect.DeepEqual(existing.Subjects, rb.Subjects) && reflect.DeepEqual(existing.Labels, mergedLabels) {
			return nil
		}
		existing.Subjects = rb.Subjects
		existing.Labels = mergedLabels
		return r.Update(ctx, existing)
	})
}

// mergeLabels merges additional into existing; additional wins on conflict.
func mergeLabels(existing, additional map[string]string) map[string]string {
	out := make(map[string]string, len(existing)+len(additional))
	for k, v := range existing {
		out[k] = v
	}
	for k, v := range additional {
		out[k] = v
	}
	return out
}

// notebooksRBACRules returns the RBAC rules needed by the dashboard SA in the notebooks namespace.
func notebooksRBACRules() []rbacv1.PolicyRule {
	return []rbacv1.PolicyRule{
		{
			APIGroups: []string{""},
			Resources: []string{"persistentvolumeclaims"},
			Verbs:     []string{"create", "get"},
		},
		{
			APIGroups: []string{""},
			Resources: []string{"configmaps"},
			Verbs:     []string{"create", "get", "update"},
		},
		{
			APIGroups: []string{""},
			Resources: []string{"secrets"},
			Verbs:     []string{"create", "get", "update"},
		},
	}
}

// modelRegistryRBACRules returns the RBAC rules needed by the dashboard SA in the model-registry namespace.
func modelRegistryRBACRules() []rbacv1.PolicyRule {
	return []rbacv1.PolicyRule{
		{
			APIGroups: []string{""},
			Resources: []string{"secrets"},
			Verbs:     []string{"create", "delete", "get", "list", "patch"},
		},
		{
			APIGroups: []string{""},
			Resources: []string{"configmaps"},
			Verbs:     []string{"create", "list"},
		},
	}
}
