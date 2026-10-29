package controller

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	policyv1 "k8s.io/api/policy/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/client/interceptor"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/controller/conditions"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

const teardownTestNamespace = "applications"

func TestTeardownManagedResourcesDeletesManagedIngressResources(t *testing.T) {
	managedLabels := map[string]string{labels.PlatformPartOf: "dashboard"}
	managedPDB := &policyv1.PodDisruptionBudget{ObjectMeta: metav1.ObjectMeta{Name: "managed-pdb", Namespace: teardownTestNamespace, Labels: managedLabels}}
	managedRoute := &gatewayv1.HTTPRoute{ObjectMeta: metav1.ObjectMeta{Name: "managed-route", Namespace: teardownTestNamespace, Labels: managedLabels}}
	unrelatedPDB := &policyv1.PodDisruptionBudget{ObjectMeta: metav1.ObjectMeta{Name: "unrelated-pdb", Namespace: teardownTestNamespace}}

	cli := fake.NewClientBuilder().WithScheme(teardownTestScheme(t)).WithObjects(managedPDB, managedRoute, unrelatedPDB).Build()
	reconciler := &DashboardReconciler{Client: cli, ApplicationsNamespace: teardownTestNamespace}

	result, err := reconciler.teardownManagedResources(context.Background(), &v1alpha1.Dashboard{}, nil, false, true)
	require.NoError(t, err)
	assert.False(t, result.Pending)
	assertTeardownResourceAbsent(t, cli, managedPDB)
	assertTeardownResourceAbsent(t, cli, managedRoute)
	assertTeardownResourcePresent(t, cli, unrelatedPDB)
}

func TestTeardownManagedResourcesIgnoresUnavailableHTTPRouteAPI(t *testing.T) {
	configMap := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{
		Name:      "managed-config",
		Namespace: teardownTestNamespace,
		Labels:    map[string]string{labels.PlatformPartOf: "dashboard"},
	}}
	cli := fake.NewClientBuilder().WithScheme(teardownTestScheme(t)).WithObjects(configMap).
		WithInterceptorFuncs(interceptor.Funcs{
			List: func(ctx context.Context, delegate client.WithWatch, list client.ObjectList, opts ...client.ListOption) error {
				if routes, ok := list.(*unstructured.UnstructuredList); ok && routes.GroupVersionKind() == gatewayv1.SchemeGroupVersion.WithKind("HTTPRouteList") {
					return &meta.NoKindMatchError{GroupKind: schema.GroupKind{Group: gatewayv1.GroupVersion.Group, Kind: "HTTPRoute"}}
				}
				return delegate.List(ctx, list, opts...)
			},
		}).Build()
	reconciler := &DashboardReconciler{Client: cli, ApplicationsNamespace: teardownTestNamespace}

	result, err := reconciler.teardownManagedResources(context.Background(), &v1alpha1.Dashboard{}, nil, false, true)
	require.NoError(t, err)
	assert.False(t, result.Pending)
	assertTeardownResourceAbsent(t, cli, configMap)
}

func TestTeardownManagedResourcesContinuesAndJoinsDeleteFailures(t *testing.T) {
	pdbErr := errors.New("PDB deletion failed")
	configMapErr := errors.New("ConfigMap deletion failed")
	managedLabels := map[string]string{labels.PlatformPartOf: "dashboard"}
	pdb := &policyv1.PodDisruptionBudget{ObjectMeta: metav1.ObjectMeta{Name: "managed-pdb", Namespace: teardownTestNamespace, Labels: managedLabels}}
	configMap := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "managed-config", Namespace: teardownTestNamespace, Labels: managedLabels}}
	service := &corev1.Service{ObjectMeta: metav1.ObjectMeta{Name: "managed-service", Namespace: teardownTestNamespace, Labels: managedLabels}}
	cli := fake.NewClientBuilder().WithScheme(teardownTestScheme(t)).WithObjects(pdb, configMap, service).
		WithInterceptorFuncs(interceptor.Funcs{
			Delete: func(ctx context.Context, delegate client.WithWatch, obj client.Object, opts ...client.DeleteOption) error {
				switch obj.(type) {
				case *policyv1.PodDisruptionBudget:
					return pdbErr
				case *corev1.ConfigMap:
					if obj.GetName() == configMap.Name {
						return configMapErr
					}
				}
				return delegate.Delete(ctx, obj, opts...)
			},
		}).Build()
	reconciler := &DashboardReconciler{Client: cli, ApplicationsNamespace: teardownTestNamespace}

	_, err := reconciler.teardownManagedResources(context.Background(), &v1alpha1.Dashboard{}, nil, false, true)
	require.Error(t, err)
	assert.ErrorIs(t, err, pdbErr)
	assert.ErrorIs(t, err, configMapErr)
	assertTeardownResourcePresent(t, cli, pdb)
	assertTeardownResourcePresent(t, cli, configMap)
	assertTeardownResourceAbsent(t, cli, service)
}

func TestTeardownManagedResourcesRetainsNetworkPoliciesWhenDeploymentDeletionFails(t *testing.T) {
	deploymentErr := errors.New("Deployment deletion failed")
	foregroundDelete := false
	managedLabels := map[string]string{labels.PlatformPartOf: "dashboard"}
	deployment := &appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Name: "managed-deployment", Namespace: teardownTestNamespace, Labels: managedLabels}}
	networkPolicy := &networkingv1.NetworkPolicy{ObjectMeta: metav1.ObjectMeta{Name: "managed-policy", Namespace: teardownTestNamespace, Labels: managedLabels}}
	service := &corev1.Service{ObjectMeta: metav1.ObjectMeta{Name: "managed-service", Namespace: teardownTestNamespace, Labels: managedLabels}}
	cli := fake.NewClientBuilder().WithScheme(teardownTestScheme(t)).WithObjects(deployment, networkPolicy, service).
		WithInterceptorFuncs(interceptor.Funcs{
			Delete: func(ctx context.Context, delegate client.WithWatch, obj client.Object, opts ...client.DeleteOption) error {
				if _, ok := obj.(*appsv1.Deployment); ok {
					deleteOptions := &client.DeleteOptions{}
					for _, opt := range opts {
						opt.ApplyToDelete(deleteOptions)
					}
					foregroundDelete = deleteOptions.PropagationPolicy != nil && *deleteOptions.PropagationPolicy == metav1.DeletePropagationForeground
					return deploymentErr
				}
				return delegate.Delete(ctx, obj, opts...)
			},
		}).Build()
	reconciler := &DashboardReconciler{Client: cli, ApplicationsNamespace: teardownTestNamespace}

	_, err := reconciler.teardownManagedResources(context.Background(), &v1alpha1.Dashboard{}, nil, false, true)
	require.Error(t, err)
	assert.ErrorIs(t, err, deploymentErr)
	assert.True(t, foregroundDelete)
	assertTeardownResourcePresent(t, cli, deployment)
	assertTeardownResourcePresent(t, cli, networkPolicy)
	assertTeardownResourceAbsent(t, cli, service)
}

func TestTeardownManagedResourcesRetainsNetworkPoliciesWhenDeploymentListingFails(t *testing.T) {
	deploymentErr := errors.New("Deployment listing failed")
	managedLabels := map[string]string{labels.PlatformPartOf: "dashboard"}
	networkPolicy := &networkingv1.NetworkPolicy{ObjectMeta: metav1.ObjectMeta{Name: "managed-policy", Namespace: teardownTestNamespace, Labels: managedLabels}}
	service := &corev1.Service{ObjectMeta: metav1.ObjectMeta{Name: "managed-service", Namespace: teardownTestNamespace, Labels: managedLabels}}
	cli := fake.NewClientBuilder().WithScheme(teardownTestScheme(t)).WithObjects(networkPolicy, service).
		WithInterceptorFuncs(interceptor.Funcs{
			List: func(ctx context.Context, delegate client.WithWatch, list client.ObjectList, opts ...client.ListOption) error {
				if _, ok := list.(*appsv1.DeploymentList); ok {
					return deploymentErr
				}
				return delegate.List(ctx, list, opts...)
			},
		}).Build()
	reconciler := &DashboardReconciler{Client: cli, ApplicationsNamespace: teardownTestNamespace}

	_, err := reconciler.teardownManagedResources(context.Background(), &v1alpha1.Dashboard{}, nil, false, true)
	require.Error(t, err)
	assert.ErrorIs(t, err, deploymentErr)
	assertTeardownResourcePresent(t, cli, networkPolicy)
	assertTeardownResourceAbsent(t, cli, service)
}

func TestTeardownManagedResourcesRetainsNetworkPoliciesWhenDeploymentRemovalCannotBeConfirmed(t *testing.T) {
	deploymentConfirmationErr := errors.New("Deployment confirmation failed")
	managedLabels := map[string]string{labels.PlatformPartOf: "dashboard"}
	networkPolicy := &networkingv1.NetworkPolicy{ObjectMeta: metav1.ObjectMeta{Name: "managed-policy", Namespace: teardownTestNamespace, Labels: managedLabels}}
	service := &corev1.Service{ObjectMeta: metav1.ObjectMeta{Name: "managed-service", Namespace: teardownTestNamespace, Labels: managedLabels}}
	deploymentLists := 0
	cli := fake.NewClientBuilder().WithScheme(teardownTestScheme(t)).WithObjects(networkPolicy, service).
		WithInterceptorFuncs(interceptor.Funcs{
			List: func(ctx context.Context, delegate client.WithWatch, list client.ObjectList, opts ...client.ListOption) error {
				if _, ok := list.(*appsv1.DeploymentList); ok {
					deploymentLists++
					if deploymentLists == 2 {
						return deploymentConfirmationErr
					}
				}
				return delegate.List(ctx, list, opts...)
			},
		}).Build()
	reconciler := &DashboardReconciler{Client: cli, ApplicationsNamespace: teardownTestNamespace}

	_, err := reconciler.teardownManagedResources(context.Background(), &v1alpha1.Dashboard{}, nil, false, true)
	require.ErrorIs(t, err, deploymentConfirmationErr)
	assert.Equal(t, 2, deploymentLists)
	assertTeardownResourcePresent(t, cli, networkPolicy)
	assertTeardownResourceAbsent(t, cli, service)
}

func TestTeardownManagedResourcesRetainsNetworkPoliciesWhileDeploymentsRemain(t *testing.T) {
	managedLabels := map[string]string{labels.PlatformPartOf: "dashboard"}
	networkPolicy := &networkingv1.NetworkPolicy{ObjectMeta: metav1.ObjectMeta{Name: "managed-policy", Namespace: teardownTestNamespace, Labels: managedLabels}}
	remainingDeployment := &appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Name: "remaining-deployment", Namespace: teardownTestNamespace, Labels: managedLabels}}
	cacheClient := fake.NewClientBuilder().WithScheme(teardownTestScheme(t)).WithObjects(networkPolicy).Build()
	directClient := fake.NewClientBuilder().WithScheme(teardownTestScheme(t)).WithObjects(remainingDeployment).Build()
	reconciler := &DashboardReconciler{Client: cacheClient, APIReader: directClient, ApplicationsNamespace: teardownTestNamespace}

	result, err := reconciler.teardownManagedResources(context.Background(), &v1alpha1.Dashboard{}, nil, false, true)
	require.NoError(t, err)
	assert.True(t, result.Pending)
	assertTeardownResourcePresent(t, cacheClient, networkPolicy)
}

func TestTeardownManagedResourcesRetainsNetworkPoliciesWhenPodRemovalCannotBeConfirmed(t *testing.T) {
	podConfirmationErr := errors.New("Pod confirmation failed")
	managedLabels := map[string]string{labels.PlatformPartOf: "dashboard"}
	networkPolicy := &networkingv1.NetworkPolicy{ObjectMeta: metav1.ObjectMeta{Name: "managed-policy", Namespace: teardownTestNamespace, Labels: managedLabels}}
	podLists := 0
	cli := fake.NewClientBuilder().WithScheme(teardownTestScheme(t)).WithObjects(networkPolicy).
		WithInterceptorFuncs(interceptor.Funcs{
			List: func(ctx context.Context, delegate client.WithWatch, list client.ObjectList, opts ...client.ListOption) error {
				if _, ok := list.(*corev1.PodList); ok {
					podLists++
					return podConfirmationErr
				}
				return delegate.List(ctx, list, opts...)
			},
		}).Build()
	reconciler := &DashboardReconciler{Client: cli, ApplicationsNamespace: teardownTestNamespace}

	_, err := reconciler.teardownManagedResources(context.Background(), &v1alpha1.Dashboard{}, nil, false, true)
	require.ErrorIs(t, err, podConfirmationErr)
	assert.Equal(t, 1, podLists)
	assertTeardownResourcePresent(t, cli, networkPolicy)
}

func TestTeardownManagedResourcesIgnoresPreservedWorkloadsWhenConfirmingTermination(t *testing.T) {
	managedLabels := map[string]string{labels.PlatformPartOf: "dashboard"}
	preservedPod := &corev1.Pod{ObjectMeta: metav1.ObjectMeta{Name: "preserved-pod", Namespace: teardownTestNamespace, Labels: map[string]string{
		labels.PlatformPartOf: "dashboard",
		moduleComponentLabel:  observabilityComponent,
	}}}
	deletablePolicy := &networkingv1.NetworkPolicy{ObjectMeta: metav1.ObjectMeta{Name: "deletable-policy", Namespace: teardownTestNamespace, Labels: managedLabels}}
	preservedPolicy := &networkingv1.NetworkPolicy{ObjectMeta: metav1.ObjectMeta{Name: "preserved-policy", Namespace: teardownTestNamespace, Labels: map[string]string{
		labels.PlatformPartOf: "dashboard",
		moduleComponentLabel:  observabilityComponent,
	}}}
	cli := fake.NewClientBuilder().WithScheme(teardownTestScheme(t)).WithObjects(preservedPod, deletablePolicy, preservedPolicy).Build()
	reconciler := &DashboardReconciler{Client: cli, ApplicationsNamespace: teardownTestNamespace}

	result, err := reconciler.teardownManagedResources(context.Background(), &v1alpha1.Dashboard{}, nil, true, true)
	require.NoError(t, err)
	assert.False(t, result.Pending)
	assertTeardownResourceAbsent(t, cli, deletablePolicy)
	assertTeardownResourcePresent(t, cli, preservedPolicy)
}

func TestTeardownManagedResourcesCanSkipCrossNamespaceCleanup(t *testing.T) {
	crossNamespaceDeleteAttempted := false
	cli := fake.NewClientBuilder().WithScheme(teardownTestScheme(t)).
		WithInterceptorFuncs(interceptor.Funcs{
			Delete: func(ctx context.Context, delegate client.WithWatch, obj client.Object, opts ...client.DeleteOption) error {
				if obj.GetNamespace() == dataScienceGatewayNamespace {
					crossNamespaceDeleteAttempted = true
				}
				return delegate.Delete(ctx, obj, opts...)
			},
		}).Build()
	reconciler := &DashboardReconciler{Client: cli, ApplicationsNamespace: teardownTestNamespace}

	_, err := reconciler.teardownManagedResources(context.Background(), &v1alpha1.Dashboard{}, nil, false, false)
	require.NoError(t, err)
	assert.False(t, crossNamespaceDeleteAttempted)
}

func TestXKSRemovalSkipsOpenShiftCrossNamespaceCleanup(t *testing.T) {
	crossNamespaceDeleteAttempted := false
	dashboard := &v1alpha1.Dashboard{ObjectMeta: metav1.ObjectMeta{Name: "default-dashboard"}}
	cli := fake.NewClientBuilder().WithScheme(teardownTestScheme(t)).WithStatusSubresource(dashboard).WithObjects(dashboard).
		WithInterceptorFuncs(interceptor.Funcs{
			Delete: func(ctx context.Context, delegate client.WithWatch, obj client.Object, opts ...client.DeleteOption) error {
				if obj.GetNamespace() == dataScienceGatewayNamespace {
					crossNamespaceDeleteAttempted = true
				}
				return delegate.Delete(ctx, obj, opts...)
			},
		}).Build()
	reconciler := &DashboardReconciler{Client: cli, ApplicationsNamespace: teardownTestNamespace}
	cm := conditions.NewManager(dashboard, string(common.ConditionTypeReady), xksDashboardLifecycle{}.readyDependents()...)

	_, err := (xksDashboardLifecycle{reconciler: reconciler}).removeRHAIIDashboard(context.Background(), dashboard, dashboard.Status.DeepCopy(), cm)
	require.NoError(t, err)
	assert.False(t, crossNamespaceDeleteAttempted)
}

func TestTeardownManagedResourcesRetainsNetworkPoliciesUntilManagedPodsAreGone(t *testing.T) {
	managedLabels := map[string]string{labels.PlatformPartOf: "dashboard"}
	pod := &corev1.Pod{ObjectMeta: metav1.ObjectMeta{Name: "managed-pod", Namespace: teardownTestNamespace, Labels: managedLabels}}
	networkPolicy := &networkingv1.NetworkPolicy{ObjectMeta: metav1.ObjectMeta{Name: "managed-policy", Namespace: teardownTestNamespace, Labels: managedLabels}}
	service := &corev1.Service{ObjectMeta: metav1.ObjectMeta{Name: "managed-service", Namespace: teardownTestNamespace, Labels: managedLabels}}
	cli := fake.NewClientBuilder().WithScheme(teardownTestScheme(t)).WithObjects(pod, networkPolicy, service).Build()
	reconciler := &DashboardReconciler{Client: cli, ApplicationsNamespace: teardownTestNamespace}

	result, err := reconciler.teardownManagedResources(context.Background(), &v1alpha1.Dashboard{}, nil, false, true)
	require.NoError(t, err)
	assert.True(t, result.Pending)
	assertTeardownResourcePresent(t, cli, networkPolicy)
	assertTeardownResourceAbsent(t, cli, service)

	require.NoError(t, cli.Delete(context.Background(), pod))
	result, err = reconciler.teardownManagedResources(context.Background(), &v1alpha1.Dashboard{}, nil, false, true)
	require.NoError(t, err)
	assert.False(t, result.Pending)
	assertTeardownResourceAbsent(t, cli, networkPolicy)
}

func TestXKSRemovalRequeuesWhileManagedPodsRemain(t *testing.T) {
	managedLabels := map[string]string{labels.PlatformPartOf: "dashboard"}
	pod := &corev1.Pod{ObjectMeta: metav1.ObjectMeta{Name: "managed-pod", Namespace: teardownTestNamespace, Labels: managedLabels}}
	networkPolicy := &networkingv1.NetworkPolicy{ObjectMeta: metav1.ObjectMeta{Name: "managed-policy", Namespace: teardownTestNamespace, Labels: managedLabels}}
	dashboard := &v1alpha1.Dashboard{ObjectMeta: metav1.ObjectMeta{Name: "default-dashboard"}}
	cm := conditions.NewManager(dashboard, string(common.ConditionTypeReady), xksDashboardLifecycle{}.readyDependents()...)
	cm.MarkTrue(string(common.ConditionTypeProvisioningSucceeded))
	cm.MarkTrue(conditionDashboardAvailable)
	cm.MarkFalse(string(common.ConditionTypeDegraded), conditions.WithSeverity(common.ConditionSeverityInfo))
	cm.Sort()
	previousStatus := dashboard.Status.DeepCopy()
	cli := fake.NewClientBuilder().WithScheme(teardownTestScheme(t)).WithStatusSubresource(dashboard).WithObjects(dashboard, pod, networkPolicy).Build()
	reconciler := &DashboardReconciler{Client: cli, ApplicationsNamespace: teardownTestNamespace}

	result, err := (xksDashboardLifecycle{reconciler: reconciler}).removeRHAIIDashboard(context.Background(), dashboard, previousStatus, cm)
	require.NoError(t, err)
	assert.Equal(t, teardownRetryInterval, result.RequeueAfter)
	assert.Equal(t, "RemovalInProgress", cm.GetCondition(string(common.ConditionTypeProvisioningSucceeded)).Reason)
	assert.Equal(t, "RemovalInProgress", cm.GetCondition(conditionDashboardAvailable).Reason)
	assert.Equal(t, "RemovalInProgress", cm.GetCondition(string(common.ConditionTypeReady)).Reason)
	assert.Equal(t, common.PhaseNotReady, dashboard.Status.Phase)
	assertTeardownResourcePresent(t, cli, networkPolicy)
	persistedDashboard := &v1alpha1.Dashboard{}
	require.NoError(t, cli.Get(context.Background(), client.ObjectKeyFromObject(dashboard), persistedDashboard))
	assert.Equal(t, "RemovalInProgress", conditions.FindStatusCondition(persistedDashboard, string(common.ConditionTypeReady)).Reason)
}

func teardownTestScheme(t *testing.T) *runtime.Scheme {
	t.Helper()
	scheme := runtime.NewScheme()
	require.NoError(t, clientgoscheme.AddToScheme(scheme))
	require.NoError(t, v1alpha1.AddToScheme(scheme))
	require.NoError(t, gatewayv1.Install(scheme))
	return scheme
}

func assertTeardownResourceAbsent(t *testing.T, cli client.Client, obj client.Object) {
	t.Helper()
	err := cli.Get(context.Background(), client.ObjectKeyFromObject(obj), obj.DeepCopyObject().(client.Object))
	assert.True(t, apierrors.IsNotFound(err), "expected %T to be absent, got %v", obj, err)
}

func assertTeardownResourcePresent(t *testing.T, cli client.Client, obj client.Object) {
	t.Helper()
	err := cli.Get(context.Background(), client.ObjectKeyFromObject(obj), obj.DeepCopyObject().(client.Object))
	assert.NoError(t, err)
}
