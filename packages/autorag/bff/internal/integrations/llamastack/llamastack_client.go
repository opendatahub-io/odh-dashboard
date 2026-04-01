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

	"github.com/openai/openai-go/v2"
	"github.com/openai/openai-go/v2/option"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

// LlamaStackClient wraps the OpenAI client for Llama Stack communication.
// It also retains a raw HTTP client and base URL for calling LlamaStack-native
// endpoints (e.g., /v1/providers) that are not part of the OpenAI-compatible API.
type LlamaStackClient struct {
	client     *openai.Client
	httpClient *http.Client
	baseURL    string
	authToken  string
}

// NewLlamaStackClient creates a new client configured for Llama Stack.
// llama-stack v0.4.0+ removed the `/v1/openai/v1/` routes.
// All OpenAI-compatible endpoints are now served directly under `/v1/`.
// See: https://github.com/llamastack/llama-stack/releases/tag/v0.4.0
func NewLlamaStackClient(baseURL string, authToken string, insecureSkipVerify bool, rootCAs *x509.CertPool, apiPath string) *LlamaStackClient {
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

	// Use the provided apiPath to construct the full base URL
	client := openai.NewClient(
		option.WithBaseURL(baseURL+apiPath),
		option.WithAPIKey(authToken),
		option.WithHTTPClient(httpClient),
	)

	return &LlamaStackClient{
		client:     &client,
		httpClient: httpClient,
		baseURL:    baseURL,
		authToken:  authToken,
	}
}

// ListModels retrieves all available models from Llama Stack.
func (c *LlamaStackClient) ListModels(ctx context.Context) ([]openai.Model, error) {
	iter := c.client.Models.ListAutoPaging(ctx)
	models := make([]openai.Model, 0)
	for iter.Next() {
		models = append(models, iter.Current())
	}
	if err := iter.Err(); err != nil {
		return nil, wrapClientError(err, "ListModels")
	}
	return models, nil
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
		switch resp.StatusCode {
		case http.StatusUnauthorized:
			return nil, NewUnauthorizedError("unauthorized to access LlamaStack providers")
		case http.StatusNotFound:
			return nil, NewNotFoundError("LlamaStack providers not found — ensure LlamaStack version supports /v1/providers")
		case http.StatusServiceUnavailable, http.StatusGatewayTimeout:
			return nil, NewServerUnavailableError("LlamaStack service unavailable while listing providers")
		default:
			return nil, NewLlamaStackError(ErrCodeInternalError,
				fmt.Sprintf("unexpected status %d from LlamaStack providers: %s", resp.StatusCode, string(body)),
				resp.StatusCode)
		}
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
