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
	contentvalidation "k8s.io/apimachinery/pkg/api/validate/content"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/fields"
	k8slabels "k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/selection"
	"k8s.io/apimachinery/pkg/types"
	k8svalidation "k8s.io/apimachinery/pkg/util/validation"
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

const certManagerIssuerRefNameKey = "CERT_MANAGER_ISSUER_REF_NAME"
const certManagerIssuerRefKindKey = "CERT_MANAGER_ISSUER_REF_KIND"
const certManagerIssuerRefGroupKey = "CERT_MANAGER_ISSUER_REF_GROUP"
const defaultCertManagerIssuerRefGroup = "cert-manager.io"

// OperatorConfig holds internal controller flags read from a ConfigMap.
// A missing or malformed ConfigMap results in zero-value defaults and never
// blocks reconciliation.
type OperatorConfig struct {
	ReconcileInterval time.Duration
}

// distributionConfig holds all reconciliation inputs from the chart-deployed
// distribution ConfigMap.
type distributionConfig struct {
	Distribution    *v1alpha1.Distribution
	PlatformVersion string
}

// certManagerConfig is the xKS certificate issuer contract published by the
// platform in the Dashboard module ConfigMap. Name and kind are platform-owned;
// group defaults to native cert-manager when the platform does not publish it.
type certManagerConfig struct {
	IssuerRefName  string
	IssuerRefKind  string
	IssuerRefGroup string
}

func readCertManagerConfig(ctx context.Context, reader client.Reader, namespace string) (certManagerConfig, error) {
	cm := &corev1.ConfigMap{}
	configMapName := resolveDistributionConfigMapName()
	key := types.NamespacedName{Name: configMapName, Namespace: namespace}
	if err := reader.Get(ctx, key, cm); err != nil {
		return certManagerConfig{}, fmt.Errorf("reading xKS platform ConfigMap %s/%s: %w", namespace, configMapName, err)
	}

	config := certManagerConfig{
		IssuerRefName:  cm.Data[certManagerIssuerRefNameKey],
		IssuerRefKind:  cm.Data[certManagerIssuerRefKindKey],
		IssuerRefGroup: cm.Data[certManagerIssuerRefGroupKey],
	}
	if config.IssuerRefName == "" || config.IssuerRefKind == "" {
		return certManagerConfig{}, fmt.Errorf(
			"xKS platform ConfigMap %s/%s is missing %s or %s",
			namespace, configMapName, certManagerIssuerRefNameKey, certManagerIssuerRefKindKey,
		)
	}
	if errs := k8svalidation.IsDNS1123Subdomain(config.IssuerRefName); len(errs) > 0 {
		return certManagerConfig{}, fmt.Errorf(
			"xKS platform ConfigMap %s/%s has invalid %s: %s",
			namespace, configMapName, certManagerIssuerRefNameKey, strings.Join(errs, "; "),
		)
	}
	if errs := contentvalidation.IsCIdentifier(config.IssuerRefKind); len(errs) > 0 {
		return certManagerConfig{}, fmt.Errorf(
			"xKS platform ConfigMap %s/%s has invalid %s: %s",
			namespace, configMapName, certManagerIssuerRefKindKey, strings.Join(errs, "; "),
		)
	}
	if config.IssuerRefGroup == "" {
		config.IssuerRefGroup = defaultCertManagerIssuerRefGroup
	}
	if errs := k8svalidation.IsDNS1123Subdomain(config.IssuerRefGroup); len(errs) > 0 {
		return certManagerConfig{}, fmt.Errorf(
			"xKS platform ConfigMap %s/%s has invalid %s: %s",
			namespace, configMapName, certManagerIssuerRefGroupKey, strings.Join(errs, "; "),
		)
	}
	return config, nil
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

// readDistributionConfig reads all reconciliation inputs from the chart-deployed
// ConfigMap in one direct API request. Orchestrator annotations take precedence
// over chart data keys.
func readDistributionConfig(ctx context.Context, reader client.Reader, namespace string) (distributionConfig, error) {
	logger := log.FromContext(ctx)
	config := distributionConfig{}
	cm := &corev1.ConfigMap{}
	key := types.NamespacedName{Name: resolveDistributionConfigMapName(), Namespace: namespace}
	if err := reader.Get(ctx, key, cm); err != nil {
		if k8serrors.IsNotFound(err) {
			return config, nil
		}
		return config, fmt.Errorf("failed to read distribution config ConfigMap: %w", err)
	}
	name, version := cm.Data["distribution.name"], cm.Data["distribution.version"]
	if annotationName := cm.Annotations[annotations.PlatformType]; annotationName != "" {
		name = annotationName
	}
	if annotationVersion := cm.Annotations[annotations.PlatformVersion]; annotationVersion != "" {
		version = annotationVersion
	}
	if name != "" || version != "" {
		if runeCount := utf8.RuneCountInString(name); runeCount > maxDistributionFieldLen {
			logger.Info("Truncating distribution.name", "original_runes", runeCount)
			name = string([]rune(name)[:maxDistributionFieldLen])
		}
		if runeCount := utf8.RuneCountInString(version); runeCount > maxDistributionFieldLen {
			logger.Info("Truncating distribution.version", "original_runes", runeCount)
			version = string([]rune(version)[:maxDistributionFieldLen])
		}
		config.Distribution = &v1alpha1.Distribution{Name: name, Version: version}
	}

	platformVersion := cm.Data["platformVersion"]
	if runeCount := utf8.RuneCountInString(platformVersion); runeCount > maxDistributionFieldLen {
		logger.Info("Truncating platformVersion", "original_runes", runeCount)
		platformVersion = string([]rune(platformVersion)[:maxDistributionFieldLen])
	}
	config.PlatformVersion = platformVersion

	return config, nil
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
	names := namedConfigMapNames()
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

func namedConfigMapNames() []string {
	names := []string{resolveDistributionConfigMapName()}
	if names[0] != operatorConfigMapName {
		names = append(names, operatorConfigMapName)
	}
	return names
}

func newSelectedConfigMapCache(mgr ctrl.Manager, namespace string, labelSelector k8slabels.Selector, fieldSelector fields.Selector) (cache.Cache, error) {
	return newSelectedResourceCache(mgr, &corev1.ConfigMap{}, namespace, labelSelector, fieldSelector)
}

// newXKSCertificateCache is an event-only cache for the fixed XKS serving
// Certificate. The field selector is enforced by the API server, so unrelated
// Certificates cannot enter the operator's cache.
func newXKSCertificateCache(mgr ctrl.Manager, namespace string) (cache.Cache, error) {
	certificate := &unstructured.Unstructured{}
	certificate.SetGroupVersionKind(certificateGVK)
	return newSelectedResourceCache(mgr, certificate, namespace, nil, fields.OneTermEqualSelector("metadata.name", rhaiiDashboardTLSName))
}

func newSelectedResourceCache(mgr ctrl.Manager, object client.Object, namespace string, labelSelector k8slabels.Selector, fieldSelector fields.Selector) (cache.Cache, error) {
	selectedCache, err := cache.New(mgr.GetConfig(), cache.Options{
		HTTPClient:                  mgr.GetHTTPClient(),
		Scheme:                      mgr.GetScheme(),
		Mapper:                      mgr.GetRESTMapper(),
		ReaderFailOnMissingInformer: true,
		ByObject: map[client.Object]cache.ByObject{
			object: {
				Namespaces: map[string]cache.Config{namespace: {}},
				Label:      labelSelector,
				Field:      fieldSelector,
			},
		},
	})
	if err != nil {
		return nil, err
	}
	if _, err := selectedCache.GetInformer(context.Background(), object); err != nil {
		return nil, fmt.Errorf("requesting selected resource informer: %w", err)
	}
	if err := mgr.Add(selectedCache); err != nil {
		return nil, fmt.Errorf("adding selected resource cache: %w", err)
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
