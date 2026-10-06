package api

import (
	"context"
	"fmt"
	"net/url"
	"strings"

	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// resolveMaaSGatewayURL gets the externally reachable MaaS API base URL from
// the MaaS BFF. Consumers use this as the source of truth for MaaS availability
// and for workloads, such as sandboxes, that run outside the dashboard namespace.
func resolveMaaSGatewayURL(ctx context.Context) (string, error) {
	maasClient := bffclient.GetClient(ctx, bffclient.BFFTargetMaaS)
	if maasClient == nil {
		return "", bffclient.NewServerUnavailableError(bffclient.BFFTargetMaaS)
	}

	var response models.MaaSBFFGatewayURLResponse
	if err := maasClient.Call(ctx, "GET", "/gateway-url", nil, &response); err != nil {
		return "", fmt.Errorf("get MaaS gateway URL: %w", err)
	}

	parsedURL, err := url.Parse(response.Data.URL)
	if err != nil || parsedURL.Host == "" || (parsedURL.Scheme != "http" && parsedURL.Scheme != "https") {
		return "", fmt.Errorf("MaaS BFF returned an invalid gateway URL")
	}
	if !strings.HasSuffix(strings.TrimSuffix(parsedURL.Path, "/"), "/maas-api") {
		return "", fmt.Errorf("MaaS BFF returned a gateway URL without the /maas-api path")
	}

	return strings.TrimSuffix(response.Data.URL, "/"), nil
}
