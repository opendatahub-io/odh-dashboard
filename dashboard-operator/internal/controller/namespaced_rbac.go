package controller

import (
	"context"
	"errors"
	"fmt"
	"reflect"
	"sort"
	"strings"

	corev1 "k8s.io/api/core/v1"
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
	var errs []error

	if ns := dashboard.Spec.NotebooksNamespace; ns != "" {
		if err := r.validateNamespacedRBACTarget(ctx, ns); err != nil {
			errs = append(errs, fmt.Errorf("notebooks namespace RBAC in %s: %w", ns, err))
		} else {
			key := namespacedRBACKey(ns, "notebooks")
			desired[key] = true
			if err := r.recordNamespacedRBACGrant(ctx, dashboard, key); err != nil {
				errs = append(errs, fmt.Errorf("recording notebooks namespace RBAC in %s: %w", ns, err))
			} else if err := r.applyNamespacedRBAC(ctx, saName, saNamespace, ns, "notebooks", notebooksRBACRules()); err != nil {
				errs = append(errs, fmt.Errorf("notebooks namespace RBAC in %s: %w", ns, err))
			}
		}
	}

	if ns := dashboard.Spec.ModelRegistryNamespace; ns != "" {
		if err := r.validateNamespacedRBACTarget(ctx, ns); err != nil {
			errs = append(errs, fmt.Errorf("model-registry namespace RBAC in %s: %w", ns, err))
		} else {
			key := namespacedRBACKey(ns, "model-registry")
			desired[key] = true
			if err := r.recordNamespacedRBACGrant(ctx, dashboard, key); err != nil {
				errs = append(errs, fmt.Errorf("recording model-registry namespace RBAC in %s: %w", ns, err))
			} else if err := r.applyNamespacedRBAC(ctx, saName, saNamespace, ns, "model-registry", modelRegistryRBACRules()); err != nil {
				errs = append(errs, fmt.Errorf("model-registry namespace RBAC in %s: %w", ns, err))
			}
		}
	}

	// Invalid targets are deliberately absent from desired. Run GC even when
	// validation or apply failed so removing opt-in immediately revokes stale grants.
	if err := r.gcStaleNamespacedRBAC(ctx, dashboard, desired); err != nil {
		errs = append(errs, err)
	}

	return errors.Join(errs...)
}

// validateNamespacedRBACTarget requires explicit consent from the target
// namespace before the dashboard service account receives access there.
func (r *DashboardReconciler) validateNamespacedRBACTarget(ctx context.Context, namespace string) error {
	if !r.NamespacedRBACAdmissionEnabled {
		return errors.New("namespaced RBAC requires the validating webhook and at least one trusted writer")
	}
	target := &corev1.Namespace{}
	if err := r.apiReader().Get(ctx, client.ObjectKey{Name: namespace}, target); err != nil {
		return fmt.Errorf("getting target namespace: %w", err)
	}
	if target.Labels[v1alpha1.NamespacedRBACOptInLabel] != "true" {
		return fmt.Errorf("target namespace must have label %s=true", v1alpha1.NamespacedRBACOptInLabel)
	}
	return nil
}

// cleanupNamespacedRBAC deletes all cross-namespace Roles and RoleBindings previously
// recorded by reconcileNamespacedRBAC. The status inventory keeps stale resources
// discoverable even when namespace fields or recipient-controlled metadata change.
// Called on Dashboard deletion and ManagementState=Removed.
func (r *DashboardReconciler) cleanupNamespacedRBAC(ctx context.Context, dashboard *v1alpha1.Dashboard) error {
	return r.gcStaleNamespacedRBAC(ctx, dashboard, map[string]bool{})
}

// namespacedRBACKey returns the composite GC key for a (namespace, suffix) pair.
// suffix is the component name used in role/rolebinding name generation (e.g. "notebooks").
func namespacedRBACKey(namespace, suffix string) string {
	return namespace + "/" + suffix
}

func splitNamespacedRBACKey(key string) (string, string, bool) {
	namespace, suffix, found := strings.Cut(key, "/")
	return namespace, suffix, found && namespace != "" && (suffix == "notebooks" || suffix == "model-registry")
}

func (r *DashboardReconciler) recordNamespacedRBACGrant(ctx context.Context, dashboard *v1alpha1.Dashboard, key string) error {
	for _, existing := range dashboard.Status.NamespacedRBACGrants {
		if existing == key {
			return nil
		}
	}

	previous := append([]string(nil), dashboard.Status.NamespacedRBACGrants...)
	dashboard.Status.NamespacedRBACGrants = append(dashboard.Status.NamespacedRBACGrants, key)
	sort.Strings(dashboard.Status.NamespacedRBACGrants)
	// Unsaved objects are used by focused unit tests. Real API objects always
	// have a UID and must persist inventory before any privilege is created.
	if dashboard.UID == "" {
		return nil
	}
	if err := r.Status().Update(ctx, dashboard); err != nil {
		dashboard.Status.NamespacedRBACGrants = previous
		return fmt.Errorf("persisting namespaced RBAC grant inventory: %w", err)
	}
	return nil
}

// gcStaleNamespacedRBAC removes managed Roles and RoleBindings whose (namespace, name)
// identity is not in the desired set. Keying by identity (not just namespace) ensures
// correct GC when two components share the same target namespace.
func (r *DashboardReconciler) gcStaleNamespacedRBAC(
	ctx context.Context,
	dashboard *v1alpha1.Dashboard,
	desired map[string]bool,
) error {
	logger := log.FromContext(ctx)
	var errs []error
	known := map[string]bool{}
	for _, key := range dashboard.Status.NamespacedRBACGrants {
		if _, _, valid := splitNamespacedRBACKey(key); valid {
			known[key] = true
		}
	}

	// Read directly without a label selector so the dashboard recipient cannot
	// hide a grant from the manager's label-scoped cache by removing mutable
	// discovery labels.
	var rbList rbacv1.RoleBindingList
	if err := r.apiReader().List(ctx, &rbList); err != nil {
		return fmt.Errorf("listing namespaced RBAC RoleBindings for GC: %w", err)
	}
	var roleList rbacv1.RoleList
	if err := r.apiReader().List(ctx, &roleList); err != nil {
		return fmt.Errorf("listing namespaced RBAC Roles for GC: %w", err)
	}

	// Migrate pre-inventory grants from their canonical names or labels. Once
	// recorded in status, discovery no longer depends on recipient-owned objects.
	for i := range roleList.Items {
		role := &roleList.Items[i]
		suffix, reservedName := managedRoleSuffix(role.Name)
		if reservedName && hasNamespacedRBACManagedLabels(role.Labels) {
			known[namespacedRBACKey(role.Namespace, suffix)] = true
		}
	}
	for i := range rbList.Items {
		rb := &rbList.Items[i]
		suffix, reservedName := managedRoleBindingSuffix(rb.Name)
		if reservedName && (hasNamespacedRBACManagedLabels(rb.Labels) || roleBindingUsesManagedRole(rb, suffix)) {
			known[namespacedRBACKey(rb.Namespace, suffix)] = true
		}
	}

	staleKeys := make([]string, 0, len(known))
	for key := range known {
		if !desired[key] {
			staleKeys = append(staleKeys, key)
		}
	}
	sort.Strings(staleKeys)

	for _, key := range staleKeys {
		namespace, suffix, _ := splitNamespacedRBACKey(key)
		roleName := fmt.Sprintf("dashboard-%s-role", suffix)
		roleKey := client.ObjectKey{Namespace: namespace, Name: roleName}
		role := &rbacv1.Role{}
		roleExists := false
		if err := r.apiReader().Get(ctx, roleKey, role); err == nil {
			roleExists = true
			if len(role.Rules) > 0 {
				role.Rules = nil
				logger.Info("Neutralizing stale namespaced RBAC Role", "name", role.Name, "namespace", role.Namespace)
				if err := r.Update(ctx, role); err != nil {
					errs = append(errs, fmt.Errorf("neutralizing stale Role %s/%s: %w", namespace, roleName, err))
				} else {
					confirmed := &rbacv1.Role{}
					if err := r.apiReader().Get(ctx, roleKey, confirmed); err != nil {
						if !k8serrors.IsNotFound(err) {
							errs = append(errs, fmt.Errorf("confirming stale Role %s/%s neutralization: %w", namespace, roleName, err))
						}
					} else if len(confirmed.Rules) > 0 {
						errs = append(errs, fmt.Errorf("stale Role %s/%s remains effective after neutralization", namespace, roleName))
					}
				}
			}
		} else if !k8serrors.IsNotFound(err) {
			errs = append(errs, fmt.Errorf("getting stale Role %s/%s: %w", namespace, roleName, err))
		}

		for i := range rbList.Items {
			rb := &rbList.Items[i]
			reservedSuffix, reservedName := managedRoleBindingSuffix(rb.Name)
			referencesRole := rb.Namespace == namespace && rb.RoleRef.APIGroup == rbacv1.GroupName &&
				rb.RoleRef.Kind == "Role" && rb.RoleRef.Name == roleName
			reservedBinding := rb.Namespace == namespace && reservedName && reservedSuffix == suffix
			if !referencesRole && !reservedBinding {
				continue
			}
			logger.Info("GC stale namespaced RBAC RoleBinding", "name", rb.Name, "namespace", rb.Namespace)
			if err := r.Delete(ctx, rb); client.IgnoreNotFound(err) != nil {
				errs = append(errs, fmt.Errorf("deleting stale RoleBinding %s/%s: %w", rb.Namespace, rb.Name, err))
			}
		}

		if roleExists {
			logger.Info("GC stale namespaced RBAC Role", "name", roleName, "namespace", namespace)
			if err := r.Delete(ctx, role); client.IgnoreNotFound(err) != nil {
				errs = append(errs, fmt.Errorf("deleting stale Role %s/%s: %w", namespace, roleName, err))
			}
		}
	}

	// Confirm cleanup from a fresh API-server snapshot. Inventory is retained
	// until both the Role and every binding to it are gone, so retries remain safe.
	var remainingBindings rbacv1.RoleBindingList
	if err := r.apiReader().List(ctx, &remainingBindings); err != nil {
		errs = append(errs, fmt.Errorf("confirming namespaced RBAC RoleBinding cleanup: %w", err))
		remainingBindings.Items = rbList.Items
	}
	remainingKeys := map[string]bool{}
	for key := range known {
		remainingKeys[key] = true
	}
	for _, key := range staleKeys {
		namespace, suffix, _ := splitNamespacedRBACKey(key)
		roleName := fmt.Sprintf("dashboard-%s-role", suffix)
		roleGone := false
		remainingRole := &rbacv1.Role{}
		if err := r.apiReader().Get(ctx, client.ObjectKey{Namespace: namespace, Name: roleName}, remainingRole); k8serrors.IsNotFound(err) {
			roleGone = true
		} else if err != nil {
			errs = append(errs, fmt.Errorf("confirming stale Role %s/%s cleanup: %w", namespace, roleName, err))
		} else {
			if len(remainingRole.Rules) > 0 {
				errs = append(errs, fmt.Errorf("stale Role %s/%s still grants permissions", namespace, roleName))
			} else {
				errs = append(errs, fmt.Errorf("waiting for stale Role %s/%s deletion", namespace, roleName))
			}
		}

		bindingGone := true
		for i := range remainingBindings.Items {
			rb := &remainingBindings.Items[i]
			reservedSuffix, reservedName := managedRoleBindingSuffix(rb.Name)
			if rb.Namespace == namespace && ((rb.RoleRef.APIGroup == rbacv1.GroupName && rb.RoleRef.Kind == "Role" && rb.RoleRef.Name == roleName) ||
				(reservedName && reservedSuffix == suffix)) {
				bindingGone = false
				break
			}
		}
		if roleGone && bindingGone {
			delete(remainingKeys, key)
		}
	}

	dashboard.Status.NamespacedRBACGrants = dashboard.Status.NamespacedRBACGrants[:0]
	for key := range remainingKeys {
		dashboard.Status.NamespacedRBACGrants = append(dashboard.Status.NamespacedRBACGrants, key)
	}
	sort.Strings(dashboard.Status.NamespacedRBACGrants)

	return errors.Join(errs...)
}

func hasNamespacedRBACManagedLabels(resourceLabels map[string]string) bool {
	return resourceLabels[namespacedRBACManagedLabel] == "true" &&
		resourceLabels[labels.PlatformPartOf] == strings.ToLower(v1alpha1.DashboardKind)
}

func managedRoleSuffix(name string) (string, bool) {
	switch name {
	case "dashboard-notebooks-role":
		return "notebooks", true
	case "dashboard-model-registry-role":
		return "model-registry", true
	default:
		return roleNameSuffix(name), false
	}
}

func managedRoleBindingSuffix(name string) (string, bool) {
	switch name {
	case "dashboard-notebooks-rolebinding":
		return "notebooks", true
	case "dashboard-model-registry-rolebinding":
		return "model-registry", true
	default:
		return roleBindingNameSuffix(name), false
	}
}

func roleBindingUsesManagedRole(rb *rbacv1.RoleBinding, suffix string) bool {
	return rb.RoleRef.APIGroup == rbacv1.GroupName &&
		rb.RoleRef.Kind == "Role" &&
		rb.RoleRef.Name == fmt.Sprintf("dashboard-%s-role", suffix)
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
		err := r.apiReader().Get(ctx, client.ObjectKeyFromObject(role), existing)
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
		err := r.apiReader().Get(ctx, client.ObjectKeyFromObject(rb), existing)
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
