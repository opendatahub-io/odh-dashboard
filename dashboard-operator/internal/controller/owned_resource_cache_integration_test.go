//go:build integration

package controller_test

import (
	"context"
	"fmt"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	policyv1 "k8s.io/api/policy/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/envtest"
	metricsserver "sigs.k8s.io/controller-runtime/pkg/metrics/server"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"

	ctrlpkg "github.com/opendatahub-io/odh-dashboard/dashboard-operator/internal/controller"
	platformlabels "github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"
)

func TestIntegration_ManagerCacheScopesOwnedResources(t *testing.T) {
	s := runtime.NewScheme()
	require.NoError(t, clientgoscheme.AddToScheme(s))
	require.NoError(t, gatewayv1.Install(s))

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

	mgr, err := ctrl.NewManager(cfg, ctrl.Options{
		Scheme: s, NewCache: ctrlpkg.NewManagerCache(applicationsNamespace),
		Metrics: metricsserver.Options{BindAddress: "0"}, HealthProbeBindAddress: "0",
	})
	require.NoError(t, err)
	ctx, cancel := context.WithCancel(context.Background())
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
