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

// MockLlamaStackClient provides a mock implementation of the LlamaStackClient for testing
type MockLlamaStackClient struct {
	// Add fields here if you need to store state for testing
}

// NewMockLlamaStackClient creates a new mock client
func NewMockLlamaStackClient() *MockLlamaStackClient {
	return &MockLlamaStackClient{}
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
		}
	}

	return result, nil
}

// CreateResponse returns a mock response with comprehensive parameter support
func (m *MockLlamaStackClient) CreateResponse(ctx context.Context, params llamastack.CreateResponseParams) (*responses.Response, error) {
	// Create base response text
	responseText := "This is a mock response to your query: " + params.Input

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

	// Create mock response with proper Output structure
	mockResponse := &responses.Response{
		ID:        "resp_mock123",
		Object:    "response",
		CreatedAt: 1234567890.0,
		Model:     params.Model,
		Status:    "completed",
		Metadata:  map[string]string{},
		Output:    outputItems,
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

// HandleMockStreaming writes realistic streaming events to the response writer
func (m *MockLlamaStackClient) HandleMockStreaming(w http.ResponseWriter, flusher http.Flusher, params llamastack.CreateResponseParams) {
	// Set hardened headers for Server-Sent Events (same as real handler)
	w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache, no-transform")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)

	// Determine response text based on whether RAG is used
	responseText := "This is a mock response to your query: " + params.Input
	if len(params.VectorStoreIDs) > 0 {
		responseText = "Based on retrieved documents, this is a mock response to your query: " + params.Input
	}

	// Mock identifiers
	responseID := "resp_mock_stream123"
	itemID := "msg_mock_stream123"

	// Helper function to send SSE event
	sendEvent := func(eventData interface{}) {
		if data, err := json.Marshal(eventData); err == nil {
			fmt.Fprintf(w, "data: %s\n\n", data)
		}
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
	time.Sleep(200 * time.Millisecond)
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
		time.Sleep(300 * time.Millisecond)
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
		time.Sleep(500 * time.Millisecond)
		flusher.Flush()

		// Update response text to reflect MCP tool usage
		responseText = "Based on the GitHub MCP tool results, the latest release is v1.95.0. " + responseText
	}

	// 3. If vector stores provided, simulate RAG processing
	if len(params.VectorStoreIDs) > 0 {
		// RAG processing happens in background (skip some sequence numbers)
		sequenceNum += 3 // Skip some numbers for RAG background processing
		time.Sleep(500 * time.Millisecond)
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
	time.Sleep(150 * time.Millisecond)
	flusher.Flush()

	// 4. Split text into words and send as delta events (like real streaming)
	words := strings.Fields(responseText)
	for i, word := range words {
		// Add space before each word except the first
		chunk := word
		if i > 0 {
			chunk = " " + word
		}

		sendEvent(map[string]interface{}{
			"type":            "response.output_text.delta",
			"sequence_number": sequenceNum + 1 + i,
			"item_id":         itemID,
			"output_index":    0,
			"delta":           chunk,
		})

		// Add realistic delay between chunks to simulate real streaming
		time.Sleep(300 * time.Millisecond)
		flusher.Flush()
	}

	// 5. Content part done event
	sendEvent(map[string]interface{}{
		"type":            "response.content_part.done",
		"sequence_number": sequenceNum + 1 + len(words),
		"item_id":         itemID,
		"output_index":    0,
		"delta":           "",
	})

	// Brief delay before completion
	time.Sleep(100 * time.Millisecond)
	if flusher, ok := w.(http.Flusher); ok {
		flusher.Flush()
	}

	// 6. Response completed event
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
				"text": responseText,
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

	// Return a special error that the handler can detect and delegate back to the mock
	mockError := &MockStreamError{
		Message:      "mock_streaming_mode",
		ResponseText: responseText,
		Params:       params,
	}

	return nil, mockError
}
