//go:build integration

package controller_test

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/config"
	"sigs.k8s.io/controller-runtime/pkg/envtest"
	metricsserver "sigs.k8s.io/controller-runtime/pkg/metrics/server"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/controller/conditions"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	ctrlpkg "github.com/opendatahub-io/odh-dashboard/dashboard-operator/internal/controller"
)

func TestIntegration_NamespaceConsentWatchPersistsRBACFailureStatus(t *testing.T) {
	localEnv := &envtest.Environment{
		CRDDirectoryPaths: []string{filepath.Join("..", "..", "config", "crd", "bases"), filepath.Join("testdata", "crd")},
		Scheme:            k8sClient.Scheme(),
	}
	cfg, err := localEnv.Start()
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, localEnv.Stop()) })

	const operatorNamespace = "namespaced-rbac-watch"
	const targetNamespace = "namespaced-rbac-watch-target"
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	directClient, err := client.New(cfg, client.Options{Scheme: k8sClient.Scheme()})
	require.NoError(t, err)
	for _, namespace := range []*corev1.Namespace{
		{ObjectMeta: metav1.ObjectMeta{Name: operatorNamespace}},
		{ObjectMeta: metav1.ObjectMeta{Name: targetNamespace, Labels: map[string]string{
			v1alpha1.NamespacedRBACOptInLabel: "true",
		}}},
	} {
		require.NoError(t, directClient.Create(ctx, namespace))
	}

	skipNameValidation := true
	mgr, err := ctrl.NewManager(cfg, ctrl.Options{
		Scheme:                 k8sClient.Scheme(),
		NewCache:               ctrlpkg.NewManagerCache(operatorNamespace),
		Metrics:                metricsserver.Options{BindAddress: "0"},
		HealthProbeBindAddress: "0",
		Controller:             config.Controller{SkipNameValidation: &skipNameValidation},
		Client: client.Options{Cache: &client.CacheOptions{DisableFor: []client.Object{
			&corev1.ConfigMap{},
		}}},
	})
	require.NoError(t, err)
	require.NoError(t, ctrlpkg.SetupWithManager(mgr, ctrlpkg.Options{
		ManifestsBasePath:              createIntegrationManifests(t, nil),
		Platform:                       cluster.OpenDataHub,
		Namespace:                      operatorNamespace,
		ApplicationsNamespace:          operatorNamespace,
		NamespacedRBACAdmissionEnabled: true,
		NamespacedRBACWebhookEnabled:   true,
	}))

	dashboard := newDashboard(v1alpha1.DashboardSpec{
		Gateway:            &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Modules:            disableAllModulesExcept(),
		NotebooksNamespace: targetNamespace,
	})
	require.NoError(t, directClient.Create(ctx, dashboard))
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

	grantKey := types.NamespacedName{Namespace: targetNamespace, Name: "dashboard-notebooks-role"}
	require.Eventually(t, func() bool {
		return directClient.Get(ctx, grantKey, &rbacv1.Role{}) == nil
	}, 10*time.Second, 100*time.Millisecond, "initial consented grant was not reconciled")

	target := &corev1.Namespace{}
	require.NoError(t, directClient.Get(ctx, types.NamespacedName{Name: targetNamespace}, target))
	delete(target.Labels, v1alpha1.NamespacedRBACOptInLabel)
	require.NoError(t, directClient.Update(ctx, target))

	require.EventuallyWithT(t, func(c *assert.CollectT) {
		current := &v1alpha1.Dashboard{}
		if !assert.NoError(c, directClient.Get(ctx, types.NamespacedName{Name: v1alpha1.DashboardInstanceName}, current)) {
			return
		}
		degraded := conditions.FindStatusCondition(current, string(common.ConditionTypeDegraded))
		if !assert.NotNil(c, degraded) {
			return
		}
		assert.Equal(c, metav1.ConditionTrue, degraded.Status)
		assert.Equal(c, "NamespacedRBACFailed", degraded.Reason)
		ready := conditions.FindStatusCondition(current, string(common.ConditionTypeReady))
		if assert.NotNil(c, ready) {
			assert.Equal(c, metav1.ConditionFalse, ready.Status)
			assert.Equal(c, "NamespacedRBACFailed", ready.Reason)
		}
		assert.True(c, apierrors.IsNotFound(directClient.Get(ctx, grantKey, &rbacv1.Role{})))
	}, 10*time.Second, 100*time.Millisecond, "namespace watch did not persist the RBAC failure status")
}
