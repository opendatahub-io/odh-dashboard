//go:build e2e

package e2e

import (
	"context"
	"encoding/json"
	"mime"
	"net/http"
	"testing"

	dashboardv1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"
)

func TestE2E_MaaSPortalObservabilitySurvivesCoreRemoval(t *testing.T) {
	if requiredPlatform(t) != "rhoai" {
		t.Skip("MaaS Portal is supported only on RHOAI")
	}

	// Use the normal auto-detection path against the cluster's real Perses.
	// Missing observability prerequisites must fail rather than silently skip.
	perses := &corev1.Service{}
	require.NoError(t, k8sClient.Get(t.Context(), client.ObjectKey{
		Namespace: "redhat-ods-monitoring", Name: "data-science-perses",
	}, perses), "this scenario requires the RHOAI Perses service")
	require.NoError(t, waitForServiceEndpoints(k8sClient, perses.Namespace, perses.Name, operandReadyTimeout))
	require.NotEmpty(t, restConfig.BearerToken, "this scenario requires a token authorized to read Perses dashboards")

	dashboard := &dashboardv1alpha1.Dashboard{}
	key := client.ObjectKey{Name: dashboardv1alpha1.DashboardInstanceName}
	require.NoError(t, k8sClient.Get(t.Context(), key, dashboard))
	require.Equal(t, dashboardUID, dashboard.UID)
	require.Equal(t, common.Managed, dashboard.Spec.ManagementState)
	for _, name := range []string{"maas", "genAi"} {
		require.NotEqual(t, dashboardv1alpha1.ModuleDisabled, dashboard.Spec.Modules[name].State,
			"MaaS Portal requires module %q to be enabled", name)
	}
	originalSpec := dashboard.Spec.DeepCopy()
	originalPortalSpec := originalSpec.MaaSPortal
	if originalPortalSpec == nil {
		originalPortalSpec = originalSpec.MaaSConsumerPortal
	}
	coreRoute, err := waitForAdmittedHTTPRouteByNames(k8sClient, testNamespace,
		[]string{"odh-dashboard", "rhods-dashboard"}, operandReadyTimeout)
	require.NoError(t, err)

	t.Cleanup(func() {
		patchDashboardSpec(t, func(spec *dashboardv1alpha1.DashboardSpec) {
			spec.ManagementState = originalSpec.ManagementState
			spec.MaaSPortal = originalSpec.MaaSPortal
			spec.Observability = originalSpec.Observability
		})
		require.NoError(t, waitForCondition(k8sClient, key.Name,
			string(common.ConditionTypeProvisioningSucceeded), metav1.ConditionTrue, fixtureReadyTimeout))
		require.NoError(t, waitForDeploymentReady(k8sClient, testNamespace, coreRoute.Name, operandReadyTimeout))
		_, err := waitForAdmittedHTTPRouteByName(k8sClient, testNamespace, coreRoute.Name, operandReadyTimeout)
		require.NoError(t, err)
		if originalPortalSpec == nil || originalPortalSpec.ManagementState != "Managed" {
			waitForObjectAbsent(t, &gatewayv1.HTTPRoute{}, maasPortalRouteName)
			waitForObjectAbsent(t, &appsv1.Deployment{}, maasPortalRouteName)
		} else {
			require.NoError(t, waitForCondition(k8sClient, key.Name,
				"MaaSPortalAvailable", metav1.ConditionTrue, fixtureReadyTimeout))
		}
	})

	patchDashboardSpec(t, func(spec *dashboardv1alpha1.DashboardSpec) {
		spec.MaaSPortal = &dashboardv1alpha1.MaaSPortalSpec{ManagementState: "Managed"}
		spec.Observability = nil
	})

	for _, state := range []common.ManagementState{common.Managed, common.Removed} {
		t.Logf("checking portal health and Perses with core dashboard %s", state)
		if state == common.Removed {
			patchDashboardSpec(t, func(spec *dashboardv1alpha1.DashboardSpec) { spec.ManagementState = state })
			waitForObjectAbsent(t, &gatewayv1.HTTPRoute{}, coreRoute.Name)
			waitForObjectAbsent(t, &appsv1.Deployment{}, coreRoute.Name)
		}
		for _, condition := range []string{"MaaSPortalAvailable", "ObservabilityAvailable"} {
			require.NoError(t, waitForCondition(k8sClient, key.Name, condition, metav1.ConditionTrue, fixtureReadyTimeout))
		}
		require.NoError(t, waitForDeploymentReady(k8sClient, testNamespace, maasPortalRouteName, operandReadyTimeout))
		_, err := waitForAdmittedHTTPRouteByName(k8sClient, testNamespace, maasPortalRouteName, operandReadyTimeout)
		require.NoError(t, err)
		require.NoError(t, k8sClient.Get(t.Context(), key, dashboard))
		require.Equal(t, state, dashboard.Spec.ManagementState)
		require.Nil(t, dashboard.Spec.Observability, "auto-detection must not persist observability in the CR spec")

		// Gateway updates and the Perses operator converge asynchronously. Both
		// requests use the external portal route, exercising its proxy and CNI.
		ctx, cancel := context.WithTimeout(t.Context(), operandReadyTimeout)
		t.Cleanup(cancel)
		require.EventuallyWithT(t, func(c *assert.CollectT) {
			healthResponse, err := fetchGatewayPath(ctx, maasPortalHealthPath)
			if assert.NoError(c, err) {
				assert.Equal(c, http.StatusOK, healthResponse.statusCode)
				mediaType, _, err := mime.ParseMediaType(healthResponse.contentType)
				assert.NoError(c, err)
				assert.Equal(c, "application/json", mediaType)
				var health struct {
					Status string `json:"status"`
				}
				assert.NoError(c, json.Unmarshal(healthResponse.body, &health))
				assert.Equal(c, "available", health.Status)
			}
			response, err := fetchGatewayPath(ctx, maasPortalPath+"/perses/api/api/v1/dashboards")
			if assert.NoError(c, err) {
				assert.NoError(c, validatePersesDashboardsResponse(response.statusCode, response.contentType,
					response.body, "dashboard-1-model"))
			}
		}, operandReadyTimeout, e2ePollInterval, "portal health and Perses must work with core dashboard %s", state)
		cancel()
	}
}
