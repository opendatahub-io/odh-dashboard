package maas

import (
	"context"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"

	openai "github.com/sashabaranov/go-openai"
)

var ErrMaasUnavailable = errors.New("MaaS service unavailable")

// Client wraps the go-openai client configured for a MaaS endpoint.
type Client struct {
	oai     *openai.Client
	baseURL string
}

// NewClient creates a MaaS client. baseURL should be the base without /v1
// (go-openai appends /v1 automatically). If baseURL already ends with /v1,
// it is stripped here.
func NewClient(baseURL, apiKey string) *Client {
	base := strings.TrimSuffix(strings.TrimRight(baseURL, "/"), "/v1")
	cfg := openai.DefaultConfig(apiKey)
	cfg.BaseURL = base + "/v1"
	return &Client{
		oai:     openai.NewClientWithConfig(cfg),
		baseURL: base,
	}
}

// Embed returns the embedding vector for text using the given model.
func (c *Client) Embed(ctx context.Context, model, text string) ([]float32, error) {
	resp, err := c.oai.CreateEmbeddings(ctx, openai.EmbeddingRequestStrings{
		Input: []string{text},
		Model: openai.EmbeddingModel(model),
	})
	if err != nil {
		return nil, fmt.Errorf("maas embed: %w", err)
	}
	if len(resp.Data) == 0 {
		return nil, fmt.Errorf("maas embed: empty response")
	}
	return resp.Data[0].Embedding, nil
}

// ChatRequest holds parameters for a chat completion call.
type ChatRequest struct {
	Model       string
	Messages    []openai.ChatCompletionMessage
	Temperature float32
	MaxTokens   int
	Stream      bool
}

// ChatResponse holds the text answer and token counts.
type ChatResponse struct {
	Answer string
}

// ChatComplete performs a non-streaming chat completion.
func (c *Client) ChatComplete(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
	resp, err := c.oai.CreateChatCompletion(ctx, openai.ChatCompletionRequest{
		Model:       req.Model,
		Messages:    req.Messages,
		Temperature: req.Temperature,
		MaxTokens:   req.MaxTokens,
	})
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
	stream, err := c.oai.CreateChatCompletionStream(ctx, openai.ChatCompletionRequest{
		Model:       req.Model,
		Messages:    req.Messages,
		Temperature: req.Temperature,
		MaxTokens:   req.MaxTokens,
		Stream:      true,
	})
	if err != nil {
		return nil, fmt.Errorf("maas stream: %w", err)
	}
	defer stream.Close()

	var fullAnswer strings.Builder
	var firstTokenMs int64
	var inputTokens, outputTokens int

	for {
		chunk, err := stream.Recv()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("maas stream recv: %w", err)
		}
		if chunk.Usage != nil {
			inputTokens = chunk.Usage.PromptTokens
			outputTokens = chunk.Usage.CompletionTokens
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

	return &StreamResult{
		FullAnswer:   fullAnswer.String(),
		InputTokens:  inputTokens,
		OutputTokens: outputTokens,
		FirstTokenMs: firstTokenMs,
		TotalMs:      time.Since(start).Milliseconds(),
	}, nil
}

