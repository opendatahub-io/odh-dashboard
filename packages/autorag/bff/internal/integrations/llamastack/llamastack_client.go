package llamastack

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"net/http"
	"time"

	"github.com/openai/openai-go/v2"
	"github.com/openai/openai-go/v2/option"
)

// LlamaStackClient wraps the OpenAI client for Llama Stack communication.
type LlamaStackClient struct {
	client *openai.Client
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
		client: &client,
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

// ListVectorStores retrieves all available vector stores from Llama Stack.
func (c *LlamaStackClient) ListVectorStores(ctx context.Context) ([]openai.VectorStore, error) {
	iter := c.client.VectorStores.ListAutoPaging(ctx, openai.VectorStoreListParams{})
	stores := make([]openai.VectorStore, 0)
	for iter.Next() {
		stores = append(stores, iter.Current())
	}
	if err := iter.Err(); err != nil {
		return nil, wrapClientError(err, "ListVectorStores")
	}
	return stores, nil
}
