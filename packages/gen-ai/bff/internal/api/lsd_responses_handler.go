package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	k8s "github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack/lsmocks"
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
	Delta          string        `json:"delta"`
	SequenceNumber int64         `json:"sequence_number"`
	Type           string        `json:"type"`
	ItemID         string        `json:"item_id"`
	OutputIndex    int           `json:"output_index"`
	Response       *ResponseData `json:"response,omitempty"`
}

// ResponseData represents the response structure for both streaming and non-streaming
type ResponseData struct {
	ID                 string       `json:"id"`
	Model              string       `json:"model"`
	Status             string       `json:"status"`
	CreatedAt          int64        `json:"created_at"`
	Output             []OutputItem `json:"output,omitempty"`
	PreviousResponseID string       `json:"previous_response_id,omitempty"` // Reference to previous response in conversation thread
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
	Text        string        `json:"text"`
	Annotations []interface{} `json:"annotations,omitempty"` // For content annotations
}

// SearchResult represents search results with essential fields
type SearchResult struct {
	Score    float64 `json:"score"`
	Text     string  `json:"text"`
	Filename string  `json:"filename,omitempty"`
}

// MCPServer represents MCP server configuration for responses
type MCPServer struct {
	ServerLabel  string            `json:"server_label"`            // Label identifier for the MCP server
	ServerURL    string            `json:"server_url"`              // URL endpoint for the MCP server
	Headers      map[string]string `json:"headers"`                 // Custom headers for MCP server authentication
	AllowedTools []string          `json:"allowed_tools,omitempty"` // List of specific tool names allowed from this server
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
				ServerLabel:  server.ServerLabel,
				ServerURL:    server.ServerURL,
				Headers:      make(map[string]string),
				AllowedTools: server.AllowedTools, // Pass through allowed_tools from MCP server config
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

			// Copy provided headers
			if server.Headers != nil {
				for k, v := range server.Headers {
					mcpServerParam.Headers[k] = v
				}
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

	// Retrieve and inject provider data for custom headers (MaaS or LLMInferenceService)
	providerData := app.getProviderData(ctx, createRequest.Model)

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
	}

	// Handle streaming vs non-streaming responses
	if createRequest.Stream {
		app.handleStreamingResponse(w, r, ctx, params)
	} else {
		app.handleNonStreamingResponse(w, r, ctx, params)
	}
}

// handleStreamingResponse handles streaming response creation
func (app *App) handleStreamingResponse(w http.ResponseWriter, r *http.Request, ctx context.Context, params llamastack.CreateResponseParams) {
	// Check if ResponseWriter supports streaming - fail fast if not
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported by client", http.StatusNotImplemented)
		return
	}

	// Create streaming response
	stream, err := app.repositories.Responses.CreateResponseStream(ctx, params)
	if err != nil {
		// Check if this is a mock streaming error - delegate to mock client
		if _, ok := err.(*lsmocks.MockStreamError); ok {
			if client, clientErr := app.repositories.Responses.GetClient(r.Context()); clientErr == nil {
				if mockClient, ok := client.(*lsmocks.MockLlamaStackClient); ok {
					mockClient.HandleMockStreaming(ctx, w, flusher, params)
					return
				}
			}
		}
		// Check if this is a model not found error
		if ModelNotFoundError(err) {
			app.modelNotFoundResponse(w, r, params.Model)
			return
		}
		app.serverErrorResponse(w, r, err)
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

		// Flush the response to send data immediately
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
}

// handleNonStreamingResponse handles regular (non-streaming) response creation
func (app *App) handleNonStreamingResponse(w http.ResponseWriter, r *http.Request, ctx context.Context, params llamastack.CreateResponseParams) {
	llamaResponse, err := app.repositories.Responses.CreateResponse(ctx, params)
	if err != nil {
		// Check if this is a model not found error
		if ModelNotFoundError(err) {
			app.modelNotFoundResponse(w, r, params.Model)
			return
		}
		app.serverErrorResponse(w, r, err)
		return
	}

	// Convert to clean response data
	responseData := convertToResponseData(llamaResponse)

	// Add previous response ID to response data if provided
	if params.PreviousResponseID != "" {
		responseData.PreviousResponseID = params.PreviousResponseID
	}

	apiResponse := llamastack.APIResponse{
		Data: responseData,
	}

	err = app.WriteJSON(w, http.StatusCreated, apiResponse, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
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

// getProviderData retrieves provider data (auth tokens) for models
func (app *App) getProviderData(ctx context.Context, modelID string) map[string]interface{} {
	// Try MaaS first
	if maasData := app.getMaaSProviderData(ctx, modelID); maasData != nil {
		return maasData
	}
	// Then try user JWT for InferenceService and LLMInferenceService
	return app.getUserJWTProviderData(ctx, modelID)
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
func (app *App) getMaaSProviderData(ctx context.Context, modelID string) map[string]interface{} {
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

	app.logger.Debug("Detected MaaS model", "model", modelID)

	// Get or generate MaaS token
	token := app.getMaaSTokenForModel(ctx, k8sClient, identity, namespace, modelID)
	if token == "" {
		return nil
	}

	// Inject token as provider data
	app.logger.Debug("Injected MaaS provider data", "model", modelID)
	return map[string]interface{}{
		"vllm_api_token": token,
	}
}

// getMaaSTokenForModel retrieves a MaaS token from cache or generates a new one
func (app *App) getMaaSTokenForModel(ctx context.Context, k8sClient k8s.KubernetesClientInterface, identity *integrations.RequestIdentity, namespace, modelID string) string {
	// Get username for cache key
	username, err := k8sClient.GetUser(ctx, identity)
	if err != nil || username == "" {
		app.logger.Warn("Failed to get username, skipping cache", "model", modelID, "error", err)
		return ""
	}

	// Check cache first
	if cachedValue, found := app.memoryStore.Get(namespace, username, constants.CacheAccessTokensCategory, modelID); found {
		// Safe type assertion to prevent panic
		if token, ok := cachedValue.(string); ok {
			app.logger.Debug("Using cached MaaS token", "model", modelID, "namespace", namespace)
			return token
		}
		// Unexpected type in cache - log warning and continue to generate new token
		app.logger.Warn("Unexpected type in cache, expected string", "model", modelID, "namespace", namespace, "type", fmt.Sprintf("%T", cachedValue))
	}

	// Cache miss - generate new token
	app.logger.Debug("No MaaS token found in cache: requesting new token", "model", modelID, "namespace", namespace)

	tokenResponse, err := app.repositories.MaaSModels.IssueToken(ctx, models.MaaSTokenRequest{
		TTL: constants.MaaSTokenTTLString,
	})
	if err != nil {
		app.logger.Warn("Failed to issue MaaS token", "model", modelID, "error", err)
		return ""
	}

	// Cache the new token
	if err := app.memoryStore.Set(namespace, username, constants.CacheAccessTokensCategory, modelID, tokenResponse.Token, constants.MaaSTokenTTLDuration); err != nil {
		app.logger.Warn("Failed to cache MaaS token", "model", modelID, "error", err)
	} else {
		app.logger.Debug("Cached new MaaS token", "model", modelID, "namespace", namespace, "expiresAt", tokenResponse.ExpiresAt)
	}

	return tokenResponse.Token
}
