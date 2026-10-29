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
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/client/interceptor"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/controller/conditions"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

const availabilityTestNamespace = "availability-test"

func TestReconcileDashboardAvailability(t *testing.T) {
	readyDeployment := availabilityDeployment(true)
	readyRoute := availabilityRoute("gateway", metav1.ConditionTrue, metav1.ConditionTrue, 0)
	staleDeployment := availabilityDeployment(true)
	staleDeployment.Generation = 2
	staleDeployment.Status.ObservedGeneration = 1
	zeroAvailableDeployment := availabilityDeployment(true)
	zeroAvailableDeployment.Status.AvailableReplicas = 0
	zeroDesiredDeployment := availabilityDeployment(true)
	zero := int32(0)
	zeroDesiredDeployment.Spec.Replicas = &zero

	tests := []struct {
		name       string
		objects    []client.Object
		readError  bool
		wantReason string
		wantRetry  time.Duration
		wantErr    bool
		wantReady  bool
	}{
		{name: "deployment is missing", wantReason: "DeploymentNotFound", wantRetry: dashboardAvailabilityRetryInterval},
		{name: "deployment is pending", objects: []client.Object{availabilityDeployment(false)}, wantReason: "DeploymentNotAvailable", wantRetry: dashboardAvailabilityRetryInterval},
		{name: "deployment status is stale", objects: []client.Object{staleDeployment}, wantReason: "DeploymentNotAvailable", wantRetry: dashboardAvailabilityRetryInterval},
		{name: "deployment has no available replicas", objects: []client.Object{zeroAvailableDeployment}, wantReason: "DeploymentNotAvailable", wantRetry: dashboardAvailabilityRetryInterval},
		{name: "deployment is scaled to zero", objects: []client.Object{zeroDesiredDeployment}, wantReason: "DeploymentNotAvailable", wantRetry: dashboardAvailabilityRetryInterval},
		{name: "route is missing", objects: []client.Object{readyDeployment}, wantReason: "HTTPRouteNotFound", wantRetry: dashboardAvailabilityRetryInterval},
		{name: "route status belongs to another parent", objects: []client.Object{readyDeployment, availabilityRoute("other-gateway", metav1.ConditionTrue, metav1.ConditionTrue, 0)}, wantReason: "HTTPRouteNotAccepted", wantRetry: dashboardAvailabilityRetryInterval},
		{name: "route is rejected", objects: []client.Object{readyDeployment, availabilityRoute("gateway", metav1.ConditionFalse, metav1.ConditionTrue, 0)}, wantReason: "HTTPRouteNotAccepted", wantRetry: dashboardAvailabilityRetryInterval},
		{name: "route has unresolved references", objects: []client.Object{readyDeployment, availabilityRoute("gateway", metav1.ConditionTrue, metav1.ConditionFalse, 0)}, wantReason: "HTTPRouteNotAccepted", wantRetry: dashboardAvailabilityRetryInterval},
		{name: "route conditions are stale", objects: []client.Object{readyDeployment, availabilityRoute("gateway", metav1.ConditionTrue, metav1.ConditionTrue, 1)}, wantReason: "HTTPRouteNotAccepted", wantRetry: dashboardAvailabilityRetryInterval},
		{name: "primary resources are available", objects: []client.Object{readyDeployment, readyRoute}, wantReason: "ResourcesAvailable", wantReady: true},
		{name: "deployment read fails", readError: true, wantReason: "DeploymentReadFailed", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := availabilityTestClient(t, tt.objects, tt.readError)
			dashboard := &v1alpha1.Dashboard{}
			cm := conditions.NewManager(dashboard, string(common.ConditionTypeReady), conditionDashboardAvailable)
			reconciler := &DashboardReconciler{Client: client, ApplicationsNamespace: availabilityTestNamespace}

			retryAfter, err := reconciler.reconcileDashboardAvailability(context.Background(), dashboard, cm, dashboardAvailabilityTarget{
				deploymentName: "dashboard",
				httpRouteName:  "dashboard",
			})

			if tt.wantErr {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
			}
			assert.Equal(t, tt.wantRetry, retryAfter)
			availability := cm.GetCondition(conditionDashboardAvailable)
			require.NotNil(t, availability)
			assert.Equal(t, tt.wantReason, availability.Reason)
			if tt.wantReady {
				assert.True(t, cm.IsHappy())
			} else {
				assert.False(t, cm.IsHappy())
			}
		})
	}
}

func TestReconcileDashboardAvailabilityRecoversAfterScaleUp(t *testing.T) {
	zero := int32(0)
	deployment := availabilityDeployment(true)
	deployment.Spec.Replicas = &zero
	deployment.Status.AvailableReplicas = 0
	route := availabilityRoute("gateway", metav1.ConditionTrue, metav1.ConditionTrue, 0)
	scheme := runtime.NewScheme()
	require.NoError(t, clientgoscheme.AddToScheme(scheme))
	require.NoError(t, gatewayv1.Install(scheme))
	cli := fake.NewClientBuilder().WithScheme(scheme).
		WithObjects(deployment, route).
		WithStatusSubresource(deployment).
		Build()
	reconciler := &DashboardReconciler{Client: cli, ApplicationsNamespace: availabilityTestNamespace}
	dashboard := &v1alpha1.Dashboard{}
	cm := conditions.NewManager(dashboard, string(common.ConditionTypeReady), conditionDashboardAvailable)
	target := dashboardAvailabilityTarget{deploymentName: deployment.Name, httpRouteName: route.Name}

	retryAfter, err := reconciler.reconcileDashboardAvailability(context.Background(), dashboard, cm, target)
	require.NoError(t, err)
	assert.Equal(t, dashboardAvailabilityRetryInterval, retryAfter)
	assert.Equal(t, "DeploymentNotAvailable", cm.GetCondition(conditionDashboardAvailable).Reason)
	assert.False(t, cm.IsHappy())

	current := &appsv1.Deployment{}
	require.NoError(t, cli.Get(context.Background(), client.ObjectKeyFromObject(deployment), current))
	one := int32(1)
	current.Spec.Replicas = &one
	require.NoError(t, cli.Update(context.Background(), current))
	require.NoError(t, cli.Get(context.Background(), client.ObjectKeyFromObject(deployment), current))
	current.Status.ObservedGeneration = current.Generation
	current.Status.AvailableReplicas = 1
	require.NoError(t, cli.Status().Update(context.Background(), current))

	retryAfter, err = reconciler.reconcileDashboardAvailability(context.Background(), dashboard, cm, target)
	require.NoError(t, err)
	assert.Zero(t, retryAfter)
	assert.Equal(t, "ResourcesAvailable", cm.GetCondition(conditionDashboardAvailable).Reason)
	assert.True(t, cm.IsHappy())
}

func availabilityTestClient(t *testing.T, objects []client.Object, readError bool) client.Client {
	t.Helper()
	scheme := runtime.NewScheme()
	require.NoError(t, clientgoscheme.AddToScheme(scheme))
	require.NoError(t, gatewayv1.Install(scheme))
	builder := fake.NewClientBuilder().WithScheme(scheme).WithObjects(objects...)
	if readError {
		builder = builder.WithInterceptorFuncs(interceptor.Funcs{
			Get: func(context.Context, client.WithWatch, client.ObjectKey, client.Object, ...client.GetOption) error {
				return errors.New("API unavailable")
			},
		})
	}
	return builder.Build()
}

func availabilityDeployment(available bool) *appsv1.Deployment {
	status := corev1.ConditionFalse
	availableReplicas := int32(0)
	if available {
		status = corev1.ConditionTrue
		availableReplicas = 1
	}
	replicas := int32(1)
	return &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{Name: "dashboard", Namespace: availabilityTestNamespace},
		Spec:       appsv1.DeploymentSpec{Replicas: &replicas},
		Status: appsv1.DeploymentStatus{
			ObservedGeneration: 0,
			AvailableReplicas:  availableReplicas,
			Conditions:         []appsv1.DeploymentCondition{{Type: appsv1.DeploymentAvailable, Status: status}},
		},
	}
}

func availabilityRoute(parentName string, accepted, resolved metav1.ConditionStatus, observedGeneration int64) *gatewayv1.HTTPRoute {
	return &gatewayv1.HTTPRoute{
		ObjectMeta: metav1.ObjectMeta{Name: "dashboard", Namespace: availabilityTestNamespace},
		Spec: gatewayv1.HTTPRouteSpec{CommonRouteSpec: gatewayv1.CommonRouteSpec{
			ParentRefs: []gatewayv1.ParentReference{{Name: "gateway"}},
		}},
		Status: gatewayv1.HTTPRouteStatus{RouteStatus: gatewayv1.RouteStatus{Parents: []gatewayv1.RouteParentStatus{{
			ParentRef: gatewayv1.ParentReference{Name: gatewayv1.ObjectName(parentName)},
			Conditions: []metav1.Condition{
				{Type: string(gatewayv1.RouteConditionAccepted), Status: accepted, ObservedGeneration: observedGeneration},
				{Type: string(gatewayv1.RouteConditionResolvedRefs), Status: resolved, ObservedGeneration: observedGeneration},
			},
		}}}},
	}
}

func TestRouteParentReferenceMatches(t *testing.T) {
	group := gatewayv1.Group(gatewayv1.GroupName)
	kind := gatewayv1.Kind("Gateway")
	namespace := gatewayv1.Namespace(availabilityTestNamespace)
	sectionName := gatewayv1.SectionName("https")
	port := gatewayv1.PortNumber(443)

	tests := []struct {
		name     string
		declared gatewayv1.ParentReference
		reported gatewayv1.ParentReference
		want     bool
	}{
		{
			name:     "implicit defaults match explicit defaults",
			declared: gatewayv1.ParentReference{Name: "gateway"},
			reported: gatewayv1.ParentReference{Name: "gateway", Group: &group, Kind: &kind, Namespace: &namespace},
			want:     true,
		},
		{
			name:     "broad parent matches reported listener section and port",
			declared: gatewayv1.ParentReference{Name: "gateway"},
			reported: gatewayv1.ParentReference{Name: "gateway", SectionName: &sectionName, Port: &port},
			want:     true,
		},
		{
			name:     "explicit listener section does not match a different reported section",
			declared: gatewayv1.ParentReference{Name: "gateway", SectionName: &sectionName},
			reported: gatewayv1.ParentReference{Name: "gateway"},
			want:     false,
		},
		{
			name:     "explicit listener port does not match a different reported port",
			declared: gatewayv1.ParentReference{Name: "gateway", Port: &port},
			reported: gatewayv1.ParentReference{Name: "gateway"},
			want:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, routeParentReferenceMatches(availabilityTestNamespace, tt.declared, tt.reported))
		})
	}
}

func TestHTTPRouteAvailableWithConcreteReportedListener(t *testing.T) {
	sectionName := gatewayv1.SectionName("https")
	port := gatewayv1.PortNumber(443)
	route := availabilityRoute("gateway", metav1.ConditionTrue, metav1.ConditionTrue, 0)
	route.Status.Parents[0].ParentRef.SectionName = &sectionName
	route.Status.Parents[0].ParentRef.Port = &port

	assert.True(t, httpRouteAvailable(route))
}
