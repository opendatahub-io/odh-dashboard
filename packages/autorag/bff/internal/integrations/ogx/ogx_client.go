package ogx

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

// OGXClient communicates with a Open GenAI Stack Distribution server using
// direct HTTP calls.
type OGXClient struct {
	httpClient *http.Client
	baseURL    string
	authToken  string
}

// NewOGXClient creates a new client configured for Open GenAI Stack.
// ogx v0.4.0+ removed the `/v1/openai/v1/` routes.
// All endpoints are now served directly under `/v1/`.
// See: https://github.com/ogx/ogx/releases/tag/v0.4.0
func NewOGXClient(baseURL string, authToken string, insecureSkipVerify bool, rootCAs *x509.CertPool) *OGXClient {
	tlsConfig := &tls.Config{
		InsecureSkipVerify: insecureSkipVerify,
		MinVersion:         tls.VersionTLS13,
	}
	if rootCAs != nil {
		tlsConfig.RootCAs = rootCAs
	}

	httpClient := &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: tlsConfig,
		},
		Timeout: 8 * time.Minute, // Overall request timeout (matches server WriteTimeout)
	}

	return &OGXClient{
		httpClient: httpClient,
		baseURL:    baseURL,
		authToken:  authToken,
	}
}

// ListModels retrieves all available models from OGX.
// Deserializes into OGXNativeModel structs so that upstream schema
// changes are surfaced explicitly rather than hidden behind the OpenAI SDK.
func (c *OGXClient) ListModels(ctx context.Context) ([]models.OGXNativeModel, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/v1/models", nil)
	if err != nil {
		return nil, NewConnectionError(fmt.Sprintf("failed to create request for Open GenAI Stack models: %s", err.Error()))
	}

	// Set headers — omit Authorization over plain HTTP to avoid leaking tokens,
	// except for localhost (dev-mode port-forwarding tunnels in-cluster traffic locally).
	req.Header.Set("Accept", "application/json")
	isLocalhost := req.URL.Hostname() == "localhost" || req.URL.Hostname() == "127.0.0.1"
	if c.authToken != "" && (req.URL.Scheme == "https" || isLocalhost) {
		req.Header.Set("Authorization", "Bearer "+c.authToken)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, wrapClientError(err, "ListModels")
	}
	defer resp.Body.Close()

	const maxModelsResponseBytes = 2 << 20 // 2 MiB
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxModelsResponseBytes))
	if err != nil {
		return nil, NewOGXError(ErrCodeInternalError,
			fmt.Sprintf("failed to read Open GenAI Stack models response body: %s", err.Error()),
			http.StatusInternalServerError)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, mapHTTPStatusToError(resp.StatusCode, body, "models")
	}

	// Open GenAI Stack wraps the models array in a { "data": [...] } envelope.
	var envelope struct {
		Data []models.OGXNativeModel `json:"data"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		// If the envelope format changed, try parsing as a bare array as a fallback.
		var bare []models.OGXNativeModel
		if errBare := json.Unmarshal(body, &bare); errBare == nil {
			return bare, nil
		}
		return nil, NewOGXError(ErrCodeInternalError,
			fmt.Sprintf("failed to parse Open GenAI Stack models response: %s", err.Error()),
			http.StatusInternalServerError)
	}

	return envelope.Data, nil
}

// ListProviders retrieves all registered providers from Open GenAI Stack via
// the native /v1/providers (not part of the OpenAI-compatible API).
func (c *OGXClient) ListProviders(ctx context.Context) ([]models.OGXProvider, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/v1/providers", nil)
	if err != nil {
		return nil, NewConnectionError(fmt.Sprintf("failed to create request for Open GenAI Stack providers: %s", err.Error()))
	}

	// Set headers — omit Authorization over plain HTTP to avoid leaking tokens,
	// except for localhost (dev-mode port-forwarding tunnels in-cluster traffic locally).
	req.Header.Set("Accept", "application/json")
	isLocalhost := req.URL.Hostname() == "localhost" || req.URL.Hostname() == "127.0.0.1"
	if c.authToken != "" && (req.URL.Scheme == "https" || isLocalhost) {
		req.Header.Set("Authorization", "Bearer "+c.authToken)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		// wrapClientError handles url.Error (network failures) correctly
		return nil, wrapClientError(err, "ListProviders")
	}
	defer resp.Body.Close()

	const maxProvidersResponseBytes = 1 << 20 // 1 MiB
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxProvidersResponseBytes))
	if err != nil {
		return nil, NewOGXError(ErrCodeInternalError,
			fmt.Sprintf("failed to read Open GenAI Stack providers response body: %s", err.Error()),
			http.StatusInternalServerError)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, mapHTTPStatusToError(resp.StatusCode, body, "providers")
	}

	// Open GenAI Stack wraps the providers array in a { "data": [...] } envelope.
	var envelope struct {
		Data []models.OGXProvider `json:"data"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		// If the envelope format changed, try parsing as a bare array as a fallback.
		var bare []models.OGXProvider
		if errBare := json.Unmarshal(body, &bare); errBare == nil {
			return bare, nil
		}
		return nil, NewOGXError(ErrCodeInternalError,
			fmt.Sprintf("failed to parse Open GenAI Stack providers response: %s", err.Error()),
			http.StatusInternalServerError)
	}

	return envelope.Data, nil
}
