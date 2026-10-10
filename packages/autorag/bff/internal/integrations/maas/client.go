package maas

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/openai/openai-go"
	"github.com/openai/openai-go/option"
)

var ErrMaasUnavailable = errors.New("MaaS service unavailable")

// ErrStreamOutputLimit prevents a provider from making the BFF accumulate an
// unbounded answer, even when the provider ignores max_tokens.
var ErrStreamOutputLimit = errors.New("stream output limit exceeded")

const maxStreamOutputBytes = 4 << 20

const (
	maxEmbeddingResults          = 16
	maxEmbeddingVectorDimensions = 16384
)

func appendStreamOutput(builder *strings.Builder, delta string) error {
	if builder.Len()+len(delta) > maxStreamOutputBytes {
		return ErrStreamOutputLimit
	}
	builder.WriteString(delta)
	return nil
}

// Client wraps the official OpenAI client configured for a MaaS endpoint.
type Client struct {
	oai     openai.Client
	baseURL string
	http    *http.Client
	apiKey  string
}

// ClientFactory creates a MaaS client with per-secret credentials and a shared
// configured HTTP transport.
type ClientFactory func(baseURL, apiKey string) (*Client, error)

// NewClientFactory creates per-secret clients using the configured MaaS
// transport policy.
func NewClientFactory(cfg MaaSClientConfig) ClientFactory {
	return NewClientFactoryWithHTTPClient(NewDefaultHTTPClient(cfg))
}

// NewClient creates a MaaS client. baseURL should be the base without /v1
// (the client appends /v1 automatically). If baseURL already ends with /v1,
// it is stripped here.
func NewClient(baseURL, apiKey string) (*Client, error) {
	return NewClientWithHTTPClient(baseURL, apiKey, http.DefaultClient)
}

// NewClientFactoryWithHTTPClient creates a factory that reuses the supplied
// transport while allowing each request to provide its own MaaS credentials.
func NewClientFactoryWithHTTPClient(httpClient *http.Client) ClientFactory {
	return func(baseURL, apiKey string) (*Client, error) {
		return NewClientWithHTTPClient(baseURL, apiKey, httpClient)
	}
}

// NewClientWithHTTPClient creates a MaaS client using the supplied HTTP client.
// The HTTP client owns TLS policy; this function only configures the endpoint
// and credentials for the new OpenAI client.
func NewClientWithHTTPClient(baseURL, apiKey string, httpClient *http.Client) (*Client, error) {
	parsed, err := ValidateBaseURL(baseURL)
	if err != nil {
		return nil, fmt.Errorf("maas: %w", err)
	}
	clientCopy := *httpClient
	clientCopy.Transport = limitMaaSResponseBody(httpClient.Transport)
	httpClient = &clientCopy

	base := strings.TrimSuffix(strings.TrimRight(parsed.String(), "/"), "/v1")
	options := []option.RequestOption{
		option.WithAPIKey(apiKey),
		option.WithBaseURL(base + "/v1"),
		option.WithRequestTimeout(2 * time.Minute),
		option.WithHTTPClient(httpClient),
	}
	return &Client{
		oai:     openai.NewClient(options...),
		baseURL: base,
		http:    httpClient,
		apiKey:  apiKey,
	}, nil
}

// Embed returns the embedding vector for text using the given model.
func (c *Client) Embed(ctx context.Context, model, text string) ([]float32, error) {
	body, err := json.Marshal(map[string]string{"input": text, "model": model})
	if err != nil {
		return nil, fmt.Errorf("maas embed request: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/v1/embeddings", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("maas embed request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	setAuthHeader(req, c.apiKey)
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("maas embed: %w", wrapMaaSClientError(err))
	}
	defer resp.Body.Close()
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return nil, fmt.Errorf("maas embed: %w", mapHTTPStatusToError(resp.StatusCode))
	}
	vecs, err := decodeEmbeddingResponse(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("maas embed: %w", err)
	}
	if len(vecs) == 0 {
		return nil, fmt.Errorf("maas embed: empty response")
	}
	return vecs[0], nil
}

// ChatRequest holds parameters for a chat completion call.
type ChatRequest struct {
	Model       string
	Messages    []openai.ChatCompletionMessageParamUnion
	Temperature *float32
	MaxTokens   int
	Stream      bool
}

// ChatResponse holds the text answer and token counts.
type ChatResponse struct {
	Answer string
}

func chatParams(req ChatRequest) openai.ChatCompletionNewParams {
	params := openai.ChatCompletionNewParams{
		Model:    req.Model,
		Messages: req.Messages,
	}
	if req.Temperature != nil {
		params.Temperature = openai.Float(float64(*req.Temperature))
	}
	if req.MaxTokens != 0 {
		params.MaxTokens = openai.Int(int64(req.MaxTokens))
	}
	return params
}

// ChatComplete performs a non-streaming chat completion.
func (c *Client) ChatComplete(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
	resp, err := c.oai.Chat.Completions.New(ctx, chatParams(req))
	if err != nil {
		return nil, fmt.Errorf("maas chat: %w", err)
	}
	if len(resp.Choices) == 0 {
		return nil, fmt.Errorf("maas chat: empty choices")
	}
	if len(resp.Choices[0].Message.Content) > maxStreamOutputBytes {
		return nil, ErrStreamOutputLimit
	}
	return &ChatResponse{Answer: resp.Choices[0].Message.Content}, nil
}

// StreamResult holds the outcome of a streaming chat completion.
type StreamResult struct {
	FullAnswer   string
	InputTokens  int
	OutputTokens int
	FirstTokenMs int64
	TotalMs      int64
}

// ChatCompleteStreamWithCallback streams a chat completion, calling onDelta for each text token.
// Returns the full answer and usage/timing stats.
func (c *Client) ChatCompleteStreamWithCallback(ctx context.Context, req ChatRequest, onDelta func(delta string)) (*StreamResult, error) {
	start := time.Now()
	params := chatParams(req)
	params.StreamOptions = openai.ChatCompletionStreamOptionsParam{
		IncludeUsage: openai.Bool(true),
	}

	stream := c.oai.Chat.Completions.NewStreaming(ctx, params)
	defer stream.Close()

	var fullAnswer strings.Builder
	var firstTokenMs int64
	var inputTokens, outputTokens int

	for stream.Next() {
		chunk := stream.Current()
		if chunk.Usage.TotalTokens > 0 {
			inputTokens = int(chunk.Usage.PromptTokens)
			outputTokens = int(chunk.Usage.CompletionTokens)
		}
		if len(chunk.Choices) == 0 {
			continue
		}
		delta := chunk.Choices[0].Delta.Content
		if delta == "" {
			continue
		}
		if firstTokenMs == 0 {
			firstTokenMs = time.Since(start).Milliseconds()
		}
		if err := appendStreamOutput(&fullAnswer, delta); err != nil {
			return nil, err
		}
		onDelta(delta)
	}
	if err := stream.Err(); err != nil {
		return nil, fmt.Errorf("maas stream recv: %w", err)
	}

	return &StreamResult{
		FullAnswer:   fullAnswer.String(),
		InputTokens:  inputTokens,
		OutputTokens: outputTokens,
		FirstTokenMs: firstTokenMs,
		TotalMs:      time.Since(start).Milliseconds(),
	}, nil
}
