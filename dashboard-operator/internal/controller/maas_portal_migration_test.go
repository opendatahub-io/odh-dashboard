package controller

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/client/interceptor"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"
)

func legacyPortalTestObjects() []client.Object {
	metadata := metav1.ObjectMeta{Name: legacyMaaSPortalName, Namespace: maasPortalTestNamespace}
	objects := []client.Object{
		&appsv1.Deployment{ObjectMeta: metadata},
		&corev1.Service{ObjectMeta: metadata},
		&corev1.ServiceAccount{ObjectMeta: metadata},
		&gatewayv1.HTTPRoute{ObjectMeta: metadata},
		&networkingv1.NetworkPolicy{ObjectMeta: metadata},
		&networkingv1.NetworkPolicy{ObjectMeta: metav1.ObjectMeta{Name: legacyMaaSPortalName + "-perses", Namespace: maasPortalTestNamespace}},
		&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: legacyMaaSPortalName + "-params", Namespace: maasPortalTestNamespace}},
		&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: legacyMaaSPortalName + "-federation-config", Namespace: maasPortalTestNamespace}},
		&corev1.Secret{ObjectMeta: metav1.ObjectMeta{Name: legacyMaaSPortalName + "-tls", Namespace: maasPortalTestNamespace}},
		&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "old-portal-config", Namespace: maasPortalTestNamespace, Labels: map[string]string{labels.PlatformPartOf: legacyMaaSPortalName}}},
		&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "old-app-labeled-config", Namespace: maasPortalTestNamespace, Labels: map[string]string{"app.kubernetes.io/part-of": legacyMaaSPortalName}}},
		&rbacv1.Role{ObjectMeta: metav1.ObjectMeta{Name: "old-portal-role", Namespace: maasPortalTestNamespace, Labels: map[string]string{labels.PlatformPartOf: legacyMaaSPortalName}}},
		&rbacv1.RoleBinding{ObjectMeta: metav1.ObjectMeta{Name: "old-portal-role", Namespace: maasPortalTestNamespace, Labels: map[string]string{labels.PlatformPartOf: legacyMaaSPortalName}}},
		&rbacv1.ClusterRole{ObjectMeta: metav1.ObjectMeta{Name: legacyMaaSPortalName}},
		&rbacv1.ClusterRoleBinding{ObjectMeta: metav1.ObjectMeta{Name: legacyMaaSPortalName}},
	}
	for _, namespace := range []string{"configured-operator", "redhat-ods-operator", "opendatahub-operator", "openshift-operators", "former-operator"} {
		for _, name := range []string{"rhods", "opendatahub"} {
			metadata := metav1.ObjectMeta{Name: legacyMaaSPortalName + "-" + name + "-operator-subscription", Namespace: namespace}
			if namespace == "former-operator" {
				metadata.Labels = map[string]string{labels.PlatformPartOf: legacyMaaSPortalName}
			}
			objects = append(objects, &rbacv1.Role{ObjectMeta: metadata}, &rbacv1.RoleBinding{ObjectMeta: metadata})
		}
	}
	return objects
}

func TestLegacyMaaSPortalCleanupIsScopedAndIdempotent(t *testing.T) {
	ctx := context.Background()
	legacy := legacyPortalTestObjects()
	preserved := []client.Object{
		&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: maasPortalFederationConfigMapName, Namespace: maasPortalTestNamespace, Labels: map[string]string{labels.PlatformPartOf: maasPortalPartOf}}},
		&corev1.Service{ObjectMeta: metav1.ObjectMeta{Name: maasPortalDeploymentName, Namespace: maasPortalTestNamespace, Labels: map[string]string{"app.kubernetes.io/part-of": legacyMaaSPortalName}}},
		&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "core-config", Namespace: maasPortalTestNamespace, Labels: map[string]string{labels.PlatformPartOf: "dashboard", "app.kubernetes.io/part-of": legacyMaaSPortalName}}},
		&corev1.Service{ObjectMeta: metav1.ObjectMeta{Name: "maas-ui", Namespace: maasPortalTestNamespace, Labels: map[string]string{labels.PlatformPartOf: "dashboard"}}},
		&appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Name: "gen-ai-ui", Namespace: maasPortalTestNamespace}},
		&networkingv1.NetworkPolicy{ObjectMeta: metav1.ObjectMeta{Name: "dashboard-perses-access", Namespace: maasPortalTestNamespace}},
		&corev1.Service{ObjectMeta: metav1.ObjectMeta{Name: legacyMaaSPortalName, Namespace: "another-application"}},
		&rbacv1.Role{ObjectMeta: metav1.ObjectMeta{Name: "unrelated-role", Namespace: "configured-operator", Labels: map[string]string{labels.PlatformPartOf: legacyMaaSPortalName}}},
		&rbacv1.Role{ObjectMeta: metav1.ObjectMeta{Name: legacyMaaSPortalName + "-rhods-operator-subscription", Namespace: "unrelated-namespace"}},
		&rbacv1.Role{ObjectMeta: metav1.ObjectMeta{Name: maasPortalRhodsOperatorSubscriptionResourceName, Namespace: "configured-operator"}},
		&corev1.Secret{ObjectMeta: metav1.ObjectMeta{Name: maasPortalDeploymentName + "-tls", Namespace: maasPortalTestNamespace, Labels: map[string]string{labels.PlatformPartOf: legacyMaaSPortalName}}},
		&rbacv1.Role{ObjectMeta: metav1.ObjectMeta{Name: legacyMaaSPortalName + "-rhods-operator-subscription", Namespace: maasPortalTestNamespace, Labels: map[string]string{labels.PlatformPartOf: maasPortalPartOf}}},
		&rbacv1.Role{ObjectMeta: metav1.ObjectMeta{Name: legacyMaaSPortalName + "-opendatahub-operator-subscription", Namespace: "unrelated-namespace", Labels: map[string]string{"app.kubernetes.io/part-of": "unrelated-app"}}},
	}
	routeDeletes := 0
	cli := fake.NewClientBuilder().WithScheme(maasPortalScheme(t)).WithObjects(append(legacy, preserved...)...).WithInterceptorFuncs(interceptor.Funcs{
		Delete: func(ctx context.Context, delegate client.WithWatch, obj client.Object, opts ...client.DeleteOption) error {
			if obj.GetObjectKind().GroupVersionKind().Kind == "HTTPRoute" {
				routeDeletes++
			}
			return delegate.Delete(ctx, obj, opts...)
		},
	}).Build()
	r := &DashboardReconciler{Client: cli, Namespace: "configured-operator", ApplicationsNamespace: maasPortalTestNamespace}
	for range 2 {
		result, err := r.deleteLegacyMaaSPortalResources(ctx)
		require.NoError(t, err)
		assert.False(t, result.Pending)
		assert.Equal(t, 1, routeDeletes, "delete the legacy route once, including across repeated reconciliation")
	}
	for _, obj := range legacy {
		assert.True(t, apierrors.IsNotFound(cli.Get(ctx, client.ObjectKeyFromObject(obj), obj.DeepCopyObject().(client.Object))), "%T %s/%s should be absent", obj, obj.GetNamespace(), obj.GetName())
	}
	for _, obj := range preserved {
		assert.NoError(t, cli.Get(ctx, client.ObjectKeyFromObject(obj), obj.DeepCopyObject().(client.Object)))
	}
}

func TestLegacyMaaSPortalCleanupRetriesFailures(t *testing.T) {
	ctx := context.Background()
	failed := true
	cli := fake.NewClientBuilder().WithScheme(maasPortalScheme(t)).WithObjects(legacyPortalTestObjects()...).WithInterceptorFuncs(interceptor.Funcs{
		Delete: func(ctx context.Context, delegate client.WithWatch, obj client.Object, opts ...client.DeleteOption) error {
			if failed && obj.GetName() == legacyMaaSPortalName+"-tls" {
				return errors.New("temporary deletion failure")
			}
			return delegate.Delete(ctx, obj, opts...)
		},
	}).Build()
	r := &DashboardReconciler{Client: cli, Namespace: "configured-operator", ApplicationsNamespace: maasPortalTestNamespace}
	result, err := r.deleteLegacyMaaSPortalResources(ctx)
	require.ErrorContains(t, err, "temporary deletion failure")
	assert.False(t, result.Pending)
	assert.NoError(t, cli.Get(ctx, client.ObjectKey{Name: legacyMaaSPortalName + "-tls", Namespace: maasPortalTestNamespace}, &corev1.Secret{}))
	assert.True(t, apierrors.IsNotFound(cli.Get(ctx, client.ObjectKey{Name: legacyMaaSPortalName, Namespace: maasPortalTestNamespace}, &corev1.Service{})))
	failed = false
	result, err = r.deleteLegacyMaaSPortalResources(ctx)
	require.NoError(t, err)
	assert.False(t, result.Pending)
	assert.True(t, apierrors.IsNotFound(cli.Get(ctx, client.ObjectKey{Name: legacyMaaSPortalName + "-tls", Namespace: maasPortalTestNamespace}, &corev1.Secret{})))
}

func TestLegacyMaaSPortalCleanupForbiddenServiceAccount(t *testing.T) {
	deletionErr := apierrors.NewForbidden(schema.GroupResource{Resource: "serviceaccounts"}, legacyMaaSPortalName, errors.New("deletion denied"))
	denyDelete := true
	cli := fake.NewClientBuilder().WithScheme(maasPortalScheme(t)).WithObjects(legacyPortalTestObjects()...).WithInterceptorFuncs(interceptor.Funcs{
		Delete: func(ctx context.Context, delegate client.WithWatch, obj client.Object, opts ...client.DeleteOption) error {
			if _, ok := obj.(*corev1.ServiceAccount); ok && denyDelete {
				return deletionErr
			}
			return delegate.Delete(ctx, obj, opts...)
		},
	}).Build()
	r := &DashboardReconciler{Client: cli, Namespace: "configured-operator", ApplicationsNamespace: maasPortalTestNamespace}
	ctx := context.Background()
	result, err := r.deleteLegacyMaaSPortalResources(ctx)
	require.ErrorIs(t, err, deletionErr)
	assert.False(t, result.Pending)
	key := client.ObjectKey{Name: legacyMaaSPortalName, Namespace: maasPortalTestNamespace}
	assert.NoError(t, cli.Get(ctx, key, &corev1.ServiceAccount{}))
	assert.True(t, apierrors.IsNotFound(cli.Get(ctx, key, &corev1.Service{})), "continue cleaning other legacy resources despite a failed ServiceAccount deletion")
	denyDelete = false
	result, err = r.deleteLegacyMaaSPortalResources(ctx)
	require.NoError(t, err)
	assert.False(t, result.Pending)
	assert.True(t, apierrors.IsNotFound(cli.Get(ctx, key, &corev1.ServiceAccount{})), "retry removes the legacy ServiceAccount after deletion is permitted")
}

func TestLegacyMaaSPortalCleanupDistinguishesPendingAndFailure(t *testing.T) {
	for _, failDelete := range []bool{false, true} {
		name := "finalizer pending"
		if failDelete {
			name = "finalizer pending with API failure"
		}
		t.Run(name, func(t *testing.T) {
			ctx := context.Background()
			deletionErr := errors.New("TLS deletion failed")
			route := &gatewayv1.HTTPRoute{ObjectMeta: metav1.ObjectMeta{Name: legacyMaaSPortalName, Namespace: maasPortalTestNamespace, Finalizers: []string{"test/hold-route"}}}
			secret := &corev1.Secret{ObjectMeta: metav1.ObjectMeta{Name: legacyMaaSPortalName + "-tls", Namespace: maasPortalTestNamespace}}
			service := &corev1.Service{ObjectMeta: metav1.ObjectMeta{Name: legacyMaaSPortalName, Namespace: maasPortalTestNamespace}}
			cli := fake.NewClientBuilder().WithScheme(maasPortalScheme(t)).WithObjects(route, secret, service).WithInterceptorFuncs(interceptor.Funcs{
				Delete: func(ctx context.Context, delegate client.WithWatch, obj client.Object, opts ...client.DeleteOption) error {
					if failDelete && obj.GetName() == secret.Name {
						return deletionErr
					}
					return delegate.Delete(ctx, obj, opts...)
				},
			}).Build()
			r := &DashboardReconciler{Client: cli, ApplicationsNamespace: maasPortalTestNamespace}
			result, err := r.deleteLegacyMaaSPortalResources(ctx)
			if failDelete {
				require.ErrorIs(t, err, deletionErr, "pending deletion must not hide an API failure")
			} else {
				require.NoError(t, err, "a finalizer is expected asynchronous work")
			}
			assert.True(t, result.Pending)
			assert.True(t, apierrors.IsNotFound(cli.Get(ctx, client.ObjectKeyFromObject(service), service)), "continue cleaning other objects while one deletion is pending")
			require.NoError(t, cli.Get(ctx, client.ObjectKeyFromObject(route), route))
			require.NotNil(t, route.DeletionTimestamp)
			route.Finalizers = nil
			require.NoError(t, cli.Update(ctx, route))
			failDelete = false
			result, err = r.deleteLegacyMaaSPortalResources(ctx)
			require.NoError(t, err)
			assert.False(t, result.Pending)
			assert.True(t, apierrors.IsNotFound(cli.Get(ctx, client.ObjectKeyFromObject(secret), secret)))
		})
	}
}

func TestMaaSPortalTeardownWaitsForLegacyFinalizers(t *testing.T) {
	for _, lifecycle := range []string{"removed", "unsupported", "finalizer"} {
		t.Run(lifecycle, func(t *testing.T) {
			ctx := context.Background()
			dashboard := &v1alpha1.Dashboard{ObjectMeta: metav1.ObjectMeta{Name: v1alpha1.DashboardInstanceName}, Status: v1alpha1.DashboardStatus{
				MaaSPortalURL: "https://previous.example.com/", MaaSConsumerPortalURL: "https://previous.example.com/",
			}}
			if lifecycle == "finalizer" {
				dashboard.Finalizers = []string{dashboardFinalizer}
				dashboard.DeletionTimestamp = &metav1.Time{Time: time.Now()}
			}
			route := &gatewayv1.HTTPRoute{ObjectMeta: metav1.ObjectMeta{Name: legacyMaaSPortalName, Namespace: maasPortalTestNamespace, Finalizers: []string{"test/hold-route"}}}
			cli := fake.NewClientBuilder().WithScheme(maasPortalScheme(t)).WithObjects(dashboard, route).Build()
			r := &DashboardReconciler{Client: cli, ApplicationsNamespace: maasPortalTestNamespace, Platform: cluster.SelfManagedRhoai}
			cm := maasPortalTestManager(t, dashboard)
			if lifecycle == "finalizer" {
				result, err := r.Reconcile(ctx, ctrl.Request{NamespacedName: client.ObjectKeyFromObject(dashboard)})
				require.NoError(t, err)
				assert.Equal(t, maasPortalRetryInterval, result.RequeueAfter)
				require.NoError(t, cli.Get(ctx, client.ObjectKeyFromObject(dashboard), dashboard))
				assert.Contains(t, dashboard.Finalizers, dashboardFinalizer, "retain the Dashboard finalizer until legacy resources are gone")
			} else {
				var retry time.Duration
				if lifecycle == "removed" {
					retry = r.reconcileRemovedMaaSPortal(ctx, dashboard, cm)
				} else {
					retry = r.reconcileUnsupportedMaaSPortal(ctx, dashboard, cm)
				}
				assert.Equal(t, maasPortalRetryInterval, retry)
				condition := cm.GetCondition(conditionMaaSPortalAvailable)
				require.NotNil(t, condition)
				assert.Equal(t, "CleanupPending", condition.Reason)
				assert.Equal(t, common.ConditionSeverityInfo, condition.Severity)
				assert.Equal(t, "https://previous.example.com/", dashboard.Status.MaaSPortalURL)
				assert.Equal(t, dashboard.Status.MaaSPortalURL, dashboard.Status.MaaSConsumerPortalURL)
			}
			require.NoError(t, cli.Get(ctx, client.ObjectKeyFromObject(route), route))
			require.NotNil(t, route.DeletionTimestamp)
			route.Finalizers = nil
			require.NoError(t, cli.Update(ctx, route))
			if lifecycle == "finalizer" {
				result, err := r.Reconcile(ctx, ctrl.Request{NamespacedName: client.ObjectKeyFromObject(dashboard)})
				require.NoError(t, err)
				assert.Zero(t, result.RequeueAfter)
				assert.True(t, apierrors.IsNotFound(cli.Get(ctx, client.ObjectKeyFromObject(dashboard), dashboard)))
			} else {
				if lifecycle == "removed" {
					assert.Zero(t, r.reconcileRemovedMaaSPortal(ctx, dashboard, cm))
				} else {
					assert.Zero(t, r.reconcileUnsupportedMaaSPortal(ctx, dashboard, cm))
				}
				assert.Empty(t, dashboard.Status.MaaSPortalURL)
				assert.Empty(t, dashboard.Status.MaaSConsumerPortalURL)
			}
		})
	}
}

func TestMaaSPortalTeardownRetriesServiceAccountDeletion(t *testing.T) {
	tests := []struct {
		lifecycle   string
		accountName string
	}{
		{"removed", maasPortalDeploymentName},
		{"removed", legacyMaaSPortalName},
		{"unsupported", maasPortalDeploymentName},
		{"unsupported", legacyMaaSPortalName},
		{"finalizer", maasPortalDeploymentName},
		{"finalizer", legacyMaaSPortalName},
	}
	for _, tt := range tests {
		t.Run(tt.lifecycle+"/"+tt.accountName, func(t *testing.T) {
			lifecycle := tt.lifecycle
			ctx := context.Background()
			dashboard := &v1alpha1.Dashboard{ObjectMeta: metav1.ObjectMeta{Name: v1alpha1.DashboardInstanceName}, Status: v1alpha1.DashboardStatus{
				MaaSPortalURL: "https://previous.example.com/", MaaSConsumerPortalURL: "https://previous.example.com/",
			}}
			if lifecycle == "finalizer" {
				dashboard.Finalizers = []string{dashboardFinalizer}
				dashboard.DeletionTimestamp = &metav1.Time{Time: time.Now()}
			}
			portalSA := &corev1.ServiceAccount{ObjectMeta: metav1.ObjectMeta{Name: tt.accountName, Namespace: maasPortalTestNamespace, Labels: map[string]string{labels.PlatformPartOf: tt.accountName}}}
			sharedSA := &corev1.ServiceAccount{ObjectMeta: metav1.ObjectMeta{Name: "shared-account", Namespace: maasPortalTestNamespace, Labels: map[string]string{labels.PlatformPartOf: "dashboard"}}}
			deletionErr := apierrors.NewForbidden(schema.GroupResource{Resource: "serviceaccounts"}, portalSA.Name, errors.New("deletion denied"))
			denyDelete := true
			cli := fake.NewClientBuilder().WithScheme(maasPortalScheme(t)).WithObjects(dashboard, portalSA, sharedSA).WithInterceptorFuncs(interceptor.Funcs{
				Delete: func(ctx context.Context, delegate client.WithWatch, obj client.Object, opts ...client.DeleteOption) error {
					if _, isSA := obj.(*corev1.ServiceAccount); isSA && obj.GetName() == portalSA.Name && denyDelete {
						return deletionErr
					}
					return delegate.Delete(ctx, obj, opts...)
				},
			}).Build()
			r := &DashboardReconciler{Client: cli, ApplicationsNamespace: maasPortalTestNamespace}
			cm := maasPortalTestManager(t, dashboard)
			cleanup := func() (time.Duration, error) {
				switch lifecycle {
				case "removed":
					return r.reconcileRemovedMaaSPortal(ctx, dashboard, cm), nil
				case "unsupported":
					return r.reconcileUnsupportedMaaSPortal(ctx, dashboard, cm), nil
				default:
					result, err := r.Reconcile(ctx, ctrl.Request{NamespacedName: client.ObjectKeyFromObject(dashboard)})
					return result.RequeueAfter, err
				}
			}
			retry, err := cleanup()
			if lifecycle == "finalizer" {
				require.ErrorIs(t, err, deletionErr, "a denied ServiceAccount deletion must retain the Dashboard finalizer for retry")
				require.NoError(t, cli.Get(ctx, client.ObjectKeyFromObject(dashboard), dashboard))
				assert.Contains(t, dashboard.Finalizers, dashboardFinalizer)
			} else {
				require.NoError(t, err)
				assert.Equal(t, maasPortalRetryInterval, retry)
				assert.Equal(t, "MaaSPortalCleanupFailed", cm.GetCondition(conditionMaaSPortalAvailable).Reason)
				assert.Equal(t, "https://previous.example.com/", dashboard.Status.MaaSPortalURL)
				assert.Equal(t, dashboard.Status.MaaSPortalURL, dashboard.Status.MaaSConsumerPortalURL)
			}
			require.NoError(t, cli.Get(ctx, client.ObjectKeyFromObject(portalSA), portalSA))
			denyDelete = false
			retry, err = cleanup()
			require.NoError(t, err)
			assert.Zero(t, retry)
			assert.True(t, apierrors.IsNotFound(cli.Get(ctx, client.ObjectKeyFromObject(portalSA), portalSA)))
			assert.NoError(t, cli.Get(ctx, client.ObjectKeyFromObject(sharedSA), sharedSA), "portal cleanup must retain shared ServiceAccounts")
			if lifecycle != "finalizer" {
				assert.Empty(t, dashboard.Status.MaaSPortalURL)
				assert.Empty(t, dashboard.Status.MaaSConsumerPortalURL)
			}
		})
	}
}

func TestMaaSPortalRouteMigrationWaitsAndRecovers(t *testing.T) {
	ctx := context.Background()
	deployment := &appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Name: maasPortalDeploymentName, Namespace: maasPortalTestNamespace, Generation: 2}}
	metadata := metav1.ObjectMeta{Name: legacyMaaSPortalName, Namespace: maasPortalTestNamespace, Finalizers: []string{"test/hold-route"}}
	cli := fake.NewClientBuilder().WithScheme(maasPortalScheme(t)).WithStatusSubresource(deployment).WithObjects(deployment, migrationFederationConfig(),
		&gatewayv1.HTTPRoute{ObjectMeta: metadata}, &corev1.Service{ObjectMeta: metav1.ObjectMeta{Name: legacyMaaSPortalName, Namespace: maasPortalTestNamespace}},
	).Build()
	r := &DashboardReconciler{Client: cli, ApplicationsNamespace: maasPortalTestNamespace}
	allowed, err := r.prepareMaaSPortalRouteMigration(ctx)
	require.NoError(t, err)
	assert.False(t, allowed, "retain the old route while the new workload is unavailable")
	deployment.Spec.Template.Annotations = map[string]string{maasPortalFederationHashAnnotation: computeFederationConfigHash("{}")}
	require.NoError(t, cli.Update(ctx, deployment))
	deployment.Status = appsv1.DeploymentStatus{ObservedGeneration: 1, Replicas: 1, UpdatedReplicas: 1, ReadyReplicas: 1, AvailableReplicas: 1, Conditions: []appsv1.DeploymentCondition{{Type: appsv1.DeploymentAvailable, Status: corev1.ConditionTrue}}}
	require.NoError(t, cli.Status().Update(ctx, deployment))
	allowed, err = r.prepareMaaSPortalRouteMigration(ctx)
	require.NoError(t, err)
	assert.False(t, allowed, "stale availability must not trigger route replacement")
	deployment.Status.ObservedGeneration = 2
	require.NoError(t, cli.Status().Update(ctx, deployment))
	allowed, err = r.prepareMaaSPortalRouteMigration(ctx)
	require.NoError(t, err, "finalizer waiting is expected migration progress")
	assert.False(t, allowed, "never apply overlapping routes while legacy deletion is pending")
	oldRoute := &gatewayv1.HTTPRoute{}
	require.NoError(t, cli.Get(ctx, client.ObjectKeyFromObject(&gatewayv1.HTTPRoute{ObjectMeta: metadata}), oldRoute))
	oldRoute.Finalizers = nil
	require.NoError(t, cli.Update(ctx, oldRoute))
	for range 2 {
		allowed, err = r.prepareMaaSPortalRouteMigration(ctx)
		require.NoError(t, err)
		assert.True(t, allowed, "recover after old route deletion, even if applying the replacement failed")
	}
	assert.NoError(t, cli.Get(ctx, client.ObjectKey{Name: legacyMaaSPortalName, Namespace: maasPortalTestNamespace}, &corev1.Service{}), "keep legacy backends until replacement readiness")
}

func TestMaaSPortalTeardownHandlesBothResourceIdentities(t *testing.T) {
	for _, lifecycle := range []string{"removed", "finalizer"} {
		for _, installation := range []string{"legacy", "new", "both"} {
			t.Run(lifecycle+"/"+installation, func(t *testing.T) {
				ctx := context.Background()
				dashboard := &v1alpha1.Dashboard{ObjectMeta: metav1.ObjectMeta{Name: v1alpha1.DashboardInstanceName}}
				if lifecycle == "finalizer" {
					dashboard.Finalizers = []string{dashboardFinalizer}
					dashboard.DeletionTimestamp = &metav1.Time{Time: time.Now()}
				}
				var operands []client.Object
				if installation != "new" {
					operands = append(operands, legacyPortalTestObjects()...)
				}
				if installation != "legacy" {
					metadata := metav1.ObjectMeta{Name: maasPortalDeploymentName, Namespace: maasPortalTestNamespace, Labels: map[string]string{labels.PlatformPartOf: maasPortalPartOf}}
					operands = append(operands, &appsv1.Deployment{ObjectMeta: metadata}, &corev1.Service{ObjectMeta: metadata}, &corev1.ServiceAccount{ObjectMeta: metadata}, &gatewayv1.HTTPRoute{ObjectMeta: metadata},
						&corev1.Secret{ObjectMeta: metav1.ObjectMeta{Name: maasPortalDeploymentName + "-tls", Namespace: maasPortalTestNamespace}})
				}
				shared := &corev1.Service{ObjectMeta: metav1.ObjectMeta{Name: "maas-ui", Namespace: maasPortalTestNamespace}}
				objects := append([]client.Object{dashboard, shared}, operands...)
				cli := fake.NewClientBuilder().WithScheme(maasPortalScheme(t)).WithObjects(objects...).Build()
				r := &DashboardReconciler{Client: cli, Namespace: "configured-operator", ApplicationsNamespace: maasPortalTestNamespace}
				if lifecycle == "finalizer" {
					_, err := r.Reconcile(ctx, ctrl.Request{NamespacedName: client.ObjectKeyFromObject(dashboard)})
					require.NoError(t, err)
				} else {
					cm := maasPortalTestManager(t, dashboard)
					assert.Zero(t, r.reconcileRemovedMaaSPortal(ctx, dashboard, cm))
				}
				for _, obj := range operands {
					assert.True(t, apierrors.IsNotFound(cli.Get(ctx, client.ObjectKeyFromObject(obj), obj.DeepCopyObject().(client.Object))), "%T %s/%s must be removed", obj, obj.GetNamespace(), obj.GetName())
				}
				assert.NoError(t, cli.Get(ctx, client.ObjectKeyFromObject(shared), &corev1.Service{}))
			})
		}
	}
}

func TestMaaSPortalRouteMigrationRepairsOverlappingRoutes(t *testing.T) {
	ctx := context.Background()
	path := "/maas-consumer-portal"
	oldRoute := &gatewayv1.HTTPRoute{ObjectMeta: metav1.ObjectMeta{Name: legacyMaaSPortalName, Namespace: maasPortalTestNamespace},
		Spec: gatewayv1.HTTPRouteSpec{Rules: []gatewayv1.HTTPRouteRule{{Matches: []gatewayv1.HTTPRouteMatch{{Path: &gatewayv1.HTTPPathMatch{Value: &path}}}}}}}
	newRoute := oldRoute.DeepCopy()
	newRoute.Name = maasPortalDeploymentName
	deployment := &appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Name: maasPortalDeploymentName, Namespace: maasPortalTestNamespace, Generation: 2},
		Status: appsv1.DeploymentStatus{ObservedGeneration: 2, Replicas: 1, UpdatedReplicas: 1, ReadyReplicas: 1, AvailableReplicas: 1, Conditions: []appsv1.DeploymentCondition{{Type: appsv1.DeploymentAvailable, Status: corev1.ConditionTrue}}}}
	deployment.Spec.Template.Annotations = map[string]string{maasPortalFederationHashAnnotation: computeFederationConfigHash("{}")}
	cli := fake.NewClientBuilder().WithScheme(maasPortalScheme(t)).WithObjects(oldRoute, newRoute, deployment, migrationFederationConfig()).Build()
	r := &DashboardReconciler{Client: cli, ApplicationsNamespace: maasPortalTestNamespace}
	allowed, err := r.prepareMaaSPortalRouteMigration(ctx)
	require.NoError(t, err)
	assert.True(t, allowed)
	assert.True(t, apierrors.IsNotFound(cli.Get(ctx, client.ObjectKeyFromObject(oldRoute), &gatewayv1.HTTPRoute{})))
	assert.NoError(t, cli.Get(ctx, client.ObjectKeyFromObject(newRoute), &gatewayv1.HTTPRoute{}))
}

func migrationFederationConfig() *corev1.ConfigMap {
	return &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: maasPortalFederationConfigMapName, Namespace: maasPortalTestNamespace},
		Data: map[string]string{federationConfigKey: "{}"}}
}

func migrationReadyDeployment() *appsv1.Deployment {
	return &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{Name: maasPortalDeploymentName, Namespace: maasPortalTestNamespace, Generation: 2},
		Spec: appsv1.DeploymentSpec{Template: corev1.PodTemplateSpec{ObjectMeta: metav1.ObjectMeta{Annotations: map[string]string{
			maasPortalFederationHashAnnotation: computeFederationConfigHash("{}"),
		}}}},
		Status: appsv1.DeploymentStatus{ObservedGeneration: 2, Replicas: 1, UpdatedReplicas: 1, ReadyReplicas: 1, AvailableReplicas: 1,
			Conditions: []appsv1.DeploymentCondition{{Type: appsv1.DeploymentAvailable, Status: corev1.ConditionTrue}}},
	}
}

func TestMaaSPortalRouteMigrationRolloutBoundaries(t *testing.T) {
	tests := []struct {
		name    string
		mutate  func(*appsv1.Deployment)
		allowed bool
	}{
		{name: "default single replica completed", allowed: true},
		{name: "multiple replicas completed", allowed: true, mutate: func(deployment *appsv1.Deployment) {
			replicas := int32(2)
			deployment.Spec.Replicas = &replicas
			deployment.Status.Replicas = 2
			deployment.Status.UpdatedReplicas = 2
			deployment.Status.ReadyReplicas = 2
			deployment.Status.AvailableReplicas = 2
		}},
		{name: "old pod is ready but no updated pod", mutate: func(deployment *appsv1.Deployment) {
			deployment.Status.UpdatedReplicas = 0
		}},
		{name: "updated pod is not ready", mutate: func(deployment *appsv1.Deployment) {
			deployment.Status.ReadyReplicas = 0
		}},
		{name: "updated pod is not available", mutate: func(deployment *appsv1.Deployment) {
			deployment.Status.AvailableReplicas = 0
		}},
		{name: "old replica remains", mutate: func(deployment *appsv1.Deployment) {
			deployment.Status.Replicas = 2
		}},
		{name: "desired replicas are zero", mutate: func(deployment *appsv1.Deployment) {
			replicas := int32(0)
			deployment.Spec.Replicas = &replicas
			deployment.Status.Replicas = 0
			deployment.Status.UpdatedReplicas = 0
			deployment.Status.ReadyReplicas = 0
			deployment.Status.AvailableReplicas = 0
		}},
		{name: "deployment is being deleted", mutate: func(deployment *appsv1.Deployment) {
			deployment.DeletionTimestamp = &metav1.Time{Time: time.Now()}
			deployment.Finalizers = []string{"test/hold-deployment"}
		}},
		{name: "observed generation is stale", mutate: func(deployment *appsv1.Deployment) {
			deployment.Status.ObservedGeneration = 1
		}},
		{name: "availability condition is false", mutate: func(deployment *appsv1.Deployment) {
			deployment.Status.Conditions[0].Status = corev1.ConditionFalse
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			deployment := migrationReadyDeployment()
			if tt.mutate != nil {
				tt.mutate(deployment)
			}
			legacyRoute := &gatewayv1.HTTPRoute{ObjectMeta: metav1.ObjectMeta{Name: legacyMaaSPortalName, Namespace: maasPortalTestNamespace}}
			cli := fake.NewClientBuilder().WithScheme(maasPortalScheme(t)).WithObjects(deployment, migrationFederationConfig(), legacyRoute).Build()
			r := &DashboardReconciler{Client: cli, APIReader: cli, ApplicationsNamespace: maasPortalTestNamespace}
			allowed, err := r.prepareMaaSPortalRouteMigration(ctx)
			require.NoError(t, err)
			assert.Equal(t, tt.allowed, allowed)
			err = cli.Get(ctx, client.ObjectKeyFromObject(legacyRoute), legacyRoute)
			if tt.allowed {
				assert.True(t, apierrors.IsNotFound(err), "completed rollout permits removal of the legacy route")
			} else {
				require.NoError(t, err, "incomplete rollout must retain the legacy route")
				assert.Nil(t, legacyRoute.DeletionTimestamp, "incomplete rollout must not start route deletion")
			}
		})
	}
}

func TestMaaSPortalRouteMigrationWaitsForCurrentFederationHash(t *testing.T) {
	tests := []struct {
		name string
		hash string
	}{
		{name: "missing annotation"},
		{name: "outdated hash", hash: computeFederationConfigHash(`{"modules":["maas"]}`)},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			deployment := migrationReadyDeployment()
			if tt.hash == "" {
				delete(deployment.Spec.Template.Annotations, maasPortalFederationHashAnnotation)
			} else {
				deployment.Spec.Template.Annotations[maasPortalFederationHashAnnotation] = tt.hash
			}
			config := migrationFederationConfig()
			legacyRoute := &gatewayv1.HTTPRoute{ObjectMeta: metav1.ObjectMeta{Name: legacyMaaSPortalName, Namespace: maasPortalTestNamespace}}
			cli := fake.NewClientBuilder().WithScheme(maasPortalScheme(t)).WithStatusSubresource(deployment).WithObjects(deployment, config, legacyRoute).Build()
			r := &DashboardReconciler{Client: cli, APIReader: cli, ApplicationsNamespace: maasPortalTestNamespace}
			allowed, err := r.prepareMaaSPortalRouteMigration(ctx)
			require.NoError(t, err)
			assert.False(t, allowed, "a complete rollout with a missing or outdated federation hash must not authorize cutover")
			require.NoError(t, cli.Get(ctx, client.ObjectKeyFromObject(legacyRoute), legacyRoute))
			assert.Nil(t, legacyRoute.DeletionTimestamp)
			require.NoError(t, cli.Get(ctx, client.ObjectKeyFromObject(deployment), deployment))
			deployment.Spec.Template.Annotations = map[string]string{maasPortalFederationHashAnnotation: computeFederationConfigHash(config.Data[federationConfigKey])}
			deployment.Generation++ // The fake client does not advance generation on template updates.
			require.NoError(t, cli.Update(ctx, deployment))
			deployment.Status.ObservedGeneration = deployment.Generation
			require.NoError(t, cli.Status().Update(ctx, deployment))
			allowed, err = r.prepareMaaSPortalRouteMigration(ctx)
			require.NoError(t, err)
			assert.True(t, allowed, "retry permits cutover after the current federation config has rolled out")
			assert.True(t, apierrors.IsNotFound(cli.Get(ctx, client.ObjectKeyFromObject(legacyRoute), legacyRoute)))
		})
	}
}

func TestMaaSPortalRouteMigrationRetainsLegacyRouteOnReadFailure(t *testing.T) {
	readErr := errors.New("API read temporarily failed")
	tests := []struct {
		name         string
		resourceName string
		missing      bool
	}{
		{name: "deployment is missing", resourceName: maasPortalDeploymentName, missing: true},
		{name: "federation config is missing", resourceName: maasPortalFederationConfigMapName, missing: true},
		{name: "legacy route read fails", resourceName: legacyMaaSPortalName},
		{name: "deployment read fails", resourceName: maasPortalDeploymentName},
		{name: "federation config read fails", resourceName: maasPortalFederationConfigMapName},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			legacyRoute := &gatewayv1.HTTPRoute{ObjectMeta: metav1.ObjectMeta{Name: legacyMaaSPortalName, Namespace: maasPortalTestNamespace}}
			objects := []client.Object{legacyRoute}
			for _, obj := range []client.Object{migrationReadyDeployment(), migrationFederationConfig()} {
				if !tt.missing || obj.GetName() != tt.resourceName {
					objects = append(objects, obj)
				}
			}
			cli := fake.NewClientBuilder().WithScheme(maasPortalScheme(t)).WithObjects(objects...).Build()
			reader := interceptor.NewClient(cli, interceptor.Funcs{
				Get: func(ctx context.Context, delegate client.WithWatch, key client.ObjectKey, obj client.Object, opts ...client.GetOption) error {
					if !tt.missing && key.Name == tt.resourceName {
						return readErr
					}
					return delegate.Get(ctx, key, obj, opts...)
				},
			})
			r := &DashboardReconciler{Client: cli, APIReader: reader, ApplicationsNamespace: maasPortalTestNamespace}
			allowed, err := r.prepareMaaSPortalRouteMigration(ctx)
			if tt.missing {
				require.NoError(t, err, "missing prerequisites wait for a later reconciliation")
			} else {
				require.ErrorIs(t, err, readErr, "API failures must propagate for retry")
			}
			assert.False(t, allowed)
			require.NoError(t, cli.Get(ctx, client.ObjectKeyFromObject(legacyRoute), legacyRoute))
			assert.Nil(t, legacyRoute.DeletionTimestamp, "missing prerequisites or failed reads must not start route deletion")
		})
	}
}

func TestMaaSPortalMigrationReadsLatestRolloutAfterFederationPatch(t *testing.T) {
	ctx := context.Background()
	config := migrationFederationConfig()
	config.Data[federationConfigKey] = `{"modules":["maas","genAi"]}`
	deployment := &appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Name: maasPortalDeploymentName, Namespace: maasPortalTestNamespace, Generation: 3},
		Spec: appsv1.DeploymentSpec{Template: corev1.PodTemplateSpec{ObjectMeta: metav1.ObjectMeta{Annotations: map[string]string{
			maasPortalFederationHashAnnotation: computeFederationConfigHash("{}"),
		}}}},
		Status: appsv1.DeploymentStatus{ObservedGeneration: 3, Replicas: 2, UpdatedReplicas: 1, ReadyReplicas: 1, AvailableReplicas: 1,
			Conditions: []appsv1.DeploymentCondition{{Type: appsv1.DeploymentAvailable, Status: corev1.ConditionTrue}}}}
	legacyRoute := &gatewayv1.HTTPRoute{ObjectMeta: metav1.ObjectMeta{Name: legacyMaaSPortalName, Namespace: maasPortalTestNamespace}}
	direct := fake.NewClientBuilder().WithScheme(maasPortalScheme(t)).WithStatusSubresource(deployment).WithObjects(deployment, config, legacyRoute).Build()
	stale := deployment.DeepCopy()
	stale.Generation = 2
	stale.Status.ObservedGeneration = 2
	stale.Status.Replicas = 1
	cached := interceptor.NewClient(direct, interceptor.Funcs{
		Get: func(ctx context.Context, delegate client.WithWatch, key client.ObjectKey, obj client.Object, opts ...client.GetOption) error {
			switch typed := obj.(type) {
			case *appsv1.Deployment:
				*typed = *stale.DeepCopy()
				return nil
			case *corev1.ConfigMap:
				*typed = *migrationFederationConfig()
				return nil
			default:
				return delegate.Get(ctx, key, obj, opts...)
			}
		},
	})
	r := &DashboardReconciler{Client: cached, APIReader: direct, ApplicationsNamespace: maasPortalTestNamespace}
	require.NoError(t, r.syncMaaSPortalDeploymentFederationHash(ctx))
	require.NoError(t, direct.Get(ctx, client.ObjectKeyFromObject(deployment), deployment))
	assert.Equal(t, computeFederationConfigHash(config.Data[federationConfigKey]), deployment.Spec.Template.Annotations[maasPortalFederationHashAnnotation], "patch the current federation config rather than the cached config")
	allowed, err := r.prepareMaaSPortalRouteMigration(ctx)
	require.NoError(t, err)
	assert.False(t, allowed, "an old available pod must not authorize cutover while the updated pod is unready")
	require.NoError(t, direct.Get(ctx, client.ObjectKeyFromObject(legacyRoute), &gatewayv1.HTTPRoute{}))
	deployment.Status.Replicas = 1
	require.NoError(t, direct.Status().Update(ctx, deployment))
	allowed, err = r.prepareMaaSPortalRouteMigration(ctx)
	require.NoError(t, err)
	assert.True(t, allowed, "cut over once the API server reports the latest revision fully rolled out")
	assert.True(t, apierrors.IsNotFound(direct.Get(ctx, client.ObjectKeyFromObject(legacyRoute), &gatewayv1.HTTPRoute{})))
}
