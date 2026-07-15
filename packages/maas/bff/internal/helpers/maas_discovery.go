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
	"strings"
	"time"

	"github.com/opendatahub-io/maas-library/bff/internal/config"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
	clientRest "k8s.io/client-go/rest"
)

const (
	maasAPIServiceName = "maas-api"
	maasAPIServicePort = 8443
)

var dashboardToInfraNamespace = map[string]string{
	"opendatahub":             "odh-ai-gateway-infra",
	"redhat-ods-applications": "redhat-ai-gateway-infra",
}

// ResolveMaasApiInfraNamespace maps the BFF pod namespace to the maas-api infrastructure namespace.
func ResolveMaasApiInfraNamespace(podNamespace, override string) string {
	if override != "" {
		return override
	}
	if infra, ok := dashboardToInfraNamespace[podNamespace]; ok {
		return infra
	}
	return podNamespace
}

// ResolveMaasApiInternalURL builds the internal maas-api Service base URL for /v1/tenants discovery.
func ResolveMaasApiInternalURL(cfg config.EnvConfig) (string, error) {
	if cfg.MaasApiInternalUrl != "" {
		return strings.TrimSuffix(cfg.MaasApiInternalUrl, "/"), nil
	}

	namespace := cfg.MaasApiNamespace
	if namespace == "" {
		podNamespace := strings.TrimSpace(cfg.PodNamespace)
		if podNamespace == "" {
			return "", fmt.Errorf("maas-api namespace unresolved: set POD_NAMESPACE, MAAS_API_NAMESPACE, or MAAS_API_INTERNAL_URL")
		}
		namespace = ResolveMaasApiInfraNamespace(podNamespace, "")
	}

	if namespace == "" {
		return "", fmt.Errorf("maas-api namespace is empty; set MAAS_API_NAMESPACE or MAAS_API_INTERNAL_URL")
	}

	return fmt.Sprintf("https://%s.%s.svc.cluster.local:%d", maasAPIServiceName, namespace, maasAPIServicePort), nil
}

// DiscoverMaasApiURL calls GET /v1/tenants on the internal maas-api Service and returns
// the external gateway URL with /maas-api suffix for passthrough calls.
func DiscoverMaasApiURL(ctx context.Context, cfg config.EnvConfig, logger *slog.Logger, rootCAs *x509.CertPool) (string, error) {
	internalURL, err := ResolveMaasApiInternalURL(cfg)
	if err != nil {
		return "", err
	}

	restCfg, err := clientRest.InClusterConfig()
	if err != nil {
		return "", fmt.Errorf("load in-cluster config for maas-api tenant discovery: %w", err)
	}
	if restCfg.BearerToken == "" {
		return "", fmt.Errorf("in-cluster config has no bearer token for maas-api tenant discovery")
	}

	tenantsURL, err := url.JoinPath(internalURL, "v1", "tenants")
	if err != nil {
		return "", fmt.Errorf("build tenants discovery URL: %w", err)
	}

	transport := &http.Transport{
		TLSClientConfig: &tls.Config{
			RootCAs:            rootCAs,
			InsecureSkipVerify: cfg.InsecureSkipVerify,
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
	req.Header.Set("Authorization", "Bearer "+restCfg.BearerToken)
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

	maasApiURL, err := MaasApiURLFromTenantsResponse(tenantsResp)
	if err != nil {
		return "", err
	}

	logger.Info("Discovered MaaS API URL from /v1/tenants",
		"tenant", tenantsResp.Tenants[0].Name,
		"gateway", tenantsResp.Tenants[0].Gateway.Name,
		"url", maasApiURL)

	return maasApiURL, nil
}

// MaasApiURLFromTenantsResponse builds the passthrough MaaS API base URL from a /v1/tenants response.
func MaasApiURLFromTenantsResponse(resp models.TenantsResponse) (string, error) {
	if len(resp.Tenants) == 0 {
		return "", fmt.Errorf("maas-api /v1/tenants returned no tenants")
	}

	externalURL := strings.TrimSpace(resp.Tenants[0].Gateway.ExternalURL)
	if externalURL == "" {
		return "", fmt.Errorf("maas-api /v1/tenants returned empty gateway.externalUrl")
	}

	maasApiURL, err := url.JoinPath(externalURL, "maas-api")
	if err != nil {
		return "", fmt.Errorf("build MaaS API URL from externalUrl %q: %w", externalURL, err)
	}

	return maasApiURL, nil
}
