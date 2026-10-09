//go:build e2e

package e2e

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime"
	"net/http"
	"net/url"
	"regexp"
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
	modelCatalogRouteName = "model-catalog"
	modelCatalogPath      = "/catalog/api/model_catalog/v1alpha1/sources"
	maasPortalRouteName   = "maas-portal"
	maasPortalPath        = "/maas-portal"
	maasPortalHealthPath  = "/maas-portal/healthcheck"
	sharedGatewayName     = "data-science-gateway"
	maxRouteResponseBody  = 1 << 20
)

type gatewayResponse struct {
	statusCode  int
	status      string
	contentType string
	location    string
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

func TestE2E_MaaSPortalRoutingConformance(t *testing.T) {
	requireManagedFixture(t)
	if requiredPlatform(t) != platformRHOAI {
		t.Skip("MaaS Portal is supported only on RHOAI")
	}

	dashboard := &dashboardv1alpha1.Dashboard{}
	require.NoError(t, k8sClient.Get(context.Background(), client.ObjectKey{Name: dashboardv1alpha1.DashboardInstanceName}, dashboard))
	for _, name := range []string{"maas", "genAi"} {
		require.NotEqual(t, dashboardv1alpha1.ModuleDisabled, dashboard.Spec.Modules[name].State,
			"MaaS Portal routing test requires module %q to be enabled in Dashboard spec.modules", name)
	}
	var originalPortalSpec *dashboardv1alpha1.MaaSPortalSpec
	if dashboard.Spec.MaaSPortal != nil {
		originalPortalSpec = dashboard.Spec.MaaSPortal.DeepCopy()
	}
	t.Cleanup(func() {
		patchDashboardSpec(t, func(spec *dashboardv1alpha1.DashboardSpec) {
			spec.MaaSPortal = originalPortalSpec
		})
		if originalPortalSpec == nil || originalPortalSpec.ManagementState != "Managed" {
			waitForObjectAbsent(t, &gatewayv1.HTTPRoute{}, maasPortalRouteName)
			waitForObjectAbsent(t, &appsv1.Deployment{}, maasPortalRouteName)
		}
	})

	patchDashboardSpec(t, func(spec *dashboardv1alpha1.DashboardSpec) {
		spec.MaaSPortal = &dashboardv1alpha1.MaaSPortalSpec{ManagementState: "Managed"}
	})
	require.NoError(t, waitForCondition(
		k8sClient,
		dashboardv1alpha1.DashboardInstanceName,
		"MaaSPortalAvailable",
		metav1.ConditionTrue,
		fixtureReadyTimeout,
	))
	require.NoError(t, waitForDeploymentReady(
		k8sClient,
		testNamespace,
		maasPortalRouteName,
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
		maasPortalRouteName,
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
	require.True(t, httpRouteMatchesPathPrefix(portalRoute, maasPortalPath))
	require.True(t, httpRouteMatchesPathPrefix(catalogRoute, "/catalog/"))

	require.NoError(t, k8sClient.Get(context.Background(), client.ObjectKey{Name: dashboardv1alpha1.DashboardInstanceName}, dashboard))
	require.Equal(t, "https://"+testGatewayDomain+maasPortalPath+"/", dashboard.Status.MaaSPortalURL)
	require.Equal(t, dashboard.Status.MaaSPortalURL, dashboard.Status.MaaSConsumerPortalURL)
	assertMaaSPortalBrowserRouting(t)

	dashboardResponse := requestGatewayPath(t, "/")
	require.Equal(t, http.StatusOK, dashboardResponse.statusCode,
		"dashboard root returned status %s, content type %q, and body length %d",
		dashboardResponse.status, dashboardResponse.contentType, len(dashboardResponse.body))
	require.True(t, bodyStartsWithHTML(dashboardResponse.body),
		"dashboard root returned non-HTML content type %q and body length %d",
		dashboardResponse.contentType, len(dashboardResponse.body))

	portalResponse := requestGatewayPath(t, maasPortalHealthPath)
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

// Verify the route and built frontend together: a health check alone cannot
// detect a bundle that still requests assets from the previous mount point.
func assertMaaSPortalBrowserRouting(t *testing.T) {
	t.Helper()
	redirect := requestGatewayPath(t, maasPortalPath)
	require.Equal(t, http.StatusFound, redirect.statusCode)
	location, err := url.Parse(redirect.location)
	require.NoError(t, err)
	require.Equal(t, maasPortalPath+"/", location.Path)

	root := requestGatewayPath(t, maasPortalPath+"/")
	require.Equal(t, http.StatusOK, root.statusCode)
	require.True(t, bodyStartsWithHTML(root.body))
	require.Contains(t, string(root.body), "<title>MaaS Portal</title>")
	require.NotContains(t, string(root.body), "/maas-consumer-portal/")
	scripts := regexp.MustCompile(`<script\b[^>]*\bsrc="([^"]+)"`).FindAllSubmatch(root.body, -1)
	require.NotEmpty(t, scripts, "the portal index must include its built entry script")
	for _, script := range scripts {
		assetPath := string(script[1])
		require.True(t, strings.HasPrefix(assetPath, maasPortalPath+"/"), "entry script %q must use the portal mount", assetPath)
		asset := requestGatewayPath(t, assetPath)
		require.Equal(t, http.StatusOK, asset.statusCode, "entry script %s", assetPath)
		require.NotEmpty(t, asset.body)
		require.False(t, bodyStartsWithHTML(asset.body), "entry script %s must not fall back to index.html", assetPath)
	}
	deepLink := requestGatewayPath(t, maasPortalPath+"/gen-ai-studio/assets")
	require.Equal(t, http.StatusOK, deepLink.statusCode)
	require.Equal(t, string(root.body), string(deepLink.body), "deep links must serve the same portal bundle")

	for _, path := range []string{"/maas-consumer-portal", "/maas-consumer-portal/", "/maas-consumer-portal/gen-ai-studio/assets", "/maas-consumer-portal/healthcheck"} {
		retired := requestGatewayPath(t, path)
		require.False(t, retired.statusCode >= 300 && retired.statusCode < 400, "retired path %s must not redirect", path)
		require.NotContains(t, string(retired.body), "<title>MaaS Portal</title>", "retired path %s must not serve the portal", path)
		require.NotContains(t, string(retired.body), maasPortalPath+"/", "retired path %s must not load the portal bundle", path)
		if path == "/maas-consumer-portal/healthcheck" {
			var health struct {
				Status string `json:"status"`
			}
			if json.Unmarshal(retired.body, &health) == nil {
				require.NotEqual(t, "available", health.Status, "retired prefix must not expose the portal health endpoint")
			}
		}
	}
}

func requestGatewayPath(t *testing.T, path string) gatewayResponse {
	t.Helper()
	response, err := fetchGatewayPath(context.Background(), path)
	require.NoError(t, err)
	return response
}

// fetchGatewayPath lets convergence checks retry transport and proxy failures
// while preserving the same authentication, TLS, and response limits.
func fetchGatewayPath(ctx context.Context, path string) (gatewayResponse, error) {
	if restConfig.BearerToken == "" {
		return gatewayResponse{}, fmt.Errorf("kubeconfig must provide a bearer token for the authenticated Gateway request")
	}
	requestURL := url.URL{Scheme: "https", Host: testGatewayDomain, Path: path}
	ctx, cancel := context.WithTimeout(ctx, httpRequestTimeout)
	defer cancel()
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL.String(), nil)
	if err != nil {
		return gatewayResponse{}, err
	}
	request.Header.Set("Authorization", "Bearer "+restConfig.BearerToken)

	httpClient := routeHTTPClient()
	defer httpClient.CloseIdleConnections()
	response, err := httpClient.Do(request)
	if err != nil {
		return gatewayResponse{}, err
	}

	body, readErr := io.ReadAll(io.LimitReader(response.Body, maxRouteResponseBody+1))
	closeErr := response.Body.Close()
	if readErr != nil {
		return gatewayResponse{}, readErr
	}
	if closeErr != nil {
		return gatewayResponse{}, closeErr
	}
	if len(body) > maxRouteResponseBody {
		return gatewayResponse{}, fmt.Errorf("Gateway response for path %s exceeded the %d-byte diagnostic limit", path, maxRouteResponseBody)
	}

	return gatewayResponse{
		statusCode:  response.StatusCode,
		status:      response.Status,
		contentType: response.Header.Get("Content-Type"),
		location:    response.Header.Get("Location"),
		body:        body,
	}, nil
}
