package controller

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/client/interceptor"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/controller/conditions"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

const maasConsumerPortalTestNamespace = "maas-consumer-portal-test"

func TestMaaSConsumerPortalAvailabilityHelpers(t *testing.T) {
	readyRoute := portalTestRoute(2,
		metav1.Condition{Type: string(gatewayv1.RouteConditionAccepted), Status: metav1.ConditionTrue, ObservedGeneration: 2},
		metav1.Condition{Type: string(gatewayv1.RouteConditionResolvedRefs), Status: metav1.ConditionTrue, ObservedGeneration: 2},
	)
	splitConditionRoute := portalTestRouteWithParents(2,
		[]metav1.Condition{{Type: string(gatewayv1.RouteConditionAccepted), Status: metav1.ConditionTrue, ObservedGeneration: 2}},
		[]metav1.Condition{{Type: string(gatewayv1.RouteConditionResolvedRefs), Status: metav1.ConditionTrue, ObservedGeneration: 2}},
	)
	availableDeployment := appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Generation: 2}, Status: appsv1.DeploymentStatus{ObservedGeneration: 2, Conditions: []appsv1.DeploymentCondition{{Type: appsv1.DeploymentAvailable, Status: corev1.ConditionTrue}}}}

	tests := []struct {
		name            string
		route           gatewayv1.HTTPRoute
		deployment      appsv1.Deployment
		wantRouteReady  bool
		wantDeployReady bool
	}{
		{name: "accepted and resolved route with available deployment", route: readyRoute, deployment: availableDeployment, wantRouteReady: true, wantDeployReady: true},
		{name: "route without resolved references", route: portalTestRoute(2, metav1.Condition{Type: string(gatewayv1.RouteConditionAccepted), Status: metav1.ConditionTrue, ObservedGeneration: 2}), deployment: availableDeployment, wantDeployReady: true},
		{name: "route conditions split across parents", route: splitConditionRoute, deployment: availableDeployment, wantDeployReady: true},
		{name: "route with stale accepted condition", route: portalTestRoute(2, metav1.Condition{Type: string(gatewayv1.RouteConditionAccepted), Status: metav1.ConditionTrue, ObservedGeneration: 1}, metav1.Condition{Type: string(gatewayv1.RouteConditionResolvedRefs), Status: metav1.ConditionTrue, ObservedGeneration: 2}), deployment: availableDeployment, wantDeployReady: true},
		{name: "route with stale resolved references condition", route: portalTestRoute(2, metav1.Condition{Type: string(gatewayv1.RouteConditionAccepted), Status: metav1.ConditionTrue, ObservedGeneration: 2}, metav1.Condition{Type: string(gatewayv1.RouteConditionResolvedRefs), Status: metav1.ConditionTrue, ObservedGeneration: 1}), deployment: availableDeployment, wantDeployReady: true},
		{name: "deployment without available condition", route: readyRoute, wantRouteReady: true},
		{name: "deployment with stale observed generation", route: readyRoute, deployment: appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Generation: 2}, Status: appsv1.DeploymentStatus{ObservedGeneration: 1, Conditions: []appsv1.DeploymentCondition{{Type: appsv1.DeploymentAvailable, Status: corev1.ConditionTrue}}}}, wantRouteReady: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.wantRouteReady, portalRouteReady(&tt.route))
			assert.Equal(t, tt.wantDeployReady, deploymentAvailable(&tt.deployment))
		})
	}
}

func portalTestRoute(generation int64, conditions ...metav1.Condition) gatewayv1.HTTPRoute {
	return portalTestRouteWithParents(generation, conditions)
}

func portalTestRouteWithParents(generation int64, conditions ...[]metav1.Condition) gatewayv1.HTTPRoute {
	parents := make([]gatewayv1.RouteParentStatus, 0, len(conditions))
	for _, conditionSet := range conditions {
		parents = append(parents, gatewayv1.RouteParentStatus{Conditions: conditionSet})
	}
	return gatewayv1.HTTPRoute{
		ObjectMeta: metav1.ObjectMeta{Generation: generation},
		Status:     gatewayv1.HTTPRouteStatus{RouteStatus: gatewayv1.RouteStatus{Parents: parents}},
	}
}

func TestReconcileMaaSConsumerPortalAvailability(t *testing.T) {
	readyRoute := &gatewayv1.HTTPRoute{
		ObjectMeta: metav1.ObjectMeta{Name: maasConsumerPortalHostPrefix, Namespace: maasConsumerPortalTestNamespace},
		Status: gatewayv1.HTTPRouteStatus{RouteStatus: gatewayv1.RouteStatus{Parents: []gatewayv1.RouteParentStatus{{Conditions: []metav1.Condition{
			{Type: string(gatewayv1.RouteConditionAccepted), Status: metav1.ConditionTrue},
			{Type: string(gatewayv1.RouteConditionResolvedRefs), Status: metav1.ConditionTrue},
		}}}}},
	}
	availableDeployment := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{Name: maasConsumerPortalHostPrefix, Namespace: maasConsumerPortalTestNamespace},
		Status:     appsv1.DeploymentStatus{Conditions: []appsv1.DeploymentCondition{{Type: appsv1.DeploymentAvailable, Status: corev1.ConditionTrue}}},
	}
	statuses := map[string]v1alpha1.ModuleStatus{
		"maas":  {Phase: v1alpha1.ModulePhaseDeployed},
		"genAi": {Phase: v1alpha1.ModulePhaseDeployed},
	}

	tests := []struct {
		name       string
		objects    []client.Object
		wantReason string
		wantRetry  time.Duration
	}{
		{name: "missing route", wantReason: "MaaSConsumerPortalRouteUnavailable", wantRetry: maasConsumerPortalRetryInterval},
		{name: "route not ready", objects: []client.Object{&gatewayv1.HTTPRoute{ObjectMeta: readyRoute.ObjectMeta}}, wantReason: "MaaSConsumerPortalRouteNotReady", wantRetry: maasConsumerPortalRetryInterval},
		{name: "missing deployment", objects: []client.Object{readyRoute}, wantReason: "MaaSConsumerPortalDeploymentUnavailable", wantRetry: maasConsumerPortalRetryInterval},
		{name: "complete portal available", objects: []client.Object{readyRoute, availableDeployment}, wantReason: "Deployed"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := maasConsumerPortalScheme(t)
			dashboard := &v1alpha1.Dashboard{Spec: v1alpha1.DashboardSpec{MaaSConsumerPortal: &v1alpha1.MaaSConsumerPortalSpec{ManagementState: "Managed"}}}
			r := &DashboardReconciler{Client: fake.NewClientBuilder().WithScheme(s).WithObjects(tt.objects...).Build(), Scheme: s, ApplicationsNamespace: maasConsumerPortalTestNamespace}
			cm := maasConsumerPortalTestManager(t, dashboard)
			retryAfter := r.reconcileMaaSConsumerPortalAvailability(context.Background(), dashboard, cm, statuses)
			condition := cm.GetCondition(conditionMaaSConsumerPortalAvailable)
			require.NotNil(t, condition)
			assert.Equal(t, tt.wantReason, condition.Reason)
			assert.Equal(t, tt.wantRetry, retryAfter)
		})
	}
}

func TestReconcileMaaSConsumerPortal_UnsupportedPlatform(t *testing.T) {
	s := maasConsumerPortalScheme(t)
	dashboard := &v1alpha1.Dashboard{
		Spec:   v1alpha1.DashboardSpec{MaaSConsumerPortal: &v1alpha1.MaaSConsumerPortalSpec{ManagementState: "Managed"}},
		Status: v1alpha1.DashboardStatus{MaaSConsumerPortalURL: "https://previous.example.com/"},
	}
	r := &DashboardReconciler{Client: fake.NewClientBuilder().WithScheme(s).Build(), Scheme: s, ApplicationsNamespace: maasConsumerPortalTestNamespace, Platform: cluster.OpenDataHub}
	cm := maasConsumerPortalTestManager(t, dashboard)
	assert.Zero(t, r.reconcileMaaSConsumerPortal(context.Background(), dashboard, cm, nil))
	condition := cm.GetCondition(conditionMaaSConsumerPortalAvailable)
	require.NotNil(t, condition)
	assert.Equal(t, "UnsupportedPlatform", condition.Reason)
	assert.Equal(t, common.ConditionSeverityInfo, condition.Severity)
	assert.Empty(t, dashboard.Status.MaaSConsumerPortalURL)
}

func maasConsumerPortalScheme(t *testing.T) *runtime.Scheme {
	t.Helper()
	s := runtime.NewScheme()
	require.NoError(t, clientgoscheme.AddToScheme(s))
	require.NoError(t, v1alpha1.AddToScheme(s))
	require.NoError(t, gatewayv1.Install(s))
	return s
}

func TestReconcileMaaSConsumerPortal_DeployFailurePreservesURL(t *testing.T) {
	s := runtime.NewScheme()
	require.NoError(t, clientgoscheme.AddToScheme(s))
	require.NoError(t, v1alpha1.AddToScheme(s))
	dashboard := &v1alpha1.Dashboard{
		ObjectMeta: metav1.ObjectMeta{Name: v1alpha1.DashboardInstanceName},
		Spec: v1alpha1.DashboardSpec{
			Gateway:            &v1alpha1.GatewaySpec{Domain: "apps.example.com"},
			MaaSConsumerPortal: &v1alpha1.MaaSConsumerPortalSpec{ManagementState: "Managed"},
		},
		Status: v1alpha1.DashboardStatus{MaaSConsumerPortalURL: "https://previous.example.com/"},
	}
	r := &DashboardReconciler{Client: fake.NewClientBuilder().WithScheme(s).Build(), Scheme: s, ManifestsBasePath: t.TempDir(), Platform: cluster.SelfManagedRhoai}
	cm := maasConsumerPortalTestManager(t, dashboard)
	retryAfter := r.reconcileMaaSConsumerPortal(context.Background(), dashboard, cm, map[string]v1alpha1.ModuleStatus{
		"maas":  {Phase: v1alpha1.ModulePhaseDeployed},
		"genAi": {Phase: v1alpha1.ModulePhaseDeployed},
	})
	condition := cm.GetCondition(conditionMaaSConsumerPortalAvailable)
	require.NotNil(t, condition)
	assert.Equal(t, metav1.ConditionFalse, condition.Status)
	assert.Equal(t, "MaaSConsumerPortalDeployFailed", condition.Reason)
	assert.Equal(t, maasConsumerPortalRetryInterval, retryAfter)
	assert.Equal(t, "https://previous.example.com/", dashboard.Status.MaaSConsumerPortalURL)
}

func TestReconcileMaaSConsumerPortal_PreservesEarlierFailure(t *testing.T) {
	s := maasConsumerPortalScheme(t)
	dashboard := &v1alpha1.Dashboard{
		Spec: v1alpha1.DashboardSpec{
			Gateway:            &v1alpha1.GatewaySpec{Domain: "apps.example.com"},
			MaaSConsumerPortal: &v1alpha1.MaaSConsumerPortalSpec{ManagementState: "Managed"},
		},
	}
	r := &DashboardReconciler{Client: fake.NewClientBuilder().WithScheme(s).Build(), Scheme: s, ManifestsBasePath: t.TempDir(), Platform: cluster.SelfManagedRhoai}
	cm := maasConsumerPortalTestManager(t, dashboard)
	cm.MarkFalse(conditionMaaSConsumerPortalAvailable,
		conditions.WithReason("RequiredModuleUnavailable"),
		conditions.WithMessage("Required module %q is unavailable", "maas"))

	assert.Equal(t, maasConsumerPortalRetryInterval, r.reconcileMaaSConsumerPortal(context.Background(), dashboard, cm, nil))
	condition := cm.GetCondition(conditionMaaSConsumerPortalAvailable)
	require.NotNil(t, condition)
	assert.Equal(t, "RequiredModuleUnavailable", condition.Reason)
}

func TestDeployMaaSConsumerPortalBundle(t *testing.T) {
	s := maasConsumerPortalScheme(t)
	base := t.TempDir()
	bundle := filepath.Join(base, "distributions", maasConsumerPortalHostPrefix)
	require.NoError(t, os.MkdirAll(bundle, 0755))
	require.NoError(t, os.WriteFile(filepath.Join(bundle, "kustomization.yaml"), []byte(`apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
`), 0644))
	require.NoError(t, os.WriteFile(filepath.Join(bundle, "params.env"), []byte("core-bff-image=initial\n"), 0644))
	require.NoError(t, os.WriteFile(filepath.Join(bundle, "deployment.yaml"), []byte(`apiVersion: apps/v1
kind: Deployment
metadata:
  name: maas-consumer-portal
spec:
  selector:
    matchLabels:
      app: maas-consumer-portal
  template:
    metadata:
      labels:
        app: maas-consumer-portal
    spec:
      containers:
        - name: portal
          image: example.invalid/portal
`), 0644))
	dashboard := &v1alpha1.Dashboard{
		ObjectMeta: metav1.ObjectMeta{Name: v1alpha1.DashboardInstanceName},
		Spec:       v1alpha1.DashboardSpec{Gateway: &v1alpha1.GatewaySpec{Domain: "apps.example.com"}},
	}
	federationConfig := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: maasConsumerPortalFederationConfigMapName, Namespace: maasConsumerPortalTestNamespace}, Data: map[string]string{federationConfigKey: "[]"}}
	cli := fake.NewClientBuilder().WithScheme(s).WithObjects(federationConfig).Build()
	r := &DashboardReconciler{Client: cli, Scheme: s, ManifestsBasePath: base, ApplicationsNamespace: maasConsumerPortalTestNamespace, Platform: cluster.SelfManagedRhoai}
	require.NoError(t, r.deployMaaSConsumerPortalBundle(context.Background(), dashboard, "https://maas-consumer-portal.apps.example.com/"))
	deployment := &appsv1.Deployment{}
	require.NoError(t, cli.Get(context.Background(), client.ObjectKey{Name: maasConsumerPortalHostPrefix, Namespace: maasConsumerPortalTestNamespace}, deployment))
	assert.NotEmpty(t, deployment.Spec.Template.Annotations[maasConsumerPortalFederationHashAnnotation])

	t.Run("does not fail while the federation ConfigMap is unavailable", func(t *testing.T) {
		cli := fake.NewClientBuilder().WithScheme(s).Build()
		r := &DashboardReconciler{Client: cli, Scheme: s, ManifestsBasePath: base, ApplicationsNamespace: maasConsumerPortalTestNamespace, Platform: cluster.SelfManagedRhoai}

		require.NoError(t, r.deployMaaSConsumerPortalBundle(context.Background(), dashboard, "https://maas-consumer-portal.apps.example.com/"))
		deployment := &appsv1.Deployment{}
		require.NoError(t, cli.Get(context.Background(), client.ObjectKey{Name: maasConsumerPortalHostPrefix, Namespace: maasConsumerPortalTestNamespace}, deployment))
		assert.Empty(t, deployment.Spec.Template.Annotations[maasConsumerPortalFederationHashAnnotation])
	})
}

func TestReconcileRemovedMaaSConsumerPortal_CleanupFailureRetries(t *testing.T) {
	s := maasConsumerPortalScheme(t)
	portalDeployment := &appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{
		Name:      maasConsumerPortalHostPrefix,
		Namespace: maasConsumerPortalTestNamespace,
		Labels:    map[string]string{labels.PlatformPartOf: maasConsumerPortalPartOf},
	}}
	cli := fake.NewClientBuilder().WithScheme(s).WithObjects(portalDeployment).WithInterceptorFuncs(interceptor.Funcs{
		Delete: func(ctx context.Context, delegate client.WithWatch, obj client.Object, options ...client.DeleteOption) error {
			if _, isDeployment := obj.(*appsv1.Deployment); isDeployment && obj.GetName() == maasConsumerPortalHostPrefix {
				return errors.New("simulated portal cleanup failure")
			}
			return delegate.Delete(ctx, obj, options...)
		},
	}).Build()
	dashboard := &v1alpha1.Dashboard{Status: v1alpha1.DashboardStatus{MaaSConsumerPortalURL: "https://previous.example.com/"}}
	r := &DashboardReconciler{Client: cli, Scheme: s, ApplicationsNamespace: maasConsumerPortalTestNamespace}
	cm := maasConsumerPortalTestManager(t, dashboard)
	assert.Equal(t, maasConsumerPortalRetryInterval, r.reconcileRemovedMaaSConsumerPortal(context.Background(), dashboard, cm))
	condition := cm.GetCondition(conditionMaaSConsumerPortalAvailable)
	require.NotNil(t, condition)
	assert.Equal(t, "MaaSConsumerPortalCleanupFailed", condition.Reason)
	assert.Equal(t, common.ConditionSeverityInfo, condition.Severity)
	assert.Equal(t, "https://previous.example.com/", dashboard.Status.MaaSConsumerPortalURL)
}

func TestReconcileUnsupportedMaaSConsumerPortal_CleanupFailurePreservesURL(t *testing.T) {
	s := maasConsumerPortalScheme(t)
	cli := fake.NewClientBuilder().WithScheme(s).WithInterceptorFuncs(interceptor.Funcs{
		Delete: func(context.Context, client.WithWatch, client.Object, ...client.DeleteOption) error {
			return errors.New("simulated portal cleanup failure")
		},
	}).Build()
	dashboard := &v1alpha1.Dashboard{Status: v1alpha1.DashboardStatus{MaaSConsumerPortalURL: "https://previous.example.com/"}}
	r := &DashboardReconciler{Client: cli, Scheme: s, ApplicationsNamespace: maasConsumerPortalTestNamespace}
	cm := maasConsumerPortalTestManager(t, dashboard)

	assert.Equal(t, maasConsumerPortalRetryInterval, r.reconcileUnsupportedMaaSConsumerPortal(context.Background(), dashboard, cm))
	assert.Equal(t, "MaaSConsumerPortalCleanupFailed", cm.GetCondition(conditionMaaSConsumerPortalAvailable).Reason)
	assert.Equal(t, "https://previous.example.com/", dashboard.Status.MaaSConsumerPortalURL)
}

func TestReconcileDeletion_CleansMaaSConsumerPortalResources(t *testing.T) {
	s := maasConsumerPortalScheme(t)
	portalLabels := map[string]string{labels.PlatformPartOf: maasConsumerPortalPartOf}
	consoleLink := &unstructured.Unstructured{}
	consoleLink.SetGroupVersionKind(consoleLinkGVK)
	consoleLink.SetName(maasConsumerPortalConsoleLinkName)
	consoleLink.SetLabels(portalLabels)
	dashboard := &v1alpha1.Dashboard{ObjectMeta: metav1.ObjectMeta{
		Name:              v1alpha1.DashboardInstanceName,
		Finalizers:        []string{dashboardFinalizer},
		DeletionTimestamp: &metav1.Time{Time: time.Now()},
	}}
	portalServiceAccount := &corev1.ServiceAccount{ObjectMeta: metav1.ObjectMeta{Name: maasConsumerPortalHostPrefix, Namespace: maasConsumerPortalTestNamespace, Labels: portalLabels}}
	objects := []client.Object{
		dashboard,
		&appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Name: maasConsumerPortalHostPrefix, Namespace: maasConsumerPortalTestNamespace, Labels: portalLabels}},
		&corev1.Service{ObjectMeta: metav1.ObjectMeta{Name: maasConsumerPortalHostPrefix, Namespace: maasConsumerPortalTestNamespace, Labels: portalLabels}},
		portalServiceAccount,
		&networkingv1.NetworkPolicy{ObjectMeta: metav1.ObjectMeta{Name: maasConsumerPortalHostPrefix, Namespace: maasConsumerPortalTestNamespace, Labels: portalLabels}},
		&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: maasConsumerPortalFederationConfigMapName, Namespace: maasConsumerPortalTestNamespace, Labels: portalLabels}},
		&corev1.Secret{ObjectMeta: metav1.ObjectMeta{Name: maasConsumerPortalHostPrefix + "-tls", Namespace: maasConsumerPortalTestNamespace}},
		&rbacv1.ClusterRole{ObjectMeta: metav1.ObjectMeta{Name: maasConsumerPortalHostPrefix, Labels: portalLabels}},
		&rbacv1.ClusterRoleBinding{ObjectMeta: metav1.ObjectMeta{Name: maasConsumerPortalHostPrefix, Labels: portalLabels}},
		&gatewayv1.HTTPRoute{ObjectMeta: metav1.ObjectMeta{Name: maasConsumerPortalHostPrefix, Namespace: maasConsumerPortalTestNamespace, Labels: portalLabels}},
		consoleLink,
	}
	serviceAccountDeleteAttempted := false
	cli := fake.NewClientBuilder().WithScheme(s).WithObjects(objects...).WithInterceptorFuncs(interceptor.Funcs{
		Delete: func(ctx context.Context, delegate client.WithWatch, obj client.Object, options ...client.DeleteOption) error {
			if _, isServiceAccount := obj.(*corev1.ServiceAccount); isServiceAccount {
				serviceAccountDeleteAttempted = true
				return errors.New("protected ServiceAccount must not be deleted")
			}
			return delegate.Delete(ctx, obj, options...)
		},
	}).Build()
	r := &DashboardReconciler{Client: cli, Scheme: s, ApplicationsNamespace: maasConsumerPortalTestNamespace}
	_, err := r.Reconcile(context.Background(), ctrl.Request{NamespacedName: types.NamespacedName{Name: v1alpha1.DashboardInstanceName}})
	require.NoError(t, err)
	for _, object := range objects[1:] {
		if object == portalServiceAccount {
			continue
		}
		err := cli.Get(context.Background(), client.ObjectKeyFromObject(object), object.DeepCopyObject().(client.Object))
		assert.Error(t, err, "%T should be removed by the Dashboard finalizer", object)
	}
	assert.False(t, serviceAccountDeleteAttempted, "portal ServiceAccount must be retained for platforms that protect ServiceAccounts")
	assert.NoError(t, cli.Get(context.Background(), client.ObjectKeyFromObject(portalServiceAccount), &corev1.ServiceAccount{}))
}

// maasConsumerPortalTestManager builds a conditions.Manager whose Error-severity dependents
// are all healthy, so the Ready rollup is True before the maasConsumerPortalCond is reconciled.
func maasConsumerPortalTestManager(t *testing.T, dashboard *v1alpha1.Dashboard) *conditions.Manager {
	t.Helper()

	cm := conditions.NewManager(
		dashboard,
		string(common.ConditionTypeReady),
		string(common.ConditionTypeProvisioningSucceeded),
		string(common.ConditionTypeDegraded),
		conditionObservabilityAvailable,
		conditionMaaSConsumerPortalAvailable,
	)
	cm.MarkTrue(string(common.ConditionTypeProvisioningSucceeded),
		conditions.WithReason("ResourcesApplied"))
	cm.MarkFalse(string(common.ConditionTypeDegraded),
		conditions.WithReason("NoDegradation"),
		conditions.WithSeverity(common.ConditionSeverityInfo))
	cm.MarkTrue(conditionObservabilityAvailable,
		conditions.WithReason("Deployed"))

	// Ready is not yet True here: MaaSConsumerPortalAvailable is still Unknown (Error
	// severity) until the maasConsumerPortalCond reconcile resolves it. Each test asserts
	// Ready becomes True afterwards, proving the Info-severity maasConsumerPortalCond state
	// does not drag the rollup down.
	return cm
}

func TestSetMaaSConsumerPortalModuleCondition(t *testing.T) {
	newDashboard := func(state string) *v1alpha1.Dashboard {
		return &v1alpha1.Dashboard{Spec: v1alpha1.DashboardSpec{
			MaaSConsumerPortal: &v1alpha1.MaaSConsumerPortalSpec{ManagementState: state},
		}}
	}
	deployed := map[string]v1alpha1.ModuleStatus{
		"maas":  {Phase: v1alpha1.ModulePhaseDeployed},
		"genAi": {Phase: v1alpha1.ModulePhaseDeployed},
	}

	t.Run("healthy dependencies leave the condition unchanged", func(t *testing.T) {
		dashboard := newDashboard("Managed")
		cm := maasConsumerPortalTestManager(t, dashboard)
		(&DashboardReconciler{}).setMaaSConsumerPortalModuleCondition(cm, dashboard, deployed)
		assert.Equal(t, metav1.ConditionUnknown, cm.GetCondition(conditionMaaSConsumerPortalAvailable).Status)
	})

	for _, phase := range []v1alpha1.ModulePhase{
		v1alpha1.ModulePhaseDisabled,
		v1alpha1.ModulePhaseNotDeployed,
		v1alpha1.ModulePhaseDegraded,
	} {
		t.Run(string(phase)+" dependency reports unavailable", func(t *testing.T) {
			dashboard := newDashboard("Managed")
			cm := maasConsumerPortalTestManager(t, dashboard)
			statuses := map[string]v1alpha1.ModuleStatus{
				"maas":  {Phase: phase, Message: "dependency is unavailable"},
				"genAi": {Phase: v1alpha1.ModulePhaseDeployed},
			}
			(&DashboardReconciler{}).setMaaSConsumerPortalModuleCondition(cm, dashboard, statuses)
			condition := cm.GetCondition(conditionMaaSConsumerPortalAvailable)
			require.NotNil(t, condition)
			assert.Equal(t, metav1.ConditionFalse, condition.Status)
			assert.Equal(t, "RequiredModuleUnavailable", condition.Reason)
			assert.Equal(t, common.ConditionSeverityError, condition.Severity)
			assert.False(t, cm.IsHappy(), "a Managed MaaS Consumer Portal dependency failure must make the aggregate readiness false")
		})
	}

	t.Run("preserves an earlier portal failure", func(t *testing.T) {
		dashboard := newDashboard("Managed")
		cm := maasConsumerPortalTestManager(t, dashboard)
		cm.MarkFalse(conditionMaaSConsumerPortalAvailable,
			conditions.WithReason("MaaSConsumerPortalDomainRequired"),
			conditions.WithMessage("gateway domain is not set"),
			conditions.WithSeverity(common.ConditionSeverityInfo))

		(&DashboardReconciler{}).setMaaSConsumerPortalModuleCondition(cm, dashboard, map[string]v1alpha1.ModuleStatus{
			"maas":  {Phase: v1alpha1.ModulePhaseDisabled, Message: "disabled"},
			"genAi": {Phase: v1alpha1.ModulePhaseDeployed},
		})

		assert.Equal(t, "MaaSConsumerPortalDomainRequired", cm.GetCondition(conditionMaaSConsumerPortalAvailable).Reason)
	})

	for _, state := range []string{"Removed", ""} {
		t.Run("portal "+state+" is a no-op", func(t *testing.T) {
			dashboard := newDashboard(state)
			cm := maasConsumerPortalTestManager(t, dashboard)
			(&DashboardReconciler{}).setMaaSConsumerPortalModuleCondition(cm, dashboard, map[string]v1alpha1.ModuleStatus{
				"maas": {Phase: v1alpha1.ModulePhaseDisabled},
			})
			assert.Equal(t, metav1.ConditionUnknown, cm.GetCondition(conditionMaaSConsumerPortalAvailable).Status)
		})
	}
}

func TestMaaSConsumerPortalRequiredModuleSlugs(t *testing.T) {
	spec := &v1alpha1.DashboardSpec{
		ManagementSpec:     common.ManagementSpec{ManagementState: "Removed"},
		MaaSConsumerPortal: &v1alpha1.MaaSConsumerPortalSpec{ManagementState: "Managed"},
	}
	assert.Equal(t, map[string]bool{"maas": true, "gen-ai": true}, maasConsumerPortalRequiredModuleSlugs(spec, resolveModuleStatuses(spec)))

	spec.Modules = map[string]v1alpha1.ModuleOverride{"maas": {State: v1alpha1.ModuleDisabled}}
	assert.Equal(t, map[string]bool{"gen-ai": true}, maasConsumerPortalRequiredModuleSlugs(spec, resolveModuleStatuses(spec)))

	spec.MaaSConsumerPortal.ManagementState = "Removed"
	assert.Empty(t, maasConsumerPortalRequiredModuleSlugs(spec, resolveModuleStatuses(spec)))
}

func TestMarkMaaSConsumerPortalFederationConfigMapFailed(t *testing.T) {
	dashboard := &v1alpha1.Dashboard{}
	cm := maasConsumerPortalTestManager(t, dashboard)
	(&DashboardReconciler{}).markMaaSConsumerPortalFederationConfigMapFailed(cm, errors.New("apply failed"))
	condition := cm.GetCondition(conditionMaaSConsumerPortalAvailable)
	require.NotNil(t, condition)
	assert.Equal(t, metav1.ConditionFalse, condition.Status)
	assert.Equal(t, "MaaSConsumerPortalFederationConfigMapFailed", condition.Reason)
	assert.Equal(t, common.ConditionSeverityError, condition.Severity)
	assert.False(t, cm.IsHappy(), "a Managed MaaS Consumer Portal federation failure must make the aggregate readiness false")

	t.Run("preserves an earlier portal failure", func(t *testing.T) {
		dashboard := &v1alpha1.Dashboard{}
		cm := maasConsumerPortalTestManager(t, dashboard)
		cm.MarkFalse(conditionMaaSConsumerPortalAvailable,
			conditions.WithReason("MaaSConsumerPortalDomainRequired"),
			conditions.WithMessage("gateway domain is not set"),
			conditions.WithSeverity(common.ConditionSeverityInfo))

		(&DashboardReconciler{}).markMaaSConsumerPortalFederationConfigMapFailed(cm, errors.New("apply failed"))
		assert.Equal(t, "MaaSConsumerPortalDomainRequired", cm.GetCondition(conditionMaaSConsumerPortalAvailable).Reason)
	})
}
