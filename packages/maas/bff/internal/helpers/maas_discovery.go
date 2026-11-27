package helper

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/opendatahub-io/maas-library/bff/internal/config"
	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/dynamic"
	clientRest "k8s.io/client-go/rest"
)

const (
	maasAPIServiceName     = "maas-api"
	maasAPIServicePort     = 8443
	maasDefaultGatewayName = "maas-default-gateway"

	// Bound for a single discovery attempt (DSC lookup + /v1/tenants HTTP).
	MaasDiscoveryAttemptTimeout = 15 * time.Second

	// OdhPlatformType values mirrored from the dashboard backend (status.release.name).
	releaseOpenDataHub      = "Open Data Hub"
	releaseSelfManagedRHOAI = "OpenShift AI Self-Managed"
	releaseManagedRHOAI     = "OpenShift AI Cloud Service"

	infraNamespaceODH   = "odh-ai-gateway-infra"
	infraNamespaceRHOAI = "redhat-ai-gateway-infra"
)

// InfraNamespaceFromReleaseName maps DSC status.release.name to the maas-api infra namespace.
// The bool is false when the release name is unrecognized.
func InfraNamespaceFromReleaseName(releaseName string) (string, bool) {
	switch strings.TrimSpace(releaseName) {
	case releaseSelfManagedRHOAI, releaseManagedRHOAI:
		return infraNamespaceRHOAI, true
	case releaseOpenDataHub:
		return infraNamespaceODH, true
	default:
		return "", false
	}
}

// FetchDSCReleaseName lists DataScienceClusters (cluster-scoped), takes the first item,
// and returns status.release.name.
func FetchDSCReleaseName(ctx context.Context, client dynamic.Interface) (string, error) {
	list, err := client.Resource(constants.DataScienceClusterGvr).List(ctx, metav1.ListOptions{})
	if err != nil {
		return "", fmt.Errorf("list DataScienceClusters: %w", err)
	}
	if len(list.Items) == 0 {
		return "", fmt.Errorf("no DataScienceCluster found")
	}

	name, found, err := unstructured.NestedString(list.Items[0].Object, "status", "release", "name")
	if err != nil {
		return "", fmt.Errorf("read status.release.name: %w", err)
	}
	if !found || strings.TrimSpace(name) == "" {
		return "", fmt.Errorf("DataScienceCluster has empty status.release.name")
	}
	return name, nil
}

// ResolveMaasApiNamespace resolves the maas-api infrastructure namespace.
// Order: cfg.MaasApiNamespace override, DSC status.release.name, then infraNamespaceRHOAI.
func ResolveMaasApiNamespace(ctx context.Context, cfg config.EnvConfig, logger *slog.Logger, dynClient dynamic.Interface) string {
	if cfg.MaasApiNamespace != "" {
		return cfg.MaasApiNamespace
	}

	if dynClient != nil {
		releaseName, err := FetchDSCReleaseName(ctx, dynClient)
		if err != nil {
			logger.Warn("Failed to read DSC product type for maas-api namespace; falling back to RHOAI infra namespace",
				"error", err,
				"namespace", infraNamespaceRHOAI)
		} else if ns, ok := InfraNamespaceFromReleaseName(releaseName); ok {
			logger.Info("Resolved maas-api namespace from DSC release",
				"release", releaseName,
				"namespace", ns)
			return ns
		} else {
			logger.Warn("Unrecognized DSC release.name; falling back to RHOAI infra namespace",
				"release", releaseName,
				"namespace", infraNamespaceRHOAI)
		}
	} else {
		logger.Warn("No dynamic client for DSC product type; falling back to RHOAI infra namespace",
			"namespace", infraNamespaceRHOAI)
	}

	return infraNamespaceRHOAI
}

// ResolveMaasApiInternalURL builds the internal maas-api Service base URL for /v1/tenants discovery.
func ResolveMaasApiInternalURL(cfg config.EnvConfig) (string, error) {
	if cfg.MaasApiInternalUrl != "" {
		return strings.TrimSuffix(cfg.MaasApiInternalUrl, "/"), nil
	}

	namespace := strings.TrimSpace(cfg.MaasApiNamespace)
	if namespace == "" {
		return "", fmt.Errorf("maas-api namespace is empty; set MAAS_API_NAMESPACE or MAAS_API_INTERNAL_URL")
	}

	return fmt.Sprintf("https://%s.%s.svc.cluster.local:%d", maasAPIServiceName, namespace, maasAPIServicePort), nil
}

// restConfigForDiscovery returns a rest config with a bearer token for /v1/tenants discovery.
// In-cluster (service account) is preferred. When the BFF runs outside the cluster
// (e.g. e2e on a CI runner with an oc login session), it falls back to the local
// kubeconfig so discovery still has a token to authenticate with.
func restConfigForDiscovery(logger *slog.Logger) (*clientRest.Config, error) {
	restCfg, inClusterErr := clientRest.InClusterConfig()
	if inClusterErr == nil && restCfg.BearerToken != "" {
		return restCfg, nil
	}
	if inClusterErr != nil {
		logger.Info("Not running in-cluster; falling back to kubeconfig for maas-api tenant discovery",
			"error", inClusterErr)
	} else {
		logger.Info("In-cluster config has no bearer token; falling back to kubeconfig for maas-api tenant discovery")
	}

	kubeCfg, kubeErr := GetKubeconfig()
	if kubeErr != nil {
		return nil, fmt.Errorf("load kubeconfig for maas-api tenant discovery (in-cluster: %v, kubeconfig: %w)", inClusterErr, kubeErr)
	}
	if kubeCfg.BearerToken == "" {
		return nil, fmt.Errorf("kubeconfig has no bearer token for maas-api tenant discovery")
	}
	return kubeCfg, nil
}

// DiscoverMaasApiURL calls GET /v1/tenants on the internal maas-api Service and returns
// the external gateway URL with /maas-api suffix for passthrough calls.
func DiscoverMaasApiURL(ctx context.Context, cfg config.EnvConfig, logger *slog.Logger, rootCAs *x509.CertPool) (string, error) {
	restCfg, err := restConfigForDiscovery(logger)
	if err != nil {
		return "", err
	}

	// When internal URL/namespace are not overridden, resolve infra NS from DSC product type.
	if cfg.MaasApiInternalUrl == "" && cfg.MaasApiNamespace == "" {
		dynClient, dynErr := dynamic.NewForConfig(restCfg)
		if dynErr != nil {
			logger.Warn("Failed to create dynamic client for DSC product type; falling back to RHOAI infra namespace",
				"error", dynErr,
				"namespace", infraNamespaceRHOAI)
			cfg.MaasApiNamespace = ResolveMaasApiNamespace(ctx, cfg, logger, nil)
		} else {
			cfg.MaasApiNamespace = ResolveMaasApiNamespace(ctx, cfg, logger, dynClient)
		}
	}

	return discoverMaasApiURLWithToken(ctx, cfg, logger, rootCAs, restCfg.BearerToken)
}

// discoverMaasApiURLWithToken performs /v1/tenants discovery using an explicit bearer token.
// Separated from DiscoverMaasApiURL so unit tests can exercise the HTTP path without in-cluster config.
func discoverMaasApiURLWithToken(ctx context.Context, cfg config.EnvConfig, logger *slog.Logger, rootCAs *x509.CertPool, bearerToken string) (string, error) {
	internalURL, err := ResolveMaasApiInternalURL(cfg)
	if err != nil {
		return "", err
	}

	tenantsURL, err := url.JoinPath(internalURL, "v1", "tenants")
	if err != nil {
		return "", fmt.Errorf("build tenants discovery URL: %w", err)
	}

	var proxyFunc func(*http.Request) (*url.URL, error)
	if os.Getenv("E2E_USE_PROXY_FROM_ENV") == "true" {
		// Match MaasClient: on e2e runners the internal maas-api Service may only be
		// reachable through the environment proxy.
		proxyFunc = http.ProxyFromEnvironment
	}
	transport := &http.Transport{
		Proxy: proxyFunc,
		TLSClientConfig: &tls.Config{
			RootCAs:            rootCAs,
			InsecureSkipVerify: cfg.InsecureSkipVerify,
			MinVersion:         tls.VersionTLS12,
		},
	}
	client := &http.Client{
		Timeout:   10 * time.Second,
		Transport: transport,
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, tenantsURL, nil)
	if err != nil {
		return "", fmt.Errorf("create tenants discovery request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+bearerToken)
	req.Header.Set("Accept", "application/json")

	logger.Info("Discovering MaaS API URL via /v1/tenants", "internalURL", internalURL)

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("call maas-api GET /v1/tenants at %s: %w", tenantsURL, err)
	}
	defer func() { _ = resp.Body.Close() }()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return "", fmt.Errorf("read maas-api /v1/tenants response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("maas-api GET /v1/tenants returned %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var tenantsResp models.TenantsResponse
	if err := json.Unmarshal(body, &tenantsResp); err != nil {
		return "", fmt.Errorf("parse maas-api /v1/tenants response: %w", err)
	}

	tenant, maasApiURL, err := MaasApiURLFromTenantsResponse(tenantsResp)
	if err != nil {
		return "", err
	}

	logger.Info("Discovered MaaS API URL from /v1/tenants",
		"tenant", tenant.Name,
		"gateway", tenant.Gateway.Name,
		"url", maasApiURL)

	return maasApiURL, nil
}

// MaasApiURLFromTenantsResponse finds the maas-default-gateway tenant and builds the passthrough MaaS API base URL.
func MaasApiURLFromTenantsResponse(resp models.TenantsResponse) (models.TenantInfo, string, error) {
	if len(resp.Tenants) == 0 {
		return models.TenantInfo{}, "", fmt.Errorf("maas-api /v1/tenants returned no tenants")
	}

	var matched *models.TenantInfo
	for i := range resp.Tenants {
		if resp.Tenants[i].Gateway.Name == maasDefaultGatewayName {
			matched = &resp.Tenants[i]
			break
		}
	}
	if matched == nil {
		return models.TenantInfo{}, "", fmt.Errorf("maas-api /v1/tenants returned no tenant with gateway %q", maasDefaultGatewayName)
	}

	externalURL := strings.TrimSpace(matched.Gateway.ExternalURL)
	if externalURL == "" {
		return models.TenantInfo{}, "", fmt.Errorf("maas-api /v1/tenants returned empty gateway.externalUrl for %q", maasDefaultGatewayName)
	}

	maasApiURL, err := url.JoinPath(externalURL, "maas-api")
	if err != nil {
		return models.TenantInfo{}, "", fmt.Errorf("build MaaS API URL from externalUrl %q: %w", externalURL, err)
	}

	return *matched, maasApiURL, nil
}
