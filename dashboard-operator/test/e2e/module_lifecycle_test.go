//go:build e2e

package e2e

import (
	"context"
	"encoding/json"
	"os"
	"testing"
	"time"

	dashboardv1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/wait"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const moduleLifecycleTimeout = 10 * time.Minute

var lifecycleModules = map[string]string{
	"modelRegistry": "model-registry",
	"genAi":         "gen-ai",
	"mlflow":        "mlflow",
	"maas":          "maas",
	"evalHub":       "eval-hub",
	"automl":        "automl",
	"autorag":       "autorag",
	"agentOps":      "agent-ops",
	"notebooks":     "notebooks",
	"dataRegistry":  "data-registry",
}

type lifecycleExpectation struct {
	phase  dashboardv1alpha1.ModulePhase
	reason string
}

type lifecycleCase struct {
	name       string
	modules    map[string]dashboardv1alpha1.ModuleOverride
	components map[string]dashboardv1alpha1.ComponentAvailability
	want       map[string]lifecycleExpectation
	recover    bool
}

// TestE2EModuleLifecycle automates TS1-TS3 from RHOAIENG-61023. Each subtest
// owns a fresh singleton and can be selected independently with -run.
func TestE2EModuleLifecycle(t *testing.T) {
	allDisabled := map[string]dashboardv1alpha1.ModuleOverride{}
	allDisabledWant := map[string]lifecycleExpectation{}
	for name := range lifecycleModules {
		allDisabled[name] = dashboardv1alpha1.ModuleOverride{State: dashboardv1alpha1.ModuleDisabled}
		allDisabledWant[name] = lifecycleExpectation{dashboardv1alpha1.ModulePhaseDisabled, "ExplicitOverride"}
	}

	cases := []lifecycleCase{
		// TS1: Dashboard module overrides.
		{name: "TS1_01_disable_one_module", modules: disabledModules("modelRegistry"), want: disabled("modelRegistry")},
		{name: "TS1_02_disable_multiple_modules", modules: disabledModules("modelRegistry", "mlflow"), want: disabled("modelRegistry", "mlflow")},
		{name: "TS1_03_disable_all_modules", modules: allDisabled, want: allDisabledWant},
		{name: "TS1_04_unknown_lowercase_module", modules: disabledModules("modelregistry"), want: map[string]lifecycleExpectation{"modelregistry": {dashboardv1alpha1.ModulePhaseNotDeployed, "UnknownModule"}}},
		{name: "TS1_05_remove_overrides_recovers", modules: disabledModules("agentOps"), want: disabled("agentOps"), recover: true},

		// TS2: DSC component availability gates.
		{name: "TS2_01_removed_component", components: components("modelregistry", "Removed"), want: unavailable("modelRegistry")},
		{name: "TS2_02_multiple_removed_components", components: components("modelregistry", "Removed", "mlflowoperator", "Removed"), want: mergeExpectations(unavailable("modelRegistry"), unavailable("mlflow"))},
		{name: "TS2_03_absent_component_in_non_nil_map", components: components("trustyai", "Managed"), want: mergeExpectations(unavailable("modelRegistry"), unavailable("mlflow"), unavailable("automl", "autorag", "dataRegistry"))},
		{name: "TS2_04_managed_component", components: components("modelregistry", "Managed"), want: present("modelRegistry")},
		{name: "TS2_05_unmanaged_component", components: components("modelregistry", "Unmanaged"), want: present("modelRegistry")},
		{name: "TS2_06_override_wins_over_component", modules: disabledModules("modelRegistry"), components: components("modelregistry", "Managed"), want: disabled("modelRegistry")},
		{name: "TS2_07_nil_components_recovers", components: components("modelregistry", "Removed"), want: unavailable("modelRegistry"), recover: true},

		// TS3: inter-module and DSC dependencies.
		{name: "TS3_01_genai_disable_cascades_to_autorag", modules: disabledModules("genAi"), want: mergeExpectations(disabled("genAi"), map[string]lifecycleExpectation{"autorag": {dashboardv1alpha1.ModulePhaseDisabled, "DependencyNotMet"}})},
		{name: "TS3_02_aipipelines_gates_automl_and_autorag", components: components("aipipelines", "Removed"), want: unavailable("automl", "autorag")},
		{name: "TS3_03_dependency_recovery", modules: disabledModules("genAi"), want: mergeExpectations(disabled("genAi"), map[string]lifecycleExpectation{"autorag": {dashboardv1alpha1.ModulePhaseDisabled, "DependencyNotMet"}}), recover: true},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			dashboardUID := createManagedDashboard(t)
			patchDashboardSpec(t, func(spec *dashboardv1alpha1.DashboardSpec) {
				spec.Modules = tc.modules
				spec.Components = tc.components
			})
			waitForModuleExpectations(t, tc.want)
			assertModuleResources(t, dashboardUID, tc.want)

			if tc.recover {
				patchDashboardSpec(t, func(spec *dashboardv1alpha1.DashboardSpec) {
					spec.Modules = nil
					spec.Components = nil
				})
				for name := range tc.want {
					if _, known := lifecycleModules[name]; known {
						waitForModulePresent(t, name)
					}
				}
			}
		})
	}
}

// TestE2EModuleOperands automates the resource, recovery, platform, and
// agentOps stories (TS4-TS8) using the standalone deployment model supported
// by the current controller.
func TestE2EModuleOperands(t *testing.T) {
	t.Run("TS4_01_module_deployments_are_observable", func(t *testing.T) {
		uid := createManagedDashboard(t)
		waitForModulePresent(t, "agentOps")
		assertModuleResources(t, uid, present("agentOps"))
	})

	t.Run("TS4_02_deleted_deployment_is_reconciled", func(t *testing.T) {
		uid := createManagedDashboard(t)
		deployment := waitForOwnedDeployment(t, uid, "agent-ops")
		require.NoError(t, k8sClient.Delete(context.Background(), deployment))
		waitForOwnedDeployment(t, uid, "agent-ops")
		waitForModulePresent(t, "agentOps")
	})

	t.Run("TS4_03_deleted_pods_are_recreated", func(t *testing.T) {
		uid := createManagedDashboard(t)
		deployment := waitForOwnedDeployment(t, uid, "agent-ops")
		pods := &corev1.PodList{}
		require.NoError(t, k8sClient.List(context.Background(), pods, client.InNamespace(testNamespace), client.MatchingLabels(deployment.Spec.Selector.MatchLabels)))
		for i := range pods.Items {
			require.NoError(t, k8sClient.Delete(context.Background(), &pods.Items[i]))
		}
		waitForOwnedDeployment(t, uid, "agent-ops")
		waitForModulePresent(t, "agentOps")
	})

	t.Run("TS4_04_dashboard_status_recovers_after_operand_reconcile", func(t *testing.T) {
		uid := createManagedDashboard(t)
		deployment := waitForOwnedDeployment(t, uid, "agent-ops")
		require.NoError(t, k8sClient.Delete(context.Background(), deployment))
		waitForModulePresent(t, "agentOps")
		require.NoError(t, waitForCondition(k8sClient, dashboardv1alpha1.DashboardInstanceName, string(common.ConditionTypeProvisioningSucceeded), metav1.ConditionTrue, moduleLifecycleTimeout))
	})

	t.Run("TS5_01_standalone_deployment", func(t *testing.T) {
		uid := createManagedDashboard(t)
		waitForModulePresent(t, "agentOps")
		waitForOwnedDeployment(t, uid, "agent-ops")
	})
	t.Run("TS5_02_standalone_service", func(t *testing.T) {
		createManagedDashboard(t)
		waitForService(t, "odh-dashboard-agent-ops-ui")
	})
	t.Run("TS5_03_standalone_service_account", func(t *testing.T) {
		createManagedDashboard(t)
		waitForObject(t, &corev1.ServiceAccount{}, "odh-dashboard-agent-ops")
	})
	t.Run("TS5_04_standalone_network_policy", func(t *testing.T) {
		createManagedDashboard(t)
		waitForObject(t, &networkingv1.NetworkPolicy{}, "agent-ops-allow-ports")
	})
	t.Run("TS5_05_federation_references_standalone_service", func(t *testing.T) {
		createManagedDashboard(t)
		cm := &corev1.ConfigMap{}
		waitForObject(t, cm, "federation-config")
		var entries []map[string]any
		require.NoError(t, json.Unmarshal([]byte(cm.Data["module-federation-config.json"]), &entries))
		require.Contains(t, cm.Data["module-federation-config.json"], "odh-dashboard-agent-ops-ui")
	})
	t.Run("TS5_06_disabled_standalone_resources_are_removed", func(t *testing.T) {
		uid := createManagedDashboard(t)
		waitForOwnedDeployment(t, uid, "agent-ops")
		patchDashboardSpec(t, func(spec *dashboardv1alpha1.DashboardSpec) { spec.Modules = disabledModules("agentOps") })
		waitForModuleExpectations(t, disabled("agentOps"))
		waitForNoOwnedDeployment(t, uid, "agent-ops")
	})
	t.Run("TS5_07_legacy_sidecar_resource_is_cleaned", func(t *testing.T) {
		createManagedDashboard(t)
		legacy := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "sidecar-params", Namespace: testNamespace, Labels: map[string]string{e2eManagedByKey: e2eFieldOwner}}}
		err := k8sClient.Create(context.Background(), legacy)
		if apierrors.IsAlreadyExists(err) {
			t.Fatal("refuse to adopt pre-existing legacy sidecar ConfigMap")
		}
		require.NoError(t, err)
		t.Cleanup(func() { require.NoError(t, client.IgnoreNotFound(k8sClient.Delete(context.Background(), legacy))) })
		triggerDashboardReconcile(t)
		waitForObjectAbsent(t, &corev1.ConfigMap{}, "sidecar-params")
	})
	t.Run("TS5_08_reconciliation_is_idempotent", func(t *testing.T) {
		uid := createManagedDashboard(t)
		before := waitForOwnedDeployment(t, uid, "agent-ops")
		triggerDashboardReconcile(t)
		after := waitForOwnedDeployment(t, uid, "agent-ops")
		require.Equal(t, before.UID, after.UID)
	})

	t.Run("TS6_01_core_service_matches_distribution", func(t *testing.T) {
		createManagedDashboard(t)
		platform := requiredPlatform(t)
		name := map[string]string{"odh": "odh-dashboard", "rhoai": "rhods-dashboard"}[platform]
		waitForService(t, name)
	})
	t.Run("TS6_02_module_service_uses_stable_prefix", func(t *testing.T) {
		createManagedDashboard(t)
		requiredPlatform(t)
		waitForService(t, "odh-dashboard-agent-ops-ui")
	})

	t.Run("TS7_01_standalone_module_can_be_disabled", func(t *testing.T) {
		uid := createManagedDashboard(t)
		waitForModulePresent(t, "agentOps")
		patchDashboardSpec(t, func(spec *dashboardv1alpha1.DashboardSpec) { spec.Modules = disabledModules("agentOps") })
		waitForModuleExpectations(t, disabled("agentOps"))
		waitForNoOwnedDeployment(t, uid, "agent-ops")
	})
	t.Run("TS7_02_standalone_module_can_be_reenabled", func(t *testing.T) {
		uid := createManagedDashboard(t)
		patchDashboardSpec(t, func(spec *dashboardv1alpha1.DashboardSpec) { spec.Modules = disabledModules("agentOps") })
		waitForModuleExpectations(t, disabled("agentOps"))
		patchDashboardSpec(t, func(spec *dashboardv1alpha1.DashboardSpec) { spec.Modules = nil })
		waitForModulePresent(t, "agentOps")
		waitForOwnedDeployment(t, uid, "agent-ops")
	})
	t.Run("TS7_03_standalone_component_gate_recovers", func(t *testing.T) {
		uid := createManagedDashboard(t)
		patchDashboardSpec(t, func(spec *dashboardv1alpha1.DashboardSpec) { spec.Components = components("modelregistry", "Removed") })
		waitForModuleExpectations(t, unavailable("modelRegistry"))
		waitForNoOwnedDeployment(t, uid, "model-registry")
		patchDashboardSpec(t, func(spec *dashboardv1alpha1.DashboardSpec) { spec.Components = nil })
		waitForModulePresent(t, "modelRegistry")
		waitForOwnedDeployment(t, uid, "model-registry")
	})

	t.Run("TS8_01_agentops_manifests_are_deployed", func(t *testing.T) {
		uid := createManagedDashboard(t)
		waitForModulePresent(t, "agentOps")
		assertModuleResources(t, uid, present("agentOps"))
	})
	t.Run("TS8_02_agentops_lifecycle_recovers", func(t *testing.T) {
		uid := createManagedDashboard(t)
		patchDashboardSpec(t, func(spec *dashboardv1alpha1.DashboardSpec) { spec.Modules = disabledModules("agentOps") })
		waitForModuleExpectations(t, disabled("agentOps"))
		waitForNoOwnedDeployment(t, uid, "agent-ops")
		patchDashboardSpec(t, func(spec *dashboardv1alpha1.DashboardSpec) { spec.Modules = nil })
		waitForModulePresent(t, "agentOps")
		waitForOwnedDeployment(t, uid, "agent-ops")
	})
}

func createManagedDashboard(t *testing.T) types.UID {
	t.Helper()
	domain := os.Getenv("TEST_GATEWAY_DOMAIN")
	if domain == "" {
		t.Fatal("TEST_GATEWAY_DOMAIN must contain the cluster applications domain")
	}
	uid, err := createDashboardCR(k8sClient, dashboardv1alpha1.DashboardSpec{
		ManagementSpec: common.ManagementSpec{ManagementState: common.Managed},
		Gateway:        &dashboardv1alpha1.GatewaySpec{Domain: domain},
	})
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, cleanupDashboardCR(k8sClient, uid)) })
	waitForAllModuleStatuses(t)
	return uid
}

func waitForAllModuleStatuses(t *testing.T) {
	t.Helper()
	err := wait.PollUntilContextTimeout(context.Background(), e2ePollInterval, moduleLifecycleTimeout, true, func(ctx context.Context) (bool, error) {
		dashboard := &dashboardv1alpha1.Dashboard{}
		if err := k8sClient.Get(ctx, client.ObjectKey{Name: dashboardv1alpha1.DashboardInstanceName}, dashboard); err != nil {
			return false, client.IgnoreNotFound(err)
		}
		for name := range lifecycleModules {
			if _, ok := dashboard.Status.ModuleStatuses[name]; !ok {
				return false, nil
			}
		}
		return true, nil
	})
	require.NoError(t, err, "wait for Dashboard status to report every registered module")
}

func patchDashboardSpec(t *testing.T, mutate func(*dashboardv1alpha1.DashboardSpec)) {
	t.Helper()
	err := wait.PollUntilContextTimeout(context.Background(), e2ePollInterval, time.Minute, true, func(ctx context.Context) (bool, error) {
		dashboard := &dashboardv1alpha1.Dashboard{}
		if err := k8sClient.Get(ctx, client.ObjectKey{Name: dashboardv1alpha1.DashboardInstanceName}, dashboard); err != nil {
			return false, err
		}
		before := dashboard.DeepCopy()
		mutate(&dashboard.Spec)
		if err := k8sClient.Patch(ctx, dashboard, client.MergeFrom(before)); apierrors.IsConflict(err) {
			return false, nil
		} else if err != nil {
			return false, err
		}
		return true, nil
	})
	require.NoError(t, err)
}

func triggerDashboardReconcile(t *testing.T) {
	t.Helper()
	err := wait.PollUntilContextTimeout(context.Background(), e2ePollInterval, time.Minute, true, func(ctx context.Context) (bool, error) {
		dashboard := &dashboardv1alpha1.Dashboard{}
		if err := k8sClient.Get(ctx, client.ObjectKey{Name: dashboardv1alpha1.DashboardInstanceName}, dashboard); err != nil {
			return false, err
		}
		before := dashboard.DeepCopy()
		if dashboard.Annotations == nil {
			dashboard.Annotations = map[string]string{}
		}
		dashboard.Annotations["dashboard.opendatahub.io/e2e-reconcile-at"] = time.Now().UTC().Format(time.RFC3339Nano)
		if err := k8sClient.Patch(ctx, dashboard, client.MergeFrom(before)); apierrors.IsConflict(err) {
			return false, nil
		} else if err != nil {
			return false, err
		}
		return true, nil
	})
	require.NoError(t, err)
}

func waitForModuleExpectations(t *testing.T, expected map[string]lifecycleExpectation) {
	t.Helper()
	err := wait.PollUntilContextTimeout(context.Background(), e2ePollInterval, moduleLifecycleTimeout, true, func(ctx context.Context) (bool, error) {
		dashboard := &dashboardv1alpha1.Dashboard{}
		if err := k8sClient.Get(ctx, client.ObjectKey{Name: dashboardv1alpha1.DashboardInstanceName}, dashboard); err != nil {
			return false, client.IgnoreNotFound(err)
		}
		for name, want := range expected {
			got, ok := dashboard.Status.ModuleStatuses[name]
			if !ok || got.Phase != want.phase || (want.reason != "" && got.Reason != want.reason) {
				return false, nil
			}
		}
		return true, nil
	})
	require.NoError(t, err, "module expectations: %v", expected)
}

func waitForModulePresent(t *testing.T, name string) {
	t.Helper()
	err := wait.PollUntilContextTimeout(context.Background(), e2ePollInterval, moduleLifecycleTimeout, true, func(ctx context.Context) (bool, error) {
		dashboard := &dashboardv1alpha1.Dashboard{}
		if err := k8sClient.Get(ctx, client.ObjectKey{Name: dashboardv1alpha1.DashboardInstanceName}, dashboard); err != nil {
			return false, client.IgnoreNotFound(err)
		}
		status, ok := dashboard.Status.ModuleStatuses[name]
		return ok && (status.Phase == dashboardv1alpha1.ModulePhaseDeployed || status.Phase == dashboardv1alpha1.ModulePhaseDegraded), nil
	})
	require.NoError(t, err, "wait for module %s to be present", name)
}

func assertModuleResources(t *testing.T, uid types.UID, expected map[string]lifecycleExpectation) {
	t.Helper()
	for name, want := range expected {
		slug, known := lifecycleModules[name]
		if !known {
			continue
		}
		if want.phase == dashboardv1alpha1.ModulePhaseDisabled || want.phase == dashboardv1alpha1.ModulePhaseNotDeployed {
			waitForNoOwnedDeployment(t, uid, slug)
		} else {
			waitForOwnedDeployment(t, uid, slug)
		}
	}
}

func waitForOwnedDeployment(t *testing.T, uid types.UID, slug string) *appsv1.Deployment {
	t.Helper()
	var found appsv1.Deployment
	err := wait.PollUntilContextTimeout(context.Background(), e2ePollInterval, moduleLifecycleTimeout, true, func(ctx context.Context) (bool, error) {
		list := &appsv1.DeploymentList{}
		if err := k8sClient.List(ctx, list, client.InNamespace(testNamespace), client.MatchingLabels{"app.kubernetes.io/component": slug}); err != nil {
			return false, err
		}
		for i := range list.Items {
			if metav1.IsControlledBy(&list.Items[i], &dashboardv1alpha1.Dashboard{ObjectMeta: metav1.ObjectMeta{UID: uid}}) {
				found = *list.Items[i].DeepCopy()
				return true, nil
			}
		}
		return false, nil
	})
	require.NoError(t, err, "wait for owned %s Deployment", slug)
	return &found
}

func waitForNoOwnedDeployment(t *testing.T, uid types.UID, slug string) {
	t.Helper()
	err := wait.PollUntilContextTimeout(context.Background(), e2ePollInterval, moduleLifecycleTimeout, true, func(ctx context.Context) (bool, error) {
		list := &appsv1.DeploymentList{}
		if err := k8sClient.List(ctx, list, client.InNamespace(testNamespace), client.MatchingLabels{"app.kubernetes.io/component": slug}); err != nil {
			return false, err
		}
		for i := range list.Items {
			for _, ref := range list.Items[i].OwnerReferences {
				if ref.UID == uid {
					return false, nil
				}
			}
		}
		return true, nil
	})
	require.NoError(t, err, "wait for owned %s Deployment removal", slug)
}

func waitForService(t *testing.T, name string) {
	t.Helper()
	err := wait.PollUntilContextTimeout(context.Background(), e2ePollInterval, moduleLifecycleTimeout, true, func(ctx context.Context) (bool, error) {
		err := k8sClient.Get(ctx, client.ObjectKey{Namespace: testNamespace, Name: name}, &corev1.Service{})
		return err == nil, client.IgnoreNotFound(err)
	})
	require.NoError(t, err, "wait for Service %s/%s", testNamespace, name)
}

func waitForObject(t *testing.T, object client.Object, name string) {
	t.Helper()
	err := wait.PollUntilContextTimeout(context.Background(), e2ePollInterval, moduleLifecycleTimeout, true, func(ctx context.Context) (bool, error) {
		err := k8sClient.Get(ctx, client.ObjectKey{Namespace: testNamespace, Name: name}, object)
		return err == nil, client.IgnoreNotFound(err)
	})
	require.NoError(t, err, "wait for %T %s/%s", object, testNamespace, name)
}

func waitForObjectAbsent(t *testing.T, object client.Object, name string) {
	t.Helper()
	err := wait.PollUntilContextTimeout(context.Background(), e2ePollInterval, moduleLifecycleTimeout, true, func(ctx context.Context) (bool, error) {
		err := k8sClient.Get(ctx, client.ObjectKey{Namespace: testNamespace, Name: name}, object)
		return apierrors.IsNotFound(err), client.IgnoreNotFound(err)
	})
	require.NoError(t, err, "wait for %T %s/%s removal", object, testNamespace, name)
}

func requiredPlatform(t *testing.T) string {
	t.Helper()
	platform := os.Getenv("TEST_PLATFORM")
	if platform != "odh" && platform != "rhoai" {
		t.Fatalf("TEST_PLATFORM must be odh or rhoai, got %q", platform)
	}
	return platform
}

func disabledModules(names ...string) map[string]dashboardv1alpha1.ModuleOverride {
	result := map[string]dashboardv1alpha1.ModuleOverride{}
	for _, name := range names {
		result[name] = dashboardv1alpha1.ModuleOverride{State: dashboardv1alpha1.ModuleDisabled}
	}
	return result
}

func components(pairs ...string) map[string]dashboardv1alpha1.ComponentAvailability {
	result := map[string]dashboardv1alpha1.ComponentAvailability{}
	for i := 0; i < len(pairs); i += 2 {
		result[pairs[i]] = dashboardv1alpha1.ComponentAvailability{ManagementState: pairs[i+1]}
	}
	return result
}

func disabled(names ...string) map[string]lifecycleExpectation {
	return expectation(dashboardv1alpha1.ModulePhaseDisabled, "ExplicitOverride", names...)
}
func unavailable(names ...string) map[string]lifecycleExpectation {
	return expectation(dashboardv1alpha1.ModulePhaseDisabled, "ComponentNotAvailable", names...)
}
func present(names ...string) map[string]lifecycleExpectation {
	return expectation(dashboardv1alpha1.ModulePhaseDeployed, "", names...)
}
func expectation(phase dashboardv1alpha1.ModulePhase, reason string, names ...string) map[string]lifecycleExpectation {
	result := map[string]lifecycleExpectation{}
	for _, name := range names {
		result[name] = lifecycleExpectation{phase, reason}
	}
	return result
}
func mergeExpectations(sets ...map[string]lifecycleExpectation) map[string]lifecycleExpectation {
	result := map[string]lifecycleExpectation{}
	for _, set := range sets {
		for name, value := range set {
			result[name] = value
		}
	}
	return result
}
