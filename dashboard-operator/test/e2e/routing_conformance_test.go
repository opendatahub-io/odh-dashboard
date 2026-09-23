//go:build e2e

package e2e

import (
	"context"
	"encoding/json"
	"io"
	"mime"
	"net/http"
	"net/url"
	"strings"
	"testing"

	dashboardv1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"
)

const (
	modelCatalogRouteName        = "model-catalog"
	modelCatalogPath             = "/catalog/api/model_catalog/v1alpha1/sources"
	maasConsumerPortalRouteName  = "maas-consumer-portal"
	maasConsumerPortalPath       = "/maas-consumer-portal"
	maasConsumerPortalHealthPath = "/maas-consumer-portal/healthcheck"
	sharedGatewayName            = "data-science-gateway"
	maxRouteResponseBody         = 1 << 20
)

type gatewayResponse struct {
	statusCode  int
	status      string
	contentType string
	body        []byte
}

func TestE2E_GatewaySubPathRoutingConformance(t *testing.T) {
	dashboardRoute, err := waitForAdmittedHTTPRouteByNames(
		k8sClient,
		testNamespace,
		[]string{"odh-dashboard", "rhods-dashboard"},
		operandReadyTimeout,
	)
	require.NoError(t, err)
	require.Contains(t, []string{"odh-dashboard", "rhods-dashboard"}, dashboardRoute.Name)
	require.Empty(t, dashboardRoute.Spec.Hostnames,
		"Dashboard catch-all HTTPRoute must stay hostname-less so sibling path routes can win")

	catalogRoute, err := waitForAdmittedHTTPRouteByName(
		k8sClient,
		testNamespace,
		modelCatalogRouteName,
		operandReadyTimeout,
	)
	require.NoError(t, err)
	require.True(t, httpRouteMatchesPathPrefix(catalogRoute, "/catalog/"),
		"HTTPRoute %s/%s does not expose the expected /catalog/ PathPrefix",
		catalogRoute.Namespace, catalogRoute.Name)

	response := requestGatewayPath(t, modelCatalogPath)
	require.NoError(t, validateModuleAPIResponse(
		response.statusCode,
		response.contentType,
		response.body,
	), "gateway request path %s returned status %s, content type %q, and body length %d",
		modelCatalogPath, response.status, response.contentType, len(response.body))
}

func TestE2E_MaaSConsumerPortalRoutingConformance(t *testing.T) {
	if requiredPlatform(t) != "rhoai" {
		t.Skip("MaaS Consumer Portal is supported only on RHOAI")
	}

	dashboard := &dashboardv1alpha1.Dashboard{}
	require.NoError(t, k8sClient.Get(context.Background(), client.ObjectKey{Name: dashboardv1alpha1.DashboardInstanceName}, dashboard))
	for _, name := range []string{"maas", "genAi"} {
		require.NotEqual(t, dashboardv1alpha1.ModuleDisabled, dashboard.Spec.Modules[name].State,
			"MaaS Consumer Portal routing test requires module %q to be enabled in Dashboard spec.modules", name)
	}
	var originalPortalSpec *dashboardv1alpha1.MaaSConsumerPortalSpec
	if dashboard.Spec.MaaSConsumerPortal != nil {
		originalPortalSpec = dashboard.Spec.MaaSConsumerPortal.DeepCopy()
	}
	t.Cleanup(func() {
		patchDashboardSpec(t, func(spec *dashboardv1alpha1.DashboardSpec) {
			spec.MaaSConsumerPortal = originalPortalSpec
		})
		if originalPortalSpec == nil || originalPortalSpec.ManagementState != "Managed" {
			waitForObjectAbsent(t, &gatewayv1.HTTPRoute{}, maasConsumerPortalRouteName)
			waitForObjectAbsent(t, &appsv1.Deployment{}, maasConsumerPortalRouteName)
		}
	})

	patchDashboardSpec(t, func(spec *dashboardv1alpha1.DashboardSpec) {
		spec.MaaSConsumerPortal = &dashboardv1alpha1.MaaSConsumerPortalSpec{ManagementState: "Managed"}
	})
	require.NoError(t, waitForCondition(
		k8sClient,
		dashboardv1alpha1.DashboardInstanceName,
		"MaaSConsumerPortalAvailable",
		metav1.ConditionTrue,
		fixtureReadyTimeout,
	))
	require.NoError(t, waitForDeploymentReady(
		k8sClient,
		testNamespace,
		maasConsumerPortalRouteName,
		operandReadyTimeout,
	))

	dashboardRoute, err := waitForAdmittedHTTPRouteByNames(
		k8sClient,
		testNamespace,
		[]string{"odh-dashboard", "rhods-dashboard"},
		operandReadyTimeout,
	)
	require.NoError(t, err)
	portalRoute, err := waitForAdmittedHTTPRouteByName(
		k8sClient,
		testNamespace,
		maasConsumerPortalRouteName,
		operandReadyTimeout,
	)
	require.NoError(t, err)
	catalogRoute, err := waitForAdmittedHTTPRouteByName(
		k8sClient,
		testNamespace,
		modelCatalogRouteName,
		operandReadyTimeout,
	)
	require.NoError(t, err)

	for _, route := range []*gatewayv1.HTTPRoute{dashboardRoute, portalRoute, catalogRoute} {
		require.Empty(t, route.Spec.Hostnames,
			"HTTPRoute %s/%s must remain hostname-less on the shared Gateway", route.Namespace, route.Name)
		require.Len(t, route.Spec.ParentRefs, 1,
			"HTTPRoute %s/%s must have one shared Gateway parent", route.Namespace, route.Name)
		require.Equal(t, gatewayv1.ObjectName(sharedGatewayName), route.Spec.ParentRefs[0].Name)
	}
	require.True(t, httpRouteMatchesPathPrefix(dashboardRoute, "/"))
	require.True(t, httpRouteMatchesPathPrefix(portalRoute, maasConsumerPortalPath))
	require.True(t, httpRouteMatchesPathPrefix(catalogRoute, "/catalog/"))

	require.NoError(t, k8sClient.Get(context.Background(), client.ObjectKey{Name: dashboardv1alpha1.DashboardInstanceName}, dashboard))
	require.Equal(t, "https://"+testGatewayDomain+maasConsumerPortalPath+"/", dashboard.Status.MaaSConsumerPortalURL)

	dashboardResponse := requestGatewayPath(t, "/")
	require.Equal(t, http.StatusOK, dashboardResponse.statusCode,
		"dashboard root returned status %s, content type %q, and body length %d",
		dashboardResponse.status, dashboardResponse.contentType, len(dashboardResponse.body))
	require.True(t, bodyStartsWithHTML(dashboardResponse.body),
		"dashboard root returned non-HTML content type %q and body length %d",
		dashboardResponse.contentType, len(dashboardResponse.body))

	portalResponse := requestGatewayPath(t, maasConsumerPortalHealthPath)
	require.Equal(t, http.StatusOK, portalResponse.statusCode,
		"portal health check returned status %s, content type %q, and body length %d",
		portalResponse.status, portalResponse.contentType, len(portalResponse.body))
	mediaType, _, err := mime.ParseMediaType(portalResponse.contentType)
	require.NoError(t, err)
	require.Equal(t, "application/json", strings.ToLower(mediaType))
	var health struct {
		Status string `json:"status"`
	}
	require.NoError(t, json.Unmarshal(portalResponse.body, &health))
	require.Equal(t, "available", health.Status)

	catalogResponse := requestGatewayPath(t, modelCatalogPath)
	require.NoError(t, validateModuleAPIResponse(
		catalogResponse.statusCode,
		catalogResponse.contentType,
		catalogResponse.body,
	), "gateway request path %s returned status %s, content type %q, and body length %d",
		modelCatalogPath, catalogResponse.status, catalogResponse.contentType, len(catalogResponse.body))
}

func requestGatewayPath(t *testing.T, path string) gatewayResponse {
	t.Helper()
	requestURL := url.URL{Scheme: "https", Host: testGatewayDomain, Path: path}
	ctx, cancel := context.WithTimeout(context.Background(), httpRequestTimeout)
	defer cancel()
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL.String(), nil)
	require.NoError(t, err)
	require.NotEmpty(t, restConfig.BearerToken,
		"kubeconfig must provide a bearer token for the authenticated Gateway request")
	request.Header.Set("Authorization", "Bearer "+restConfig.BearerToken)

	response, err := routeHTTPClient().Do(request)
	require.NoError(t, err)
	defer func() {
		require.NoError(t, response.Body.Close())
	}()

	body, err := io.ReadAll(io.LimitReader(response.Body, maxRouteResponseBody+1))
	require.NoError(t, err)
	require.LessOrEqual(t, len(body), maxRouteResponseBody,
		"Gateway response for path %s exceeded the %d-byte diagnostic limit", path, maxRouteResponseBody)

	return gatewayResponse{
		statusCode:  response.StatusCode,
		status:      response.Status,
		contentType: response.Header.Get("Content-Type"),
		body:        body,
	}
}
