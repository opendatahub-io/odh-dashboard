//go:build e2e

package e2e

import (
	"context"
	"encoding/json"
	"fmt"
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
						waitForModuleDeployed(t, name)
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
	t.Run("TS4_00_invalid_image_reports_degraded", func(t *testing.T) {
		uid := createManagedDashboard(t)
		waitForModuleDeployed(t, "agentOps")

		restore := setOperatorImageEnvironment(t, "RELATED_IMAGE_ODH_MOD_ARCH_AGENT_OPS_IMAGE", "quay.io/invalid/dashboard-operator-e2e:does-not-exist")
		restored := false
		t.Cleanup(func() {
			if !restored {
				restore()
			}
		})
		triggerDashboardReconcile(t)
		waitForPodImagePullBackOff(t, uid, "agent-ops")
		deleteReadyPodsForDeployment(t, uid, "agent-ops")
		waitForModulePresent(t, "agentOps")
		waitForDashboardDegraded(t, "agentOps")

		restore()
		restored = true
		triggerDashboardReconcile(t)
		waitForModuleDeployed(t, "agentOps")
	})

	t.Run("TS4_01_module_deployments_are_observable", func(t *testing.T) {
		uid := createManagedDashboard(t)
		waitForModuleDeployed(t, "agentOps")
		assertModuleResources(t, uid, present("agentOps"))
	})

	t.Run("TS4_02_deleted_deployment_is_reconciled", func(t *testing.T) {
		uid := createManagedDashboard(t)
		deployment := waitForOwnedDeployment(t, uid, "agent-ops")
		deletedUID := deployment.UID
		require.NoError(t, k8sClient.Delete(context.Background(), deployment))
		waitForReplacementDeployment(t, uid, "agent-ops", deletedUID)
		waitForModuleDeployed(t, "agentOps")
	})

	t.Run("TS4_03_deleted_pods_are_recreated", func(t *testing.T) {
		uid := createManagedDashboard(t)
		deployment := waitForOwnedDeployment(t, uid, "agent-ops")
		pods := &corev1.PodList{}
		require.NoError(t, k8sClient.List(context.Background(), pods, client.InNamespace(testNamespace), client.MatchingLabels(deployment.Spec.Selector.MatchLabels)))
		deletedUIDs := make(map[types.UID]struct{}, len(pods.Items))
		for i := range pods.Items {
			deletedUIDs[pods.Items[i].UID] = struct{}{}
			require.NoError(t, k8sClient.Delete(context.Background(), &pods.Items[i]))
		}
		waitForNewReadyPod(t, deployment, deletedUIDs)
		waitForModuleDeployed(t, "agentOps")
	})

	t.Run("TS4_04_dashboard_status_recovers_after_operand_reconcile", func(t *testing.T) {
		uid := createManagedDashboard(t)
		deployment := waitForOwnedDeployment(t, uid, "agent-ops")
		deletedUID := deployment.UID
		require.NoError(t, k8sClient.Delete(context.Background(), deployment))
		waitForReplacementDeployment(t, uid, "agent-ops", deletedUID)
		waitForModuleDeployed(t, "agentOps")
		require.NoError(t, waitForCondition(k8sClient, dashboardv1alpha1.DashboardInstanceName, string(common.ConditionTypeProvisioningSucceeded), metav1.ConditionTrue, moduleLifecycleTimeout))
	})

	t.Run("TS5_01_standalone_deployment", func(t *testing.T) {
		uid := createManagedDashboard(t)
		waitForModuleDeployed(t, "agentOps")
		waitForOwnedDeployment(t, uid, "agent-ops")
	})
	t.Run("TS5_02_standalone_service", func(t *testing.T) {
		uid := createManagedDashboard(t)
		waitForService(t, uid, "odh-dashboard-agent-ops-ui")
	})
	t.Run("TS5_03_standalone_service_account", func(t *testing.T) {
		uid := createManagedDashboard(t)
		waitForObject(t, uid, &corev1.ServiceAccount{}, "odh-dashboard-agent-ops")
	})
	t.Run("TS5_04_standalone_network_policy", func(t *testing.T) {
		uid := createManagedDashboard(t)
		waitForObject(t, uid, &networkingv1.NetworkPolicy{}, "agent-ops-allow-ports")
	})
	t.Run("TS5_05_federation_references_standalone_service", func(t *testing.T) {
		uid := createManagedDashboard(t)
		cm := &corev1.ConfigMap{}
		waitForObject(t, uid, cm, "federation-config")
		var entries []struct {
			Name    string `json:"name"`
			Service *struct {
				Name string `json:"name"`
			} `json:"service"`
		}
		require.NoError(t, json.Unmarshal([]byte(cm.Data["module-federation-config.json"]), &entries))
		require.Condition(t, func() bool {
			for _, entry := range entries {
				if entry.Name == "agentOps" && entry.Service != nil && entry.Service.Name == "odh-dashboard-agent-ops-ui" {
					return true
				}
			}
			return false
		}, "agentOps federation entry does not reference its standalone Service")
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
		uid := createManagedDashboard(t)
		platform := requiredPlatform(t)
		name := map[string]string{"odh": "odh-dashboard", "rhoai": "rhods-dashboard"}[platform]
		waitForService(t, uid, name)
	})
	t.Run("TS6_02_module_service_uses_stable_prefix", func(t *testing.T) {
		uid := createManagedDashboard(t)
		waitForService(t, uid, "odh-dashboard-agent-ops-ui")
	})

	t.Run("TS7_01_standalone_module_can_be_disabled", func(t *testing.T) {
		uid := createManagedDashboard(t)
		waitForModuleDeployed(t, "agentOps")
		patchDashboardSpec(t, func(spec *dashboardv1alpha1.DashboardSpec) { spec.Modules = disabledModules("agentOps") })
		waitForModuleExpectations(t, disabled("agentOps"))
		waitForNoOwnedDeployment(t, uid, "agent-ops")
	})
	t.Run("TS7_02_standalone_module_can_be_reenabled", func(t *testing.T) {
		uid := createManagedDashboard(t)
		patchDashboardSpec(t, func(spec *dashboardv1alpha1.DashboardSpec) { spec.Modules = disabledModules("agentOps") })
		waitForModuleExpectations(t, disabled("agentOps"))
		patchDashboardSpec(t, func(spec *dashboardv1alpha1.DashboardSpec) { spec.Modules = nil })
		waitForModuleDeployed(t, "agentOps")
		waitForOwnedDeployment(t, uid, "agent-ops")
	})
	t.Run("TS7_03_standalone_component_gate_recovers", func(t *testing.T) {
		uid := createManagedDashboard(t)
		patchDashboardSpec(t, func(spec *dashboardv1alpha1.DashboardSpec) { spec.Components = components("modelregistry", "Removed") })
		waitForModuleExpectations(t, unavailable("modelRegistry"))
		waitForNoOwnedDeployment(t, uid, "model-registry")
		patchDashboardSpec(t, func(spec *dashboardv1alpha1.DashboardSpec) { spec.Components = nil })
		waitForModuleDeployed(t, "modelRegistry")
		waitForOwnedDeployment(t, uid, "model-registry")
	})

	t.Run("TS8_01_agentops_manifests_are_deployed", func(t *testing.T) {
		uid := createManagedDashboard(t)
		waitForModuleDeployed(t, "agentOps")
		assertModuleResources(t, uid, present("agentOps"))
	})
	t.Run("TS8_02_agentops_lifecycle_recovers", func(t *testing.T) {
		uid := createManagedDashboard(t)
		patchDashboardSpec(t, func(spec *dashboardv1alpha1.DashboardSpec) { spec.Modules = disabledModules("agentOps") })
		waitForModuleExpectations(t, disabled("agentOps"))
		waitForNoOwnedDeployment(t, uid, "agent-ops")
		patchDashboardSpec(t, func(spec *dashboardv1alpha1.DashboardSpec) { spec.Modules = nil })
		waitForModuleDeployed(t, "agentOps")
		waitForOwnedDeployment(t, uid, "agent-ops")
	})
}

func createManagedDashboard(t *testing.T) types.UID {
	t.Helper()
	dashboard := &dashboardv1alpha1.Dashboard{}
	require.NoError(t, k8sClient.Get(
		context.Background(),
		client.ObjectKey{Name: dashboardv1alpha1.DashboardInstanceName},
		dashboard,
	))
	require.Equal(t, dashboardUID, dashboard.UID, "module lifecycle tests must use the E2E-owned Dashboard fixture")
	originalSpec := dashboard.Spec.DeepCopy()
	t.Cleanup(func() {
		patchDashboardSpec(t, func(spec *dashboardv1alpha1.DashboardSpec) {
			*spec = *originalSpec.DeepCopy()
		})
	})
	waitForAllModuleStatuses(t)
	return dashboard.UID
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
	var targetGeneration int64
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
		targetGeneration = dashboard.Generation
		return true, nil
	})
	require.NoError(t, err)
	err = wait.PollUntilContextTimeout(context.Background(), e2ePollInterval, moduleLifecycleTimeout, true, func(ctx context.Context) (bool, error) {
		dashboard := &dashboardv1alpha1.Dashboard{}
		if err := k8sClient.Get(ctx, client.ObjectKey{Name: dashboardv1alpha1.DashboardInstanceName}, dashboard); err != nil {
			return false, client.IgnoreNotFound(err)
		}
		return dashboard.Status.ObservedGeneration >= targetGeneration, nil
	})
	require.NoError(t, err, "wait for Dashboard controller to observe generation %d", targetGeneration)
}

func triggerDashboardReconcile(t *testing.T) {
	t.Helper()
	var targetGeneration int64
	err := wait.PollUntilContextTimeout(context.Background(), e2ePollInterval, time.Minute, true, func(ctx context.Context) (bool, error) {
		dashboard := &dashboardv1alpha1.Dashboard{}
		if err := k8sClient.Get(ctx, client.ObjectKey{Name: dashboardv1alpha1.DashboardInstanceName}, dashboard); err != nil {
			return false, err
		}
		before := dashboard.DeepCopy()
		if dashboard.Spec.Modules == nil {
			dashboard.Spec.Modules = map[string]dashboardv1alpha1.ModuleOverride{}
		}
		dashboard.Spec.Modules["agentOps"] = dashboardv1alpha1.ModuleOverride{State: dashboardv1alpha1.ModuleEnabled}
		if err := k8sClient.Patch(ctx, dashboard, client.MergeFrom(before)); apierrors.IsConflict(err) {
			return false, nil
		} else if err != nil {
			return false, err
		}
		targetGeneration = dashboard.Generation
		return true, nil
	})
	require.NoError(t, err)
	err = wait.PollUntilContextTimeout(context.Background(), e2ePollInterval, moduleLifecycleTimeout, true, func(ctx context.Context) (bool, error) {
		dashboard := &dashboardv1alpha1.Dashboard{}
		if err := k8sClient.Get(ctx, client.ObjectKey{Name: dashboardv1alpha1.DashboardInstanceName}, dashboard); err != nil {
			return false, client.IgnoreNotFound(err)
		}
		return dashboard.Status.ObservedGeneration >= targetGeneration, nil
	})
	require.NoError(t, err, "wait for Dashboard controller to observe generation %d", targetGeneration)
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

func waitForModuleDeployed(t *testing.T, name string) {
	t.Helper()
	waitForModuleExpectations(t, expectation(dashboardv1alpha1.ModulePhaseDeployed, "", name))
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

func waitForReplacementDeployment(t *testing.T, uid types.UID, slug string, deletedUID types.UID) *appsv1.Deployment {
	t.Helper()
	var found appsv1.Deployment
	err := wait.PollUntilContextTimeout(context.Background(), e2ePollInterval, moduleLifecycleTimeout, true, func(ctx context.Context) (bool, error) {
		list := &appsv1.DeploymentList{}
		if err := k8sClient.List(ctx, list, client.InNamespace(testNamespace), client.MatchingLabels{"app.kubernetes.io/component": slug}); err != nil {
			return false, err
		}
		for i := range list.Items {
			deployment := &list.Items[i]
			if deployment.UID != deletedUID && deployment.DeletionTimestamp.IsZero() && controlledByUID(deployment, uid) {
				found = *deployment.DeepCopy()
				return true, nil
			}
		}
		return false, nil
	})
	require.NoError(t, err, "wait for replacement owned %s Deployment", slug)
	return &found
}

func waitForNewReadyPod(t *testing.T, deployment *appsv1.Deployment, deletedUIDs map[types.UID]struct{}) {
	t.Helper()
	err := wait.PollUntilContextTimeout(context.Background(), e2ePollInterval, moduleLifecycleTimeout, true, func(ctx context.Context) (bool, error) {
		pods := &corev1.PodList{}
		if err := k8sClient.List(ctx, pods, client.InNamespace(testNamespace), client.MatchingLabels(deployment.Spec.Selector.MatchLabels)); err != nil {
			return false, err
		}
		for i := range pods.Items {
			if _, deleted := deletedUIDs[pods.Items[i].UID]; deleted {
				continue
			}
			for _, condition := range pods.Items[i].Status.Conditions {
				if condition.Type == corev1.PodReady && condition.Status == corev1.ConditionTrue {
					return true, nil
				}
			}
		}
		return false, nil
	})
	require.NoError(t, err, "wait for a newly recreated Ready Pod for Deployment %s", deployment.Name)
}

func setOperatorImageEnvironment(t *testing.T, name, value string) func() {
	t.Helper()
	operatorName := os.Getenv("TEST_OPERATOR_DEPLOYMENT")
	if operatorName == "" {
		operatorName = "dashboard-operator"
	}
	key := client.ObjectKey{Namespace: testNamespace, Name: operatorName}
	operator := &appsv1.Deployment{}
	require.NoError(t, k8sClient.Get(context.Background(), key, operator))
	require.NotEmpty(t, operator.Spec.Template.Spec.Containers)
	originalEnv := append([]corev1.EnvVar(nil), operator.Spec.Template.Spec.Containers[0].Env...)

	patchOperatorEnvironment(t, key, func(env []corev1.EnvVar) []corev1.EnvVar {
		for i := range env {
			if env[i].Name == name {
				env[i].Value = value
				env[i].ValueFrom = nil
				return env
			}
		}
		return append(env, corev1.EnvVar{Name: name, Value: value})
	})
	require.NoError(t, waitForDeploymentReady(k8sClient, key.Namespace, key.Name, moduleLifecycleTimeout))

	return func() {
		patchOperatorEnvironment(t, key, func([]corev1.EnvVar) []corev1.EnvVar {
			return append([]corev1.EnvVar(nil), originalEnv...)
		})
		require.NoError(t, waitForDeploymentReady(k8sClient, key.Namespace, key.Name, moduleLifecycleTimeout))
	}
}

func patchOperatorEnvironment(t *testing.T, key client.ObjectKey, mutate func([]corev1.EnvVar) []corev1.EnvVar) {
	t.Helper()
	err := wait.PollUntilContextTimeout(context.Background(), e2ePollInterval, time.Minute, true, func(ctx context.Context) (bool, error) {
		operator := &appsv1.Deployment{}
		if err := k8sClient.Get(ctx, key, operator); err != nil {
			return false, err
		}
		if len(operator.Spec.Template.Spec.Containers) == 0 {
			return false, fmt.Errorf("operator Deployment %s/%s has no containers", key.Namespace, key.Name)
		}
		before := operator.DeepCopy()
		operator.Spec.Template.Spec.Containers[0].Env = mutate(operator.Spec.Template.Spec.Containers[0].Env)
		if err := k8sClient.Patch(ctx, operator, client.MergeFrom(before)); apierrors.IsConflict(err) {
			return false, nil
		} else if err != nil {
			return false, err
		}
		return true, nil
	})
	require.NoError(t, err)
}

func waitForPodImagePullBackOff(t *testing.T, dashboardUID types.UID, slug string) {
	t.Helper()
	err := wait.PollUntilContextTimeout(context.Background(), e2ePollInterval, moduleLifecycleTimeout, true, func(ctx context.Context) (bool, error) {
		deployment, err := findOwnedDeployment(ctx, dashboardUID, slug)
		if err != nil {
			return false, err
		}
		if deployment == nil {
			return false, nil
		}
		pods := &corev1.PodList{}
		if err := k8sClient.List(ctx, pods, client.InNamespace(testNamespace), client.MatchingLabels(deployment.Spec.Selector.MatchLabels)); err != nil {
			return false, err
		}
		for i := range pods.Items {
			for _, status := range pods.Items[i].Status.ContainerStatuses {
				if status.State.Waiting != nil && status.State.Waiting.Reason == "ImagePullBackOff" {
					return true, nil
				}
			}
		}
		return false, nil
	})
	require.NoError(t, err, "wait for %s Pod ImagePullBackOff", slug)
}

func deleteReadyPodsForDeployment(t *testing.T, dashboardUID types.UID, slug string) {
	t.Helper()
	deployment, err := findOwnedDeployment(context.Background(), dashboardUID, slug)
	require.NoError(t, err)
	require.NotNil(t, deployment)
	pods := &corev1.PodList{}
	require.NoError(t, k8sClient.List(
		context.Background(),
		pods,
		client.InNamespace(testNamespace),
		client.MatchingLabels(deployment.Spec.Selector.MatchLabels),
	))
	deleted := 0
	for i := range pods.Items {
		for _, condition := range pods.Items[i].Status.Conditions {
			if condition.Type == corev1.PodReady && condition.Status == corev1.ConditionTrue {
				require.NoError(t, k8sClient.Delete(context.Background(), &pods.Items[i]))
				deleted++
				break
			}
		}
	}
	require.Positive(t, deleted, "expected a Ready Pod to remove before asserting degradation")
}

func findOwnedDeployment(ctx context.Context, dashboardUID types.UID, slug string) (*appsv1.Deployment, error) {
	list := &appsv1.DeploymentList{}
	if err := k8sClient.List(ctx, list, client.InNamespace(testNamespace), client.MatchingLabels{"app.kubernetes.io/component": slug}); err != nil {
		return nil, err
	}
	for i := range list.Items {
		if controlledByUID(&list.Items[i], dashboardUID) {
			return &list.Items[i], nil
		}
	}
	return nil, nil
}

func waitForDashboardDegraded(t *testing.T, module string) {
	t.Helper()
	err := wait.PollUntilContextTimeout(context.Background(), e2ePollInterval, moduleLifecycleTimeout, true, func(ctx context.Context) (bool, error) {
		dashboard := &dashboardv1alpha1.Dashboard{}
		if err := k8sClient.Get(ctx, client.ObjectKey{Name: dashboardv1alpha1.DashboardInstanceName}, dashboard); err != nil {
			return false, client.IgnoreNotFound(err)
		}
		moduleStatus, ok := dashboard.Status.ModuleStatuses[module]
		if !ok || moduleStatus.Phase != dashboardv1alpha1.ModulePhaseDegraded {
			return false, nil
		}
		for _, condition := range dashboard.Status.Conditions {
			if condition.Type == string(common.ConditionTypeDegraded) && condition.Status == metav1.ConditionTrue {
				return true, nil
			}
		}
		return false, nil
	})
	require.NoError(t, err, "wait for Dashboard and module %s to report degradation", module)
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

func waitForService(t *testing.T, uid types.UID, name string) {
	t.Helper()
	err := wait.PollUntilContextTimeout(context.Background(), e2ePollInterval, moduleLifecycleTimeout, true, func(ctx context.Context) (bool, error) {
		service := &corev1.Service{}
		err := k8sClient.Get(ctx, client.ObjectKey{Namespace: testNamespace, Name: name}, service)
		return err == nil && controlledByUID(service, uid), client.IgnoreNotFound(err)
	})
	require.NoError(t, err, "wait for Service %s/%s", testNamespace, name)
}

func waitForObject(t *testing.T, uid types.UID, object client.Object, name string) {
	t.Helper()
	err := wait.PollUntilContextTimeout(context.Background(), e2ePollInterval, moduleLifecycleTimeout, true, func(ctx context.Context) (bool, error) {
		err := k8sClient.Get(ctx, client.ObjectKey{Namespace: testNamespace, Name: name}, object)
		return err == nil && controlledByUID(object, uid), client.IgnoreNotFound(err)
	})
	require.NoError(t, err, "wait for %T %s/%s", object, testNamespace, name)
}

func controlledByUID(object metav1.Object, uid types.UID) bool {
	owner := metav1.GetControllerOf(object)
	return owner != nil && owner.UID == uid
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
	if len(pairs)%2 != 0 {
		panic("components requires name and management-state pairs")
	}
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
