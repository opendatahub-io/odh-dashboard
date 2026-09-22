//go:build e2e

package e2e

import (
	"context"
	"io"
	"net/http"
	"net/url"
	"testing"

	"github.com/stretchr/testify/require"
)

const (
	modelCatalogRouteName = "model-catalog"
	modelCatalogPath      = "/catalog/api/model_catalog/v1alpha1/sources"
	maxRouteResponseBody  = 1 << 20
)

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

	requestURL := url.URL{Scheme: "https", Host: testGatewayDomain, Path: modelCatalogPath}
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
		"catalog route response exceeded the %d-byte diagnostic limit", maxRouteResponseBody)
	require.NoError(t, validateModuleAPIResponse(
		response.StatusCode,
		response.Header.Get("Content-Type"),
		body,
	), "gateway request path %s returned status %s, content type %q, and body length %d",
		requestURL.Path, response.Status, response.Header.Get("Content-Type"), len(body))
}
