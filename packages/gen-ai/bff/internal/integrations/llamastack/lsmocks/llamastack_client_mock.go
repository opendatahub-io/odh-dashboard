package lsmocks

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/openai/openai-go/v2"
	"github.com/openai/openai-go/v2/packages/ssestream"
	"github.com/openai/openai-go/v2/responses"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
)

// MockResponse represents a mock response for testing
type MockResponse struct {
	ID     string
	Model  string
	Status string
}

// MockLlamaStackClient provides a mock implementation of the LlamaStackClient for testing
type MockLlamaStackClient struct {
	// Add fields here if you need to store state for testing
	getResponseResults map[string]*MockResponse
	getResponseErrors  map[string]error
}

// NewMockLlamaStackClient creates a new mock client
func NewMockLlamaStackClient() *MockLlamaStackClient {
	return &MockLlamaStackClient{
		getResponseResults: make(map[string]*MockResponse),
		getResponseErrors:  make(map[string]error),
	}
}

// SetGetResponseResult sets a mock response for a given response ID
func (m *MockLlamaStackClient) SetGetResponseResult(responseID string, mockResponse *MockResponse) {
	m.getResponseResults[responseID] = mockResponse
}

// SetGetResponseError sets an error for a given response ID
func (m *MockLlamaStackClient) SetGetResponseError(responseID string, err error) {
	m.getResponseErrors[responseID] = err
}

// ListModels returns mock model data
func (m *MockLlamaStackClient) ListModels(ctx context.Context) ([]openai.Model, error) {
	// Check namespace from context - return no models for mock-test-namespace-3
	// This allows testing "Add to playground" button for all AAmodels
	if namespace, ok := ctx.Value(constants.NamespaceQueryParameterKey).(string); ok {
		if namespace == "mock-test-namespace-3" {
			return []openai.Model{}, nil
		}
	}

	return []openai.Model{
		{
			ID:      "ollama/llama3.2:3b",
			Object:  "model",
			Created: 1755721063,
			OwnedBy: "llama_stack",
		},
		{
			ID:      "ollama/all-minilm:l6-v2",
			Object:  "model",
			Created: 1755721063,
			OwnedBy: "llama_stack",
		},
		{
			ID:      "mistral-7b-instruct",
			Object:  "model",
			Created: 1755721063,
			OwnedBy: "llama_stack",
		},
		{
			ID:      "llama-3.1-8b-instruct",
			Object:  "model",
			Created: 1755721063,
			OwnedBy: "llama_stack",
		},
	}, nil
}

// ListVectorStores returns mock vector store data with optional parameters
func (m *MockLlamaStackClient) ListVectorStores(ctx context.Context, params llamastack.ListVectorStoresParams) ([]openai.VectorStore, error) {
	return []openai.VectorStore{
		{
			ID:         "vs_mock123",
			Object:     "vector_store",
			CreatedAt:  1755721097,
			Name:       "Mock Vector Store",
			UsageBytes: 0,
			FileCounts: openai.VectorStoreFileCounts{
				InProgress: 0,
				Completed:  1,
				Failed:     0,
				Cancelled:  0,
				Total:      1,
			},
			Status:       "completed",
			LastActiveAt: 1755721097,
			Metadata: map[string]string{
				"provider_id":           "milvus",
				"provider_vector_db_id": "vs_mock123",
			},
			ExpiresAfter: openai.VectorStoreExpiresAfter{
				Anchor: "last_active_at",
				Days:   0,
			},
			ExpiresAt: 0,
		},
	}, nil
}

// CreateVectorStore returns a mock created vector store with optional parameters
func (m *MockLlamaStackClient) CreateVectorStore(ctx context.Context, params llamastack.CreateVectorStoreParams) (*openai.VectorStore, error) {
	name := params.Name
	if name == "" {
		name = "Mock Vector Store"
	}

	mockID := "vs_mock_new123"
	return &openai.VectorStore{
		ID:         mockID,
		Object:     "vector_store",
		CreatedAt:  1755721097,
		Name:       name,
		UsageBytes: 0,
		FileCounts: openai.VectorStoreFileCounts{
			InProgress: 0,
			Completed:  0,
			Failed:     0,
			Cancelled:  0,
			Total:      0,
		},
		Status:       "completed",
		LastActiveAt: 1755721097,
		Metadata: map[string]string{
			"provider_id":           "milvus",
			"provider_vector_db_id": mockID,
		},
		ExpiresAfter: openai.VectorStoreExpiresAfter{
			Anchor: "last_active_at",
			Days:   0,
		},
		ExpiresAt: 0,
	}, nil
}

// UploadFile uploads a file with optional parameters and optionally adds to vector store
func (m *MockLlamaStackClient) UploadFile(ctx context.Context, params llamastack.UploadFileParams) (*llamastack.FileUploadResult, error) {
	mockFileID := "file-mock123abc456def"
	result := &llamastack.FileUploadResult{
		FileID: mockFileID,
	}

	// If vector store ID is provided, simulate adding to vector store
	if params.VectorStoreID != "" {
		result.VectorStoreFile = &openai.VectorStoreFile{
			ID:            mockFileID,
			Object:        "vector_store.file",
			UsageBytes:    0,
			CreatedAt:     1755721386,
			VectorStoreID: params.VectorStoreID,
			Status:        "completed",
			LastError: openai.VectorStoreFileLastError{
				Code:    "",
				Message: "",
			},
			Attributes: map[string]openai.VectorStoreFileAttributeUnion{},
			ChunkingStrategy: openai.FileChunkingStrategyUnion{
				Type: "auto",
				Static: openai.StaticFileChunkingStrategy{
					ChunkOverlapTokens: 0,
					MaxChunkSizeTokens: 0,
				},
			},
		}
	}

	return result, nil
}

// CreateResponse returns a mock response with comprehensive parameter support
func (m *MockLlamaStackClient) CreateResponse(ctx context.Context, params llamastack.CreateResponseParams) (*responses.Response, error) {
	// Create base response text
	responseText := "This is a mock response to your query: " + params.Input

	// If previous response ID is provided, acknowledge it in the response
	if params.PreviousResponseID != "" {
		responseText = "Continuing from previous response " + params.PreviousResponseID + ". " + responseText
	}

	// Create output items
	var outputItems []responses.ResponseOutputItemUnion

	// If MCP tools are provided, simulate MCP tool interactions
	if len(params.Tools) > 0 {
		// Add mock MCP list tools output
		outputItems = append(outputItems, responses.ResponseOutputItemUnion{
			ID:          "mcp_list_mock123",
			Type:        "mcp_list_tools",
			Role:        "assistant",
			ServerLabel: params.Tools[0].ServerLabel,
		})

		// Add mock MCP tool call with realistic GitHub API output
		mcpOutput := `{"tag_name":"v1.95.0","name":"Mock Release","body":"This is a mock GitHub release with realistic data structure","published_at":"2025-09-17T15:00:00Z","author":{"login":"mock-user","id":12345}}`

		outputItems = append(outputItems, responses.ResponseOutputItemUnion{
			ID:          "call_mock456",
			Type:        "mcp_call",
			Role:        "assistant",
			ServerLabel: params.Tools[0].ServerLabel,
			Name:        "get_latest_release",
			Arguments:   `{"owner":"llamastack","repo":"llama-stack"}`,
			Output:      mcpOutput,
		})

		// Update response text to reflect MCP tool usage
		responseText = "Based on the GitHub MCP tool results, the latest release is v1.95.0. " + responseText
	}

	// If vector stores are provided, simulate file search call
	if len(params.VectorStoreIDs) > 0 {
		// Add mock file search call result with search results
		outputItems = append(outputItems, responses.ResponseOutputItemUnion{
			ID:      "call_mock123",
			Type:    "file_search_call",
			Role:    "assistant",
			Status:  "completed",
			Queries: []string{params.Input},
		})

		// Manually set results using reflection since the exact type might not be exported
		lastItem := &outputItems[len(outputItems)-1]
		results := []map[string]interface{}{
			{
				"score":    0.8542,
				"text":     "This is mock retrieved content that relates to your query: " + params.Input + ". This content comes from the vector store and provides context for the AI response.",
				"filename": "mock_document.txt",
			},
		}

		// Use JSON marshal/unmarshal to set the Results field correctly
		if itemJSON, err := json.Marshal(map[string]interface{}{
			"id":      lastItem.ID,
			"type":    lastItem.Type,
			"role":    lastItem.Role,
			"status":  lastItem.Status,
			"queries": lastItem.Queries,
			"results": results,
		}); err == nil {
			var updatedItem responses.ResponseOutputItemUnion
			if json.Unmarshal(itemJSON, &updatedItem) == nil {
				outputItems[len(outputItems)-1] = updatedItem
			}
		}

		// Update response text to indicate RAG usage
		responseText = "Based on retrieved documents, this is a mock response to your query: " + params.Input
	}

	// Add message content
	outputItems = append(outputItems, responses.ResponseOutputItemUnion{
		ID:     "msg_mock123",
		Type:   "message",
		Role:   "assistant",
		Status: "completed",
		Content: []responses.ResponseOutputMessageContentUnion{
			{
				Type: "output_text",
				Text: responseText,
			},
		},
	})

	// Create mock response with proper Output structure including Usage
	mockResponse := &responses.Response{
		ID:        "resp_mock123",
		Object:    "response",
		CreatedAt: 1234567890.0,
		Model:     params.Model,
		Status:    "completed",
		Metadata:  map[string]string{},
		Output:    outputItems,
		Usage: responses.ResponseUsage{
			InputTokens:  10,
			OutputTokens: 25,
			TotalTokens:  35,
		},
	}

	return mockResponse, nil
}

// MockStreamError indicates mock streaming mode and provides response data
type MockStreamError struct {
	Message      string
	ResponseText string
	Params       llamastack.CreateResponseParams
}

func (e *MockStreamError) Error() string {
	return e.Message
}

// ModerationChunkSize is the number of words to buffer before running moderation
const ModerationChunkSize = 30

// GuardrailViolationMessage is the message shown when content is blocked by guardrails
const GuardrailViolationMessage = "I apologize, but I cannot provide a response to this request as it may contain content that violates our safety guidelines."

func (m *MockLlamaStackClient) HandleMockStreaming(ctx context.Context, w http.ResponseWriter, flusher http.Flusher, params llamastack.CreateResponseParams) {
	sleepWithContext := func(d time.Duration) bool {
		select {
		case <-ctx.Done():
			return false // Context cancelled
		case <-time.After(d):
			return true // Sleep completed
		}
	}

	// Set hardened headers for Server-Sent Events (same as real handler)
	w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache, no-transform")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)

	// Mock identifiers
	responseID := "resp_mock_stream123"
	itemID := "msg_mock_stream123"

	// Helper function to send SSE event
	sendEvent := func(eventData interface{}) {
		if data, err := json.Marshal(eventData); err == nil {
			fmt.Fprintf(w, "data: %s\n\n", data)
		}
	}

	// Helper function to send input guardrail violation in streaming format
	// Uses OpenAI standard refusal content type and streaming events
	sendInputBlockedError := func() {
		// Send response.created event
		sendEvent(map[string]interface{}{
			"type":            "response.created",
			"sequence_number": 0,
			"response": map[string]interface{}{
				"id":         responseID,
				"model":      params.Model,
				"status":     "in_progress",
				"created_at": 1234567890.0,
			},
		})
		flusher.Flush()

		// Send delta with guardrail violation message
		sendEvent(map[string]interface{}{
			"type":            "response.refusal.delta",
			"sequence_number": 1,
			"item_id":         itemID,
			"output_index":    0,
			"content_index":   0,
			"delta":           GuardrailViolationMessage,
		})
		flusher.Flush()

		// Send response.refusal.done (OpenAI standard)
		sendEvent(map[string]interface{}{
			"type":            "response.refusal.done",
			"sequence_number": 2,
			"item_id":         itemID,
			"output_index":    0,
			"content_index":   0,
			"refusal":         GuardrailViolationMessage,
		})
		flusher.Flush()

		// Send response.completed with refusal content type (OpenAI standard)
		sendEvent(map[string]interface{}{
			"type":            "response.completed",
			"sequence_number": 3,
			"response": map[string]interface{}{
				"id":         responseID,
				"model":      params.Model,
				"status":     "completed",
				"created_at": 1234567890.0,
				"output": []map[string]interface{}{
					{
						"id":     itemID,
						"type":   "message",
						"role":   "assistant",
						"status": "completed",
						"content": []map[string]interface{}{
							{
								"type":    "refusal",
								"refusal": GuardrailViolationMessage,
							},
						},
					},
				},
			},
		})
		flusher.Flush()
	}

	// INPUT MODERATION: If InputShieldID is set, moderate the user input first
	if params.InputShieldID != "" {
		inputModResult, err := m.CreateModeration(ctx, params.Input, params.InputShieldID)
		if err == nil && len(inputModResult.Results) > 0 && inputModResult.Results[0].Flagged {
			// Input blocked by guardrails
			sendInputBlockedError()
			return
		}
	}
	// Track start time for metrics
	streamStartTime := time.Now()

	// Determine response text based on whether RAG is used
	responseText := "This is a mock response to your query: " + params.Input
	if len(params.VectorStoreIDs) > 0 {
		responseText = "Based on retrieved documents, this is a mock response to your query: " + params.Input
	}

	// If previous response ID is provided, acknowledge it in the response
	if params.PreviousResponseID != "" {
		responseText = "Continuing from previous response " + params.PreviousResponseID + ". " + responseText
	}

	// Helper function to send guardrail violation and complete response using OpenAI standard refusal events
	sendGuardrailViolation := func(sequenceNum int, accumulatedText string) {
		// Send response.refusal.delta with the guardrail violation message (OpenAI standard)
		sendEvent(map[string]interface{}{
			"type":            "response.refusal.delta",
			"sequence_number": sequenceNum,
			"item_id":         itemID,
			"output_index":    0,
			"content_index":   0,
			"delta":           GuardrailViolationMessage,
		})
		flusher.Flush()

		// Send response.refusal.done (OpenAI standard)
		sendEvent(map[string]interface{}{
			"type":            "response.refusal.done",
			"sequence_number": sequenceNum + 1,
			"item_id":         itemID,
			"output_index":    0,
			"content_index":   0,
			"refusal":         GuardrailViolationMessage,
		})

		// Response completed with refusal content type (OpenAI standard)
		sendEvent(map[string]interface{}{
			"type":            "response.completed",
			"sequence_number": 0,
			"item_id":         "",
			"output_index":    0,
			"delta":           "",
			"response": map[string]interface{}{
				"id":         responseID,
				"model":      params.Model,
				"status":     "completed",
				"created_at": 1234567890.0,
				"output": []map[string]interface{}{
					{
						"id":     itemID,
						"type":   "message",
						"role":   "assistant",
						"status": "completed",
						"content": []map[string]interface{}{
							{
								"type":    "refusal",
								"refusal": GuardrailViolationMessage,
							},
						},
					},
				},
			},
		})
	}

	// 1. Response created event
	sendEvent(map[string]interface{}{
		"type":            "response.created",
		"sequence_number": 0,
		"item_id":         "",
		"output_index":    0,
		"delta":           "",
		"response": map[string]interface{}{
			"id":         responseID,
			"model":      params.Model,
			"status":     "in_progress",
			"created_at": 1234567890.0,
		},
	})

	// Small delay after creation
	if !sleepWithContext(200 * time.Millisecond) {
		return
	}
	flusher.Flush()

	// 2. If MCP tools provided, simulate MCP tool processing
	sequenceNum := 1
	if len(params.Tools) > 0 {
		// Simulate MCP list tools event
		sendEvent(map[string]interface{}{
			"type":            "mcp_list_tools",
			"sequence_number": sequenceNum,
			"item_id":         "mcp_list_mock123",
			"output_index":    0,
			"delta":           "",
			"server_label":    params.Tools[0].ServerLabel,
		})
		sequenceNum++
		if !sleepWithContext(300 * time.Millisecond) {
			return
		}
		flusher.Flush()

		// Simulate MCP tool call event
		mcpOutput := `{"tag_name":"v1.95.0","name":"Mock Release","body":"This is a mock GitHub release","published_at":"2025-09-17T15:00:00Z","author":{"login":"mock-user","id":12345}}`
		sendEvent(map[string]interface{}{
			"type":            "mcp_call",
			"sequence_number": sequenceNum,
			"item_id":         "call_mock456",
			"output_index":    0,
			"delta":           "",
			"server_label":    params.Tools[0].ServerLabel,
			"name":            "get_latest_release",
			"arguments":       `{"owner":"llamastack","repo":"llama-stack"}`,
			"output":          mcpOutput,
		})
		sequenceNum++
		if !sleepWithContext(500 * time.Millisecond) {
			return
		}
		flusher.Flush()

		// Update response text to reflect MCP tool usage
		responseText = "Based on the GitHub MCP tool results, the latest release is v1.95.0. " + responseText
	}

	// 3. If vector stores provided, simulate RAG processing
	if len(params.VectorStoreIDs) > 0 {
		// RAG processing happens in background (skip some sequence numbers)
		sequenceNum += 3 // Skip some numbers for RAG background processing
		if !sleepWithContext(500 * time.Millisecond) {
			return
		}
	}

	// 4. Content part added event
	sendEvent(map[string]interface{}{
		"type":            "response.content_part.added",
		"sequence_number": sequenceNum,
		"item_id":         itemID,
		"output_index":    0,
		"delta":           "",
	})

	// Small delay before starting text generation
	if !sleepWithContext(150 * time.Millisecond) {
		return
	}
	flusher.Flush()

	// 5. Chunked streaming with moderation
	// Split text into words and process in chunks for moderation
	words := strings.Fields(responseText)
	var wordBuffer []string    // Buffer for current chunk
	var accumulatedText string // All text accumulated so far (for moderation)
	var streamedText string    // Text that has been streamed to client
	deltaSequenceNum := sequenceNum + 1

	for i, word := range words {
		// Build the chunk with proper spacing
		chunk := word
		if i > 0 {
			chunk = " " + word
		}

		// Add to buffers
		wordBuffer = append(wordBuffer, chunk)
		accumulatedText += chunk

		// Check if we've accumulated enough words for a moderation check
		if len(wordBuffer) >= ModerationChunkSize || i == len(words)-1 {
			// OUTPUT MODERATION: Only run if OutputShieldID is configured
			if params.OutputShieldID != "" {
				moderationResult, err := m.CreateModeration(ctx, accumulatedText, params.OutputShieldID)
				if err != nil {
					// If moderation fails, log but continue (fail open for mock)
					// In production, you might want to fail closed
				} else if len(moderationResult.Results) > 0 && moderationResult.Results[0].Flagged {
					// Content flagged! Stop streaming and send guardrail violation
					sendGuardrailViolation(deltaSequenceNum, accumulatedText)
					return
				}
			}

			// Moderation passed - stream the buffered words
			for _, bufferedChunk := range wordBuffer {
				sendEvent(map[string]interface{}{
					"type":            "response.output_text.delta",
					"sequence_number": deltaSequenceNum,
					"item_id":         itemID,
					"output_index":    0,
					"delta":           bufferedChunk,
				})
				deltaSequenceNum++

				// Add delay between chunks for realistic streaming effect
				if !sleepWithContext(50 * time.Millisecond) {
					return
				}
				flusher.Flush()
			}

			// Update streamed text and clear buffer
			streamedText = accumulatedText
			wordBuffer = nil
		}
	}

	// Use streamedText for final response (same as responseText if all passed)
	finalText := streamedText
	if finalText == "" {
		finalText = responseText
	}

	// 6. Content part done event
	sendEvent(map[string]interface{}{
		"type":            "response.content_part.done",
		"sequence_number": deltaSequenceNum,
		"item_id":         itemID,
		"output_index":    0,
		"delta":           "",
	})

	// Brief delay before completion
	if !sleepWithContext(100 * time.Millisecond) {
		return
	}
	flusher.Flush()

	// 7. Response completed event
	var outputItems []map[string]interface{}

	// Add MCP tool outputs to completed response if MCP tools were used
	if len(params.Tools) > 0 {
		// Add MCP list tools output
		outputItems = append(outputItems, map[string]interface{}{
			"id":           "mcp_list_mock123",
			"type":         "mcp_list_tools",
			"role":         "assistant",
			"server_label": params.Tools[0].ServerLabel,
			"output":       "",
		})

		// Add MCP tool call output
		mcpOutput := `{"tag_name":"v1.95.0","name":"Mock Release","body":"This is a mock GitHub release","published_at":"2025-09-17T15:00:00Z","author":{"login":"mock-user","id":12345}}`
		outputItems = append(outputItems, map[string]interface{}{
			"id":           "call_mock456",
			"type":         "mcp_call",
			"role":         "assistant",
			"server_label": params.Tools[0].ServerLabel,
			"name":         "get_latest_release",
			"arguments":    `{"owner":"llamastack","repo":"llama-stack"}`,
			"output":       mcpOutput,
		})
	}

	// Add tool call to completed response if vector stores were used
	if len(params.VectorStoreIDs) > 0 {
		outputItems = append(outputItems, map[string]interface{}{
			"id":      "call_mock123",
			"type":    "file_search_call",
			"role":    "assistant",
			"status":  "completed",
			"queries": []string{params.Input},
			"results": []map[string]interface{}{
				{
					"filename": "mock_document.txt",
					"score":    0.8542,
					"text":     "This is mock retrieved content that relates to your query: " + params.Input + ". This content comes from the vector store and provides context for the AI response.",
				},
			},
		})
	}

	// Add message content
	outputItems = append(outputItems, map[string]interface{}{
		"id":     itemID,
		"type":   "message",
		"role":   "assistant",
		"status": "completed",
		"content": []map[string]interface{}{
			{
				"type": "output_text",
				"text": finalText,
			},
		},
	})

	sendEvent(map[string]interface{}{
		"type":            "response.completed",
		"sequence_number": 0,
		"item_id":         "",
		"output_index":    0,
		"delta":           "",
		"response": map[string]interface{}{
			"id":         responseID,
			"model":      params.Model,
			"status":     "completed",
			"created_at": 1234567890.0,
			"output":     outputItems,
			"usage": map[string]interface{}{
				"input_tokens":  10,
				"output_tokens": 25,
				"total_tokens":  35,
			},
		},
	})

	// Send response.metrics event (simulates BFF metrics tracking)
	elapsedMs := time.Since(streamStartTime).Milliseconds()
	sendEvent(map[string]interface{}{
		"type": "response.metrics",
		"metrics": map[string]interface{}{
			"latency_ms":             elapsedMs,
			"time_to_first_token_ms": 100, // Mock TTFT
			"usage": map[string]interface{}{
				"input_tokens":  10,
				"output_tokens": 25,
				"total_tokens":  35,
			},
		},
	})
}

// CreateResponseStream returns an error that indicates mock streaming mode
func (m *MockLlamaStackClient) CreateResponseStream(ctx context.Context, params llamastack.CreateResponseParams) (*ssestream.Stream[responses.ResponseStreamEventUnion], error) {
	// Use the same response text logic as non-streaming mock
	responseText := "This is a mock response to your query: " + params.Input
	if len(params.VectorStoreIDs) > 0 {
		responseText = "Based on retrieved documents, this is a mock response to your query: " + params.Input
	}

	// If previous response ID is provided, acknowledge it in the response
	if params.PreviousResponseID != "" {
		responseText = "Continuing from previous response " + params.PreviousResponseID + ". " + responseText
	}

	// Return a special error that the handler can detect and delegate back to the mock
	mockError := &MockStreamError{
		Message:      "mock_streaming_mode",
		ResponseText: responseText,
		Params:       params,
	}

	return nil, mockError
}

// DeleteVectorStore returns success for mock deletion
func (m *MockLlamaStackClient) DeleteVectorStore(ctx context.Context, vectorStoreID string) error {
	if vectorStoreID == "" {
		return fmt.Errorf("vectorStoreID is required")
	}
	// Mock deletion always succeeds
	return nil
}

// ListFiles returns mock file data
func (m *MockLlamaStackClient) ListFiles(ctx context.Context, params llamastack.ListFilesParams) ([]openai.FileObject, error) {
	return []openai.FileObject{
		{
			ID:        "file-mock123abc456def",
			Object:    "file",
			Bytes:     1024,
			CreatedAt: 1755721386,
			Filename:  "mock_document.txt",
			Purpose:   "assistants",
		},
		{
			ID:        "file-mock789ghi012jkl",
			Object:    "file",
			Bytes:     2048,
			CreatedAt: 1755721400,
			Filename:  "mock_data.pdf",
			Purpose:   "assistants",
		},
	}, nil
}

// GetFile returns mock file details by ID
func (m *MockLlamaStackClient) GetFile(ctx context.Context, fileID string) (*openai.FileObject, error) {
	if fileID == "" {
		return nil, fmt.Errorf("fileID is required")
	}

	// Return mock file details based on ID
	mockFiles := map[string]openai.FileObject{
		"file-mock123abc456def": {
			ID:        "file-mock123abc456def",
			Object:    "file",
			Bytes:     1024,
			CreatedAt: 1755721386,
			Filename:  "mock_document.txt",
			Purpose:   "assistants",
		},
		"file-mock789ghi012jkl": {
			ID:        "file-mock789ghi012jkl",
			Object:    "file",
			Bytes:     2048,
			CreatedAt: 1755721400,
			Filename:  "mock_data.pdf",
			Purpose:   "assistants",
		},
		"file-f76dd7ebee5c48048f3b97b44dff6b97": {
			ID:        "file-f76dd7ebee5c48048f3b97b44dff6b97",
			Object:    "file",
			Bytes:     14522,
			CreatedAt: 1759415698,
			Filename:  "test_document_1.pdf",
			Purpose:   "assistants",
		},
		"file-7376f43495fa4b4a8f6dbe93bbe9f187": {
			ID:        "file-7376f43495fa4b4a8f6dbe93bbe9f187",
			Object:    "file",
			Bytes:     14522,
			CreatedAt: 1759415696,
			Filename:  "test_document_2.pdf",
			Purpose:   "assistants",
		},
	}

	if file, exists := mockFiles[fileID]; exists {
		return &file, nil
	}

	// Return generic mock file for unknown IDs
	return &openai.FileObject{
		ID:        fileID,
		Object:    "file",
		Bytes:     1024,
		CreatedAt: 1759412258,
		Filename:  "unknown_file.txt",
		Purpose:   "assistants",
	}, nil
}

// DeleteFile returns success for mock deletion
func (m *MockLlamaStackClient) DeleteFile(ctx context.Context, fileID string) error {
	if fileID == "" {
		return fmt.Errorf("fileID is required")
	}
	// Mock deletion always succeeds
	return nil
}

// GetResponse returns a mock response for testing
func (m *MockLlamaStackClient) GetResponse(ctx context.Context, responseID string) (*responses.Response, error) {
	if responseID == "" {
		return nil, fmt.Errorf("responseID is required")
	}

	// Check if there's a specific error set for this response ID
	if err, exists := m.getResponseErrors[responseID]; exists {
		return nil, err
	}

	// Check if there's a specific mock response set for this response ID
	if mockResp, exists := m.getResponseResults[responseID]; exists {
		return &responses.Response{
			ID:        mockResp.ID,
			Model:     responses.ResponsesModel(mockResp.Model),
			Status:    responses.ResponseStatus(mockResp.Status),
			CreatedAt: 1234567890,
		}, nil
	}

	// Default mock response
	return &responses.Response{
		ID:        responseID,
		Model:     "llama-3.1-8b",
		Status:    "completed",
		CreatedAt: 1234567890,
	}, nil
}

// ListVectorStoreFiles returns mock vector store file data
func (m *MockLlamaStackClient) ListVectorStoreFiles(ctx context.Context, vectorStoreID string, params llamastack.ListVectorStoreFilesParams) ([]openai.VectorStoreFile, error) {
	if vectorStoreID == "" {
		return nil, fmt.Errorf("vectorStoreID is required")
	}

	return []openai.VectorStoreFile{
		{
			ID:            "file-mock123abc456def",
			Object:        "vector_store.file",
			UsageBytes:    0,
			CreatedAt:     1755721386,
			VectorStoreID: vectorStoreID,
			Status:        "completed",
			LastError: openai.VectorStoreFileLastError{
				Code:    "",
				Message: "",
			},
			Attributes: map[string]openai.VectorStoreFileAttributeUnion{},
			ChunkingStrategy: openai.FileChunkingStrategyUnion{
				Type: "auto",
				Static: openai.StaticFileChunkingStrategy{
					ChunkOverlapTokens: 0,
					MaxChunkSizeTokens: 0,
				},
			},
		},
		{
			ID:            "file-mock789ghi012jkl",
			Object:        "vector_store.file",
			UsageBytes:    0,
			CreatedAt:     1755721400,
			VectorStoreID: vectorStoreID,
			Status:        "completed",
			LastError: openai.VectorStoreFileLastError{
				Code:    "",
				Message: "",
			},
			Attributes: map[string]openai.VectorStoreFileAttributeUnion{},
			ChunkingStrategy: openai.FileChunkingStrategyUnion{
				Type: "auto",
				Static: openai.StaticFileChunkingStrategy{
					ChunkOverlapTokens: 0,
					MaxChunkSizeTokens: 0,
				},
			},
		},
	}, nil
}

// DeleteVectorStoreFile returns success for mock deletion
func (m *MockLlamaStackClient) DeleteVectorStoreFile(ctx context.Context, vectorStoreID, fileID string) error {
	if vectorStoreID == "" {
		return fmt.Errorf("vectorStoreID is required")
	}
	if fileID == "" {
		return fmt.Errorf("fileID is required")
	}
	// Mock deletion always succeeds
	return nil
}

// CreateModeration returns a mock moderation response using SDK types.
// It simulates guardrail behavior by checking for certain patterns in the input.
// This allows testing both flagged and unflagged scenarios.
func (m *MockLlamaStackClient) CreateModeration(ctx context.Context, input string, model string) (*openai.ModerationNewResponse, error) {
	if input == "" {
		return nil, fmt.Errorf("input is required")
	}
	if model == "" {
		return nil, fmt.Errorf("model (shield ID) is required")
	}

	inputLower := strings.ToLower(input)

	// Patterns that trigger moderation flags (for testing purposes)
	flaggedPatterns := []string{
		"hack", "attack", "exploit", "malicious", "harmful",
		"kill", "hate", "violence",
	}

	// Check if any flagged patterns are present in the input
	flagged := false
	for _, pattern := range flaggedPatterns {
		if strings.Contains(inputLower, pattern) {
			flagged = true
			break
		}
	}

	// Build mock response using SDK types
	// Only Flagged field is used by the actual code - Categories/Scores are not needed
	return &openai.ModerationNewResponse{
		ID:    "mod_mock_" + fmt.Sprintf("%d", time.Now().UnixNano()),
		Model: model,
		Results: []openai.Moderation{
			{
				Flagged: flagged,
			},
		},
	}, nil
}
