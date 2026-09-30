//go:build integration

package controller_test

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/config"
	"sigs.k8s.io/controller-runtime/pkg/envtest"
	metricsserver "sigs.k8s.io/controller-runtime/pkg/metrics/server"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	ctrlpkg "github.com/opendatahub-io/odh-dashboard/dashboard-operator/internal/controller"
)

func TestIntegration_MaaSConsumerPortalSubscriptionRBACWatches(t *testing.T) {
	// A running manager exercises informer events rather than manually invoking
	// Reconcile. Isolate it from the shared envtest's manually reconciled CRs.
	localEnv := &envtest.Environment{
		CRDDirectoryPaths: []string{filepath.Join("..", "..", "config", "crd", "bases"), filepath.Join("testdata", "crd")},
		Scheme:            k8sClient.Scheme(),
	}
	cfg, err := localEnv.Start()
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, localEnv.Stop()) })
	// Controller names are tracked globally across the suite's managers.
	skipNameValidation := true
	mgr, err := ctrl.NewManager(cfg, ctrl.Options{
		Scheme: k8sClient.Scheme(), Metrics: metricsserver.Options{BindAddress: "0"}, HealthProbeBindAddress: "0",
		Controller: config.Controller{SkipNameValidation: &skipNameValidation},
	})
	require.NoError(t, err)
	base := createIntegrationManifests(t, []string{"maas", "gen-ai"})
	writeMaaSConsumerPortalManifest(t, base)
	require.NoError(t, ctrlpkg.SetupWithManager(mgr, ctrlpkg.Options{
		ManifestsBasePath: base, Platform: cluster.SelfManagedRhoai,
		Namespace: integrationNamespace, ApplicationsNamespace: integrationNamespace,
	}))
	directClient, err := client.New(cfg, client.Options{Scheme: k8sClient.Scheme()})
	require.NoError(t, err)
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	for _, namespace := range []string{integrationNamespace, "redhat-ods-operator"} {
		require.NoError(t, directClient.Create(ctx, &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: namespace}}))
	}
	require.NoError(t, directClient.Create(ctx, newDashboard(v1alpha1.DashboardSpec{
		ManagementSpec:     common.ManagementSpec{ManagementState: "Removed"},
		Gateway:            &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Modules:            disableAllModulesExcept("maas", "genAi"),
		MaaSConsumerPortal: &v1alpha1.MaaSConsumerPortalSpec{ManagementState: "Managed"},
		Observability:      &v1alpha1.ObservabilitySpec{Enabled: false},
	})))
	managerErr := make(chan error, 1)
	go func() { managerErr <- mgr.Start(ctx) }()
	t.Cleanup(func() {
		cancel()
		select {
		case err := <-managerErr:
			require.NoError(t, err)
		case <-time.After(10 * time.Second):
			t.Error("manager did not stop")
		}
	})

	// Settle the portal into Ready so periodic readiness retries cannot repair
	// the grants for us. Each repair below must happen within ten seconds.
	for _, name := range []string{"maas-consumer-portal", "maas-ui", "gen-ai-ui"} {
		require.Eventually(t, func() bool {
			deployment := &appsv1.Deployment{}
			if directClient.Get(ctx, client.ObjectKey{Name: name, Namespace: integrationNamespace}, deployment) != nil {
				return false
			}
			deployment.Status.ObservedGeneration = deployment.Generation
			deployment.Status.Replicas = 1
			deployment.Status.ReadyReplicas = 1
			deployment.Status.Conditions = []appsv1.DeploymentCondition{{Type: appsv1.DeploymentAvailable, Status: corev1.ConditionTrue}}
			return directClient.Status().Update(ctx, deployment) == nil
		}, 10*time.Second, 100*time.Millisecond)
	}
	require.Eventually(t, func() bool {
		route := &gatewayv1.HTTPRoute{}
		if directClient.Get(ctx, client.ObjectKey{Name: "maas-consumer-portal", Namespace: integrationNamespace}, route) != nil {
			return false
		}
		route.Status.Parents = []gatewayv1.RouteParentStatus{{Conditions: []metav1.Condition{
			{Type: string(gatewayv1.RouteConditionAccepted), Status: metav1.ConditionTrue, ObservedGeneration: route.Generation},
			{Type: string(gatewayv1.RouteConditionResolvedRefs), Status: metav1.ConditionTrue, ObservedGeneration: route.Generation},
		}}}
		return directClient.Status().Update(ctx, route) == nil
	}, 10*time.Second, 100*time.Millisecond)
	dashboard := &v1alpha1.Dashboard{}
	require.Eventually(t, func() bool {
		return directClient.Get(ctx, client.ObjectKey{Name: v1alpha1.DashboardInstanceName}, dashboard) == nil &&
			conditionStatus(dashboard, string(common.ConditionTypeReady)) == metav1.ConditionTrue
	}, 10*time.Second, 100*time.Millisecond)

	key := client.ObjectKey{Name: "maas-consumer-portal-rhods-operator-subscription", Namespace: "redhat-ods-operator"}
	role := &rbacv1.Role{}
	binding := &rbacv1.RoleBinding{}
	require.NoError(t, directClient.Get(ctx, key, role))
	require.NoError(t, directClient.Get(ctx, key, binding))
	expectedRules, expectedSubjects := role.DeepCopy().Rules, binding.DeepCopy().Subjects
	require.NotEmpty(t, expectedRules)
	require.NotEmpty(t, expectedSubjects)

	// Drain events from setup or the preceding repair before each mutation, so
	// an unrelated queued reconciliation cannot make a missing watch pass.
	waitForIdle := func(t *testing.T) {
		t.Helper()
		var lastVersion string
		var stableSince time.Time
		require.Eventually(t, func() bool {
			if directClient.Get(ctx, client.ObjectKeyFromObject(dashboard), dashboard) != nil {
				return false
			}
			if dashboard.ResourceVersion != lastVersion {
				lastVersion, stableSince = dashboard.ResourceVersion, time.Now()
			}
			return time.Since(stableSince) >= 500*time.Millisecond
		}, 10*time.Second, 100*time.Millisecond, "controller did not settle before grant mutation")
	}

	for _, tt := range []struct {
		name     string
		resource client.Object
	}{{"Role", role}, {"RoleBinding", binding}} {
		t.Run(tt.name+" deletion", func(t *testing.T) {
			waitForIdle(t)
			resource := tt.resource
			previousUID := resource.GetUID()
			require.NoError(t, directClient.Delete(ctx, resource))
			require.Eventually(t, func() bool {
				return directClient.Get(ctx, key, resource) == nil && resource.GetUID() != previousUID
			}, 10*time.Second, 100*time.Millisecond, "owned grant deletion did not trigger reconciliation")
		})
	}

	waitForIdle(t)
	role.Rules = nil
	require.NoError(t, directClient.Update(ctx, role))
	require.Eventually(t, func() bool {
		return directClient.Get(ctx, key, role) == nil && len(role.Rules) > 0
	}, 10*time.Second, 100*time.Millisecond, "Role drift did not trigger reconciliation")
	assert.Equal(t, expectedRules, role.Rules)
	waitForIdle(t)
	binding.Subjects = nil
	require.NoError(t, directClient.Update(ctx, binding))
	require.Eventually(t, func() bool {
		return directClient.Get(ctx, key, binding) == nil && len(binding.Subjects) > 0
	}, 10*time.Second, 100*time.Millisecond, "RoleBinding drift did not trigger reconciliation")
	assert.Equal(t, expectedSubjects, binding.Subjects)
}
