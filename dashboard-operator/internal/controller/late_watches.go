package controller

import (
	"context"
	"fmt"
	"time"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/fields"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/controller-runtime/pkg/cache"
	"sigs.k8s.io/controller-runtime/pkg/client"
	ctrlcontroller "sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/manager"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
	"sigs.k8s.io/controller-runtime/pkg/source"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

// lateWatchDiscoveryInterval is how often a late watch polls discovery for its
// API while it is not installed.
var lateWatchDiscoveryInterval = 10 * time.Second

// lateWatch describes a watch on an optional API that may be installed after the
// operator starts. Watches registered with the controller builder need the API
// at setup time, so without this a resource whose CRD arrives later (Gateway API
// or cert-manager on a Helm-ordered xKS install) is never watched until the pod
// restarts, and drift on it is not repaired by an event.
type lateWatch struct {
	name       string
	gvk        schema.GroupVersionKind
	newObject  func() client.Object
	scope      cache.ByObject
	handler    handler.EventHandler
	predicates []predicate.Predicate
}

// addLateWatch registers a runnable that polls discovery until the watch's API
// exists, then starts a dedicated cache scoped by w.scope and adds the watch to
// the running controller. It mirrors addOdhDashboardConfigWatch.
func addLateWatch(mgr manager.Manager, dashboardController ctrlcontroller.Controller, w lateWatch) error {
	return mgr.Add(manager.RunnableFunc(func(ctx context.Context) error {
		logger := log.FromContext(ctx).WithName("late-watch").WithValues("watch", w.name, "groupVersionKind", w.gvk.String())
		ticker := time.NewTicker(lateWatchDiscoveryInterval)
		defer ticker.Stop()

		for {
			available, err := apiResourceAvailable(mgr.GetRESTMapper(), w.gvk)
			if err != nil {
				logger.Error(err, "Unable to discover API for late watch; will retry")
			} else if available {
				if err := startLateWatch(ctx, mgr, dashboardController, w); err != nil {
					return err
				}
				if ctx.Err() != nil {
					return nil
				}
				logger.Info("API became available after startup; registered watch")
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

func startLateWatch(ctx context.Context, mgr manager.Manager, dashboardController ctrlcontroller.Controller, w lateWatch) error {
	scopedCache, err := cache.New(mgr.GetConfig(), cache.Options{
		HTTPClient:                  mgr.GetHTTPClient(),
		Scheme:                      mgr.GetScheme(),
		Mapper:                      mgr.GetRESTMapper(),
		ReaderFailOnMissingInformer: true,
		ByObject:                    map[client.Object]cache.ByObject{w.newObject(): w.scope},
	})
	if err != nil {
		return fmt.Errorf("creating %s cache: %w", w.name, err)
	}
	if _, err := scopedCache.GetInformer(ctx, w.newObject()); err != nil {
		return fmt.Errorf("requesting %s informer: %w", w.name, err)
	}

	// The cache lives for the manager's lifetime (bound to ctx). Surface a Start
	// error so a cache that fails to start cannot block WaitForCacheSync forever.
	startErr := make(chan error, 1)
	go func() { startErr <- scopedCache.Start(ctx) }()
	synced := make(chan bool, 1)
	go func() { synced <- scopedCache.WaitForCacheSync(ctx) }()

	select {
	case err := <-startErr:
		if err != nil {
			return fmt.Errorf("starting %s cache: %w", w.name, err)
		}
		if ctx.Err() == nil {
			return fmt.Errorf("%s cache stopped before the watch was registered", w.name)
		}
		return nil
	case <-ctx.Done():
		return nil
	case ok := <-synced:
		if !ok {
			if ctx.Err() != nil {
				return nil
			}
			return fmt.Errorf("%s cache failed to sync", w.name)
		}
	}

	if err := dashboardController.Watch(source.Kind(scopedCache, w.newObject(), w.handler, w.predicates...)); err != nil {
		return fmt.Errorf("starting %s watch: %w", w.name, err)
	}
	return nil
}

// addLateOptionalWatches registers late watches for the optional APIs that were
// missing when the controller was built: the owned HTTPRoute on every platform
// and, on XKS, the dashboard serving Certificate.
func addLateOptionalWatches(mgr manager.Manager, dashboardController ctrlcontroller.Controller, r *DashboardReconciler) error {
	httpRouteGVK := gatewayv1.SchemeGroupVersion.WithKind("HTTPRoute")
	available, err := apiResourceAvailable(mgr.GetRESTMapper(), httpRouteGVK)
	if err != nil {
		return fmt.Errorf("discovering %s API: %w", httpRouteGVK, err)
	}
	if !available {
		ownedSelector, err := ownedResourceSelector()
		if err != nil {
			return err
		}
		if err := addLateWatch(mgr, dashboardController, lateWatch{
			name:      "owned HTTPRoute",
			gvk:       httpRouteGVK,
			newObject: func() client.Object { return &gatewayv1.HTTPRoute{} },
			scope: cache.ByObject{
				Namespaces: map[string]cache.Config{r.ApplicationsNamespace: {}},
				Label:      ownedSelector,
			},
			handler: handler.EnqueueRequestForOwner(mgr.GetScheme(), mgr.GetRESTMapper(), &v1alpha1.Dashboard{}, handler.OnlyControllerOwner()),
		}); err != nil {
			return err
		}
	}

	if r.Platform != cluster.XKS {
		return nil
	}
	available, err = apiResourceAvailable(mgr.GetRESTMapper(), certificateGVK)
	if err != nil {
		return fmt.Errorf("discovering cert-manager Certificate API: %w", err)
	}
	if available {
		return nil
	}
	return addLateWatch(mgr, dashboardController, lateWatch{
		name: "XKS Certificate",
		gvk:  certificateGVK,
		newObject: func() client.Object {
			certificate := &unstructured.Unstructured{}
			certificate.SetGroupVersionKind(certificateGVK)
			return certificate
		},
		scope: cache.ByObject{
			Namespaces: map[string]cache.Config{r.ApplicationsNamespace: {}},
			Field:      fields.OneTermEqualSelector("metadata.name", rhaiiDashboardTLSName),
		},
		handler: handler.EnqueueRequestsFromMapFunc(func(_ context.Context, certificate client.Object) []reconcile.Request {
			return r.mapXKSCertificateToDashboard(certificate)
		}),
		predicates: []predicate.Predicate{predicate.GenerationChangedPredicate{}},
	})
}
