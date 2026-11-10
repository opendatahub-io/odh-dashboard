//go:build integration

package controller_test

import (
	"context"
	"fmt"
	"path/filepath"
	"testing"
	"time"

	routev1 "github.com/openshift/api/route/v1"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	policyv1 "k8s.io/api/policy/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	ctrl "sigs.k8s.io/controller-runtime"
	ctrlcache "sigs.k8s.io/controller-runtime/pkg/cache"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/envtest"
	metricsserver "sigs.k8s.io/controller-runtime/pkg/metrics/server"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	platformlabels "github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	ctrlpkg "github.com/opendatahub-io/odh-dashboard/dashboard-operator/internal/controller"
)

func TestIntegration_ManagerCacheScopesOwnedResources(t *testing.T) {
	s := runtime.NewScheme()
	require.NoError(t, clientgoscheme.AddToScheme(s))
	require.NoError(t, gatewayv1.Install(s))
	require.NoError(t, routev1.AddToScheme(s))
	require.NoError(t, v1alpha1.AddToScheme(s))

	localEnv := &envtest.Environment{
		CRDDirectoryPaths: []string{filepath.Join("testdata", "crd")},
		Scheme:            s,
	}
	cfg, err := localEnv.Start()
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, localEnv.Stop()) })

	const applicationsNamespace = "cache-applications"
	const externalNamespace = "cache-external"
	directClient, err := client.New(cfg, client.Options{Scheme: s})
	require.NoError(t, err)
	for _, namespace := range []string{applicationsNamespace, externalNamespace} {
		require.NoError(t, directClient.Create(context.Background(), &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: namespace}}))
	}

	consoleLink := &unstructured.Unstructured{}
	consoleLink.SetAPIVersion("console.openshift.io/v1")
	consoleLink.SetKind("ConsoleLink")
	objects := []client.Object{
		cacheTestDeployment(applicationsNamespace),
		&corev1.Service{ObjectMeta: metav1.ObjectMeta{Namespace: applicationsNamespace}, Spec: corev1.ServiceSpec{Ports: []corev1.ServicePort{{Port: 80}}}},
		&corev1.ServiceAccount{ObjectMeta: metav1.ObjectMeta{Namespace: applicationsNamespace}},
		&policyv1.PodDisruptionBudget{ObjectMeta: metav1.ObjectMeta{Namespace: applicationsNamespace}},
		&gatewayv1.HTTPRoute{ObjectMeta: metav1.ObjectMeta{Namespace: applicationsNamespace}},
		&networkingv1.NetworkPolicy{ObjectMeta: metav1.ObjectMeta{Namespace: externalNamespace}},
		&rbacv1.Role{ObjectMeta: metav1.ObjectMeta{Namespace: externalNamespace}},
		&rbacv1.RoleBinding{ObjectMeta: metav1.ObjectMeta{Namespace: externalNamespace}, RoleRef: rbacv1.RoleRef{APIGroup: rbacv1.GroupName, Kind: "Role", Name: "selected"}},
		&rbacv1.ClusterRole{},
		&rbacv1.ClusterRoleBinding{RoleRef: rbacv1.RoleRef{APIGroup: rbacv1.GroupName, Kind: "ClusterRole", Name: "selected"}},
		consoleLink,
	}

	selected := make([]client.Object, 0, len(objects))
	filtered := make([]client.Object, 0, len(objects))
	for index, prototype := range objects {
		selectedObject := prototype.DeepCopyObject().(client.Object)
		selectedObject.SetName(fmt.Sprintf("selected-%d", index))
		selectedObject.SetLabels(map[string]string{platformlabels.PlatformPartOf: "dashboard"})
		require.NoError(t, directClient.Create(context.Background(), selectedObject))
		selected = append(selected, selectedObject)

		filteredObject := prototype.DeepCopyObject().(client.Object)
		filteredObject.SetName(fmt.Sprintf("filtered-%d", index))
		filteredObject.SetLabels(map[string]string{platformlabels.PlatformPartOf: "other"})
		require.NoError(t, directClient.Create(context.Background(), filteredObject))
		filtered = append(filtered, filteredObject)
	}
	wrongNamespace := cacheTestDeployment(externalNamespace)
	wrongNamespace.Name = "selected-wrong-namespace"
	wrongNamespace.Labels = map[string]string{platformlabels.PlatformPartOf: "dashboard"}
	require.NoError(t, directClient.Create(context.Background(), wrongNamespace))
	driftedRole := &rbacv1.Role{
		ObjectMeta: metav1.ObjectMeta{
			Name: "dashboard-notebooks-role", Namespace: externalNamespace,
			Labels: map[string]string{platformlabels.PlatformPartOf: "other"},
		},
		Rules: []rbacv1.PolicyRule{{APIGroups: []string{""}, Resources: []string{"pods"}, Verbs: []string{"get"}}},
	}
	driftedRoleBinding := &rbacv1.RoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name: "dashboard-notebooks-rolebinding", Namespace: externalNamespace,
			Labels: map[string]string{platformlabels.PlatformPartOf: "other"},
		},
		RoleRef:  rbacv1.RoleRef{APIGroup: rbacv1.GroupName, Kind: "Role", Name: driftedRole.Name},
		Subjects: []rbacv1.Subject{{Kind: rbacv1.ServiceAccountKind, Name: "wrong", Namespace: "wrong"}},
	}
	require.NoError(t, directClient.Create(context.Background(), driftedRole))
	require.NoError(t, directClient.Create(context.Background(), driftedRoleBinding))

	mgr, err := ctrl.NewManager(cfg, ctrl.Options{
		Scheme: s, NewCache: ctrlpkg.NewManagerCache(applicationsNamespace),
		Metrics: metricsserver.Options{BindAddress: "0"}, HealthProbeBindAddress: "0",
	})
	require.NoError(t, err)
	ctx, cancel := context.WithCancel(context.Background())
	// Register the informers before starting the manager, as SetupWithManager
	// does in production. Strict cache reads must not create informers lazily.
	for _, object := range objects {
		_, err = mgr.GetCache().GetInformer(ctx, object)
		require.NoErrorf(t, err, "registering informer for %T", object)
	}
	managerErr := make(chan error, 1)
	go func() { managerErr <- mgr.Start(ctx) }()
	t.Cleanup(func() {
		cancel()
		require.NoError(t, <-managerErr)
	})

	for _, object := range selected {
		cached := object.DeepCopyObject().(client.Object)
		assert.Eventually(t, func() bool {
			return mgr.GetCache().Get(ctx, client.ObjectKeyFromObject(object), cached) == nil
		}, 10*time.Second, 100*time.Millisecond, "selected %T was not visible through the manager cache", object)
	}
	for _, object := range filtered {
		cached := object.DeepCopyObject().(client.Object)
		err := mgr.GetCache().Get(ctx, client.ObjectKeyFromObject(object), cached)
		assert.Truef(t, apierrors.IsNotFound(err), "filtered %T should be absent from the manager cache, got %v", object, err)
	}
	err = mgr.GetCache().Get(ctx, client.ObjectKeyFromObject(wrongNamespace), &appsv1.Deployment{})
	assert.ErrorContains(t, err, "unknown namespace for the cache")

	var notCached *ctrlcache.ErrResourceNotCached
	err = mgr.GetClient().List(ctx, &batchv1.JobList{})
	require.ErrorAs(t, err, &notCached)
	require.NoError(t, mgr.GetAPIReader().List(ctx, &batchv1.JobList{}))
	notCached = nil
	err = mgr.GetClient().List(ctx, &batchv1.JobList{})
	require.ErrorAs(t, err, &notCached, "an APIReader request must not create a shared-cache informer")

	reconciler := &ctrlpkg.DashboardReconciler{
		Client:                mgr.GetClient(),
		APIReader:             mgr.GetAPIReader(),
		Scheme:                s,
		Platform:              cluster.OpenDataHub,
		ApplicationsNamespace: applicationsNamespace,
	}
	require.NoError(t, reconciler.ReconcileNamespacedRBAC(ctx, &v1alpha1.Dashboard{Spec: v1alpha1.DashboardSpec{
		NotebooksNamespace: externalNamespace,
	}}))
	require.NoError(t, directClient.Get(ctx, client.ObjectKeyFromObject(driftedRole), driftedRole))
	assert.Equal(t, "dashboard", driftedRole.Labels[platformlabels.PlatformPartOf])
	assert.Equal(t, "true", driftedRole.Labels["dashboard.opendatahub.io/namespaced-rbac"])
	assert.Len(t, driftedRole.Rules, 3)
	require.NoError(t, directClient.Get(ctx, client.ObjectKeyFromObject(driftedRoleBinding), driftedRoleBinding))
	assert.Equal(t, "dashboard", driftedRoleBinding.Labels[platformlabels.PlatformPartOf])
	assert.Equal(t, "true", driftedRoleBinding.Labels["dashboard.opendatahub.io/namespaced-rbac"])
	require.Len(t, driftedRoleBinding.Subjects, 1)
	assert.Equal(t, "odh-dashboard", driftedRoleBinding.Subjects[0].Name)
	assert.Equal(t, applicationsNamespace, driftedRoleBinding.Subjects[0].Namespace)
}

// TestIntegration_ManagerCacheWatchesMetadataOnly proves that the GVKs converted
// to metadata-only watches (ServiceAccount, ConsoleLink) cache only ObjectMeta:
// their metadata informers deliver scoped objects, while a full-object read of the
// same GVK fails because no structured/unstructured informer exists.
func TestIntegration_ManagerCacheWatchesMetadataOnly(t *testing.T) {
	s := runtime.NewScheme()
	require.NoError(t, clientgoscheme.AddToScheme(s))
	require.NoError(t, gatewayv1.Install(s))
	require.NoError(t, routev1.AddToScheme(s))
	require.NoError(t, v1alpha1.AddToScheme(s))

	localEnv := &envtest.Environment{
		CRDDirectoryPaths: []string{filepath.Join("testdata", "crd")},
		Scheme:            s,
	}
	cfg, err := localEnv.Start()
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, localEnv.Stop()) })

	const applicationsNamespace = "metadata-applications"
	ctx, cancel := context.WithCancel(context.Background())
	directClient, err := client.New(cfg, client.Options{Scheme: s})
	require.NoError(t, err)
	require.NoError(t, directClient.Create(ctx, &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: applicationsNamespace}}))

	consoleLinkPrototype := &unstructured.Unstructured{}
	consoleLinkPrototype.SetAPIVersion("console.openshift.io/v1")
	consoleLinkPrototype.SetKind("ConsoleLink")
	consoleLinkGVK := consoleLinkPrototype.GroupVersionKind()
	serviceAccountGVK := corev1.SchemeGroupVersion.WithKind("ServiceAccount")

	// Selected objects carry the dashboard label (and the ServiceAccount lives in the
	// applications namespace); filtered objects are excluded by the cache selectors.
	selectedSA := &corev1.ServiceAccount{ObjectMeta: metav1.ObjectMeta{Name: "selected-sa", Namespace: applicationsNamespace, Labels: map[string]string{platformlabels.PlatformPartOf: "dashboard"}}}
	filteredSA := &corev1.ServiceAccount{ObjectMeta: metav1.ObjectMeta{Name: "filtered-sa", Namespace: applicationsNamespace, Labels: map[string]string{platformlabels.PlatformPartOf: "other"}}}
	require.NoError(t, directClient.Create(ctx, selectedSA))
	require.NoError(t, directClient.Create(ctx, filteredSA))

	selectedLink := consoleLinkPrototype.DeepCopy()
	selectedLink.SetName("selected-link")
	selectedLink.SetLabels(map[string]string{platformlabels.PlatformPartOf: "dashboard"})
	filteredLink := consoleLinkPrototype.DeepCopy()
	filteredLink.SetName("filtered-link")
	filteredLink.SetLabels(map[string]string{platformlabels.PlatformPartOf: "other"})
	require.NoError(t, directClient.Create(ctx, selectedLink))
	require.NoError(t, directClient.Create(ctx, filteredLink))

	mgr, err := ctrl.NewManager(cfg, ctrl.Options{
		Scheme: s, NewCache: ctrlpkg.NewManagerCache(applicationsNamespace),
		Metrics: metricsserver.Options{BindAddress: "0"}, HealthProbeBindAddress: "0",
	})
	require.NoError(t, err)

	// Register the metadata-only informers the production builder sets up via
	// builder.OnlyMetadata, before starting the manager.
	saInformer := &metav1.PartialObjectMetadata{}
	saInformer.SetGroupVersionKind(serviceAccountGVK)
	_, err = mgr.GetCache().GetInformer(ctx, saInformer)
	require.NoError(t, err, "registering ServiceAccount metadata informer")
	linkInformer := &metav1.PartialObjectMetadata{}
	linkInformer.SetGroupVersionKind(consoleLinkGVK)
	_, err = mgr.GetCache().GetInformer(ctx, linkInformer)
	require.NoError(t, err, "registering ConsoleLink metadata informer")

	managerErr := make(chan error, 1)
	go func() { managerErr <- mgr.Start(ctx) }()
	t.Cleanup(func() {
		cancel()
		require.NoError(t, <-managerErr)
	})

	metadataGet := func(gvk schema.GroupVersionKind, key client.ObjectKey) error {
		obj := &metav1.PartialObjectMetadata{}
		obj.SetGroupVersionKind(gvk)
		return mgr.GetCache().Get(ctx, key, obj)
	}

	// Selected objects are delivered through the metadata informer.
	assert.Eventually(t, func() bool {
		return metadataGet(serviceAccountGVK, client.ObjectKeyFromObject(selectedSA)) == nil
	}, 10*time.Second, 100*time.Millisecond, "selected ServiceAccount not visible via metadata cache")
	assert.Eventually(t, func() bool {
		return metadataGet(consoleLinkGVK, client.ObjectKeyFromObject(selectedLink)) == nil
	}, 10*time.Second, 100*time.Millisecond, "selected ConsoleLink not visible via metadata cache")

	// Filtered objects are excluded by the cache selectors.
	assert.True(t, apierrors.IsNotFound(metadataGet(serviceAccountGVK, client.ObjectKeyFromObject(filteredSA))),
		"filtered ServiceAccount must be absent from the metadata cache")
	assert.True(t, apierrors.IsNotFound(metadataGet(consoleLinkGVK, client.ObjectKeyFromObject(filteredLink))),
		"filtered ConsoleLink must be absent from the metadata cache")

	// A full-object read of the same GVK fails: only a metadata informer exists,
	// so nothing but ObjectMeta is cached for these types.
	var notCached *ctrlcache.ErrResourceNotCached
	err = mgr.GetCache().Get(ctx, client.ObjectKeyFromObject(selectedSA), &corev1.ServiceAccount{})
	require.ErrorAs(t, err, &notCached, "ServiceAccount must not have a full-object informer")
	notCached = nil
	fullLink := &unstructured.Unstructured{}
	fullLink.SetGroupVersionKind(consoleLinkGVK)
	err = mgr.GetCache().Get(ctx, client.ObjectKeyFromObject(selectedLink), fullLink)
	require.ErrorAs(t, err, &notCached, "ConsoleLink must not have a full-object informer")
}

func cacheTestDeployment(namespace string) *appsv1.Deployment {
	return &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{Namespace: namespace},
		Spec: appsv1.DeploymentSpec{
			Selector: &metav1.LabelSelector{MatchLabels: map[string]string{"app": "cache-test"}},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{Labels: map[string]string{"app": "cache-test"}},
				Spec:       corev1.PodSpec{Containers: []corev1.Container{{Name: "cache-test", Image: "example.invalid/cache-test"}}},
			},
		},
	}
}
