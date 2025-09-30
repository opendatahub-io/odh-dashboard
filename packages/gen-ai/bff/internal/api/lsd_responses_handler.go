package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack/lsmocks"
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
	ID        string       `json:"id"`
	Model     string       `json:"model"`
	Status    string       `json:"status"`
	CreatedAt int64        `json:"created_at"`
	Output    []OutputItem `json:"output,omitempty"`
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
	ServerLabel string            `json:"server_label"` // Label identifier for the MCP server
	ServerURL   string            `json:"server_url"`   // URL endpoint for the MCP server
	Headers     map[string]string `json:"headers"`      // Custom headers for MCP server authentication
}

// CreateResponseRequest represents the request body for creating a response
type CreateResponseRequest struct {
	Input string `json:"input"`
	Model string `json:"model"`

	VectorStoreIDs []string             `json:"vector_store_ids,omitempty"` // Enables RAG
	ChatContext    []ChatContextMessage `json:"chat_context,omitempty"`     // Conversation history
	Temperature    *float64             `json:"temperature,omitempty"`      // Controls creativity (0.0-2.0)
	TopP           *float64             `json:"top_p,omitempty"`            // Controls randomness (0.0-1.0)
	Instructions   string               `json:"instructions,omitempty"`     // System message/behavior
	Stream         bool                 `json:"stream,omitempty"`           // Enable streaming response
	MCPServers     []MCPServer          `json:"mcp_servers,omitempty"`      // MCP server configurations
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

			// Create MCP server parameter for LlamaStack
			mcpServerParam := llamastack.MCPServerParam{
				ServerLabel: server.ServerLabel,
				ServerURL:   server.ServerURL,
				Headers:     make(map[string]string),
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

	// Convert to client params (only working parameters)
	params := llamastack.CreateResponseParams{
		Input:          createRequest.Input,
		Model:          createRequest.Model,
		VectorStoreIDs: createRequest.VectorStoreIDs,
		ChatContext:    chatContext,
		Temperature:    createRequest.Temperature,
		TopP:           createRequest.TopP,
		Instructions:   createRequest.Instructions,
		Tools:          mcpServerParams,
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
					mockClient.HandleMockStreaming(w, flusher, params)
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

	apiResponse := llamastack.APIResponse{
		Data: responseData,
	}

	err = app.WriteJSON(w, http.StatusCreated, apiResponse, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
