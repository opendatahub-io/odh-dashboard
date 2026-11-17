package controller

import (
	"context"
	"encoding/json"
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
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
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

var errNamespacedRBACConsentMissing = errors.New("namespaced RBAC consent is missing")

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
	enforceConsent, err := r.ensureNamespacedRBACConsentEnforced(ctx, dashboard)
	if err != nil {
		return err
	}
	if err := r.ensureNamespacedRBACGrantInventory(ctx, dashboard); err != nil {
		return err
	}
	if enforceConsent && !r.NamespacedRBACWebhookEnabled {
		cleanupErr := r.gcStaleNamespacedRBAC(ctx, dashboard, map[string]bool{})
		return errors.Join(
			fmt.Errorf("namespaced RBAC consent was enforced previously, but the validating webhook is disabled"),
			cleanupErr,
		)
	}

	saName := dashboardSAName(r.Platform)
	saNamespace := r.ApplicationsNamespace

	desired := map[string]bool{}
	var errs []error

	if ns := dashboard.Spec.NotebooksNamespace; ns != "" {
		if err := r.reconcileNamespacedRBACGrant(ctx, dashboard, desired, enforceConsent, saName, saNamespace, ns, "notebooks", notebooksRBACRules()); err != nil {
			errs = append(errs, fmt.Errorf("notebooks namespace RBAC in %s: %w", ns, err))
		}
	}

	if ns := dashboard.Spec.ModelRegistryNamespace; ns != "" {
		if err := r.reconcileNamespacedRBACGrant(ctx, dashboard, desired, enforceConsent, saName, saNamespace, ns, "model-registry", modelRegistryRBACRules()); err != nil {
			errs = append(errs, fmt.Errorf("model-registry namespace RBAC in %s: %w", ns, err))
		}
	}

	// Invalid targets are deliberately absent from desired. Run GC even when
	// validation or apply failed so removing opt-in immediately revokes stale grants.
	if err := r.gcStaleNamespacedRBAC(ctx, dashboard, desired); err != nil {
		errs = append(errs, err)
	}

	return errors.Join(errs...)
}

func (r *DashboardReconciler) reconcileNamespacedRBACGrant(
	ctx context.Context,
	dashboard *v1alpha1.Dashboard,
	desired map[string]bool,
	enforceConsent bool,
	saName, saNamespace, namespace, suffix string,
	rules []rbacv1.PolicyRule,
) error {
	key := namespacedRBACKey(namespace, suffix)
	if enforceConsent {
		if err := r.validateNamespacedRBACTarget(ctx, namespace); err != nil {
			// Only an authoritative revocation signal (the Namespace is gone or
			// consent is absent) may remove an existing grant. Preserve it across
			// transient API failures so a timeout or throttling response cannot
			// revoke otherwise valid access.
			if !k8serrors.IsNotFound(err) && !errors.Is(err, errNamespacedRBACConsentMissing) {
				desired[key] = true
			}
			return err
		}
	}

	desired[key] = true
	if err := r.recordNamespacedRBACGrant(ctx, dashboard, key); err != nil {
		return fmt.Errorf("recording grant: %w", err)
	}
	return r.applyNamespacedRBAC(ctx, saName, saNamespace, namespace, suffix, rules)
}

// validateNamespacedRBACTarget requires explicit consent from the target
// namespace before the dashboard service account receives access there.
func (r *DashboardReconciler) validateNamespacedRBACTarget(ctx context.Context, namespace string) error {
	target := &corev1.Namespace{}
	if err := r.apiReader().Get(ctx, client.ObjectKey{Name: namespace}, target); err != nil {
		return fmt.Errorf("getting target namespace: %w", err)
	}
	if target.Labels[v1alpha1.NamespacedRBACOptInLabel] != "true" {
		return fmt.Errorf("%w: target namespace must have label %s=true", errNamespacedRBACConsentMissing, v1alpha1.NamespacedRBACOptInLabel)
	}
	return nil
}

// cleanupNamespacedRBAC deletes all cross-namespace Roles and RoleBindings
// previously recorded by reconcileNamespacedRBAC. The Dashboard annotation
// inventory keeps stale resources discoverable even when namespace fields or
// recipient-controlled metadata change.
// Called on Dashboard deletion and ManagementState=Removed.
func (r *DashboardReconciler) cleanupNamespacedRBAC(ctx context.Context, dashboard *v1alpha1.Dashboard) error {
	if err := r.ensureNamespacedRBACGrantInventory(ctx, dashboard); err != nil {
		return err
	}
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

func namespacedRBACGrantInventory(dashboard *v1alpha1.Dashboard) (map[string]bool, error) {
	return decodeNamespacedRBACGrantInventory(dashboard.Annotations[v1alpha1.NamespacedRBACInventoryAnnotation])
}

func decodeNamespacedRBACGrantInventory(raw string) (map[string]bool, error) {
	inventory := map[string]bool{}
	if raw == "" {
		return inventory, nil
	}

	var keys []string
	if err := json.Unmarshal([]byte(raw), &keys); err != nil {
		return nil, fmt.Errorf("parsing namespaced RBAC grant inventory: %w", err)
	}
	for _, key := range keys {
		if _, _, valid := splitNamespacedRBACKey(key); !valid {
			return nil, fmt.Errorf("invalid namespaced RBAC grant inventory key %q", key)
		}
		inventory[key] = true
	}
	return inventory, nil
}

func (r *DashboardReconciler) loadNamespacedRBACGrantInventory(
	ctx context.Context,
	dashboard *v1alpha1.Dashboard,
) (map[string]bool, bool, error) {
	state := &corev1.ConfigMap{}
	err := r.apiReader().Get(ctx, client.ObjectKey{
		Namespace: r.namespacedRBACStateNamespace(),
		Name:      v1alpha1.NamespacedRBACStateConfigMapName,
	}, state)
	if err == nil {
		if raw, recorded := state.Data[v1alpha1.NamespacedRBACGrantInventoryKey]; recorded {
			inventory, parseErr := decodeNamespacedRBACGrantInventory(raw)
			return inventory, true, parseErr
		}
	} else if !k8serrors.IsNotFound(err) {
		return nil, false, fmt.Errorf("reading controller-protected namespaced RBAC grant inventory: %w", err)
	}

	inventory, parseErr := namespacedRBACGrantInventory(dashboard)
	_, recorded := dashboard.Annotations[v1alpha1.NamespacedRBACInventoryAnnotation]
	return inventory, recorded, parseErr
}

func (r *DashboardReconciler) setNamespacedRBACGrantInventory(
	ctx context.Context,
	dashboard *v1alpha1.Dashboard,
	inventory map[string]bool,
) error {
	keys := make([]string, 0, len(inventory))
	for key := range inventory {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	encoded, err := json.Marshal(keys)
	if err != nil {
		return fmt.Errorf("encoding namespaced RBAC grant inventory: %w", err)
	}
	raw := string(encoded)
	if err := r.setNamespacedRBACStateValue(ctx, v1alpha1.NamespacedRBACGrantInventoryKey, raw); err != nil {
		return fmt.Errorf("persisting controller-protected namespaced RBAC grant inventory: %w", err)
	}
	current, recorded := dashboard.Annotations[v1alpha1.NamespacedRBACInventoryAnnotation]
	if recorded && current == raw {
		return nil
	}

	// Unsaved objects are used by focused unit tests. Real API objects always
	// have a UID and must persist inventory before any privilege is created.
	if err := r.patchDashboardAnnotation(ctx, dashboard, v1alpha1.NamespacedRBACInventoryAnnotation, raw); err != nil {
		return fmt.Errorf("persisting namespaced RBAC grant inventory: %w", err)
	}
	return nil
}

func (r *DashboardReconciler) patchDashboardAnnotation(
	ctx context.Context,
	dashboard *v1alpha1.Dashboard,
	key, value string,
) error {
	if dashboard.UID == "" {
		if dashboard.Annotations == nil {
			dashboard.Annotations = map[string]string{}
		}
		dashboard.Annotations[key] = value
		return nil
	}

	// Patch a copy so decoding the API response cannot overwrite spec or status
	// values calculated earlier in this reconcile. Only metadata and the new
	// resourceVersion are merged back into the active object.
	before := dashboard.DeepCopy()
	updated := dashboard.DeepCopy()
	if updated.Annotations == nil {
		updated.Annotations = map[string]string{}
	}
	updated.Annotations[key] = value
	if err := r.Patch(ctx, updated, client.MergeFrom(before)); err != nil {
		return err
	}
	dashboard.Annotations = updated.Annotations
	dashboard.ResourceVersion = updated.ResourceVersion
	return nil
}

func (r *DashboardReconciler) ensureNamespacedRBACConsentEnforced(
	ctx context.Context,
	dashboard *v1alpha1.Dashboard,
) (bool, error) {
	persisted, err := r.persistedNamespacedRBACConsentEnforced(ctx)
	if err != nil {
		return false, err
	}
	enforced := r.NamespacedRBACAdmissionEnabled || persisted ||
		dashboard.Annotations[v1alpha1.NamespacedRBACConsentEnforcedAnnotation] == "true"
	if !enforced {
		return false, nil
	}

	if !persisted {
		if err := r.setNamespacedRBACStateValue(ctx, v1alpha1.NamespacedRBACConsentEnforcedKey, "true"); err != nil {
			return false, fmt.Errorf("persisting controller-protected namespaced RBAC consent state: %w", err)
		}
	}
	if dashboard.Annotations[v1alpha1.NamespacedRBACConsentEnforcedAnnotation] != "true" {
		if err := r.patchDashboardAnnotation(ctx, dashboard, v1alpha1.NamespacedRBACConsentEnforcedAnnotation, "true"); err != nil {
			return false, fmt.Errorf("mirroring namespaced RBAC consent enforcement state: %w", err)
		}
	}
	return true, nil
}

func (r *DashboardReconciler) persistedNamespacedRBACConsentEnforced(ctx context.Context) (bool, error) {
	state := &corev1.ConfigMap{}
	err := r.apiReader().Get(ctx, client.ObjectKey{
		Namespace: r.namespacedRBACStateNamespace(),
		Name:      v1alpha1.NamespacedRBACStateConfigMapName,
	}, state)
	if k8serrors.IsNotFound(err) {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("reading controller-protected namespaced RBAC consent state: %w", err)
	}
	return state.Data[v1alpha1.NamespacedRBACConsentEnforcedKey] == "true", nil
}

func (r *DashboardReconciler) namespacedRBACStateNamespace() string {
	if r.Namespace != "" {
		return r.Namespace
	}
	return r.ApplicationsNamespace
}

func (r *DashboardReconciler) setNamespacedRBACStateValue(ctx context.Context, key, value string) error {
	state := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{
		Namespace: r.namespacedRBACStateNamespace(),
		Name:      v1alpha1.NamespacedRBACStateConfigMapName,
	}}
	_, err := controllerutil.CreateOrUpdate(ctx, r.Client, state, func() error {
		if state.Data == nil {
			state.Data = map[string]string{}
		}
		state.Data[key] = value
		return nil
	})
	return err
}

func (r *DashboardReconciler) namespacedRBACConsentEnforced(dashboard *v1alpha1.Dashboard) bool {
	return r.NamespacedRBACAdmissionEnabled ||
		dashboard.Annotations[v1alpha1.NamespacedRBACConsentEnforcedAnnotation] == "true"
}

// ensureNamespacedRBACGrantInventory performs one label-selected migration for
// grants created before the durable inventory existed. Persisting even an empty
// JSON array is the migration marker, so steady-state reconciles never sweep
// Roles or RoleBindings cluster-wide.
func (r *DashboardReconciler) ensureNamespacedRBACGrantInventory(ctx context.Context, dashboard *v1alpha1.Dashboard) error {
	inventory, recorded, parseErr := r.loadNamespacedRBACGrantInventory(ctx, dashboard)
	if recorded && parseErr == nil {
		// A direct lookup of current targets repairs valid-but-truncated state only
		// when the resources still carry independent operator ownership evidence.
		changed, err := r.addOwnedCurrentNamespacedRBACTargets(ctx, dashboard, inventory)
		if err != nil {
			return err
		}
		if !changed {
			keys := make([]string, 0, len(inventory))
			for key := range inventory {
				keys = append(keys, key)
			}
			sort.Strings(keys)
			encoded, err := json.Marshal(keys)
			if err != nil {
				return fmt.Errorf("encoding namespaced RBAC grant inventory: %w", err)
			}
			if dashboard.Annotations[v1alpha1.NamespacedRBACInventoryAnnotation] == string(encoded) {
				return nil
			}
		}
		return r.setNamespacedRBACGrantInventory(ctx, dashboard, inventory)
	}

	// Missing or malformed state is repaired from independently observable
	// ownership evidence before any grant cleanup runs.
	inventory = map[string]bool{}
	matchLabels := client.MatchingLabels{
		namespacedRBACManagedLabel: "true",
		labels.PlatformPartOf:      strings.ToLower(v1alpha1.DashboardKind),
	}
	var roles rbacv1.RoleList
	if err := r.apiReader().List(ctx, &roles, matchLabels); err != nil {
		return fmt.Errorf("discovering legacy namespaced RBAC Roles: %w", err)
	}
	for i := range roles.Items {
		role := &roles.Items[i]
		if suffix, reserved := managedRoleSuffix(role.Name); reserved {
			inventory[namespacedRBACKey(role.Namespace, suffix)] = true
		}
	}

	var bindings rbacv1.RoleBindingList
	if err := r.apiReader().List(ctx, &bindings, matchLabels); err != nil {
		return fmt.Errorf("discovering legacy namespaced RBAC RoleBindings: %w", err)
	}
	for i := range bindings.Items {
		binding := &bindings.Items[i]
		if suffix, reserved := managedRoleBindingSuffix(binding.Name); reserved {
			inventory[namespacedRBACKey(binding.Namespace, suffix)] = true
		}
	}

	return r.setNamespacedRBACGrantInventory(ctx, dashboard, inventory)
}

func (r *DashboardReconciler) addOwnedCurrentNamespacedRBACTargets(
	ctx context.Context,
	dashboard *v1alpha1.Dashboard,
	inventory map[string]bool,
) (bool, error) {
	changed := false
	for _, target := range []struct {
		namespace string
		suffix    string
	}{
		{dashboard.Spec.NotebooksNamespace, "notebooks"},
		{dashboard.Spec.ModelRegistryNamespace, "model-registry"},
	} {
		if target.namespace == "" {
			continue
		}
		key := namespacedRBACKey(target.namespace, target.suffix)
		if inventory[key] {
			continue
		}
		owned, err := r.currentNamespacedRBACTargetIsOwned(ctx, target.namespace, target.suffix)
		if err != nil {
			return false, err
		}
		if owned {
			inventory[key] = true
			changed = true
		}
	}
	return changed, nil
}

func (r *DashboardReconciler) currentNamespacedRBACTargetIsOwned(
	ctx context.Context,
	namespace, suffix string,
) (bool, error) {
	objects := []client.Object{
		&rbacv1.Role{ObjectMeta: metav1.ObjectMeta{Namespace: namespace, Name: fmt.Sprintf("dashboard-%s-role", suffix)}},
		&rbacv1.RoleBinding{ObjectMeta: metav1.ObjectMeta{Namespace: namespace, Name: fmt.Sprintf("dashboard-%s-rolebinding", suffix)}},
	}
	for _, object := range objects {
		if err := r.apiReader().Get(ctx, client.ObjectKeyFromObject(object), object); err != nil {
			if k8serrors.IsNotFound(err) {
				continue
			}
			return false, fmt.Errorf("checking namespaced RBAC ownership for %s/%s: %w", namespace, object.GetName(), err)
		}
		objectLabels := object.GetLabels()
		if objectLabels[namespacedRBACManagedLabel] == "true" &&
			objectLabels[labels.PlatformPartOf] == strings.ToLower(v1alpha1.DashboardKind) {
			return true, nil
		}
	}
	return false, nil
}

func (r *DashboardReconciler) recordNamespacedRBACGrant(ctx context.Context, dashboard *v1alpha1.Dashboard, key string) error {
	inventory, _, err := r.loadNamespacedRBACGrantInventory(ctx, dashboard)
	if err != nil {
		return err
	}
	if inventory[key] {
		return nil
	}
	inventory[key] = true
	return r.setNamespacedRBACGrantInventory(ctx, dashboard, inventory)
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
	known, _, err := r.loadNamespacedRBACGrantInventory(ctx, dashboard)
	if err != nil {
		return err
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

		var bindings rbacv1.RoleBindingList
		if err := r.apiReader().List(ctx, &bindings, client.InNamespace(namespace)); err != nil {
			errs = append(errs, fmt.Errorf("listing stale RoleBindings in %s: %w", namespace, err))
		} else {
			for i := range bindings.Items {
				rb := &bindings.Items[i]
				if !roleBindingBelongsToGrant(rb, suffix) {
					continue
				}
				logger.Info("GC stale namespaced RBAC RoleBinding", "name", rb.Name, "namespace", rb.Namespace)
				if err := r.Delete(ctx, rb); client.IgnoreNotFound(err) != nil {
					errs = append(errs, fmt.Errorf("deleting stale RoleBinding %s/%s: %w", rb.Namespace, rb.Name, err))
				}
			}
		}

		if roleExists {
			logger.Info("GC stale namespaced RBAC Role", "name", roleName, "namespace", namespace)
			if err := r.Delete(ctx, role); client.IgnoreNotFound(err) != nil {
				errs = append(errs, fmt.Errorf("deleting stale Role %s/%s: %w", namespace, roleName, err))
			}
		}

		roleGone := false
		remainingRole := &rbacv1.Role{}
		if err := r.apiReader().Get(ctx, roleKey, remainingRole); k8serrors.IsNotFound(err) {
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
		var remainingBindings rbacv1.RoleBindingList
		if err := r.apiReader().List(ctx, &remainingBindings, client.InNamespace(namespace)); err != nil {
			errs = append(errs, fmt.Errorf("confirming stale RoleBinding cleanup in %s: %w", namespace, err))
			bindingGone = false
		} else {
			for i := range remainingBindings.Items {
				if roleBindingBelongsToGrant(&remainingBindings.Items[i], suffix) {
					bindingGone = false
					break
				}
			}
			if !bindingGone {
				errs = append(errs, fmt.Errorf("waiting for stale RoleBindings in %s deletion", namespace))
			}
		}
		if roleGone && bindingGone {
			delete(known, key)
		}
	}

	if err := r.setNamespacedRBACGrantInventory(ctx, dashboard, known); err != nil {
		errs = append(errs, err)
	}

	return errors.Join(errs...)
}

func roleBindingBelongsToGrant(rb *rbacv1.RoleBinding, suffix string) bool {
	reservedSuffix, reservedName := managedRoleBindingSuffix(rb.Name)
	return roleBindingUsesManagedRole(rb, suffix) ||
		(reservedName && reservedSuffix == suffix)
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
