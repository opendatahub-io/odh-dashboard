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

const maasPortalTestNamespace = "maas-portal-test"

func TestMaaSPortalAvailabilityHelpers(t *testing.T) {
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

func TestMaaSPortalPersesNamespace(t *testing.T) {
	tests := []struct {
		name                  string
		platform              cluster.Platform
		applicationsNamespace string
		observability         *v1alpha1.ObservabilitySpec
		want                  string
	}{
		{
			name:                  "uses the configured Perses service namespace",
			platform:              cluster.SelfManagedRhoai,
			applicationsNamespace: "redhat-ods-applications",
			observability: &v1alpha1.ObservabilitySpec{
				Enabled:       true,
				PersesService: &v1alpha1.ServiceTarget{Namespace: "custom-monitoring"},
			},
			want: "custom-monitoring",
		},
		{
			name:                  "uses RHOAI monitoring namespace when not configured",
			platform:              cluster.SelfManagedRhoai,
			applicationsNamespace: "redhat-ods-applications",
			want:                  "redhat-ods-monitoring",
		},
		{
			name:                  "uses ODH applications namespace when not configured",
			platform:              cluster.OpenDataHub,
			applicationsNamespace: "opendatahub",
			want:                  "opendatahub",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &DashboardReconciler{Platform: tt.platform, ApplicationsNamespace: tt.applicationsNamespace}
			dashboard := &v1alpha1.Dashboard{Spec: v1alpha1.DashboardSpec{Observability: tt.observability}}
			assert.Equal(t, tt.want, r.maasPortalPersesNamespace(dashboard))
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

func TestReconcileMaaSPortalAvailability(t *testing.T) {
	readyRoute := &gatewayv1.HTTPRoute{
		ObjectMeta: metav1.ObjectMeta{Name: maasPortalDeploymentName, Namespace: maasPortalTestNamespace},
		Status: gatewayv1.HTTPRouteStatus{RouteStatus: gatewayv1.RouteStatus{Parents: []gatewayv1.RouteParentStatus{{Conditions: []metav1.Condition{
			{Type: string(gatewayv1.RouteConditionAccepted), Status: metav1.ConditionTrue},
			{Type: string(gatewayv1.RouteConditionResolvedRefs), Status: metav1.ConditionTrue},
		}}}}},
	}
	availableDeployment := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{Name: maasPortalDeploymentName, Namespace: maasPortalTestNamespace},
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
		{name: "missing route", wantReason: "MaaSConsumerPortalRouteUnavailable", wantRetry: maasPortalRetryInterval},
		{name: "route not ready", objects: []client.Object{&gatewayv1.HTTPRoute{ObjectMeta: readyRoute.ObjectMeta}}, wantReason: "MaaSConsumerPortalRouteNotReady", wantRetry: maasPortalRetryInterval},
		{name: "missing deployment", objects: []client.Object{readyRoute}, wantReason: "MaaSConsumerPortalDeploymentUnavailable", wantRetry: maasPortalRetryInterval},
		{name: "complete portal available", objects: []client.Object{readyRoute, availableDeployment}, wantReason: "Deployed"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := maasPortalScheme(t)
			dashboard := &v1alpha1.Dashboard{Spec: v1alpha1.DashboardSpec{MaaSPortal: &v1alpha1.MaaSPortalSpec{ManagementState: "Managed"}}}
			r := &DashboardReconciler{Client: fake.NewClientBuilder().WithScheme(s).WithObjects(tt.objects...).Build(), Scheme: s, ApplicationsNamespace: maasPortalTestNamespace}
			cm := maasPortalTestManager(t, dashboard)
			retryAfter := r.reconcileMaaSPortalAvailability(context.Background(), dashboard, cm, statuses)
			condition := cm.GetCondition(conditionMaaSPortalAvailable)
			require.NotNil(t, condition)
			assert.Equal(t, tt.wantReason, condition.Reason)
			assert.Equal(t, tt.wantRetry, retryAfter)
		})
	}
}

func TestReconcileMaaSPortal_UnsupportedPlatform(t *testing.T) {
	s := maasPortalScheme(t)
	dashboard := &v1alpha1.Dashboard{
		Spec: v1alpha1.DashboardSpec{MaaSPortal: &v1alpha1.MaaSPortalSpec{ManagementState: "Managed"}},
		Status: v1alpha1.DashboardStatus{
			MaaSPortalURL:         "https://previous.example.com/",
			MaaSConsumerPortalURL: "https://previous.example.com/",
		},
	}
	r := &DashboardReconciler{Client: fake.NewClientBuilder().WithScheme(s).Build(), Scheme: s, ApplicationsNamespace: maasPortalTestNamespace, Platform: cluster.OpenDataHub}
	cm := maasPortalTestManager(t, dashboard)
	assert.Zero(t, r.reconcileMaaSPortal(context.Background(), dashboard, cm, nil))
	condition := cm.GetCondition(conditionMaaSPortalAvailable)
	require.NotNil(t, condition)
	assert.Equal(t, "UnsupportedPlatform", condition.Reason)
	assert.Equal(t, common.ConditionSeverityInfo, condition.Severity)
	assert.Empty(t, dashboard.Status.MaaSPortalURL)
}

func TestReconcileMaaSPortal_MissingGatewayDomainRetries(t *testing.T) {
	s := maasPortalScheme(t)
	dashboard := &v1alpha1.Dashboard{
		Spec: v1alpha1.DashboardSpec{
			MaaSPortal: &v1alpha1.MaaSPortalSpec{ManagementState: "Managed"},
		},
		Status: v1alpha1.DashboardStatus{
			MaaSPortalURL:         "https://previous.example.com/",
			MaaSConsumerPortalURL: "https://previous.example.com/",
		},
	}
	r := &DashboardReconciler{Client: fake.NewClientBuilder().WithScheme(s).Build(), Scheme: s, ApplicationsNamespace: maasPortalTestNamespace, Platform: cluster.SelfManagedRhoai}
	cm := maasPortalTestManager(t, dashboard)

	assert.Equal(t, maasPortalRetryInterval, r.reconcileMaaSPortal(context.Background(), dashboard, cm, nil))
	condition := cm.GetCondition(conditionMaaSPortalAvailable)
	require.NotNil(t, condition)
	assert.Equal(t, "MaaSConsumerPortalDomainRequired", condition.Reason)
	assert.Equal(t, "https://previous.example.com/", dashboard.Status.MaaSPortalURL)
	assert.Equal(t, "https://previous.example.com/", dashboard.Status.MaaSConsumerPortalURL)
}

func maasPortalScheme(t *testing.T) *runtime.Scheme {
	t.Helper()
	s := runtime.NewScheme()
	require.NoError(t, clientgoscheme.AddToScheme(s))
	require.NoError(t, v1alpha1.AddToScheme(s))
	require.NoError(t, gatewayv1.Install(s))
	return s
}

func TestReconcileMaaSPortal_DeployFailurePreservesURL(t *testing.T) {
	s := runtime.NewScheme()
	require.NoError(t, clientgoscheme.AddToScheme(s))
	require.NoError(t, v1alpha1.AddToScheme(s))
	dashboard := &v1alpha1.Dashboard{
		ObjectMeta: metav1.ObjectMeta{Name: v1alpha1.DashboardInstanceName},
		Spec: v1alpha1.DashboardSpec{
			Gateway:    &v1alpha1.GatewaySpec{Domain: "apps.example.com"},
			MaaSPortal: &v1alpha1.MaaSPortalSpec{ManagementState: "Managed"},
		},
		Status: v1alpha1.DashboardStatus{
			MaaSPortalURL:         "https://previous.example.com/",
			MaaSConsumerPortalURL: "https://previous.example.com/",
		},
	}
	r := &DashboardReconciler{Client: fake.NewClientBuilder().WithScheme(s).Build(), Scheme: s, ManifestsBasePath: t.TempDir(), Platform: cluster.SelfManagedRhoai}
	cm := maasPortalTestManager(t, dashboard)
	retryAfter := r.reconcileMaaSPortal(context.Background(), dashboard, cm, map[string]v1alpha1.ModuleStatus{
		"maas":  {Phase: v1alpha1.ModulePhaseDeployed},
		"genAi": {Phase: v1alpha1.ModulePhaseDeployed},
	})
	condition := cm.GetCondition(conditionMaaSPortalAvailable)
	require.NotNil(t, condition)
	assert.Equal(t, metav1.ConditionFalse, condition.Status)
	assert.Equal(t, "MaaSConsumerPortalDeployFailed", condition.Reason)
	assert.Equal(t, maasPortalRetryInterval, retryAfter)
	assert.Equal(t, "https://previous.example.com/", dashboard.Status.MaaSPortalURL)
	assert.Equal(t, "https://previous.example.com/", dashboard.Status.MaaSConsumerPortalURL)
}

func TestReconcileMaaSPortal_PreservesEarlierFailure(t *testing.T) {
	s := maasPortalScheme(t)
	dashboard := &v1alpha1.Dashboard{
		Spec: v1alpha1.DashboardSpec{
			Gateway:    &v1alpha1.GatewaySpec{Domain: "apps.example.com"},
			MaaSPortal: &v1alpha1.MaaSPortalSpec{ManagementState: "Managed"},
		},
	}
	r := &DashboardReconciler{Client: fake.NewClientBuilder().WithScheme(s).Build(), Scheme: s, ManifestsBasePath: t.TempDir(), Platform: cluster.SelfManagedRhoai}
	cm := maasPortalTestManager(t, dashboard)
	cm.MarkFalse(conditionMaaSPortalAvailable,
		conditions.WithReason("RequiredModuleUnavailable"),
		conditions.WithMessage("Required module %q is unavailable", "maas"))

	assert.Equal(t, maasPortalRetryInterval, r.reconcileMaaSPortal(context.Background(), dashboard, cm, nil))
	condition := cm.GetCondition(conditionMaaSPortalAvailable)
	require.NotNil(t, condition)
	assert.Equal(t, "RequiredModuleUnavailable", condition.Reason)
}

func TestDeployMaaSPortalBundle(t *testing.T) {
	s := maasPortalScheme(t)
	base := t.TempDir()
	bundle := filepath.Join(base, "distributions", maasPortalDeploymentName)
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
  name: maas-portal
spec:
  selector:
    matchLabels:
      app: maas-portal
  template:
    metadata:
      labels:
        app: maas-portal
    spec:
      containers:
        - name: portal
          image: example.invalid/portal
`), 0644))
	dashboard := &v1alpha1.Dashboard{
		ObjectMeta: metav1.ObjectMeta{Name: v1alpha1.DashboardInstanceName},
		Spec:       v1alpha1.DashboardSpec{Gateway: &v1alpha1.GatewaySpec{Domain: "apps.example.com"}},
	}
	federationConfig := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: maasPortalFederationConfigMapName, Namespace: maasPortalTestNamespace}, Data: map[string]string{federationConfigKey: "[]"}}
	cli := fake.NewClientBuilder().WithScheme(s).WithObjects(federationConfig).Build()
	r := &DashboardReconciler{Client: cli, Scheme: s, ManifestsBasePath: base, ApplicationsNamespace: maasPortalTestNamespace, Platform: cluster.SelfManagedRhoai}
	result, err := r.deployMaaSPortalBundle(context.Background(), dashboard)
	require.NoError(t, err)
	assert.False(t, result.Pending)
	deployment := &appsv1.Deployment{}
	require.NoError(t, cli.Get(context.Background(), client.ObjectKey{Name: maasPortalDeploymentName, Namespace: maasPortalTestNamespace}, deployment))
	assert.NotEmpty(t, deployment.Spec.Template.Annotations[maasPortalFederationHashAnnotation])

	t.Run("does not fail while the federation ConfigMap is unavailable", func(t *testing.T) {
		cli := fake.NewClientBuilder().WithScheme(s).Build()
		r := &DashboardReconciler{Client: cli, Scheme: s, ManifestsBasePath: base, ApplicationsNamespace: maasPortalTestNamespace, Platform: cluster.SelfManagedRhoai}

		result, err := r.deployMaaSPortalBundle(context.Background(), dashboard)
		require.NoError(t, err)
		assert.False(t, result.Pending)
		deployment := &appsv1.Deployment{}
		require.NoError(t, cli.Get(context.Background(), client.ObjectKey{Name: maasPortalDeploymentName, Namespace: maasPortalTestNamespace}, deployment))
		assert.Empty(t, deployment.Spec.Template.Annotations[maasPortalFederationHashAnnotation])
	})
}

func TestReconcileRemovedMaaSPortal_CleanupFailureRetries(t *testing.T) {
	s := maasPortalScheme(t)
	portalDeployment := &appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{
		Name:      maasPortalDeploymentName,
		Namespace: maasPortalTestNamespace,
		Labels:    map[string]string{labels.PlatformPartOf: maasPortalPartOf},
	}}
	cli := fake.NewClientBuilder().WithScheme(s).WithObjects(portalDeployment).WithInterceptorFuncs(interceptor.Funcs{
		Delete: func(ctx context.Context, delegate client.WithWatch, obj client.Object, options ...client.DeleteOption) error {
			if _, isDeployment := obj.(*appsv1.Deployment); isDeployment && obj.GetName() == maasPortalDeploymentName {
				return errors.New("simulated portal cleanup failure")
			}
			return delegate.Delete(ctx, obj, options...)
		},
	}).Build()
	dashboard := &v1alpha1.Dashboard{Status: v1alpha1.DashboardStatus{
		MaaSPortalURL:         "https://previous.example.com/",
		MaaSConsumerPortalURL: "https://previous.example.com/",
	}}
	r := &DashboardReconciler{Client: cli, Scheme: s, ApplicationsNamespace: maasPortalTestNamespace}
	cm := maasPortalTestManager(t, dashboard)
	assert.Equal(t, maasPortalRetryInterval, r.reconcileRemovedMaaSPortal(context.Background(), dashboard, cm))
	condition := cm.GetCondition(conditionMaaSPortalAvailable)
	require.NotNil(t, condition)
	assert.Equal(t, "MaaSConsumerPortalCleanupFailed", condition.Reason)
	assert.Equal(t, common.ConditionSeverityInfo, condition.Severity)
	assert.Equal(t, "https://previous.example.com/", dashboard.Status.MaaSPortalURL)
	assert.Equal(t, "https://previous.example.com/", dashboard.Status.MaaSConsumerPortalURL)
}

func TestReconcileMaaSPortal_LegacyCleanupPendingKeepsAvailable(t *testing.T) {
	for _, previousURL := range []string{"", "https://previous.example.com/"} {
		t.Run("previous URL="+previousURL, func(t *testing.T) {
			ctx := context.Background()
			dashboard := &v1alpha1.Dashboard{
				ObjectMeta: metav1.ObjectMeta{Name: v1alpha1.DashboardInstanceName},
				Spec: v1alpha1.DashboardSpec{
					Gateway: &v1alpha1.GatewaySpec{Domain: "apps.example.com"}, MaaSPortal: &v1alpha1.MaaSPortalSpec{ManagementState: "Managed"},
				},
				Status: v1alpha1.DashboardStatus{MaaSPortalURL: previousURL, MaaSConsumerPortalURL: previousURL},
			}
			route := &gatewayv1.HTTPRoute{ObjectMeta: metav1.ObjectMeta{Name: maasPortalDeploymentName, Namespace: maasPortalTestNamespace, Generation: 1}}
			route.Status.Parents = []gatewayv1.RouteParentStatus{{Conditions: []metav1.Condition{
				{Type: string(gatewayv1.RouteConditionAccepted), Status: metav1.ConditionTrue, ObservedGeneration: 1},
				{Type: string(gatewayv1.RouteConditionResolvedRefs), Status: metav1.ConditionTrue, ObservedGeneration: 1},
			}}}
			secret := &corev1.Secret{ObjectMeta: metav1.ObjectMeta{Name: legacyMaaSPortalName + "-tls", Namespace: maasPortalTestNamespace, Finalizers: []string{"test/hold-secret"}}}
			cli := fake.NewClientBuilder().WithScheme(maasPortalScheme(t)).WithObjects(migrationReadyDeployment(), migrationFederationConfig(), route, secret).Build()
			r := &DashboardReconciler{Client: cli, ApplicationsNamespace: maasPortalTestNamespace, Platform: cluster.SelfManagedRhoai, ManifestsBasePath: writeMaaSPortalSubscriptionTestManifest(t)}
			statuses := map[string]v1alpha1.ModuleStatus{"maas": {Phase: v1alpha1.ModulePhaseDeployed}, "genAi": {Phase: v1alpha1.ModulePhaseDeployed}}
			cm := maasPortalTestManager(t, dashboard)
			assert.Equal(t, maasPortalRetryInterval, r.reconcileMaaSPortal(ctx, dashboard, cm, statuses))
			condition := cm.GetCondition(conditionMaaSPortalAvailable)
			require.NotNil(t, condition)
			assert.Equal(t, metav1.ConditionTrue, condition.Status)
			assert.Equal(t, "Deployed", condition.Reason)
			assert.Equal(t, "https://apps.example.com/maas-consumer-portal/", dashboard.Status.MaaSPortalURL)
			assert.Equal(t, dashboard.Status.MaaSPortalURL, dashboard.Status.MaaSConsumerPortalURL)
			require.NoError(t, cli.Get(ctx, client.ObjectKeyFromObject(secret), secret))
			require.NotNil(t, secret.DeletionTimestamp)
			secret.Finalizers = nil
			require.NoError(t, cli.Update(ctx, secret))
			cm = maasPortalTestManager(t, dashboard)
			cm.ClearCondition(conditionMaaSPortalAvailable) // Reconcile resets availability at the start of each cycle.
			assert.Zero(t, r.reconcileMaaSPortal(ctx, dashboard, cm, statuses))
			assert.Equal(t, metav1.ConditionTrue, cm.GetCondition(conditionMaaSPortalAvailable).Status)
			assert.Equal(t, "https://apps.example.com/maas-consumer-portal/", dashboard.Status.MaaSPortalURL)
			assert.Equal(t, dashboard.Status.MaaSPortalURL, dashboard.Status.MaaSConsumerPortalURL)
		})
	}
}

func TestReconcileUnsupportedMaaSPortal_CleanupFailurePreservesURL(t *testing.T) {
	s := maasPortalScheme(t)
	cli := fake.NewClientBuilder().WithScheme(s).WithInterceptorFuncs(interceptor.Funcs{
		Delete: func(context.Context, client.WithWatch, client.Object, ...client.DeleteOption) error {
			return errors.New("simulated portal cleanup failure")
		},
	}).Build()
	dashboard := &v1alpha1.Dashboard{Status: v1alpha1.DashboardStatus{
		MaaSPortalURL:         "https://previous.example.com/",
		MaaSConsumerPortalURL: "https://previous.example.com/",
	}}
	r := &DashboardReconciler{Client: cli, Scheme: s, ApplicationsNamespace: maasPortalTestNamespace}
	cm := maasPortalTestManager(t, dashboard)

	assert.Equal(t, maasPortalRetryInterval, r.reconcileUnsupportedMaaSPortal(context.Background(), dashboard, cm))
	assert.Equal(t, "MaaSConsumerPortalCleanupFailed", cm.GetCondition(conditionMaaSPortalAvailable).Reason)
	assert.Equal(t, "https://previous.example.com/", dashboard.Status.MaaSPortalURL)
	assert.Equal(t, "https://previous.example.com/", dashboard.Status.MaaSConsumerPortalURL)
}

func TestReconcileDeletion_CleansMaaSPortalResources(t *testing.T) {
	s := maasPortalScheme(t)
	portalLabels := map[string]string{labels.PlatformPartOf: maasPortalPartOf}
	dashboard := &v1alpha1.Dashboard{ObjectMeta: metav1.ObjectMeta{
		Name:              v1alpha1.DashboardInstanceName,
		Finalizers:        []string{dashboardFinalizer},
		DeletionTimestamp: &metav1.Time{Time: time.Now()},
	}}
	portalServiceAccount := &corev1.ServiceAccount{ObjectMeta: metav1.ObjectMeta{Name: maasPortalDeploymentName, Namespace: maasPortalTestNamespace, Labels: portalLabels}}
	operatorNamespaces := []client.Object{
		&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "redhat-ods-operator"}},
		&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "opendatahub-operator"}},
	}
	objects := []client.Object{
		dashboard,
		&appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Name: maasPortalDeploymentName, Namespace: maasPortalTestNamespace, Labels: portalLabels}},
		&corev1.Service{ObjectMeta: metav1.ObjectMeta{Name: maasPortalDeploymentName, Namespace: maasPortalTestNamespace, Labels: portalLabels}},
		portalServiceAccount,
		&networkingv1.NetworkPolicy{ObjectMeta: metav1.ObjectMeta{Name: maasPortalDeploymentName, Namespace: maasPortalTestNamespace, Labels: portalLabels}},
		&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: maasPortalFederationConfigMapName, Namespace: maasPortalTestNamespace, Labels: portalLabels}},
		&corev1.Secret{ObjectMeta: metav1.ObjectMeta{Name: maasPortalDeploymentName + "-tls", Namespace: maasPortalTestNamespace}},
		&rbacv1.ClusterRole{ObjectMeta: metav1.ObjectMeta{Name: maasPortalDeploymentName, Labels: portalLabels}},
		&rbacv1.ClusterRoleBinding{ObjectMeta: metav1.ObjectMeta{Name: maasPortalDeploymentName, Labels: portalLabels}},
		&rbacv1.Role{ObjectMeta: metav1.ObjectMeta{Name: "maas-portal-rhods-operator-subscription", Namespace: "redhat-ods-operator", Labels: portalLabels}},
		&rbacv1.RoleBinding{ObjectMeta: metav1.ObjectMeta{Name: "maas-portal-rhods-operator-subscription", Namespace: "redhat-ods-operator", Labels: portalLabels}},
		&rbacv1.Role{ObjectMeta: metav1.ObjectMeta{Name: "maas-portal-opendatahub-operator-subscription", Namespace: "opendatahub-operator", Labels: portalLabels}},
		&rbacv1.RoleBinding{ObjectMeta: metav1.ObjectMeta{Name: "maas-portal-opendatahub-operator-subscription", Namespace: "opendatahub-operator", Labels: portalLabels}},
		&gatewayv1.HTTPRoute{ObjectMeta: metav1.ObjectMeta{Name: maasPortalDeploymentName, Namespace: maasPortalTestNamespace, Labels: portalLabels}},
	}
	cli := fake.NewClientBuilder().WithScheme(s).WithObjects(append(objects, operatorNamespaces...)...).Build()
	r := &DashboardReconciler{Client: cli, Scheme: s, ApplicationsNamespace: maasPortalTestNamespace}
	_, err := r.Reconcile(context.Background(), ctrl.Request{NamespacedName: types.NamespacedName{Name: v1alpha1.DashboardInstanceName}})
	require.NoError(t, err)
	for _, object := range objects[1:] {
		err := cli.Get(context.Background(), client.ObjectKeyFromObject(object), object.DeepCopyObject().(client.Object))
		assert.Error(t, err, "%T should be removed by the Dashboard finalizer", object)
	}
}

func TestDeleteLabeledMaaSPortalRBACResources_IgnoresAbsentOperatorNamespaces(t *testing.T) {
	s := maasPortalScheme(t)
	r := &DashboardReconciler{Client: fake.NewClientBuilder().WithScheme(s).Build()}

	require.NoError(t, r.deleteLabeledMaaSPortalRBACResources(context.Background()))
}

// maasPortalTestManager builds a conditions.Manager whose Error-severity dependents
// are all healthy, so the Ready rollup is True before the maasPortalCond is reconciled.
func maasPortalTestManager(t *testing.T, dashboard *v1alpha1.Dashboard) *conditions.Manager {
	t.Helper()

	cm := conditions.NewManager(
		dashboard,
		string(common.ConditionTypeReady),
		string(common.ConditionTypeProvisioningSucceeded),
		string(common.ConditionTypeDegraded),
		conditionObservabilityAvailable,
		conditionMaaSPortalAvailable,
	)
	cm.MarkTrue(string(common.ConditionTypeProvisioningSucceeded),
		conditions.WithReason("ResourcesApplied"))
	cm.MarkFalse(string(common.ConditionTypeDegraded),
		conditions.WithReason("NoDegradation"),
		conditions.WithSeverity(common.ConditionSeverityInfo))
	cm.MarkTrue(conditionObservabilityAvailable,
		conditions.WithReason("Deployed"))

	// Ready is not yet True here: MaaSPortalAvailable is still Unknown (Error
	// severity) until the maasPortalCond reconcile resolves it. Each test asserts
	// Ready becomes True afterwards, proving the Info-severity maasPortalCond state
	// does not drag the rollup down.
	return cm
}

func TestSetMaaSPortalModuleCondition(t *testing.T) {
	newDashboard := func(state string) *v1alpha1.Dashboard {
		return &v1alpha1.Dashboard{Spec: v1alpha1.DashboardSpec{
			MaaSPortal: &v1alpha1.MaaSPortalSpec{ManagementState: state},
		}}
	}
	deployed := map[string]v1alpha1.ModuleStatus{
		"maas":  {Phase: v1alpha1.ModulePhaseDeployed},
		"genAi": {Phase: v1alpha1.ModulePhaseDeployed},
	}

	t.Run("healthy dependencies leave the condition unchanged", func(t *testing.T) {
		dashboard := newDashboard("Managed")
		cm := maasPortalTestManager(t, dashboard)
		(&DashboardReconciler{}).setMaaSPortalModuleCondition(cm, dashboard, deployed)
		assert.Equal(t, metav1.ConditionUnknown, cm.GetCondition(conditionMaaSPortalAvailable).Status)
	})

	for _, phase := range []v1alpha1.ModulePhase{
		v1alpha1.ModulePhaseDisabled,
		v1alpha1.ModulePhaseNotDeployed,
		v1alpha1.ModulePhaseDegraded,
	} {
		t.Run(string(phase)+" dependency reports unavailable", func(t *testing.T) {
			dashboard := newDashboard("Managed")
			cm := maasPortalTestManager(t, dashboard)
			statuses := map[string]v1alpha1.ModuleStatus{
				"maas":  {Phase: phase, Message: "dependency is unavailable"},
				"genAi": {Phase: v1alpha1.ModulePhaseDeployed},
			}
			(&DashboardReconciler{}).setMaaSPortalModuleCondition(cm, dashboard, statuses)
			condition := cm.GetCondition(conditionMaaSPortalAvailable)
			require.NotNil(t, condition)
			assert.Equal(t, metav1.ConditionFalse, condition.Status)
			assert.Equal(t, "RequiredModuleUnavailable", condition.Reason)
			assert.Equal(t, common.ConditionSeverityError, condition.Severity)
			assert.False(t, cm.IsHappy(), "a Managed MaaS Portal dependency failure must make the aggregate readiness false")
		})
	}

	t.Run("preserves an earlier portal failure", func(t *testing.T) {
		dashboard := newDashboard("Managed")
		cm := maasPortalTestManager(t, dashboard)
		cm.MarkFalse(conditionMaaSPortalAvailable,
			conditions.WithReason("MaaSConsumerPortalDomainRequired"),
			conditions.WithMessage("gateway domain is not set"),
			conditions.WithSeverity(common.ConditionSeverityInfo))

		(&DashboardReconciler{}).setMaaSPortalModuleCondition(cm, dashboard, map[string]v1alpha1.ModuleStatus{
			"maas":  {Phase: v1alpha1.ModulePhaseDisabled, Message: "disabled"},
			"genAi": {Phase: v1alpha1.ModulePhaseDeployed},
		})

		assert.Equal(t, "MaaSConsumerPortalDomainRequired", cm.GetCondition(conditionMaaSPortalAvailable).Reason)
	})

	for _, state := range []string{"Removed", ""} {
		t.Run("portal "+state+" is a no-op", func(t *testing.T) {
			dashboard := newDashboard(state)
			cm := maasPortalTestManager(t, dashboard)
			(&DashboardReconciler{}).setMaaSPortalModuleCondition(cm, dashboard, map[string]v1alpha1.ModuleStatus{
				"maas": {Phase: v1alpha1.ModulePhaseDisabled},
			})
			assert.Equal(t, metav1.ConditionUnknown, cm.GetCondition(conditionMaaSPortalAvailable).Status)
		})
	}
}

func TestMaaSPortalRequiredModuleSlugs(t *testing.T) {
	spec := &v1alpha1.DashboardSpec{
		ManagementSpec: common.ManagementSpec{ManagementState: "Removed"},
		MaaSPortal:     &v1alpha1.MaaSPortalSpec{ManagementState: "Managed"},
	}
	assert.Equal(t, map[string]bool{"maas": true, "gen-ai": true}, maasPortalRequiredModuleSlugs(spec, resolveModuleStatuses(spec)))

	spec.Modules = map[string]v1alpha1.ModuleOverride{"maas": {State: v1alpha1.ModuleDisabled}}
	assert.Equal(t, map[string]bool{"gen-ai": true}, maasPortalRequiredModuleSlugs(spec, resolveModuleStatuses(spec)))

	spec.MaaSPortal.ManagementState = "Removed"
	assert.Empty(t, maasPortalRequiredModuleSlugs(spec, resolveModuleStatuses(spec)))
}

func TestMarkMaaSPortalFederationConfigMapFailed(t *testing.T) {
	dashboard := &v1alpha1.Dashboard{}
	cm := maasPortalTestManager(t, dashboard)
	(&DashboardReconciler{}).markMaaSPortalFederationConfigMapFailed(cm, errors.New("apply failed"))
	condition := cm.GetCondition(conditionMaaSPortalAvailable)
	require.NotNil(t, condition)
	assert.Equal(t, metav1.ConditionFalse, condition.Status)
	assert.Equal(t, "MaaSConsumerPortalFederationConfigMapFailed", condition.Reason)
	assert.Equal(t, common.ConditionSeverityError, condition.Severity)
	assert.False(t, cm.IsHappy(), "a Managed MaaS Portal federation failure must make the aggregate readiness false")

	t.Run("preserves an earlier portal failure", func(t *testing.T) {
		dashboard := &v1alpha1.Dashboard{}
		cm := maasPortalTestManager(t, dashboard)
		cm.MarkFalse(conditionMaaSPortalAvailable,
			conditions.WithReason("MaaSConsumerPortalDomainRequired"),
			conditions.WithMessage("gateway domain is not set"),
			conditions.WithSeverity(common.ConditionSeverityInfo))

		(&DashboardReconciler{}).markMaaSPortalFederationConfigMapFailed(cm, errors.New("apply failed"))
		assert.Equal(t, "MaaSConsumerPortalDomainRequired", cm.GetCondition(conditionMaaSPortalAvailable).Reason)
	})
}
