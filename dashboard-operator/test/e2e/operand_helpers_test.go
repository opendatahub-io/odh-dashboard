package e2e

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	policyv1 "k8s.io/api/policy/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/intstr"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"
)

func TestDeploymentReady(t *testing.T) {
	replicas := int32(2)
	ready := appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{Generation: 3},
		Spec:       appsv1.DeploymentSpec{Replicas: &replicas},
		Status: appsv1.DeploymentStatus{
			ObservedGeneration: 3,
			UpdatedReplicas:    2,
			ReadyReplicas:      2,
			Conditions: []appsv1.DeploymentCondition{{
				Type: appsv1.DeploymentAvailable, Status: corev1.ConditionTrue,
			}},
		},
	}

	tests := []struct {
		name   string
		mutate func(*appsv1.Deployment)
		want   bool
	}{
		{name: "ready", mutate: func(*appsv1.Deployment) {}, want: true},
		{name: "stale generation", mutate: func(d *appsv1.Deployment) { d.Status.ObservedGeneration = 2 }},
		{name: "old replicas", mutate: func(d *appsv1.Deployment) { d.Status.UpdatedReplicas = 1 }},
		{name: "unready replicas", mutate: func(d *appsv1.Deployment) { d.Status.ReadyReplicas = 1 }},
		{name: "available false", mutate: func(d *appsv1.Deployment) { d.Status.Conditions[0].Status = corev1.ConditionFalse }},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			deployment := ready.DeepCopy()
			tt.mutate(deployment)
			require.Equal(t, tt.want, deploymentReady(deployment))
		})
	}
}

//nolint:staticcheck // Cover the legacy Endpoints helper used by the real-cluster tests.
func TestEndpointsReady(t *testing.T) {
	require.False(t, endpointsReady(&corev1.Endpoints{}))
	require.False(t, endpointsReady(&corev1.Endpoints{Subsets: []corev1.EndpointSubset{{NotReadyAddresses: []corev1.EndpointAddress{{IP: "10.0.0.1"}}}}}))
	require.True(t, endpointsReady(&corev1.Endpoints{Subsets: []corev1.EndpointSubset{{Addresses: []corev1.EndpointAddress{{IP: "10.0.0.1"}}}}}))
}

func TestOwnedByUID(t *testing.T) {
	object := &corev1.Service{ObjectMeta: metav1.ObjectMeta{OwnerReferences: []metav1.OwnerReference{{UID: types.UID("expected")}}}}
	require.True(t, ownedByUID(object, types.UID("expected")))
	require.False(t, ownedByUID(object, types.UID("other")))
	require.False(t, ownedByUID(object, ""))
}

func TestHTTPRouteAdmitted(t *testing.T) {
	condition := func(conditionType string, generation int64) metav1.Condition {
		return metav1.Condition{Type: conditionType, Status: metav1.ConditionTrue, ObservedGeneration: generation, Reason: "Accepted"}
	}
	route := &gatewayv1.HTTPRoute{
		ObjectMeta: metav1.ObjectMeta{Generation: 2},
		Status: gatewayv1.HTTPRouteStatus{RouteStatus: gatewayv1.RouteStatus{Parents: []gatewayv1.RouteParentStatus{{
			Conditions: []metav1.Condition{
				condition(string(gatewayv1.RouteConditionAccepted), 2),
				condition(string(gatewayv1.RouteConditionResolvedRefs), 2),
			},
		}}}},
	}
	require.True(t, httpRouteAdmitted(route))

	stale := route.DeepCopy()
	stale.Status.Parents[0].Conditions[0].ObservedGeneration = 1
	require.False(t, httpRouteAdmitted(stale))

	missing := route.DeepCopy()
	missing.Status.Parents[0].Conditions = missing.Status.Parents[0].Conditions[:1]
	require.False(t, httpRouteAdmitted(missing))
}

func TestHTTPRouteMatchesPathPrefix(t *testing.T) {
	prefixType := gatewayv1.PathMatchPathPrefix
	exactType := gatewayv1.PathMatchExact
	catalogValue := "/catalog/"
	catalogPath := gatewayv1.HTTPPathMatch{
		Type:  &prefixType,
		Value: &catalogValue,
	}
	route := &gatewayv1.HTTPRoute{Spec: gatewayv1.HTTPRouteSpec{Rules: []gatewayv1.HTTPRouteRule{{
		Matches: []gatewayv1.HTTPRouteMatch{{Path: &catalogPath}},
	}}}}

	require.True(t, httpRouteMatchesPathPrefix(route, "/catalog/"))
	require.False(t, httpRouteMatchesPathPrefix(route, "/other/"))

	route.Spec.Rules[0].Matches[0].Path.Type = &exactType
	require.False(t, httpRouteMatchesPathPrefix(route, "/catalog/"))
}

func TestPDBSelectsDeployment(t *testing.T) {
	deployment := &appsv1.Deployment{Spec: appsv1.DeploymentSpec{Template: corev1.PodTemplateSpec{ObjectMeta: metav1.ObjectMeta{Labels: map[string]string{"deployment": "odh-dashboard"}}}}}
	pdb := &policyv1.PodDisruptionBudget{Spec: policyv1.PodDisruptionBudgetSpec{Selector: &metav1.LabelSelector{MatchLabels: map[string]string{"deployment": "odh-dashboard"}}}}

	matched, err := pdbSelectsDeployment(pdb, deployment)
	require.NoError(t, err)
	require.True(t, matched)

	pdb.Spec.Selector.MatchLabels["deployment"] = "other"
	matched, err = pdbSelectsDeployment(pdb, deployment)
	require.NoError(t, err)
	require.False(t, matched)
}

func TestResolveServiceTargetPort(t *testing.T) {
	pod := &corev1.Pod{ObjectMeta: metav1.ObjectMeta{Name: "module"}, Spec: corev1.PodSpec{Containers: []corev1.Container{{Ports: []corev1.ContainerPort{{Name: "https", ContainerPort: 8043}}}}}}
	tests := []struct {
		name       string
		targetPort intstr.IntOrString
		want       int32
		wantErr    bool
	}{
		{name: "numeric", targetPort: intstr.FromInt32(8043), want: 8043},
		{name: "named", targetPort: intstr.FromString("https"), want: 8043},
		{name: "missing named", targetPort: intstr.FromString("missing"), wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service := &corev1.Service{ObjectMeta: metav1.ObjectMeta{Name: "module"}, Spec: corev1.ServiceSpec{Ports: []corev1.ServicePort{{Port: 443, TargetPort: tt.targetPort}}}}
			got, err := resolveServiceTargetPort(service, pod, 443)
			if tt.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			require.Equal(t, tt.want, got)
		})
	}
}

func TestBFFTargets(t *testing.T) {
	require.Len(t, bffTargets, 8)
	names := make(map[string]struct{}, len(bffTargets))
	services := make(map[string]struct{}, len(bffTargets))
	for _, target := range bffTargets {
		require.NotEmpty(t, target.name)
		require.NotEmpty(t, target.service)
		require.Positive(t, target.port)
		_, duplicateName := names[target.name]
		require.False(t, duplicateName, "duplicate BFF name %s", target.name)
		_, duplicateService := services[target.service]
		require.False(t, duplicateService, "duplicate BFF service %s", target.service)
		names[target.name] = struct{}{}
		services[target.service] = struct{}{}
	}
}

func TestExpectedModuleOperands(t *testing.T) {
	require.Len(t, expectedModuleOperands, 10)
	deployments := make(map[string]struct{}, len(expectedModuleOperands))
	services := make(map[string]struct{}, len(expectedModuleOperands))
	for _, operand := range expectedModuleOperands {
		require.NotEmpty(t, operand.name)
		require.NotEmpty(t, operand.deployment)
		require.NotEmpty(t, operand.service)
		_, duplicateDeployment := deployments[operand.deployment]
		require.False(t, duplicateDeployment, "duplicate module Deployment %s", operand.deployment)
		_, duplicateService := services[operand.service]
		require.False(t, duplicateService, "duplicate module Service %s", operand.service)
		deployments[operand.deployment] = struct{}{}
		services[operand.service] = struct{}{}
	}
}

func TestRouteResponseHealthy(t *testing.T) {
	for _, statusCode := range []int{200, 302, 303, 401, 403} {
		require.True(t, routeResponseHealthy(statusCode), "status %d", statusCode)
	}
	for _, statusCode := range []int{0, 201, 404, 499, 503} {
		require.False(t, routeResponseHealthy(statusCode), "status %d", statusCode)
	}
}

func TestValidateModuleAPIResponse(t *testing.T) {
	tests := []struct {
		name        string
		statusCode  int
		contentType string
		body        string
		wantErr     bool
	}{
		{name: "JSON success", statusCode: http.StatusOK, contentType: "application/json; charset=utf-8", body: `{"items":[]}`},
		{name: "vendor JSON success", statusCode: http.StatusOK, contentType: "application/problem+json", body: `{"detail":"ok"}`},
		{name: "Model Catalog unauthorized response", statusCode: http.StatusUnauthorized, contentType: "application/json", body: `{"code":"unauthorized","message":"permission denied"}`},
		{name: "plain-text unauthorized response", statusCode: http.StatusUnauthorized, contentType: "text/plain", body: "Unauthorized", wantErr: true},
		{name: "malformed unauthorized response", statusCode: http.StatusUnauthorized, contentType: "application/json", body: `{`, wantErr: true},
		{name: "incomplete unauthorized response", statusCode: http.StatusUnauthorized, contentType: "application/json", body: `{"code":"unauthorized"}`, wantErr: true},
		{name: "forbidden API response", statusCode: http.StatusForbidden, body: "Forbidden", wantErr: true},
		{name: "Dashboard SPA collision", statusCode: http.StatusOK, contentType: "text/html; charset=utf-8", body: "<!DOCTYPE html><html></html>", wantErr: true},
		{name: "HTML body without content type", statusCode: http.StatusForbidden, body: "\ufeff  <HTML><body>Forbidden</body></HTML>", wantErr: true},
		{name: "invalid JSON", statusCode: http.StatusOK, contentType: "application/json", body: "not JSON", wantErr: true},
		{name: "non-JSON success", statusCode: http.StatusOK, contentType: "text/plain", body: "ok", wantErr: true},
		{name: "redirect", statusCode: http.StatusFound, contentType: "text/html", wantErr: true},
		{name: "not found", statusCode: http.StatusNotFound, contentType: "application/json", body: `{}`, wantErr: true},
		{name: "server error", statusCode: http.StatusInternalServerError, contentType: "application/json", body: `{}`, wantErr: true},
		{name: "malformed content type", statusCode: http.StatusOK, contentType: "application/json; charset", body: `{}`, wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateModuleAPIResponse(tt.statusCode, tt.contentType, []byte(tt.body))
			if tt.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
		})
	}
}

func TestMissingOperandResources(t *testing.T) {
	inventory := operandInventory{
		deployments: []appsv1.Deployment{{ObjectMeta: metav1.ObjectMeta{Name: "odh-dashboard"}}},
		services:    []corev1.Service{{ObjectMeta: metav1.ObjectMeta{Name: "odh-dashboard"}}},
	}
	for _, operand := range expectedModuleOperands {
		inventory.deployments = append(inventory.deployments, appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Name: operand.deployment}})
		inventory.services = append(inventory.services, corev1.Service{ObjectMeta: metav1.ObjectMeta{Name: operand.service}})
	}
	require.Empty(t, missingOperandResources(inventory))

	inventory.deployments = inventory.deployments[1:]
	require.Contains(t, missingOperandResources(inventory), "Deployment/{odh-dashboard,rhods-dashboard}")

	inventory.deployments = append(inventory.deployments, appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Name: "odh-dashboard"}})
	inventory.services[0].Name = "rhods-dashboard"
	require.ElementsMatch(t, []string{
		"Deployment/{odh-dashboard,rhods-dashboard}",
		"Service/{odh-dashboard,rhods-dashboard}",
	}, missingOperandResources(inventory))
}

func TestFindCoreDeployment(t *testing.T) {
	deployments := []appsv1.Deployment{{ObjectMeta: metav1.ObjectMeta{Name: "module"}}, {ObjectMeta: metav1.ObjectMeta{Name: "rhods-dashboard"}}}
	deployment, err := findCoreDeployment(deployments)
	require.NoError(t, err)
	require.Equal(t, "rhods-dashboard", deployment.Name)

	_, err = findCoreDeployment(deployments[:1])
	require.Error(t, err)
}

func TestAnyReadyPod(t *testing.T) {
	notReady := corev1.Pod{Status: corev1.PodStatus{Conditions: []corev1.PodCondition{{Type: corev1.PodReady, Status: corev1.ConditionFalse}}}}
	ready := corev1.Pod{Status: corev1.PodStatus{Conditions: []corev1.PodCondition{{Type: corev1.PodReady, Status: corev1.ConditionTrue}}}}
	require.False(t, anyReadyPod([]corev1.Pod{notReady}))
	require.True(t, anyReadyPod([]corev1.Pod{notReady, ready}))
}
