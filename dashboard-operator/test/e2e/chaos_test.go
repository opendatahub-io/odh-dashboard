//go:build e2e

package e2e

import (
	"context"
	"os"
	"testing"

	chaosv1alpha1 "github.com/opendatahub-io/operator-chaos/api/v1alpha1"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/client-go/kubernetes"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

func TestE2EOperatorChaos(t *testing.T) {
	if os.Getenv("TEST_ENABLE_CHAOS") != "true" {
		t.Skip("set TEST_ENABLE_CHAOS=true to run destructive live-cluster chaos tests")
	}

	target, err := discoverChaosTarget(context.Background())
	require.NoError(t, err)
	require.NoError(t, verifyChaosPermissions(context.Background(), target.namespace, testNamespace))
	require.NoError(t, waitForDeploymentReady(
		k8sClient, target.namespace, target.deployment.Name, chaosRecoveryTimeout,
	))
	require.NoError(t, assertDashboardAndOperandsHealthy())
	clientset, err := kubernetes.NewForConfig(restConfig)
	require.NoError(t, err)

	t.Run("PodKill", func(t *testing.T) {
		experiment, err := loadLiveChaosExperiment("pod-kill.yaml", target)
		require.NoError(t, err)
		require.Equal(t, chaosv1alpha1.PodKill, experiment.Spec.Injection.Type)

		_, err = waitForReadyControllerPod(target, chaosRecoveryTimeout)
		require.NoError(t, err)
		baseline, err := captureControllerPodBaseline(context.Background(), target)
		require.NoError(t, err)

		fault, events, err := startChaosFault(context.Background(), experiment, target.namespace)
		if fault != nil {
			t.Cleanup(func() { require.NoError(t, fault.revert()) })
		}
		require.NoError(t, err)
		require.True(t, injectionTargetedBaselinePod(events, baseline.names), "PodKill must report a pre-injection controller pod it deleted")

		replacement, err := waitForReplacementControllerPod(target, baseline.uids, experiment.ResolvedRecoveryTimeout())
		require.NoError(t, err)
		t.Logf("controller recovered from pod kill: baselineUIDs=%d newUID=%s", len(baseline.uids), replacement.UID)
		require.NoError(t, fault.revert())
		require.NoError(t, waitForDeploymentReady(k8sClient, target.namespace, target.deployment.Name, chaosRecoveryTimeout))
		require.NoError(t, assertDashboardAndOperandsHealthy())
	})

	t.Run("NetworkPartition", func(t *testing.T) {
		experiment, err := loadLiveChaosExperiment("network-partition.yaml", target)
		require.NoError(t, err)
		require.Equal(t, chaosv1alpha1.NetworkPartition, experiment.Spec.Injection.Type)

		inventory, err := waitForOperandInventory(k8sClient, testNamespace, dashboardUID, chaosRecoveryTimeout)
		require.NoError(t, err)
		coreDeployment, err := findCoreDeployment(inventory.deployments)
		require.NoError(t, err)
		coreKey := client.ObjectKey{Namespace: coreDeployment.Namespace, Name: coreDeployment.Name}

		fault, events, err := startChaosFault(context.Background(), experiment, target.namespace)
		if fault != nil {
			t.Cleanup(func() { require.NoError(t, fault.revert()) })
		}
		require.NoError(t, err)
		require.Len(t, events, 1)
		require.Equal(t, chaosv1alpha1.NetworkPartition, events[0].Type)
		require.Equal(t, "created", events[0].Action)
		require.NoError(t, waitForChaosNetworkPolicy(events[0].Target, target.namespace, true))
		replacement, err := restartControllerUnderPartition(target, experiment.ResolvedRecoveryTimeout())
		require.NoError(t, err)
		t.Logf("controller restarted under active NetworkPolicy: newUID=%s podIP=%s", replacement.UID, replacement.Status.PodIP)

		require.NoError(t, removeOwnedCoreDeploymentLabel(context.Background(), coreKey))
		require.NoError(t, assertDeploymentLabelAbsentFor(coreKey, partitionObservationTime),
			"managed-resource drift must remain unhealed while the controller is isolated")

		require.NoError(t, fault.revert())
		require.NoError(t, waitForChaosNetworkPolicy(events[0].Target, target.namespace, false))
		require.NoError(t, waitForDeploymentReady(k8sClient, target.namespace, target.deployment.Name, chaosRecoveryTimeout))
		require.NoError(t, waitForDeploymentLabel(coreKey, experiment.ResolvedRecoveryTimeout()),
			"restoring the missed drift proves informer reconnection after partition healing")
		require.NoError(t, assertDashboardAndOperandsHealthy())
	})

	t.Run("PDBBlock", func(t *testing.T) {
		experiment, err := loadLiveChaosExperiment("pdb-block.yaml", target)
		require.NoError(t, err)
		require.Equal(t, chaosv1alpha1.PDBBlock, experiment.Spec.Injection.Type)

		fault, events, err := startChaosFault(context.Background(), experiment, target.namespace)
		if fault != nil {
			t.Cleanup(func() { require.NoError(t, fault.revert()) })
		}
		require.NoError(t, err)
		require.Len(t, events, 1)
		require.Equal(t, chaosv1alpha1.PDBBlock, events[0].Type)
		pdbName := events[0].Details["pdbName"]
		require.NotEmpty(t, pdbName)
		require.NoError(t, waitForChaosPDB(pdbName, target.namespace, true))

		current, err := waitForReadyControllerPod(target, chaosRecoveryTimeout)
		require.NoError(t, err)
		err = evictControllerPod(context.Background(), clientset, current)
		require.Error(t, err, "controller eviction must be blocked while the chaos PDB is active")
		require.True(t, evictionBlocked(err), "expected PDB denial/HTTP 429, got %v", err)
		unchanged := &corev1.Pod{}
		require.NoError(t, k8sClient.Get(context.Background(), client.ObjectKeyFromObject(current), unchanged))
		require.Equal(t, current.UID, unchanged.UID)

		require.NoError(t, fault.revert())
		require.NoError(t, waitForChaosPDB(pdbName, target.namespace, false))
		require.NoError(t, waitForDeploymentReady(k8sClient, target.namespace, target.deployment.Name, chaosRecoveryTimeout))
		require.NoError(t, assertDashboardAndOperandsHealthy())
	})
}
