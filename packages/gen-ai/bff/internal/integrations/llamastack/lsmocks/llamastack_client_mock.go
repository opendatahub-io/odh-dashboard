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
	Status responses.ResponseStatus
	Output []responses.ResponseOutputItemUnion
}

// MockLlamaStackClient provides a mock implementation of the LlamaStackClient for testing
type MockLlamaStackClient struct {
	// Add fields here if you need to store state for testing
	getResponseResults   map[string]*MockResponse
	getResponseErrors    map[string]error
	createResponseResult *MockResponse
}

// NewMockLlamaStackClient creates a new mock client
func NewMockLlamaStackClient() *MockLlamaStackClient {
	return &MockLlamaStackClient{
		getResponseResults: make(map[string]*MockResponse),
		getResponseErrors:  make(map[string]error),
		createResponseResult: &MockResponse{
			ID:     "resp_mock123",
			Model:  "llama-3.1-8b",
			Status: responses.ResponseStatusCompleted,
			Output: []responses.ResponseOutputItemUnion{
				{
					Type: "message",
					Role: "assistant",
					Content: []responses.ResponseOutputMessageContentUnion{
						{
							Type: "text",
							Text: "This is a mock response.",
						},
					},
				},
			},
		},
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

// SetCreateResponseResult sets the mock response for CreateResponse
func (m *MockLlamaStackClient) SetCreateResponseResult(mockResponse *MockResponse) {
	m.createResponseResult = mockResponse
}

// CreateResponse returns a mock response
func (m *MockLlamaStackClient) CreateResponse(ctx context.Context, params llamastack.CreateResponseParams) (*responses.Response, error) {
	if m.createResponseResult == nil {
		return nil, fmt.Errorf("no mock response set")
	}

	// Create output items starting with the default ones
	output := make([]responses.ResponseOutputItemUnion, 0)

	// If MCP tools are provided, add MCP tool interactions
	if len(params.Tools) > 0 {
		// Add MCP list tools output
		output = append(output, responses.ResponseOutputItemUnion{
			Type:        "mcp_list_tools",
			Role:        "assistant",
			ServerLabel: params.Tools[0].ServerLabel,
		})

		// Add MCP tool call output
		mcpOutput := `{"tag_name":"v1.95.0","name":"Mock Release","body":"This is a mock GitHub release","published_at":"2025-09-17T15:00:00Z","author":{"login":"mock-user","id":12345}}`
		output = append(output, responses.ResponseOutputItemUnion{
			Type:        "mcp_call",
			Role:        "assistant",
			ServerLabel: params.Tools[0].ServerLabel,
			Name:        "get_latest_release",
			Arguments:   `{"owner":"llamastack","repo":"llama-stack"}`,
			Output:      mcpOutput,
		})
	}

	// Build the message text based on various conditions
	messageText := "This is a mock response."

	// Add previous response ID to message if provided
	if params.PreviousResponseID != "" {
		messageText = "Continuing from previous response " + params.PreviousResponseID + ". " + messageText
	}

	// Add MCP tool results to message if tools are provided
	if len(params.Tools) > 0 {
		messageText = "Based on the GitHub MCP tool results, the latest release is v1.95.0. " + messageText
	}

	// Add file content to message if input contains file content
	if strings.Contains(params.Input, "Context from uploaded files:") {
		// Extract file content from input
		lines := strings.Split(params.Input, "\n")
		var fileContents []string
		for _, line := range lines {
			if strings.HasPrefix(line, "File: ") {
				fileContents = append(fileContents, line)
			} else if len(fileContents) > 0 && strings.HasPrefix(line, "Content:") {
				fileContents = append(fileContents, line)
			} else if len(fileContents) > 0 && !strings.HasPrefix(line, "User query:") {
				fileContents = append(fileContents, line)
			}
		}
		if len(fileContents) > 0 {
			messageText = "I've read the files:\n" + strings.Join(fileContents, "\n") + "\n" + messageText
		}
	}

	output = append(output, responses.ResponseOutputItemUnion{
		Type: "message",
		Role: "assistant",
		Content: []responses.ResponseOutputMessageContentUnion{
			{
				Type: "text",
				Text: messageText,
			},
		},
	})

	// Convert MockResponse to responses.Response, but use the model from the request
	response := &responses.Response{
		ID:     m.createResponseResult.ID,
		Model:  params.Model,
		Status: m.createResponseResult.Status,
		Output: output,
	}

	return response, nil
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

	// If previous response ID is provided, acknowledge it in the response
	if params.PreviousResponseID != "" {
		responseText = "Continuing from previous response " + params.PreviousResponseID + ". " + responseText
	}

	// If input contains file content (from in-context learning), acknowledge it
	if strings.Contains(params.Input, "Context from uploaded files:") {
		responseText = "Based on the provided file content, " + responseText
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
