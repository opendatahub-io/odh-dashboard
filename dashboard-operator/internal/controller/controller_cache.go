package controller

import (
	"fmt"
	"strings"

	routev1 "github.com/openshift/api/route/v1"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	policyv1 "k8s.io/api/policy/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	k8slabels "k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/selection"
	"k8s.io/client-go/rest"
	"sigs.k8s.io/controller-runtime/pkg/cache"
	"sigs.k8s.io/controller-runtime/pkg/client"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	platformlabels "github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"
)

// ManagerCacheOptions limits the shared manager cache to resources owned by the
// Dashboard controller and rejects reads for resources without a registered
// informer. ConfigMaps and Secrets intentionally remain absent: the manager
// client reads them directly from the API server, while ConfigMap event handling
// uses the dedicated caches configured in controller_configmaps.go.
func ManagerCacheOptions(applicationsNamespace string, mapper meta.RESTMapper) (cache.Options, error) {
	ownedRequirement, err := k8slabels.NewRequirement(
		platformlabels.PlatformPartOf,
		selection.In,
		[]string{strings.ToLower(v1alpha1.DashboardKind), maasPortalPartOf},
	)
	if err != nil {
		return cache.Options{}, fmt.Errorf("building owned-resource cache selector: %w", err)
	}
	ownedSelector := k8slabels.NewSelector().Add(*ownedRequirement)
	dashboardSelector := k8slabels.SelectorFromSet(k8slabels.Set{
		platformlabels.PlatformPartOf: strings.ToLower(v1alpha1.DashboardKind),
	})
	applicationsNamespaceOnly := map[string]cache.Config{applicationsNamespace: {}}

	byObject := map[client.Object]cache.ByObject{}
	for _, object := range []client.Object{
		&appsv1.Deployment{},
		&corev1.Service{},
		&corev1.ServiceAccount{},
		&policyv1.PodDisruptionBudget{},
	} {
		byObject[object] = cache.ByObject{
			Namespaces: applicationsNamespaceOnly,
			Label:      ownedSelector,
		}
	}
	for _, object := range []client.Object{
		&networkingv1.NetworkPolicy{},
		&rbacv1.Role{},
		&rbacv1.RoleBinding{},
		&rbacv1.ClusterRole{},
		&rbacv1.ClusterRoleBinding{},
	} {
		byObject[object] = cache.ByObject{Label: ownedSelector}
	}
	optionalResources, err := optionalOwnedResources(mapper)
	if err != nil {
		return cache.Options{}, err
	}
	for _, object := range optionalResources {
		switch object.(type) {
		case *gatewayv1.HTTPRoute, *routev1.Route:
			byObject[object] = cache.ByObject{Namespaces: applicationsNamespaceOnly, Label: ownedSelector}
		default:
			byObject[object] = cache.ByObject{Label: dashboardSelector}
		}
	}

	return cache.Options{
		ByObject:                    byObject,
		ReaderFailOnMissingInformer: true,
	}, nil
}

// NewManagerCache builds the cache after the manager has initialized its REST
// mapper. This lets optional HTTPRoute, OpenShift Route, and ConsoleLink APIs be
// omitted without making manager startup fail where their CRDs are unavailable.
func NewManagerCache(applicationsNamespace string) cache.NewCacheFunc {
	return func(config *rest.Config, options cache.Options) (cache.Cache, error) {
		scoped, err := ManagerCacheOptions(applicationsNamespace, options.Mapper)
		if err != nil {
			return nil, err
		}
		// Preserve manager-initialized fields such as Scheme, Mapper, and HTTPClient.
		// Any option added to ManagerCacheOptions must also be copied here.
		options.ByObject = scoped.ByObject
		options.ReaderFailOnMissingInformer = scoped.ReaderFailOnMissingInformer
		return cache.New(config, options)
	}
}
