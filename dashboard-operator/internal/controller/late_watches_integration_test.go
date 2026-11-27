//go:build integration

package controller

import (
	"context"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/cache"
	"sigs.k8s.io/controller-runtime/pkg/client"
	ctrlcontroller "sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/envtest"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	metricsserver "sigs.k8s.io/controller-runtime/pkg/metrics/server"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

type recordingReconciler struct {
	mu       sync.Mutex
	requests []reconcile.Request
}

func (r *recordingReconciler) Reconcile(_ context.Context, request reconcile.Request) (reconcile.Result, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.requests = append(r.requests, request)
	return reconcile.Result{}, nil
}

func (r *recordingReconciler) saw(name string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, request := range r.requests {
		if request.Name == name {
			return true
		}
	}
	return false
}

// Gateway API installed after the manager starts must still get a watch: the late watch polls
// discovery, starts its scoped cache once the CRD exists, and delivers HTTPRoute events to the
// running controller without a restart.
func TestIntegration_LateWatchRegistersAfterCRDInstall(t *testing.T) {
	previousInterval := lateWatchDiscoveryInterval
	lateWatchDiscoveryInterval = 500 * time.Millisecond
	t.Cleanup(func() { lateWatchDiscoveryInterval = previousInterval })

	s := runtime.NewScheme()
	require.NoError(t, clientgoscheme.AddToScheme(s))
	require.NoError(t, v1alpha1.AddToScheme(s))
	require.NoError(t, gatewayv1.Install(s))

	env := &envtest.Environment{CRDDirectoryPaths: []string{filepath.Join("..", "..", "config", "crd", "bases")}, Scheme: s}
	cfg, err := env.Start()
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, env.Stop()) })

	const namespace = "late-watch"
	mgr, err := ctrl.NewManager(cfg, ctrl.Options{
		Scheme:                 s,
		Metrics:                metricsserver.Options{BindAddress: "0"},
		HealthProbeBindAddress: "0",
	})
	require.NoError(t, err)
	recorder := &recordingReconciler{}
	skipNameValidation := true
	testController, err := ctrlcontroller.New("late-watch-test", mgr, ctrlcontroller.Options{Reconciler: recorder, SkipNameValidation: &skipNameValidation})
	require.NoError(t, err)

	httpRouteGVK := gatewayv1.SchemeGroupVersion.WithKind("HTTPRoute")
	available, err := apiResourceAvailable(mgr.GetRESTMapper(), httpRouteGVK)
	require.NoError(t, err)
	require.False(t, available, "test precondition: Gateway API must not be installed at startup")
	require.NoError(t, addLateWatch(mgr, testController, lateWatch{
		name:      "test HTTPRoute",
		gvk:       httpRouteGVK,
		newObject: func() client.Object { return &gatewayv1.HTTPRoute{} },
		scope:     cache.ByObject{Namespaces: map[string]cache.Config{namespace: {}}},
		handler: handler.EnqueueRequestsFromMapFunc(func(_ context.Context, obj client.Object) []reconcile.Request {
			return []reconcile.Request{{NamespacedName: types.NamespacedName{Name: obj.GetName()}}}
		}),
	}))

	ctx, cancel := context.WithCancel(context.Background())
	managerErr := make(chan error, 1)
	go func() { managerErr <- mgr.Start(ctx) }()
	t.Cleanup(func() {
		cancel()
		require.NoError(t, <-managerErr)
	})

	directClient, err := client.New(cfg, client.Options{Scheme: s})
	require.NoError(t, err)
	require.NoError(t, directClient.Create(context.Background(), &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: namespace}}))

	_, err = envtest.InstallCRDs(cfg, envtest.CRDInstallOptions{Paths: []string{filepath.Join("testdata", "crd", "gateway.networking.k8s.io_httproutes.yaml")}})
	require.NoError(t, err)

	const routeName = "late-route"
	require.Eventually(t, func() bool {
		route := &gatewayv1.HTTPRoute{ObjectMeta: metav1.ObjectMeta{Name: routeName, Namespace: namespace}}
		if err := directClient.Create(context.Background(), route); err != nil && !apierrors.IsAlreadyExists(err) {
			return false
		}
		return recorder.saw(routeName)
	}, 30*time.Second, 250*time.Millisecond, "HTTPRoute event never reached the controller after Gateway API was installed")
}
