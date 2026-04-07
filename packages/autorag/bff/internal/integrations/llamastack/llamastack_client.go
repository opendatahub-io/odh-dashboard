package llamastack

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

// LlamaStackClient communicates with a LlamaStack Distribution server using
// direct HTTP calls.
type LlamaStackClient struct {
	httpClient *http.Client
	baseURL    string
	authToken  string
}

// NewLlamaStackClient creates a new client configured for Llama Stack.
// llama-stack v0.4.0+ removed the `/v1/openai/v1/` routes.
// All endpoints are now served directly under `/v1/`.
// See: https://github.com/llamastack/llama-stack/releases/tag/v0.4.0
func NewLlamaStackClient(baseURL string, authToken string, insecureSkipVerify bool, rootCAs *x509.CertPool) *LlamaStackClient {
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

	return &LlamaStackClient{
		httpClient: httpClient,
		baseURL:    baseURL,
		authToken:  authToken,
	}
}

// ListModels retrieves all available models from LlamaStack.
// Deserializes into LlamaStackNativeModel structs so that upstream schema
// changes are surfaced explicitly rather than hidden behind the OpenAI SDK.
func (c *LlamaStackClient) ListModels(ctx context.Context) ([]models.LlamaStackNativeModel, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/v1/models", nil)
	if err != nil {
		return nil, NewConnectionError(fmt.Sprintf("failed to create request for LlamaStack models: %s", err.Error()))
	}

	req.Header.Set("Accept", "application/json")
	if c.authToken != "" && req.URL.Scheme == "https" {
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
		return nil, NewLlamaStackError(ErrCodeInternalError,
			fmt.Sprintf("failed to read LlamaStack models response body: %s", err.Error()),
			http.StatusInternalServerError)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, mapHTTPStatusToError(resp.StatusCode, body, "models")
	}

	// LlamaStack wraps the models array in a { "data": [...] } envelope.
	var envelope struct {
		Data []models.LlamaStackNativeModel `json:"data"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		// If the envelope format changed, try parsing as a bare array as a fallback.
		var bare []models.LlamaStackNativeModel
		if errBare := json.Unmarshal(body, &bare); errBare == nil {
			return bare, nil
		}
		return nil, NewLlamaStackError(ErrCodeInternalError,
			fmt.Sprintf("failed to parse LlamaStack models response: %s", err.Error()),
			http.StatusInternalServerError)
	}

	return envelope.Data, nil
}

// ListProviders retrieves all registered providers from LlamaStack via
// the native /v1/providers (not part of the OpenAI-compatible API).
func (c *LlamaStackClient) ListProviders(ctx context.Context) ([]models.LlamaStackProvider, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/v1/providers", nil)
	if err != nil {
		return nil, NewConnectionError(fmt.Sprintf("failed to create request for LlamaStack providers: %s", err.Error()))
	}

	// Set headers — omit Authorization over plain HTTP to avoid leaking tokens
	req.Header.Set("Accept", "application/json")
	if c.authToken != "" && req.URL.Scheme == "https" {
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
		return nil, NewLlamaStackError(ErrCodeInternalError,
			fmt.Sprintf("failed to read LlamaStack providers response body: %s", err.Error()),
			http.StatusInternalServerError)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, mapHTTPStatusToError(resp.StatusCode, body, "providers")
	}

	// LlamaStack wraps the providers array in a { "data": [...] } envelope.
	var envelope struct {
		Data []models.LlamaStackProvider `json:"data"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		return nil, NewLlamaStackError(ErrCodeInternalError,
			fmt.Sprintf("failed to parse LlamaStack providers response: %s", err.Error()),
			http.StatusInternalServerError)
	}

	return envelope.Data, nil
}
