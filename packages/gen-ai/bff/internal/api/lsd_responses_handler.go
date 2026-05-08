package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/julienschmidt/httprouter"
	"github.com/openai/openai-go/v2/responses"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	k8s "github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// Supported streaming event types that we want to process for the Gen AI API
// These events represent the core response generation lifecycle that clients need to track.
// Other LlamaStack events (connection, debug, etc.) are filtered out to reduce
// noise and bandwidth while maintaining the essential streaming response functionality.
var supportedEventTypes = map[string]bool{
	"response.created":            true, // Response generation started
	"response.content_part.added": true, // New content part added to response
	"response.output_text.delta":  true, // Text delta/chunk for streaming text
	"response.content_part.done":  true, // Content part completed
	"response.completed":          true, // Response generation completed
	"response.refusal.delta":      true, // Refusal text
	"response.refusal.done":       true, // Refusal text completed
}

// isEventTypeSupported checks if the given event type should be processed
func isEventTypeSupported(eventType string) bool {
	return supportedEventTypes[eventType]
}

// ChatContextMessage represents a message in chat context history
type ChatContextMessage struct {
	Role    string `json:"role"`    // "user" or "assistant"
	Content string `json:"content"` // Message content
}

// StreamingEvent represents a streaming event
type StreamingEvent struct {
	Delta          string        `json:"delta,omitempty"`
	Refusal        string        `json:"refusal,omitempty"` // For response.refusal.done events (OpenAI standard)
	SequenceNumber int64         `json:"sequence_number"`
	Type           string        `json:"type"`
	ItemID         string        `json:"item_id,omitempty"`
	OutputIndex    int           `json:"output_index"`
	ContentIndex   int           `json:"content_index,omitempty"` // For refusal events
	Response       *ResponseData `json:"response,omitempty"`
}

// ResponseData represents the response structure for both streaming and non-streaming
type ResponseData struct {
	ID                 string           `json:"id"`
	Model              string           `json:"model"`
	Status             string           `json:"status"`
	CreatedAt          int64            `json:"created_at"`
	Output             []OutputItem     `json:"output,omitempty"`
	PreviousResponseID string           `json:"previous_response_id,omitempty"` // Reference to previous response in conversation thread
	Metrics            *ResponseMetrics `json:"metrics,omitempty"`              // Response metrics (latency, usage)
}

// OutputItem represents an output item with essential fields
type OutputItem struct {
	ID      string         `json:"id,omitempty"`
	Type    string         `json:"type"`
	Role    string         `json:"role,omitempty"`
	Status  string         `json:"status,omitempty"`
	Content []ContentItem  `json:"content,omitempty"`
	Queries []string       `json:"queries,omitempty"`
	Results []SearchResult `json:"results,omitempty"`

	// MCP-specific fields
	ServerLabel string      `json:"server_label,omitempty"`
	Arguments   string      `json:"arguments,omitempty"`
	Name        string      `json:"name,omitempty"`
	Error       string      `json:"error,omitempty"`
	Output      interface{} `json:"output,omitempty"`
}

// ContentItem represents content with essential fields
type ContentItem struct {
	Type        string        `json:"type"`
	Text        string        `json:"text,omitempty"`        // For output_text content type
	Refusal     string        `json:"refusal,omitempty"`     // For refusal content type (OpenAI standard for guardrails)
	Annotations []interface{} `json:"annotations,omitempty"` // For content annotations
}

// SearchResult represents search results with essential fields
type SearchResult struct {
	Score    float64 `json:"score"`
	Text     string  `json:"text"`
	Filename string  `json:"filename,omitempty"`
}

// ResponseMetrics contains timing and usage metrics for the response
type ResponseMetrics struct {
	LatencyMs          int64      `json:"latency_ms"`                       // Total response time in milliseconds
	TimeToFirstTokenMs *int64     `json:"time_to_first_token_ms,omitempty"` // TTFT for streaming (nil for non-streaming)
	Usage              *UsageData `json:"usage,omitempty"`                  // Token usage data
}

// UsageData contains token usage information from LlamaStack
type UsageData struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
	TotalTokens  int `json:"total_tokens"`
}

// MetricsEvent represents the response.metrics streaming event
type MetricsEvent struct {
	Type    string          `json:"type"`    // "response.metrics"
	Metrics ResponseMetrics `json:"metrics"` // Metrics data
}

// MCPServer represents MCP server configuration for responses
type MCPServer struct {
	ServerLabel   string   `json:"server_label"`            // Label identifier for the MCP server
	ServerURL     string   `json:"server_url"`              // URL endpoint for the MCP server
	Authorization string   `json:"authorization,omitempty"` // OAuth access token for MCP server authentication
	AllowedTools  []string `json:"allowed_tools,omitempty"` // List of specific tool names allowed from this server
}

// CreateResponseRequest represents the request body for creating a response
type CreateResponseRequest struct {
	Input string `json:"input"`
	Model string `json:"model"`

	VectorStoreIDs     []string             `json:"vector_store_ids,omitempty"`     // Enables RAG
	ChatContext        []ChatContextMessage `json:"chat_context,omitempty"`         // Conversation history
	Temperature        *float64             `json:"temperature,omitempty"`          // Controls creativity (0.0-2.0)
	TopP               *float64             `json:"top_p,omitempty"`                // Controls randomness (0.0-1.0)
	Instructions       string               `json:"instructions,omitempty"`         // System message/behavior
	Stream             bool                 `json:"stream,omitempty"`               // Enable streaming response
	MCPServers         []MCPServer          `json:"mcp_servers,omitempty"`          // MCP server configurations
	PreviousResponseID string               `json:"previous_response_id,omitempty"` // Link to previous response for conversation continuity
	Store              *bool                `json:"store,omitempty"`                // Store response for later retrieval (default true)
	InputShieldID      string               `json:"input_shield_id,omitempty"`      // Shield ID for input moderation (e.g., "trustyai_input")
	OutputShieldID     string               `json:"output_shield_id,omitempty"`     // Shield ID for output moderation (e.g., "trustyai_output")
	ModelSourceType    string               `json:"model_source_type,omitempty"`    // Source type: "namespace", "custom_endpoint", "maas"
	Subscription       string               `json:"subscription,omitempty"`         // MaaS subscription name for API key generation
}

// convertToStreamingEvent converts a LlamaStack event to our clean StreamingEvent schema
func convertToStreamingEvent(event interface{}) *StreamingEvent {
	// Direct marshal to our clean schema - Go JSON ignores extra fields automatically!
	eventJSON, err := json.Marshal(event)
	if err != nil {
		return nil
	}

	var streamingEvent StreamingEvent
	if err := json.Unmarshal(eventJSON, &streamingEvent); err != nil {
		return nil
	}

	// Only process the supported event types, ignore all others
	if !isEventTypeSupported(streamingEvent.Type) {
		// Skip some events types to reduce noise.
		// Full list of events: https://platform.openai.com/docs/api-reference/responses-streaming
		return nil
	}

	return &streamingEvent
}

// convertToResponseData converts a LlamaStack response to our clean ResponseData schema
func convertToResponseData(llamaResponse interface{}) ResponseData {
	// Direct marshal to our clean schema - JSON unmarshaling ignores extra fields automatically
	var responseData ResponseData

	responseJSON, err := json.Marshal(llamaResponse)
	if err != nil {
		// Marshal failed - return zero-value ResponseData
		return responseData
	}

	// Attempt unmarshal - ignore errors as responseData will keep zero values if it fails
	// This is expected to be rare since we're marshaling from a valid Go struct
	_ = json.Unmarshal(responseJSON, &responseData)

	return responseData
}

// extractUsage extracts usage data from a LlamaStack response
func extractUsage(llamaResponse interface{}) *UsageData {
	// Use type assertion for efficiency (avoids marshal/unmarshal overhead)
	if resp, ok := llamaResponse.(*responses.Response); ok {
		return &UsageData{
			InputTokens:  int(resp.Usage.InputTokens),
			OutputTokens: int(resp.Usage.OutputTokens),
			TotalTokens:  int(resp.Usage.TotalTokens),
		}
	}
	return nil
}

// extractUsageFromEvent extracts usage data from a streaming event (response.completed)
func extractUsageFromEvent(event interface{}) *UsageData {
	// The response.completed event contains the full response with usage
	eventJSON, err := json.Marshal(event)
	if err != nil {
		return nil
	}

	var raw struct {
		Response *struct {
			Usage *struct {
				InputTokens  int `json:"input_tokens"`
				OutputTokens int `json:"output_tokens"`
				TotalTokens  int `json:"total_tokens"`
			} `json:"usage"`
		} `json:"response"`
	}

	if err := json.Unmarshal(eventJSON, &raw); err != nil || raw.Response == nil || raw.Response.Usage == nil {
		return nil
	}

	return &UsageData{
		InputTokens:  raw.Response.Usage.InputTokens,
		OutputTokens: raw.Response.Usage.OutputTokens,
		TotalTokens:  raw.Response.Usage.TotalTokens,
	}
}

// calculateTTFT calculates Time to First Token in milliseconds
func calculateTTFT(startTime time.Time, firstTokenTime *time.Time) *int64 {
	if firstTokenTime == nil {
		return nil
	}
	ttft := firstTokenTime.Sub(startTime).Milliseconds()
	return &ttft
}

// LlamaStackCreateResponseHandler handles POST /gen-ai/api/v1/responses
func (app *App) LlamaStackCreateResponseHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	// Parse the request body
	var createRequest CreateResponseRequest
	if err := json.NewDecoder(r.Body).Decode(&createRequest); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// Validate required fields
	if createRequest.Input == "" {
		app.badRequestResponse(w, r, errors.New("input is required"))
		return
	}
	if createRequest.Model == "" {
		app.badRequestResponse(w, r, errors.New("model is required"))
		return
	}

	createRequest.Subscription = strings.TrimSpace(createRequest.Subscription)

	// Convert chat context format
	var chatContext []llamastack.ChatContextMessage
	for _, msg := range createRequest.ChatContext {
		chatContext = append(chatContext, llamastack.ChatContextMessage{
			Role:    msg.Role,
			Content: msg.Content,
		})
	}

	// Convert MCP servers to LlamaStack tool parameters
	var mcpServerParams []llamastack.MCPServerParam
	if len(createRequest.MCPServers) > 0 {
		for _, server := range createRequest.MCPServers {
			// Validate MCP server parameters
			if server.ServerLabel == "" {
				app.badRequestResponse(w, r, errors.New("server_label is required for MCP server"))
				return
			}
			if server.ServerURL == "" {
				app.badRequestResponse(w, r, errors.New("server_url is required for MCP server"))
				return
			}

			// Validate allowed_tools if provided
			// Note: LlamaStack behavior:
			//   - nil/undefined: ALL tools allowed (no restrictions)
			//   - []: NO tools allowed (explicitly disabled)
			//   - ["tool1", "tool2"]: ONLY these tools allowed
			// We only validate non-empty arrays to ensure tool names are not empty strings
			if len(server.AllowedTools) > 0 {
				for j, toolName := range server.AllowedTools {
					if strings.TrimSpace(toolName) == "" {
						app.badRequestResponse(w, r, fmt.Errorf("MCP server '%s': allowed_tools[%d] cannot be empty string", server.ServerLabel, j))
						return
					}
				}
			}

			// Create MCP server parameter for LlamaStack
			mcpServerParam := llamastack.MCPServerParam{
				ServerLabel:   server.ServerLabel,
				ServerURL:     server.ServerURL,
				Authorization: server.Authorization,
				AllowedTools:  server.AllowedTools, // Pass through allowed_tools from MCP server config
			}

			// Log the allowed_tools being sent to LlamaStack
			if len(server.AllowedTools) > 0 {
				app.logger.Debug("MCP server with specific allowed_tools", "server_label", server.ServerLabel, "allowed_tools", server.AllowedTools)
			} else if server.AllowedTools != nil {
				// Empty array explicitly provided - no tools allowed
				app.logger.Debug("MCP server with no tools allowed", "server_label", server.ServerLabel, "allowed_tools", "[] (empty array)")
			} else {
				// Nil/undefined - all tools allowed
				app.logger.Debug("MCP server with no tool restrictions", "server_label", server.ServerLabel, "allowed_tools", "undefined (all tools allowed)")
			}

			mcpServerParams = append(mcpServerParams, mcpServerParam)
		}
	}

	// Validate that chat_context and previous_response_id are not used together
	if len(createRequest.ChatContext) > 0 && createRequest.PreviousResponseID != "" {
		app.badRequestResponse(w, r, errors.New("chat_context and previous_response_id cannot be used together. Use either chat_context for manual conversation history or previous_response_id for automatic conversation threading"))
		return
	}

	// Validate previous response ID if provided
	if createRequest.PreviousResponseID != "" {
		if err := app.validatePreviousResponse(ctx, createRequest.PreviousResponseID); err != nil {
			app.badRequestResponse(w, r, fmt.Errorf("invalid previous response ID: %w", err))
			return
		}
	}

	// TODO: Input moderation will be wired here once the guardrail_config request field
	// is implemented (replaces the deprecated InputShieldID path).

	// Retrieve and inject provider data for custom headers (MaaS, custom endpoint, or LLMInferenceService)
	providerData, err := app.getProviderData(ctx, createRequest.Model, createRequest.ModelSourceType, createRequest.Subscription, createRequest.VectorStoreIDs)
	if err != nil {
		app.logger.Error("Failed to resolve provider credentials", "model", createRequest.Model, "error", err)
		app.serverErrorResponse(w, r, fmt.Errorf("failed to resolve provider credentials: %w", err))
		return
	}

	// Convert to client params (only working parameters)
	params := llamastack.CreateResponseParams{
		Input:              createRequest.Input,
		Model:              createRequest.Model,
		VectorStoreIDs:     createRequest.VectorStoreIDs,
		ChatContext:        chatContext,
		Temperature:        createRequest.Temperature,
		TopP:               createRequest.TopP,
		Instructions:       createRequest.Instructions,
		Tools:              mcpServerParams,
		PreviousResponseID: createRequest.PreviousResponseID,
		Store:              createRequest.Store,
		ProviderData:       providerData,
		InputShieldID:      createRequest.InputShieldID,
		OutputShieldID:     createRequest.OutputShieldID,
	}

	// Handle streaming vs non-streaming responses
	if createRequest.Stream {
		// Use async moderation for better streaming performance when output moderation is enabled
		if createRequest.OutputShieldID != "" {
			app.handleStreamingResponseAsync(w, r, ctx, params)
		} else {
			app.handleStreamingResponse(w, r, ctx, params)
		}
	} else {
		app.handleNonStreamingResponse(w, r, ctx, params)
	}
}

// handleStreamingResponse handles streaming response creation
func (app *App) handleStreamingResponse(w http.ResponseWriter, r *http.Request, ctx context.Context, params llamastack.CreateResponseParams) {
	// Track start time for latency and TTFT calculation
	startTime := time.Now()
	var firstTokenTime *time.Time
	var usage *UsageData

	// Check if ResponseWriter supports streaming - fail fast if not
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported by client", http.StatusNotImplemented)
		return
	}

	// Create streaming response
	stream, err := app.repositories.Responses.CreateResponseStream(ctx, params)
	if err != nil {
		app.handleLlamaStackClientError(w, r, err)
		return
	}
	defer stream.Close()

	// Set SSE headers only after successful stream creation
	w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache, no-transform")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	// Stream events to client
	for stream.Next() {
		// Check if client disconnected
		select {
		case <-ctx.Done():
			app.logger.Info("Client disconnected, stopping stream processing",
				"context_error", ctx.Err())
			return
		default:
			// Context still active, continue processing
		}

		event := stream.Current()

		// Convert to clean streaming event
		streamingEvent := convertToStreamingEvent(event)
		if streamingEvent == nil {
			// Skip events we don't care about
			continue
		}

		// Track TTFT on first text delta event
		if streamingEvent.Type == "response.output_text.delta" && firstTokenTime == nil {
			now := time.Now()
			firstTokenTime = &now
		}

		// Extract usage from completed event
		if streamingEvent.Type == "response.completed" {
			usage = extractUsageFromEvent(event)
		}

		// Convert clean streaming event to JSON
		eventData, err := json.Marshal(streamingEvent)
		if err != nil {
			app.logger.Error("Failed to marshal streaming event",
				"error", err,
				"event_type", streamingEvent.Type,
				"item_id", streamingEvent.ItemID,
				"sequence", streamingEvent.SequenceNumber)
			continue
		}

		// Write SSE format
		_, err = fmt.Fprintf(w, "data: %s\n\n", eventData)
		if err != nil {
			app.logger.Error("Failed to write streaming event", "error", err)
			return
		}
		flusher.Flush()
	}

	// Check for stream errors
	if err = stream.Err(); err != nil {
		app.logger.Error("Streaming error", "error", err)
		// Send error event
		errorData := map[string]interface{}{
			"error": map[string]interface{}{
				"message": "Streaming error occurred",
				"code":    "500",
			},
		}
		errorJSON, _ := json.Marshal(errorData)
		fmt.Fprintf(w, "data: %s\n\n", errorJSON)
	}

	// Send metrics event after stream completes
	latencyMs := time.Since(startTime).Milliseconds()
	metricsEvent := MetricsEvent{
		Type: "response.metrics",
		Metrics: ResponseMetrics{
			LatencyMs:          latencyMs,
			TimeToFirstTokenMs: calculateTTFT(startTime, firstTokenTime),
			Usage:              usage,
		},
	}
	eventData, err := json.Marshal(metricsEvent)
	if err != nil {
		app.logger.Error("failed to marshal metrics event", "error", err)
		return
	}
	fmt.Fprintf(w, "data: %s\n\n", eventData)
	flusher.Flush()
}

// handleNonStreamingResponse handles regular (non-streaming) response creation
func (app *App) handleNonStreamingResponse(w http.ResponseWriter, r *http.Request, ctx context.Context, params llamastack.CreateResponseParams) {
	// Track start time for latency calculation
	startTime := time.Now()

	llamaResponse, err := app.repositories.Responses.CreateResponse(ctx, params)
	if err != nil {
		app.handleLlamaStackClientError(w, r, err)
		return
	}

	// Calculate latency
	latencyMs := time.Since(startTime).Milliseconds()

	// Convert to clean response data
	responseData := convertToResponseData(llamaResponse)

	// TODO: Output moderation will be wired here once the guardrail_config request field
	// is implemented (replaces the deprecated OutputShieldID path).

	// Add previous response ID to response data if provided
	if params.PreviousResponseID != "" {
		responseData.PreviousResponseID = params.PreviousResponseID
	}

	// Add metrics to response
	responseData.Metrics = &ResponseMetrics{
		LatencyMs: latencyMs,
		Usage:     extractUsage(llamaResponse),
	}

	apiResponse := llamastack.APIResponse{
		Data: responseData,
	}

	err = app.WriteJSON(w, http.StatusCreated, apiResponse, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// sendInputGuardrailViolationStreaming sends a guardrail violation response in streaming SSE format
// using the OpenAI standard refusal content type and streaming events.
// This is used when input moderation flags content and the client requested streaming.
// Will be wired in the follow-up PR once guardrail_config request field is implemented.
//
//nolint:unused
func (app *App) sendInputGuardrailViolationStreaming(w http.ResponseWriter, model string) {
	// Check if ResponseWriter supports streaming
	flusher, ok := w.(http.Flusher)
	if !ok {
		// Fallback to JSON if streaming not supported
		responseData := createGuardrailViolationResponse("", model, true)
		apiResponse := llamastack.APIResponse{Data: responseData}
		_ = app.WriteJSON(w, http.StatusCreated, apiResponse, nil) // Best effort - client may have disconnected
		return
	}

	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache, no-transform")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	message := constants.InputGuardrailViolationMessage

	// Generate IDs for the response
	responseID := "resp_guardrail_" + fmt.Sprintf("%d", getCurrentTimestamp())
	itemID := "msg_guardrail"

	// Send response.created event
	createdEvent := &StreamingEvent{
		Type:           "response.created",
		SequenceNumber: 0,
		Response: &ResponseData{
			ID:        responseID,
			Model:     model,
			Status:    "in_progress",
			CreatedAt: getCurrentTimestamp(),
		},
	}
	if eventData, err := json.Marshal(createdEvent); err == nil {
		fmt.Fprintf(w, "data: %s\n\n", eventData)
		flusher.Flush()
	}

	// Send response.refusal.delta with the guardrail message (OpenAI standard)
	refusalDeltaEvent := &StreamingEvent{
		Type:           "response.refusal.delta",
		SequenceNumber: 1,
		ItemID:         itemID,
		OutputIndex:    0,
		ContentIndex:   0,
		Delta:          message,
	}
	if eventData, err := json.Marshal(refusalDeltaEvent); err == nil {
		fmt.Fprintf(w, "data: %s\n\n", eventData)
		flusher.Flush()
	}

	// Send response.refusal.done (OpenAI standard)
	refusalDoneEvent := &StreamingEvent{
		Type:           "response.refusal.done",
		SequenceNumber: 2,
		ItemID:         itemID,
		OutputIndex:    0,
		ContentIndex:   0,
		Refusal:        message,
	}
	if eventData, err := json.Marshal(refusalDoneEvent); err == nil {
		fmt.Fprintf(w, "data: %s\n\n", eventData)
		flusher.Flush()
	}

	// Send response.completed with refusal content type (OpenAI standard)
	completedEvent := &StreamingEvent{
		Type:           "response.completed",
		SequenceNumber: 3,
		Response: &ResponseData{
			ID:        responseID,
			Model:     model,
			Status:    "completed",
			CreatedAt: getCurrentTimestamp(),
			Output: []OutputItem{
				{
					ID:     itemID,
					Type:   "message",
					Role:   "assistant",
					Status: "completed",
					Content: []ContentItem{
						{
							Type:    "refusal",
							Refusal: message,
						},
					},
				},
			},
		},
	}
	if eventData, err := json.Marshal(completedEvent); err == nil {
		fmt.Fprintf(w, "data: %s\n\n", eventData)
		flusher.Flush()
	}
}

// getCurrentTimestamp returns the current Unix timestamp.
// Will be wired in the follow-up PR once guardrail_config request field is implemented.
//
//nolint:unused
func getCurrentTimestamp() int64 {
	return int64(0) // Use 0 for consistency with other guardrail responses
}

// validatePreviousResponse validates that a previous response ID exists and is accessible
func (app *App) validatePreviousResponse(ctx context.Context, responseID string) error {
	if responseID == "" {
		return nil // Empty ID is valid (no previous response)
	}

	// Use the repository to validate the response exists
	_, err := app.repositories.Responses.GetResponse(ctx, responseID)
	if err != nil {
		return fmt.Errorf("previous response not found or not accessible: %w", err)
	}

	return nil
}

// getProviderData retrieves provider data (auth tokens) for models.
// If vectorStoreIDs is non-empty, it also checks for a custom-endpoint embedding model
// backing one of those stores and injects its URL and secret. Returns an error if the
// passthrough embedding lookup fails so the handler can fail closed.
func (app *App) getProviderData(ctx context.Context, modelID string, modelSourceType string, subscription string, vectorStoreIDs []string) (map[string]interface{}, error) {
	var providerData map[string]interface{}

	if modelSourceType == string(models.ModelSourceTypeCustomEndpoint) {
		// Inference custom endpoints are always remote::openai
		if apiKey := app.getCustomEndpointSecret(ctx, modelID); apiKey != "" {
			providerData = map[string]interface{}{"openai_api_key": apiKey}
		}
	} else if maasData := app.getMaaSProviderData(ctx, modelID, subscription); maasData != nil {
		providerData = maasData
	} else {
		providerData = app.getUserJWTProviderData(ctx, modelID)
	}

	// Inject passthrough_url and passthrough_api_key for custom-endpoint embedding models used by vector stores
	passthroughURL, passthroughKey, err := app.getPassthroughEmbeddingSecret(ctx, vectorStoreIDs)
	if err != nil {
		return nil, err
	}
	if passthroughURL != "" || passthroughKey != "" {
		if providerData == nil {
			providerData = make(map[string]interface{})
		}
		providerData["passthrough_url"] = passthroughURL
		providerData["passthrough_api_key"] = passthroughKey
	}

	return providerData, nil
}

// getPassthroughEmbeddingSecret delegates to ExternalModelsRepository to find the first
// vector store in vectorStoreIDs that uses a custom-endpoint (remote::passthrough) embedding
// model and returns its base URL and API key. Returns an error on ConfigMap or Secret
// read failures so the caller can fail closed rather than proceed with bogus credentials.
func (app *App) getPassthroughEmbeddingSecret(ctx context.Context, vectorStoreIDs []string) (string, string, error) {
	if len(vectorStoreIDs) == 0 {
		return "", "", nil
	}

	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil {
		return "", "", nil
	}

	namespace, ok := ctx.Value(constants.NamespaceQueryParameterKey).(string)
	if !ok || namespace == "" {
		return "", "", nil
	}

	k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		return "", "", fmt.Errorf("failed to get Kubernetes client: %w", err)
	}

	info, err := app.repositories.ExternalModels.GetPassthroughEmbeddingProviderInfo(k8sClient, ctx, identity, namespace, vectorStoreIDs)
	if err != nil {
		return "", "", err
	}
	if info == nil {
		return "", "", nil
	}

	app.logger.Debug("Resolved passthrough embedding provider info", "url", info.BaseURL)
	return info.BaseURL, info.APIKey, nil
}

// getUserJWTProviderData retrieves user JWT token for InferenceService and LLMInferenceService models
func (app *App) getUserJWTProviderData(ctx context.Context, modelID string) map[string]interface{} {
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil || identity.Token == "" {
		return nil
	}

	app.logger.Debug("Injected user JWT token as provider data", "model", modelID)
	return map[string]interface{}{
		"vllm_api_token": identity.Token,
	}
}

// getMaaSProviderData retrieves and caches MaaS tokens for MaaS models
func (app *App) getMaaSProviderData(ctx context.Context, modelID string, subscription string) map[string]interface{} {
	// Early return if context doesn't have required data
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil {
		return nil
	}

	namespace, ok := ctx.Value(constants.NamespaceQueryParameterKey).(string)
	if !ok || namespace == "" {
		return nil
	}

	// Early check: If model ID doesn't start with "maas-", skip MaaS token injection
	// This handles provider-prefixed format (e.g., "maas-vllm-inference-1/facebook/opt-125m")
	if !strings.HasPrefix(modelID, constants.MaaSProviderPrefix) {
		app.logger.Debug("Non-MaaS model (no maas- prefix in model ID), skipping token injection", "model", modelID)
		return nil
	}

	// Get Kubernetes client
	k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		return nil
	}

	app.logger.Debug("Detected MaaS model", "model", modelID, "subscription", subscription)

	// Get or generate MaaS token
	token := app.getMaaSTokenForModel(ctx, k8sClient, identity, namespace, modelID, subscription)
	if token == "" {
		return nil
	}

	// Inject token as provider data
	app.logger.Debug("Injected MaaS provider data", "model", modelID)
	return map[string]interface{}{
		"vllm_api_token": token,
	}
}

// getMaaSTokenForModel retrieves a MaaS token from cache or generates a new one.
// subscription is the optional MaaSSubscription name to bind the ephemeral key to.
func (app *App) getMaaSTokenForModel(ctx context.Context, k8sClient k8s.KubernetesClientInterface, identity *integrations.RequestIdentity, namespace, modelID, subscription string) string {
	// Get username for cache key
	username, err := k8sClient.GetUser(ctx, identity)
	if err != nil || username == "" {
		app.logger.Warn("Failed to get username, skipping cache", "model", modelID, "error", err)
		return ""
	}

	// Build cache key that incorporates subscription so different subscriptions get separate tokens
	cacheKey := modelID
	if subscription != "" {
		cacheKey = modelID + "|" + subscription
	}

	// Check cache first
	if cachedValue, found := app.memoryStore.Get(namespace, username, constants.CacheAccessTokensCategory, cacheKey); found {
		// Safe type assertion to prevent panic
		if token, ok := cachedValue.(string); ok {
			app.logger.Debug("Using cached MaaS token", "model", modelID, "namespace", namespace, "subscription", subscription)
			return token
		}
		// Unexpected type in cache - log warning and continue to generate new token
		app.logger.Warn("Unexpected type in cache, expected string", "model", modelID, "namespace", namespace, "type", fmt.Sprintf("%T", cachedValue))
	}

	// Cache miss - generate new token
	app.logger.Debug("No MaaS token found in cache: requesting new token", "model", modelID, "namespace", namespace, "subscription", subscription)

	tokenResponse, err := app.repositories.MaaSModels.IssueToken(ctx, models.MaaSTokenRequest{
		ExpiresIn:    constants.MaaSTokenTTLString,
		Subscription: subscription,
	})
	if err != nil {
		app.logger.Warn("Failed to issue MaaS API key", "model", modelID, "error", err)
		return ""
	}

	// Compute cache TTL from the key's actual expiry, with a safety buffer
	cacheTTL := constants.MaaSTokenTTLDuration
	ttlSource := "default"
	if tokenResponse.ExpiresAt != "" {
		if expiresAt, parseErr := time.Parse(time.RFC3339, tokenResponse.ExpiresAt); parseErr == nil {
			const safetyBuffer = 30 * time.Second
			computed := time.Until(expiresAt) - safetyBuffer
			if computed > 0 && computed <= 24*time.Hour {
				cacheTTL = computed
				ttlSource = "expiresAt"
			}
		}
	}

	// Cache the new API key
	app.logger.Debug("Caching MaaS API key", "model", modelID, "namespace", namespace, "subscription", subscription, "ttl", cacheTTL, "ttlSource", ttlSource, "expiresAt", tokenResponse.ExpiresAt)
	if err := app.memoryStore.Set(namespace, username, constants.CacheAccessTokensCategory, cacheKey, tokenResponse.Key, cacheTTL); err != nil {
		app.logger.Warn("Failed to cache MaaS API key", "model", modelID, "error", err)
	}

	return tokenResponse.Key
}

// getCustomEndpointSecret retrieves the raw API key for a provider-qualified custom endpoint
// model ID (e.g. "endpoint-1/meta-llama/Llama-3.1-8B"). Returns "" when the secret cannot
// be resolved so the caller can skip injection.
func (app *App) getCustomEndpointSecret(ctx context.Context, modelID string) string {
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil {
		return ""
	}

	namespace, ok := ctx.Value(constants.NamespaceQueryParameterKey).(string)
	if !ok || namespace == "" {
		return ""
	}

	// Model ID must be provider-qualified to prevent ambiguity when multiple providers expose same model_id
	if !strings.Contains(modelID, "/") {
		app.logger.Warn("Custom endpoint model ID must be provider-qualified (provider/model)", "model", modelID)
		return ""
	}

	// Split on FIRST slash only (model IDs can contain slashes like "meta-llama/Llama-3.1-8B")
	parts := strings.SplitN(modelID, "/", 2)
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		app.logger.Warn("Invalid custom endpoint model ID format", "model", modelID)
		return ""
	}

	providerPrefix := parts[0]
	actualModelID := parts[1]
	app.logger.Debug("Parsed provider-qualified model ID", "original", modelID, "provider", providerPrefix, "modelID", actualModelID)

	k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.logger.Warn("Failed to get Kubernetes client for custom endpoint", "model", modelID, "error", err)
		return ""
	}

	externalModelsConfig, err := k8sClient.GetExternalModelsConfig(ctx, namespace)
	if err != nil {
		app.logger.Warn("Failed to get external models ConfigMap", "model", modelID, "namespace", namespace, "error", err)
		return ""
	}

	// Match BOTH ProviderID and ModelID to prevent returning the wrong key
	var foundModel *models.RegisteredModel
	for i := range externalModelsConfig.RegisteredResources.Models {
		m := &externalModelsConfig.RegisteredResources.Models[i]
		if m.ProviderID == providerPrefix && m.ModelID == actualModelID {
			foundModel = m
			break
		}
	}
	if foundModel == nil {
		app.logger.Warn("Custom endpoint model not found in ConfigMap", "provider", providerPrefix, "model", actualModelID, "namespace", namespace)
		return ""
	}

	var foundProvider *models.InferenceProvider
	for i := range externalModelsConfig.Providers.Inference {
		if externalModelsConfig.Providers.Inference[i].ProviderID == foundModel.ProviderID {
			foundProvider = &externalModelsConfig.Providers.Inference[i]
			break
		}
	}
	if foundProvider == nil {
		app.logger.Warn("Provider not found for custom endpoint model", "model", actualModelID, "providerID", foundModel.ProviderID, "namespace", namespace)
		return ""
	}

	apiKey := app.fetchSecretFromProvider(ctx, k8sClient, identity, namespace, foundProvider, actualModelID)
	app.logger.Debug("Resolved custom endpoint secret", "model", modelID, "actualModelID", actualModelID, "provider", foundProvider.ProviderID)
	return apiKey
}

// fetchSecretFromProvider reads the API key referenced by a provider's SecretRef,
// defaulting to "fake" when no secret is configured or the fetch fails.
func (app *App) fetchSecretFromProvider(ctx context.Context, k8sClient k8s.KubernetesClientInterface, identity *integrations.RequestIdentity, namespace string, provider *models.InferenceProvider, logModelID string) string {
	secretName := provider.Config.CustomGenAI.APIKey.SecretRef.Name
	secretKey := provider.Config.CustomGenAI.APIKey.SecretRef.Key
	if secretName == "" || secretKey == "" {
		return "fake"
	}
	val, err := k8sClient.GetSecretValue(ctx, identity, namespace, secretName, secretKey)
	if err != nil {
		app.logger.Warn("Failed to get secret for custom endpoint model", "model", logModelID, "secretName", secretName, "error", err)
		return "fake"
	}
	if val == "" {
		return "fake"
	}
	return val
}
