package maas

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/openai/openai-go"
	"github.com/openai/openai-go/option"
)

var ErrMaasUnavailable = errors.New("MaaS service unavailable")

// Client wraps the official OpenAI client configured for a MaaS endpoint.
type Client struct {
	oai     openai.Client
	baseURL string
}

// NewClient creates a MaaS client. baseURL should be the base without /v1
// (the client appends /v1 automatically). If baseURL already ends with /v1,
// it is stripped here.
func NewClient(baseURL, apiKey string) (*Client, error) {
	parsed, err := url.Parse(strings.TrimSpace(baseURL))
	if err != nil {
		return nil, fmt.Errorf("maas: invalid base URL: %w", err)
	}
	if parsed.Scheme != "https" || parsed.Host == "" {
		return nil, fmt.Errorf("maas: base URL must use HTTPS and include a host")
	}

	base := strings.TrimSuffix(strings.TrimRight(parsed.String(), "/"), "/v1")
	options := []option.RequestOption{
		option.WithAPIKey(apiKey),
		option.WithBaseURL(base + "/v1"),
		option.WithRequestTimeout(2 * time.Minute),
	}
	return &Client{
		oai:     openai.NewClient(options...),
		baseURL: base,
	}, nil
}

// Embed returns the embedding vector for text using the given model.
func (c *Client) Embed(ctx context.Context, model, text string) ([]float32, error) {
	resp, err := c.oai.Embeddings.New(ctx, openai.EmbeddingNewParams{
		Input: openai.EmbeddingNewParamsInputUnion{OfString: openai.String(text)},
		Model: openai.EmbeddingModel(model),
	})
	if err != nil {
		return nil, fmt.Errorf("maas embed: %w", err)
	}
	if len(resp.Data) == 0 {
		return nil, fmt.Errorf("maas embed: empty response")
	}
	raw := resp.Data[0].Embedding
	vec := make([]float32, len(raw))
	for i, v := range raw {
		vec[i] = float32(v)
	}
	return vec, nil
}

// ChatRequest holds parameters for a chat completion call.
type ChatRequest struct {
	Model       string
	Messages    []openai.ChatCompletionMessageParamUnion
	Temperature float32
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
	if req.Temperature != 0 {
		params.Temperature = openai.Float(float64(req.Temperature))
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
		fullAnswer.WriteString(delta)
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
