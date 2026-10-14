package controller

import (
	"context"
	"fmt"
	"maps"
	"strings"
	"time"
	"unicode/utf8"

	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/fields"
	k8slabels "k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/selection"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/cache"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
	"sigs.k8s.io/controller-runtime/pkg/source"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/annotations"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

const operatorConfigMapName = "dashboard-operator-config"
const distributionConfigMapName = "odh-dashboard-config"
const minReconcileInterval = 5 * time.Second
const maxDistributionFieldLen = 256

// OperatorConfig holds internal controller flags read from a ConfigMap.
// A missing or malformed ConfigMap results in zero-value defaults and never
// blocks reconciliation.
type OperatorConfig struct {
	ReconcileInterval time.Duration
}

// readOperatorConfig reads the dashboard-operator-config ConfigMap from the
// given namespace. Returns zero-value OperatorConfig on any error.
func readOperatorConfig(ctx context.Context, reader client.Reader, namespace string) OperatorConfig {
	logger := log.FromContext(ctx)
	cfg := OperatorConfig{}
	cm := &corev1.ConfigMap{}
	key := types.NamespacedName{Name: operatorConfigMapName, Namespace: namespace}
	if err := reader.Get(ctx, key, cm); err != nil {
		if !k8serrors.IsNotFound(err) {
			logger.Error(err, "Failed to read operator config ConfigMap")
		}
		return cfg
	}
	if cm.Data == nil {
		return cfg
	}
	if v, ok := cm.Data["reconcileInterval"]; ok {
		d, err := time.ParseDuration(v)
		if err != nil {
			logger.Error(err, "Invalid reconcileInterval in operator config", "value", v)
		} else if d < minReconcileInterval {
			logger.Info("reconcileInterval below minimum; ignoring", "value", v, "min", minReconcileInterval)
		} else {
			cfg.ReconcileInterval = d
		}
	}
	return cfg
}

// readDistributionConfig reads distribution identity from the chart-deployed
// ConfigMap. Orchestrator annotations take precedence over chart data keys.
func readDistributionConfig(ctx context.Context, reader client.Reader, namespace string) (*v1alpha1.Distribution, error) {
	logger := log.FromContext(ctx)
	cm := &corev1.ConfigMap{}
	key := types.NamespacedName{Name: resolveDistributionConfigMapName(), Namespace: namespace}
	if err := reader.Get(ctx, key, cm); err != nil {
		if k8serrors.IsNotFound(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to read distribution config ConfigMap: %w", err)
	}
	name, version := cm.Data["distribution.name"], cm.Data["distribution.version"]
	if annotationName := cm.Annotations[annotations.PlatformType]; annotationName != "" {
		name = annotationName
	}
	if annotationVersion := cm.Annotations[annotations.PlatformVersion]; annotationVersion != "" {
		version = annotationVersion
	}
	if name == "" && version == "" {
		return nil, nil
	}
	if runeCount := utf8.RuneCountInString(name); runeCount > maxDistributionFieldLen {
		logger.Info("Truncating distribution.name", "original_runes", runeCount)
		name = string([]rune(name)[:maxDistributionFieldLen])
	}
	if runeCount := utf8.RuneCountInString(version); runeCount > maxDistributionFieldLen {
		logger.Info("Truncating distribution.version", "original_runes", runeCount)
		version = string([]rune(version)[:maxDistributionFieldLen])
	}
	return &v1alpha1.Distribution{Name: name, Version: version}, nil
}

// readPlatformVersion reads the platformVersion key from the chart-deployed
// ConfigMap. A missing ConfigMap or key produces an empty version.
func readPlatformVersion(ctx context.Context, reader client.Reader, namespace string) (string, error) {
	logger := log.FromContext(ctx)
	cm := &corev1.ConfigMap{}
	key := types.NamespacedName{Name: resolveDistributionConfigMapName(), Namespace: namespace}
	if err := reader.Get(ctx, key, cm); err != nil {
		if k8serrors.IsNotFound(err) {
			return "", nil
		}
		return "", fmt.Errorf("failed to read platform config ConfigMap: %w", err)
	}
	if cm.Data == nil {
		return "", nil
	}
	version := cm.Data["platformVersion"]
	if runeCount := utf8.RuneCountInString(version); runeCount > maxDistributionFieldLen {
		logger.Info("Truncating platformVersion", "original_runes", runeCount)
		version = string([]rune(version)[:maxDistributionFieldLen])
	}
	return version, nil
}

// addConfigMapWatches registers selector-scoped ConfigMap caches as event
// sources. The manager client deliberately bypasses its cache for ConfigMaps;
// these caches exist only to deliver relevant reconcile events.
func addConfigMapWatches(mgr ctrl.Manager, controllerBuilder *builder.Builder, r *DashboardReconciler) error {
	ownedConfigMapCache, err := newOwnedConfigMapCache(mgr, r.ApplicationsNamespace)
	if err != nil {
		return err
	}
	namedConfigMapCaches, err := newNamedConfigMapCaches(mgr, r.Namespace)
	if err != nil {
		return err
	}

	controllerBuilder.WatchesRawSource(source.Kind(
		ownedConfigMapCache,
		&corev1.ConfigMap{},
		handler.TypedEnqueueRequestForOwner[*corev1.ConfigMap](mgr.GetScheme(), mgr.GetRESTMapper(), &v1alpha1.Dashboard{}, handler.OnlyControllerOwner()),
	))
	for _, namedConfigMapCache := range namedConfigMapCaches {
		controllerBuilder.WatchesRawSource(source.Kind(
			namedConfigMapCache,
			&corev1.ConfigMap{},
			handler.TypedEnqueueRequestsFromMapFunc(func(ctx context.Context, cm *corev1.ConfigMap) []reconcile.Request {
				return r.mapConfigMapToDashboard(ctx, cm)
			}),
			r.configMapUpdatePredicate(),
		))
	}
	return nil
}

// newOwnedConfigMapCache watches only rendered Dashboard and MaaS Portal
// ConfigMaps. It is an event source, not a client cache.
func newOwnedConfigMapCache(mgr ctrl.Manager, namespace string) (cache.Cache, error) {
	requirement, err := k8slabels.NewRequirement(labels.PlatformPartOf, selection.In, []string{
		strings.ToLower(v1alpha1.DashboardKind), maasPortalPartOf,
	})
	if err != nil {
		return nil, fmt.Errorf("creating owned ConfigMap selector: %w", err)
	}
	return newSelectedConfigMapCache(mgr, namespace, k8slabels.NewSelector().Add(*requirement), nil)
}

// newNamedConfigMapCaches creates one cache per physical external input. The
// distribution and operator config inputs can intentionally share a name.
func newNamedConfigMapCaches(mgr ctrl.Manager, namespace string) ([]cache.Cache, error) {
	names := []string{resolveDistributionConfigMapName()}
	if names[0] != operatorConfigMapName {
		names = append(names, operatorConfigMapName)
	}
	caches := make([]cache.Cache, 0, len(names))
	for _, name := range names {
		selectedCache, err := newSelectedConfigMapCache(mgr, namespace, nil, fields.OneTermEqualSelector("metadata.name", name))
		if err != nil {
			return nil, fmt.Errorf("creating ConfigMap cache for %q: %w", name, err)
		}
		caches = append(caches, selectedCache)
	}
	return caches, nil
}

func newSelectedConfigMapCache(mgr ctrl.Manager, namespace string, labelSelector k8slabels.Selector, fieldSelector fields.Selector) (cache.Cache, error) {
	selectedCache, err := cache.New(mgr.GetConfig(), cache.Options{
		HTTPClient:                  mgr.GetHTTPClient(),
		Scheme:                      mgr.GetScheme(),
		Mapper:                      mgr.GetRESTMapper(),
		ReaderFailOnMissingInformer: true,
		ByObject: map[client.Object]cache.ByObject{
			&corev1.ConfigMap{}: {
				Namespaces: map[string]cache.Config{namespace: {}},
				Label:      labelSelector,
				Field:      fieldSelector,
			},
		},
	})
	if err != nil {
		return nil, err
	}
	if _, err := selectedCache.GetInformer(context.Background(), &corev1.ConfigMap{}); err != nil {
		return nil, fmt.Errorf("requesting ConfigMap informer: %w", err)
	}
	if err := mgr.Add(selectedCache); err != nil {
		return nil, fmt.Errorf("adding ConfigMap cache: %w", err)
	}
	return selectedCache, nil
}

func (r *DashboardReconciler) isWatchedConfigMap(obj client.Object) bool {
	if obj == nil || obj.GetNamespace() != r.Namespace {
		return false
	}
	name := obj.GetName()
	return name == resolveDistributionConfigMapName() || name == operatorConfigMapName
}

func (r *DashboardReconciler) mapConfigMapToDashboard(_ context.Context, obj client.Object) []reconcile.Request {
	if !r.isWatchedConfigMap(obj) {
		return nil
	}
	return []reconcile.Request{{NamespacedName: types.NamespacedName{Name: v1alpha1.DashboardInstanceName}}}
}

func (r *DashboardReconciler) configMapUpdatePredicate() predicate.TypedPredicate[*corev1.ConfigMap] {
	return predicate.TypedFuncs[*corev1.ConfigMap]{
		CreateFunc:  func(event.TypedCreateEvent[*corev1.ConfigMap]) bool { return true },
		DeleteFunc:  func(event.TypedDeleteEvent[*corev1.ConfigMap]) bool { return true },
		GenericFunc: func(event.TypedGenericEvent[*corev1.ConfigMap]) bool { return true },
		UpdateFunc: func(e event.TypedUpdateEvent[*corev1.ConfigMap]) bool {
			return configMapInputChanged(e.ObjectOld, e.ObjectNew)
		},
	}
}

func configMapInputChanged(oldCM, newCM *corev1.ConfigMap) bool {
	if oldCM == nil || newCM == nil {
		return true
	}
	annotationChanged := newCM.Name == resolveDistributionConfigMapName() &&
		(oldCM.Annotations[annotations.PlatformType] != newCM.Annotations[annotations.PlatformType] ||
			oldCM.Annotations[annotations.PlatformVersion] != newCM.Annotations[annotations.PlatformVersion])
	return !maps.Equal(oldCM.Data, newCM.Data) || annotationChanged
}

func (r *DashboardReconciler) configMapPredicate() predicate.Predicate {
	return predicate.Funcs{
		CreateFunc:  func(e event.CreateEvent) bool { return r.isWatchedConfigMap(e.Object) },
		DeleteFunc:  func(e event.DeleteEvent) bool { return r.isWatchedConfigMap(e.Object) },
		GenericFunc: func(e event.GenericEvent) bool { return r.isWatchedConfigMap(e.Object) },
		UpdateFunc: func(e event.UpdateEvent) bool {
			if !r.isWatchedConfigMap(e.ObjectNew) {
				return false
			}
			oldCM, oldOK := e.ObjectOld.(*corev1.ConfigMap)
			newCM, newOK := e.ObjectNew.(*corev1.ConfigMap)
			if !oldOK || !newOK {
				return true
			}
			return configMapInputChanged(oldCM, newCM)
		},
	}
}
