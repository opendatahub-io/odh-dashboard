package controller

import (
	"context"
	"fmt"
	"time"

	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/fields"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/cache"
	"sigs.k8s.io/controller-runtime/pkg/client"
	ctrlcontroller "sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/manager"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
	"sigs.k8s.io/controller-runtime/pkg/source"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

const odhDashboardConfigName = "odh-dashboard-config"

const odhDashboardConfigDiscoveryInterval = 10 * time.Second

var odhDashboardConfigGVK = schema.GroupVersionKind{
	Group:   "opendatahub.io",
	Version: "v1alpha",
	Kind:    "OdhDashboardConfig",
}

func newOdhDashboardConfig() *unstructured.Unstructured {
	config := &unstructured.Unstructured{}
	config.SetGroupVersionKind(odhDashboardConfigGVK)
	return config
}

// reconcileSelfManagedRHOAIDashboardConfigDefaults initializes self-managed RHOAI defaults that
// must be correct even when another component wins the create race. The
// OdhDashboardConfig remains user-managed: explicit values and every unrelated
// field are preserved.
func (r *DashboardReconciler) reconcileSelfManagedRHOAIDashboardConfigDefaults(ctx context.Context) (time.Duration, error) {
	config := newOdhDashboardConfig()
	key := types.NamespacedName{Name: odhDashboardConfigName, Namespace: r.ApplicationsNamespace}
	if err := r.Get(ctx, key, config); err != nil {
		if k8serrors.IsNotFound(err) {
			return 0, nil
		}
		if meta.IsNoMatchError(err) {
			return odhDashboardConfigDiscoveryInterval, nil
		}
		return 0, fmt.Errorf("get OdhDashboardConfig %s: %w", key, err)
	}

	_, found, err := unstructured.NestedBool(config.Object, "spec", "dashboardConfig", "disableTracking")
	if err != nil {
		return 0, fmt.Errorf("read OdhDashboardConfig %s disableTracking: %w", key, err)
	}
	if found {
		return 0, nil
	}

	original := config.DeepCopy()
	if err := unstructured.SetNestedField(config.Object, false, "spec", "dashboardConfig", "disableTracking"); err != nil {
		return 0, fmt.Errorf("set OdhDashboardConfig %s disableTracking default: %w", key, err)
	}

	patch := client.MergeFromWithOptions(original, client.MergeFromWithOptimisticLock{})
	if err := r.Patch(ctx, config, patch); err != nil {
		return 0, fmt.Errorf("patch OdhDashboardConfig %s disableTracking default: %w", key, err)
	}

	log.FromContext(ctx).Info("Initialized RHOAI dashboard tracking default", "namespace", key.Namespace, "name", key.Name)
	return 0, nil
}

func (r *DashboardReconciler) isTargetOdhDashboardConfig(obj client.Object) bool {
	return obj != nil &&
		obj.GetNamespace() == r.ApplicationsNamespace &&
		obj.GetName() == odhDashboardConfigName
}

func (r *DashboardReconciler) odhDashboardConfigNeedsDefault(obj client.Object) bool {
	if !r.isTargetOdhDashboardConfig(obj) {
		return false
	}

	config, ok := obj.(*unstructured.Unstructured)
	if !ok {
		return true
	}

	_, found, err := unstructured.NestedBool(config.Object, "spec", "dashboardConfig", "disableTracking")
	return err != nil || !found
}

func (r *DashboardReconciler) mapOdhDashboardConfigToDashboard(_ context.Context, obj client.Object) []reconcile.Request {
	if !r.isTargetOdhDashboardConfig(obj) {
		return nil
	}

	return []reconcile.Request{{
		NamespacedName: types.NamespacedName{Name: v1alpha1.DashboardInstanceName},
	}}
}

func (r *DashboardReconciler) odhDashboardConfigPredicate() predicate.Predicate {
	return predicate.Funcs{
		CreateFunc:  func(e event.CreateEvent) bool { return r.odhDashboardConfigNeedsDefault(e.Object) },
		DeleteFunc:  func(e event.DeleteEvent) bool { return r.isTargetOdhDashboardConfig(e.Object) },
		GenericFunc: func(e event.GenericEvent) bool { return r.odhDashboardConfigNeedsDefault(e.Object) },
		UpdateFunc:  func(e event.UpdateEvent) bool { return r.odhDashboardConfigNeedsDefault(e.ObjectNew) },
	}
}

func addOdhDashboardConfigWatch(
	mgr manager.Manager,
	dashboardController ctrlcontroller.Controller,
	r *DashboardReconciler,
) error {
	if r.Platform != cluster.SelfManagedRhoai {
		return nil
	}

	return mgr.Add(manager.RunnableFunc(func(ctx context.Context) error {
		logger := log.FromContext(ctx).WithName("odh-dashboard-config-watch")
		ticker := time.NewTicker(odhDashboardConfigDiscoveryInterval)
		defer ticker.Stop()

		for {
			available, err := apiResourceAvailable(mgr.GetRESTMapper(), odhDashboardConfigGVK)
			if err != nil {
				logger.Error(err, "Unable to discover OdhDashboardConfig API; will retry")
			} else if available {
				if err := startScopedOdhDashboardConfigWatch(ctx, mgr, dashboardController, r); err != nil {
					return err
				}
				// A nil return during shutdown means the watch was not registered;
				// only log success when the context is still live.
				if ctx.Err() != nil {
					return nil
				}
				logger.Info("Registered OdhDashboardConfig watch")
				<-ctx.Done()
				return nil
			}

			select {
			case <-ctx.Done():
				return nil
			case <-ticker.C:
			}
		}
	}))
}

// startScopedOdhDashboardConfigWatch wires the OdhDashboardConfig watch to a
// dedicated cache scoped to the single target object (applications namespace,
// name odh-dashboard-config) instead of the shared cluster-wide manager cache.
// This keeps the informer from caching every OdhDashboardConfig in the cluster.
//
// Unlike the ConfigMap caches (built at SetupWithManager time and registered via
// mgr.Add before the manager starts), this watch is created lazily at runtime
// after CRD discovery, so the dedicated cache is started manually and its
// lifecycle is bound to the discovery runnable's context.
func startScopedOdhDashboardConfigWatch(
	ctx context.Context,
	mgr manager.Manager,
	dashboardController ctrlcontroller.Controller,
	r *DashboardReconciler,
) error {
	scopedCache, err := cache.New(mgr.GetConfig(), cache.Options{
		HTTPClient:                  mgr.GetHTTPClient(),
		Scheme:                      mgr.GetScheme(),
		Mapper:                      mgr.GetRESTMapper(),
		ReaderFailOnMissingInformer: true,
		ByObject:                    scopedOdhDashboardConfigByObject(r.ApplicationsNamespace),
	})
	if err != nil {
		return fmt.Errorf("creating scoped OdhDashboardConfig cache: %w", err)
	}

	// Request the informer before starting so the cache has something to sync.
	if _, err := scopedCache.GetInformer(ctx, newOdhDashboardConfig()); err != nil {
		return fmt.Errorf("requesting OdhDashboardConfig informer: %w", err)
	}

	// The cache runs for the manager's lifetime (bound to ctx). Surface a Start
	// error on a channel so a cache that fails to start cannot leave
	// WaitForCacheSync blocked indefinitely.
	startErr := make(chan error, 1)
	go func() { startErr <- scopedCache.Start(ctx) }()

	synced := make(chan bool, 1)
	go func() { synced <- scopedCache.WaitForCacheSync(ctx) }()

	select {
	case err := <-startErr:
		if err != nil {
			return fmt.Errorf("starting scoped OdhDashboardConfig cache: %w", err)
		}
		// Start returns nil only after the context is cancelled (shutdown). If it
		// returns nil while the context is still live, the cache stopped
		// unexpectedly and the watch was never registered — surface it.
		if ctx.Err() == nil {
			return fmt.Errorf("scoped OdhDashboardConfig cache stopped before the watch was registered")
		}
		return nil
	case <-ctx.Done():
		return nil
	case ok := <-synced:
		if !ok {
			// A failed sync during shutdown is expected and not an error.
			if ctx.Err() != nil {
				return nil
			}
			return fmt.Errorf("scoped OdhDashboardConfig cache failed to sync")
		}
	}

	var config client.Object = newOdhDashboardConfig()
	if err := dashboardController.Watch(source.Kind(
		scopedCache,
		config,
		handler.EnqueueRequestsFromMapFunc(r.mapOdhDashboardConfigToDashboard),
		r.odhDashboardConfigPredicate(),
	)); err != nil {
		return fmt.Errorf("start OdhDashboardConfig watch: %w", err)
	}
	return nil
}

// scopedOdhDashboardConfigByObject restricts the OdhDashboardConfig informer to
// the single target object: the applications namespace and the exact name
// odh-dashboard-config, applied server-side so unselected objects never enter
// the local store.
func scopedOdhDashboardConfigByObject(namespace string) map[client.Object]cache.ByObject {
	return map[client.Object]cache.ByObject{
		newOdhDashboardConfig(): {
			Namespaces: map[string]cache.Config{namespace: {}},
			Field:      fields.OneTermEqualSelector("metadata.name", odhDashboardConfigName),
		},
	}
}
