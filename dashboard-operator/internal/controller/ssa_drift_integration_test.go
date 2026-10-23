//go:build integration

package controller_test

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/intstr"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/config"
	"sigs.k8s.io/controller-runtime/pkg/envtest"
	metricsserver "sigs.k8s.io/controller-runtime/pkg/metrics/server"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	platformlabels "github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	ctrlpkg "github.com/opendatahub-io/odh-dashboard/dashboard-operator/internal/controller"
)

const (
	ssaDriftNamespace       = "ssa-drift-integration"
	ssaDriftServiceName     = "maas-ui"
	ssaDriftDesiredPort     = int32(8543)
	ssaDriftExternalPort    = int32(9999)
	ssaDriftExternalManager = "kubectl-patch"
	ssaDriftOperatorManager = "dashboard-operator"
)

// TestIntegration_ServiceDrift_ReclaimedByDashboardOperator verifies
// RHOAIENG-78639 end to end. It covers drift present when the controller starts
// and drift introduced while the owned-Service watch is running.
func TestIntegration_ServiceDrift_ReclaimedByDashboardOperator(t *testing.T) {
	localEnv := &envtest.Environment{
		CRDDirectoryPaths: []string{filepath.Join("..", "..", "config", "crd", "bases"), filepath.Join("testdata", "crd")},
		Scheme:            k8sClient.Scheme(),
	}
	cfg, err := localEnv.Start()
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, localEnv.Stop()) })

	directClient, err := client.New(cfg, client.Options{Scheme: k8sClient.Scheme()})
	require.NoError(t, err)
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	require.NoError(t, directClient.Create(ctx, &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{Name: ssaDriftNamespace},
	}))

	manifests := createIntegrationManifests(t, []string{"maas"})
	require.NoError(t, os.WriteFile(
		filepath.Join(manifests, "modules", "maas", "service.yaml"),
		[]byte(`apiVersion: v1
kind: Service
metadata:
  name: maas-ui
spec:
  selector:
    app: maas-ui
  ports:
  - name: maas-ui
    port: 8543
    targetPort: 8543
`),
		0o644,
	))

	modules := disableAllModulesExcept("maas")
	modules["maas"] = v1alpha1.ModuleOverride{State: v1alpha1.ModuleEnabled}
	dashboard := newDashboard(v1alpha1.DashboardSpec{
		Gateway: &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Modules: modules,
	})
	require.NoError(t, directClient.Create(ctx, dashboard))
	require.NoError(t, directClient.Get(ctx, client.ObjectKeyFromObject(dashboard), dashboard))

	// Model the ticket's scale-to-zero case: create the operator-owned baseline,
	// then let kubectl-patch replace the associative port-list entry while the
	// controller is stopped.
	drifted := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:      ssaDriftServiceName,
			Namespace: ssaDriftNamespace,
			Labels:    map[string]string{platformlabels.PlatformPartOf: "dashboard"},
		},
		Spec: corev1.ServiceSpec{
			Selector: map[string]string{"app": ssaDriftServiceName},
			Ports: []corev1.ServicePort{{
				Name:       "maas-ui",
				Port:       ssaDriftDesiredPort,
				TargetPort: intstr.FromInt32(ssaDriftDesiredPort),
			}},
		},
	}
	require.NoError(t, ctrl.SetControllerReference(dashboard, drifted, directClient.Scheme()))
	require.NoError(t, directClient.Create(ctx, drifted, client.FieldOwner(ssaDriftOperatorManager)))
	require.True(t, managerOwnsServicePorts(drifted, ssaDriftOperatorManager))
	require.NoError(t, patchSSADriftService(ctx, directClient))
	drifted = getSSADriftService(t, ctx, directClient)
	require.Equal(t, ssaDriftExternalPort, drifted.Spec.Ports[0].Port)
	require.True(t, managerOwnsServicePorts(drifted, ssaDriftExternalManager))

	skipNameValidation := true
	mgr, err := ctrl.NewManager(cfg, ctrl.Options{
		Scheme:                 k8sClient.Scheme(),
		NewCache:               ctrlpkg.NewManagerCache(ssaDriftNamespace),
		Metrics:                metricsserver.Options{BindAddress: "0"},
		HealthProbeBindAddress: "0",
		Controller:             config.Controller{SkipNameValidation: &skipNameValidation},
	})
	require.NoError(t, err)
	require.NoError(t, ctrlpkg.SetupWithManager(mgr, ctrlpkg.Options{
		ManifestsBasePath:     manifests,
		Platform:              cluster.OpenDataHub,
		Namespace:             ssaDriftNamespace,
		ApplicationsNamespace: ssaDriftNamespace,
	}))

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
	require.Eventually(t, func() bool {
		current := &v1alpha1.Dashboard{}
		return directClient.Get(ctx, client.ObjectKeyFromObject(dashboard), current) == nil && len(current.Finalizers) > 0
	}, 10*time.Second, 100*time.Millisecond, "controller did not reconcile the pre-existing Dashboard")

	assertServicePortAndOwner(t, ctx, directClient, ssaDriftDesiredPort, ssaDriftOperatorManager,
		"controller startup did not reclaim the drifted Service port")
	waitForServiceToSettle(t, ctx, directClient)

	// Reproduce the live oc patch after startup. The repair must arrive through
	// the Service watch, without manually invoking Reconcile.
	require.NoError(t, patchSSADriftService(ctx, directClient))

	external := getSSADriftService(t, ctx, directClient)
	require.Equal(t, ssaDriftExternalPort, external.Spec.Ports[0].Port)
	require.True(t, managerOwnsServicePorts(external, ssaDriftExternalManager),
		"external field manager did not take ownership of spec.ports")

	assertServicePortAndOwner(t, ctx, directClient, ssaDriftDesiredPort, ssaDriftOperatorManager,
		"owned-Service watch did not restore the externally managed port")
}

func patchSSADriftService(ctx context.Context, cli client.Client) error {
	patch := []byte(`{"spec":{"ports":[{"name":"maas-ui","port":9999,"protocol":"TCP","targetPort":8543}]}}`)
	return cli.Patch(
		ctx,
		&corev1.Service{ObjectMeta: metav1.ObjectMeta{Name: ssaDriftServiceName, Namespace: ssaDriftNamespace}},
		client.RawPatch(types.MergePatchType, patch),
		client.FieldOwner(ssaDriftExternalManager),
	)
}

func assertServicePortAndOwner(
	t *testing.T,
	ctx context.Context,
	cli client.Client,
	wantPort int32,
	wantManager string,
	message string,
) {
	t.Helper()
	require.EventuallyWithT(t, func(c *assert.CollectT) {
		service := &corev1.Service{}
		if !assert.NoError(c, cli.Get(ctx, client.ObjectKey{Name: ssaDriftServiceName, Namespace: ssaDriftNamespace}, service)) {
			return
		}
		if !assert.Len(c, service.Spec.Ports, 1) {
			return
		}
		assert.Equal(c, wantPort, service.Spec.Ports[0].Port)
		assert.True(c, managerOwnsServicePorts(service, wantManager),
			"%s does not own spec.ports; managedFields: %+v", wantManager, service.ManagedFields)
	}, 10*time.Second, 100*time.Millisecond, message)
}

func getSSADriftService(t *testing.T, ctx context.Context, cli client.Client) *corev1.Service {
	t.Helper()
	service := &corev1.Service{}
	require.NoError(t, cli.Get(ctx, client.ObjectKey{Name: ssaDriftServiceName, Namespace: ssaDriftNamespace}, service))
	return service
}

func waitForServiceToSettle(t *testing.T, ctx context.Context, cli client.Client) {
	t.Helper()
	var lastVersion string
	var stableSince time.Time
	require.Eventually(t, func() bool {
		service := getSSADriftService(t, ctx, cli)
		if service.ResourceVersion != lastVersion {
			lastVersion = service.ResourceVersion
			stableSince = time.Now()
		}
		return time.Since(stableSince) >= 500*time.Millisecond
	}, 10*time.Second, 100*time.Millisecond, "Service did not settle before external drift")
}

func managerOwnsServicePorts(service *corev1.Service, manager string) bool {
	for _, fields := range service.ManagedFields {
		if fields.Manager != manager || fields.FieldsV1 == nil {
			continue
		}
		var owned map[string]any
		if json.Unmarshal(fields.FieldsV1.GetRawBytes(), &owned) != nil {
			continue
		}
		spec, ok := owned["f:spec"].(map[string]any)
		if !ok {
			continue
		}
		if _, ok := spec["f:ports"]; ok {
			return true
		}
	}
	return false
}
