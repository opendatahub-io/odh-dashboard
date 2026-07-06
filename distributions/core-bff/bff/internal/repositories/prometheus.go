package repositories

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
)

// PrometheusConfig holds configuration for creating a PrometheusRepository.
type PrometheusConfig struct {
	Host               string
	Namespace          string
	Instance           string
	Port               string
	RootCAs            *x509.CertPool
	InsecureSkipVerify bool
}

// PrometheusRepository handles Prometheus/Thanos query operations.
type PrometheusRepository struct {
	httpClient *http.Client
	host       string
}

func NewPrometheusRepository(cfg PrometheusConfig) *PrometheusRepository {
	host := cfg.Host
	if host == "" && cfg.Instance != "" && cfg.Namespace != "" && cfg.Port != "" {
		host = fmt.Sprintf("https://%s.%s.svc.cluster.local:%s", cfg.Instance, cfg.Namespace, cfg.Port)
	}

	tlsConfig := &tls.Config{
		RootCAs:            cfg.RootCAs,
		InsecureSkipVerify: cfg.InsecureSkipVerify, //nolint:gosec // configurable for dev mode
	}

	return &PrometheusRepository{
		httpClient: &http.Client{
			Transport: &http.Transport{
				TLSClientConfig: tlsConfig,
			},
		},
		host: host,
	}
}

// Query executes a Prometheus query and returns the response.
// queryType should be "query" for instant or "query_range" for range queries.
func (r *PrometheusRepository) Query(ctx context.Context, token, query, queryType string) (*models.PrometheusQueryResponse, error) {
	if r.host == "" {
		return nil, &models.PrometheusUnavailableError{Reason: "no Prometheus host configured"}
	}

	u, err := url.Parse(fmt.Sprintf("%s/api/v1/%s", r.host, queryType))
	if err != nil {
		return nil, fmt.Errorf("failed to build Prometheus URL: %w", err)
	}
	vals, err := url.ParseQuery(query)
	if err != nil {
		return nil, fmt.Errorf("failed to parse query parameters: %w", err)
	}
	u.RawQuery = vals.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create Prometheus request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := r.httpClient.Do(req)
	if err != nil {
		return nil, &models.PrometheusUnavailableError{Reason: err.Error()}
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("cannot fetch prometheus data, failed to read response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, &models.PrometheusUpstreamError{StatusCode: resp.StatusCode, Body: string(body)}
	}

	var parsed struct {
		Status string `json:"status"`
		Error  string `json:"error"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, &models.PrometheusUnparsableError{Reason: err.Error()}
	}

	if parsed.Status == "error" {
		return nil, &models.PrometheusQueryError{Message: parsed.Error}
	}

	return &models.PrometheusQueryResponse{
		Code:     resp.StatusCode,
		Response: json.RawMessage(body),
	}, nil
}
