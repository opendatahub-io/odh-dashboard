//go:build integration

package controller_test

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/operator-chaos/pkg/sdk"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	ctrlpkg "github.com/opendatahub-io/odh-dashboard/dashboard-operator/internal/controller"
)

// L3 operator-chaos integration: fault injection with the ChaosClient SDK
// (github.com/opendatahub-io/operator-chaos/pkg/sdk) layered on top of the
// L1-L2 shift-left validation added in RHOAIENG-63027 / PR #9201. These tests
// embed fault injection directly into the controller-runtime test harness to
// verify the DashboardReconciler behaves gracefully under upgrade-like faults:
// no panic, accurate status conditions, and self-healing once the fault clears.
//
// Two complementary injection styles are exercised:
//
//   - Cluster-state faults (config drift, managed-resource mutation, ownership
//     changes): the desired state is mutated out-of-band with the real client,
//     an apply-time fault is injected through the ChaosClient to confirm the
//     restore fails gracefully while the fault is active, then a fault-free
//     reconcile must restore the desired state via Server-Side Apply.
//   - Client-boundary faults (transient/intermittent API errors): the
//     reconciler is wired to a sdk.ChaosClient that injects errors on specific
//     controller-runtime operations, verifying the controller surfaces the
//     failure through status conditions and recovers when faults clear.
//
// See RHOAIENG-85609 and model-registry-operator PR #525 for the reference L3
// pattern.

const coreConfigMapName = "dashboard-core-config"

// newChaosReconciler wires a DashboardReconciler to a ChaosClient wrapping the
// shared envtest client, so the given fault config governs every client
// operation the reconciler performs.
func newChaosReconciler(manifests string, faults *sdk.FaultConfig) *ctrlpkg.DashboardReconciler {
	return newReconcilerWithClient(sdk.NewChaosClient(k8sClient, faults), manifests)
}

// setupChaosDashboard creates a Managed Dashboard with the given modules enabled
// and drives it to a healthy steady state using the real client (faults are
// injected by the caller afterwards). It returns a reconciler whose client is a
// ChaosClient governed by faults, ready for the fault phase of the test.
func setupChaosDashboard(t *testing.T, faults *sdk.FaultConfig, enabledModules ...string) *ctrlpkg.DashboardReconciler {
	t.Helper()

	manifestSlugs := make([]string, 0, len(enabledModules))
	for _, module := range enabledModules {
		if module == "modelRegistry" {
			manifestSlugs = append(manifestSlugs, "model-registry")
		}
	}
	manifests := createIntegrationManifests(t, manifestSlugs)

	// Baseline is established with the real client so the fault config only
	// governs the reconcile under test.
	real := newManifestReconciler(manifests)
	dashboard := newDashboard(v1alpha1.DashboardSpec{
		Gateway: &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Modules: disableAllModulesExcept(enabledModules...),
	})
	require.NoError(t, k8sClient.Create(context.Background(), dashboard))
	t.Cleanup(func() {
		deleteDashboard(t)
		cleanupModuleResources(t)
	})

	// First reconcile adds the finalizer; the second runs the deploy pipeline.
	reconcile(t, real)
	reconcile(t, real)
	require.Equal(t, metav1.ConditionTrue,
		conditionStatus(getDashboard(t), string(common.ConditionTypeProvisioningSucceeded)),
		"baseline should be provisioned before injecting faults")

	return newChaosReconciler(manifests, faults)
}

// getCoreConfigMap fetches the SSA-managed core ConfigMap the reconciler
// deploys from the core overlay.
func getCoreConfigMap(t *testing.T) *corev1.ConfigMap {
	t.Helper()
	cm := &corev1.ConfigMap{}
	require.NoError(t, k8sClient.Get(context.Background(), types.NamespacedName{
		Name:      coreConfigMapName,
		Namespace: integrationNamespace,
	}, cm))

	return cm
}

// assertApplyFaultIsGraceful injects a deterministic apply-time fault, drives a
// reconcile through the ChaosClient, and asserts the controller fails gracefully
// (a ChaosError, never a panic) rather than corrupting state. It leaves the
// fault deactivated so the caller can verify self-healing on the next reconcile.
func assertApplyFaultIsGraceful(t *testing.T, r *ctrlpkg.DashboardReconciler, faults *sdk.FaultConfig) {
	t.Helper()

	faults.SetFault(sdk.OpApply, sdk.FaultSpec{
		ErrorRate: 1.0,
		Error:     "chaos: apiserver unavailable during apply",
	})
	faults.Activate()

	_, err := r.Reconcile(context.Background(), dashboardRequest())
	require.Error(t, err, "reconcile should surface the injected apply fault")
	var chaosErr *sdk.ChaosError
	require.Truef(t, errors.As(err, &chaosErr), "error should be a ChaosError, got: %v", err)

	faults.Deactivate()
}

// TestIntegration_Chaos_ConfigDrift_RestoredByReconcile injects config drift by
// mutating a managed ConfigMap out-of-band, verifies the controller tolerates an
// apply-time fault gracefully while the drift is present, and then confirms that
// once the fault clears the next reconcile restores the operator-owned value via
// Server-Side Apply. (RHOAIENG-85609)
func TestIntegration_Chaos_ConfigDrift_RestoredByReconcile(t *testing.T) {
	faults := &sdk.FaultConfig{}
	r := setupChaosDashboard(t, faults)

	// Capture the operator-owned baseline value.
	cm := getCoreConfigMap(t)
	original := cm.Data["key"]
	require.NotEmpty(t, original, "core ConfigMap should carry an operator-owned value")

	// Drift: mutate the managed ConfigMap outside the controller.
	drift := cm.DeepCopy()
	drift.Data["key"] = "drifted-by-chaos"
	require.NoError(t, k8sClient.Update(context.Background(), drift))
	require.Equal(t, "drifted-by-chaos", getCoreConfigMap(t).Data["key"], "drift should be applied")

	// While an apply fault is active the reconcile fails gracefully and the drift
	// remains unhealed.
	assertApplyFaultIsGraceful(t, r, faults)
	require.Equal(t, "drifted-by-chaos", getCoreConfigMap(t).Data["key"],
		"drift should persist while the apply fault blocks reconciliation")

	// Once the fault clears, re-reconcile heals the drift.
	reconcile(t, r)

	assert.Equal(t, original, getCoreConfigMap(t).Data["key"],
		"reconcile should restore the operator-owned ConfigMap value after config drift")
}

// TestIntegration_Chaos_ManagedResourceMutation_RestoredByReconcile injects a
// CRD/managed-resource mutation by rewriting a managed Deployment's container
// image out-of-band and verifies the next reconcile reasserts the desired image.
// Image is not part of the deploy merge strategy (which preserves only replicas
// and resources), so SSA fully reclaims it. (RHOAIENG-85609)
func TestIntegration_Chaos_ManagedResourceMutation_RestoredByReconcile(t *testing.T) {
	faults := &sdk.FaultConfig{}
	r := setupChaosDashboard(t, faults, "modelRegistry")

	deployments := listDeployments(t, "model-registry")
	require.Len(t, deployments, 1)
	require.NotEmpty(t, deployments[0].Spec.Template.Spec.Containers,
		"managed Deployment should have containers")
	original := deployments[0].Spec.Template.Spec.Containers[0].Image
	require.NotEmpty(t, original, "managed Deployment should carry an operator-owned image")

	// Mutate the managed Deployment's image outside the controller.
	drift := deployments[0].DeepCopy()
	drift.Spec.Template.Spec.Containers[0].Image = "registry.example.com/chaos-injected:mutated"
	require.NoError(t, k8sClient.Update(context.Background(), drift))
	require.Equal(t, "registry.example.com/chaos-injected:mutated",
		listDeployments(t, "model-registry")[0].Spec.Template.Spec.Containers[0].Image,
		"mutation should be applied")

	// While an apply fault is active the reconcile fails gracefully and the
	// mutation remains unhealed.
	assertApplyFaultIsGraceful(t, r, faults)
	require.Equal(t, "registry.example.com/chaos-injected:mutated",
		listDeployments(t, "model-registry")[0].Spec.Template.Spec.Containers[0].Image,
		"mutation should persist while the apply fault blocks reconciliation")

	// Once the fault clears, re-reconcile reasserts the desired image.
	reconcile(t, r)

	assert.Equal(t, original,
		listDeployments(t, "model-registry")[0].Spec.Template.Spec.Containers[0].Image,
		"reconcile should reassert the desired Deployment image after mutation")
}

// TestIntegration_Chaos_OwnershipStripped_Reestablished removes the controller
// owner reference from a managed resource and verifies the next reconcile
// re-establishes it, keeping garbage-collection semantics intact.
// (RHOAIENG-85609)
func TestIntegration_Chaos_OwnershipStripped_Reestablished(t *testing.T) {
	faults := &sdk.FaultConfig{}
	r := setupChaosDashboard(t, faults)

	cm := getCoreConfigMap(t)
	require.NotEmpty(t, cm.OwnerReferences, "managed ConfigMap should have an owner reference")
	require.Equal(t, v1alpha1.DashboardInstanceName, cm.OwnerReferences[0].Name,
		"owner reference should point to the Dashboard CR")

	// Strip the owner references out-of-band.
	stripped := cm.DeepCopy()
	stripped.OwnerReferences = nil
	require.NoError(t, k8sClient.Update(context.Background(), stripped))
	require.Empty(t, getCoreConfigMap(t).OwnerReferences, "owner references should be stripped")

	// While an apply fault is active the reconcile fails gracefully and ownership
	// remains unrestored.
	assertApplyFaultIsGraceful(t, r, faults)
	require.Empty(t, getCoreConfigMap(t).OwnerReferences,
		"owner references should remain stripped while the apply fault blocks reconciliation")

	// Once the fault clears, re-reconcile re-establishes ownership.
	reconcile(t, r)

	restored := getCoreConfigMap(t)
	require.NotEmpty(t, restored.OwnerReferences,
		"reconcile should re-establish the owner reference after it was stripped")
	assert.Equal(t, v1alpha1.DashboardInstanceName, restored.OwnerReferences[0].Name,
		"re-established owner reference should point to the Dashboard CR")
	assert.Equal(t, v1alpha1.DashboardKind, restored.OwnerReferences[0].Kind)
}

// TestIntegration_Chaos_ClientApplyFault_DegradesAndRecovers uses the ChaosClient
// SDK to inject a deterministic fault on the Apply operation the SSA deployer
// relies on. The reconcile must fail gracefully (a ChaosError, no panic) and
// report the failure through status conditions, then self-heal once the fault
// is cleared. (RHOAIENG-85609)
func TestIntegration_Chaos_ClientApplyFault_DegradesAndRecovers(t *testing.T) {
	// Core-only so recovery reaches a fully Ready state (no module replica
	// bookkeeping); the core overlay still deploys via SSA Apply, so the OpApply
	// fault fires on the deploy path.
	faults := &sdk.FaultConfig{}
	r := setupChaosDashboard(t, faults)

	// Inject an apply-time fault (SSA deploy goes through client.Apply).
	faults.SetFault(sdk.OpApply, sdk.FaultSpec{
		ErrorRate: 1.0,
		Error:     "chaos: apiserver unavailable during apply",
	})
	faults.Activate()

	_, err := r.Reconcile(context.Background(), dashboardRequest())
	require.Error(t, err, "reconcile should surface the injected apply fault")

	var chaosErr *sdk.ChaosError
	require.Truef(t, errors.As(err, &chaosErr), "error should be a ChaosError, got: %v", err)
	assert.Equal(t, sdk.OpApply, chaosErr.Operation)

	// Status reflects the provisioning failure; the controller did not panic and
	// persisted an accurate condition (status writes bypass the fault).
	dashboard := getDashboard(t)
	assert.Equal(t, metav1.ConditionFalse,
		conditionStatus(dashboard, string(common.ConditionTypeProvisioningSucceeded)),
		"ProvisioningSucceeded should be False while the apply fault is active")
	assert.Equal(t, metav1.ConditionFalse,
		conditionStatus(dashboard, string(common.ConditionTypeReady)),
		"Ready should be False while the apply fault is active")
	assert.Equal(t, common.PhaseNotReady, dashboard.Status.Phase)

	// Clear the fault: the controller self-heals on the next reconcile.
	faults.Deactivate()
	reconcile(t, r)

	dashboard = getDashboard(t)
	assert.Equal(t, metav1.ConditionTrue,
		conditionStatus(dashboard, string(common.ConditionTypeProvisioningSucceeded)),
		"ProvisioningSucceeded should recover once the fault clears")
	assert.Equal(t, metav1.ConditionTrue,
		conditionStatus(dashboard, string(common.ConditionTypeReady)),
		"Ready should recover once the fault clears")
	assert.Equal(t, common.PhaseReady, dashboard.Status.Phase)
}

// TestIntegration_Chaos_IntermittentClientFaults_EventuallyConverges models a
// flaky API server during an upgrade. It first drives two deterministic fault
// phases (read, then apply) so each injection path is provably exercised and the
// test cannot pass vacuously if injection regresses, then applies intermittent
// mixed faults to confirm the controller never panics and only ever surfaces
// ChaosErrors, and finally verifies convergence once the faults clear.
// (RHOAIENG-85609)
func TestIntegration_Chaos_IntermittentClientFaults_EventuallyConverges(t *testing.T) {
	faults := &sdk.FaultConfig{}
	r := setupChaosDashboard(t, faults, "modelRegistry")

	// observed records which fault paths actually fired, so the coverage below
	// cannot pass without genuine injection.
	observed := map[sdk.Operation]bool{}

	// Phase 1 — deterministic read fault: the outer Get fails before any deploy.
	faults.SetFault(sdk.OpGet, sdk.FaultSpec{ErrorRate: 1.0, Error: "chaos: get unavailable"})
	faults.Activate()
	_, err := r.Reconcile(context.Background(), dashboardRequest())
	require.Error(t, err, "an active OpGet fault should surface an error")
	var getErr *sdk.ChaosError
	require.Truef(t, errors.As(err, &getErr), "expected a ChaosError, got: %v", err)
	assert.Equal(t, sdk.OpGet, getErr.Operation)
	observed[getErr.Operation] = true
	faults.RemoveFault(sdk.OpGet)

	// Phase 2 — deterministic apply fault: reads are healthy, so the SSA deploy
	// fails on apply.
	faults.SetFault(sdk.OpApply, sdk.FaultSpec{ErrorRate: 1.0, Error: "chaos: apply unavailable"})
	_, err = r.Reconcile(context.Background(), dashboardRequest())
	require.Error(t, err, "an active OpApply fault should surface an error")
	var applyErr *sdk.ChaosError
	require.Truef(t, errors.As(err, &applyErr), "expected a ChaosError, got: %v", err)
	assert.Equal(t, sdk.OpApply, applyErr.Operation)
	observed[applyErr.Operation] = true
	faults.RemoveFault(sdk.OpApply)

	// Phase 3 — intermittent mixed faults: hammer the reconciler and confirm any
	// error is an injected ChaosError (the controller must not turn chaos into a
	// different failure mode) and that it never panics.
	faults.SetFault(sdk.OpGet, sdk.FaultSpec{ErrorRate: 0.5, Error: "chaos: intermittent get timeout"})
	faults.SetFault(sdk.OpApply, sdk.FaultSpec{ErrorRate: 0.5, Error: "chaos: intermittent apply conflict"})
	for i := range 12 {
		_, err := r.Reconcile(context.Background(), dashboardRequest())
		if err != nil {
			var chaosErr *sdk.ChaosError
			require.Truef(t, errors.As(err, &chaosErr),
				"iteration %d: every error under chaos must be a ChaosError, got: %v", i, err)
			observed[chaosErr.Operation] = true
		}
	}

	// Both fault paths were genuinely exercised (guaranteed by phases 1 and 2).
	assert.True(t, observed[sdk.OpGet], "the OpGet fault path should have been exercised")
	assert.True(t, observed[sdk.OpApply], "the OpApply fault path should have been exercised")

	// Clear faults and drive to convergence.
	faults.Deactivate()
	reconcile(t, r)
	setModuleReadyReplicas(t, "model-registry", 1)
	reconcile(t, r)

	dashboard := getDashboard(t)
	assert.Equal(t, metav1.ConditionTrue,
		conditionStatus(dashboard, string(common.ConditionTypeProvisioningSucceeded)),
		"ProvisioningSucceeded should be True after faults clear")
	assert.Equal(t, metav1.ConditionFalse,
		conditionStatus(dashboard, string(common.ConditionTypeDegraded)),
		"Degraded should be False once modules report healthy")
	assert.Equal(t, metav1.ConditionTrue,
		conditionStatus(dashboard, string(common.ConditionTypeReady)),
		"Ready should recover after intermittent faults clear")
	assert.Equal(t, common.PhaseReady, dashboard.Status.Phase)
}
