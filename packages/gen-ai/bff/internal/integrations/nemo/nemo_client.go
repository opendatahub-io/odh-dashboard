package nemo

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const defaultTimeout = 30 * time.Second

// NemoGuardrailsClient calls the NeMo Guardrails API for content moderation.
type NemoGuardrailsClient struct {
	baseURL    string
	authToken  string
	httpClient *http.Client
}

// NewNemoGuardrailsClient creates a client for the NeMo Guardrails API.
func NewNemoGuardrailsClient(baseURL, authToken string, insecureSkipVerify bool, rootCAs *x509.CertPool) *NemoGuardrailsClient {
	transport := &http.Transport{
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: insecureSkipVerify, //nolint:gosec // configurable for dev clusters
			RootCAs:            rootCAs,
		},
	}

	return &NemoGuardrailsClient{
		baseURL:   baseURL,
		authToken: authToken,
		httpClient: &http.Client{
			Transport: transport,
			Timeout:   defaultTimeout,
		},
	}
}

// CheckGuardrails sends a moderation request to NeMo's /v1/guardrail/checks endpoint.
//
// opts must carry a fully inline config (model endpoint, rails, prompts) so that no
// pre-existing ConfigMap is required on the cluster.
func (c *NemoGuardrailsClient) CheckGuardrails(ctx context.Context, messages []Message, opts GuardrailsOptions) (*GuardrailCheckResponse, error) {
	if len(messages) == 0 {
		return nil, fmt.Errorf("messages are required")
	}
	if opts.Config == nil || len(opts.Config.Models) == 0 {
		return nil, fmt.Errorf("inline guardrail config with at least one model is required")
	}

	modelName := DefaultModel
	if mn, ok := opts.Config.Models[0].Parameters["model_name"].(string); ok && mn != "" {
		modelName = mn
	}

	reqBody := GuardrailCheckRequest{
		Model:      modelName,
		Messages:   messages,
		Guardrails: opts,
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	url := c.baseURL + GuardrailChecksPath
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if c.authToken != "" {
		req.Header.Set("Authorization", "Bearer "+c.authToken)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("guardrail check request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("guardrail check returned status %d: %s", resp.StatusCode, string(respBody))
	}

	var result GuardrailCheckResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &result, nil
}
