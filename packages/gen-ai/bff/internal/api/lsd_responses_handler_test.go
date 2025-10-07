package api

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack/lsmocks"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
	"github.com/opendatahub-io/gen-ai/internal/testutil"
	"github.com/stretchr/testify/assert"
)

func TestLlamaStackCreateResponseHandler(t *testing.T) {
	// Create test app with mock client
	llamaStackClientFactory := lsmocks.NewMockClientFactory()
	app := App{
		config: config.EnvConfig{
			Port: 4000,
		},
		llamaStackClientFactory: llamaStackClientFactory,
		repositories:            repositories.NewRepositories(),
	}

	// Helper function to create JSON request
	createJSONRequest := func(payload interface{}) (*http.Request, error) {
		jsonData, err := json.Marshal(payload)
		if err != nil {
			return nil, err
		}

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/responses?namespace="+testutil.TestNamespace, bytes.NewBuffer(jsonData))
		if err != nil {
			return nil, err
		}
		req.Header.Set("Content-Type", "application/json")
		return req, nil
	}

	t.Run("should create response with required parameters only", func(t *testing.T) {
		payload := CreateResponseRequest{
			Input: "Hello, how are you?",
			Model: "llama-3.1-8b",
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		// Simulate AttachLlamaStackClient middleware: create client and add to context
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateResponseHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		// Verify simplified response structure
		assert.Contains(t, response, "data")
		data := response["data"].(map[string]interface{})

		assert.Equal(t, "resp_mock123", data["id"])
		assert.Equal(t, "llama-3.1-8b", data["model"])
		assert.Equal(t, "completed", data["status"])
		assert.Contains(t, data, "created_at")
		assert.Contains(t, data, "output")

		// Verify output structure
		output := data["output"].([]interface{})
		assert.Greater(t, len(output), 0)

		// Check message output item
		messageItem := output[len(output)-1].(map[string]interface{})
		assert.Equal(t, "message", messageItem["type"])
		assert.Equal(t, "assistant", messageItem["role"])
		assert.Contains(t, messageItem, "content")
	})

	t.Run("should create response with all optional parameters", func(t *testing.T) {
		temperature := 0.7
		topP := 0.9

		payload := CreateResponseRequest{
			Input:          "Tell me about AI",
			Model:          "llama-3.1-70b",
			VectorStoreIDs: []string{"vs_test123", "vs_test456"},
			ChatContext: []ChatContextMessage{
				{Role: "user", Content: "What is machine learning?"},
				{Role: "assistant", Content: "Machine learning is a subset of AI."},
			},
			Temperature:  &temperature,
			TopP:         &topP,
			Instructions: "You are a helpful AI assistant.",
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		// Simulate AttachLlamaStackClient middleware: create client and add to context
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateResponseHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		data := response["data"].(map[string]interface{})
		assert.Equal(t, "resp_mock123", data["id"])
		assert.Equal(t, "llama-3.1-70b", data["model"])
		assert.Equal(t, "completed", data["status"])
	})

	t.Run("should return error when input is missing", func(t *testing.T) {
		payload := CreateResponseRequest{
			Model: "llama-3.1-8b",
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateResponseHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		errorObj := response["error"].(map[string]interface{})
		assert.Contains(t, errorObj["message"], "input is required")
	})

	t.Run("should return error when model is missing", func(t *testing.T) {
		payload := CreateResponseRequest{
			Input: "Hello, world!",
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateResponseHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		errorObj := response["error"].(map[string]interface{})
		assert.Contains(t, errorObj["message"], "model is required")
	})

	t.Run("should handle chat context correctly", func(t *testing.T) {
		payload := CreateResponseRequest{
			Input: "Continue the conversation",
			Model: "llama-3.1-8b",
			ChatContext: []ChatContextMessage{
				{Role: "user", Content: "Hello"},
				{Role: "assistant", Content: "Hi there! How can I help you?"},
				{Role: "user", Content: "Tell me about AI"},
			},
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		// Simulate AttachLlamaStackClient middleware: create client and add to context
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateResponseHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		data := response["data"].(map[string]interface{})
		assert.Equal(t, "resp_mock123", data["id"])
		assert.Equal(t, "llama-3.1-8b", data["model"])
	})

	t.Run("should handle RAG with vector store IDs", func(t *testing.T) {
		payload := CreateResponseRequest{
			Input:          "Search for information about AI",
			Model:          "llama-3.1-8b",
			VectorStoreIDs: []string{"vs_documents", "vs_knowledge"},
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		// Simulate AttachLlamaStackClient middleware: create client and add to context
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateResponseHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		data := response["data"].(map[string]interface{})
		assert.Equal(t, "resp_mock123", data["id"])
		assert.Equal(t, "completed", data["status"])
	})

	t.Run("should use unified repository pattern", func(t *testing.T) {
		assert.NotNil(t, app.repositories)
		assert.NotNil(t, app.repositories.Responses)

		payload := CreateResponseRequest{
			Input: "Test unified repository",
			Model: "llama-3.1-8b",
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		// Simulate AttachLlamaStackClient middleware: create client and add to context
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateResponseHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		// Verify simplified response structure
		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		data := response["data"].(map[string]interface{})

		// Verify clean response contains only essential fields
		expectedFields := []string{"id", "model", "status", "created_at", "output"}
		for _, field := range expectedFields {
			assert.Contains(t, data, field)
		}

		// Verify clean output structure
		output := data["output"].([]interface{})
		assert.Greater(t, len(output), 0)

		// Verify message output item structure
		messageItem := output[len(output)-1].(map[string]interface{})
		assert.Equal(t, "message", messageItem["type"])
		assert.Equal(t, "assistant", messageItem["role"])
		assert.Contains(t, messageItem, "content")

		// Verify no complex nested structures from original response (these were filtered out)
		assert.NotContains(t, data, "object")
		assert.NotContains(t, data, "metadata")
	})

	t.Run("should return error for invalid JSON", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/responses?namespace="+testutil.TestNamespace, bytes.NewBuffer([]byte("invalid json")))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		rr := httptest.NewRecorder()
		app.LlamaStackCreateResponseHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("should create response with MCP servers and include MCP fields", func(t *testing.T) {
		payload := CreateResponseRequest{
			Input: "Test MCP server integration",
			Model: "mock-model-for-testing",
			MCPServers: []MCPServer{
				{
					ServerLabel: "github",
					ServerURL:   "https://api.githubcopilot.com/mcp/x/repos/readonly",
					Headers: map[string]string{
						"Authorization": "Bearer test-token",
					},
				},
			},
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		// Simulate AttachLlamaStackClient middleware: create client and add to context
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateResponseHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		// Verify response structure
		assert.Contains(t, response, "data")
		data := response["data"].(map[string]interface{})
		assert.Contains(t, data, "output")

		// Verify output contains MCP tool interactions
		output := data["output"].([]interface{})
		assert.Greater(t, len(output), 2) // Should have mcp_list_tools, mcp_call, and message

		// Find and verify MCP tool output items
		var mcpListItem map[string]interface{}
		var mcpCallItem map[string]interface{}
		var messageItem map[string]interface{}

		for _, item := range output {
			itemMap := item.(map[string]interface{})
			switch itemMap["type"] {
			case "mcp_list_tools":
				mcpListItem = itemMap
			case "mcp_call":
				mcpCallItem = itemMap
			case "message":
				messageItem = itemMap
			}
		}

		// Verify MCP list tools item with new fields
		assert.NotNil(t, mcpListItem, "Should have mcp_list_tools output item")
		assert.Equal(t, "mcp_list_tools", mcpListItem["type"])
		assert.Equal(t, "assistant", mcpListItem["role"])
		assert.Equal(t, "github", mcpListItem["server_label"])
		assert.Contains(t, mcpListItem, "output")

		// Verify MCP call item with all new MCP fields
		assert.NotNil(t, mcpCallItem, "Should have mcp_call output item")
		assert.Equal(t, "mcp_call", mcpCallItem["type"])
		assert.Equal(t, "assistant", mcpCallItem["role"])
		assert.Equal(t, "github", mcpCallItem["server_label"])
		assert.Equal(t, "get_latest_release", mcpCallItem["name"])
		assert.Contains(t, mcpCallItem, "arguments")
		assert.Contains(t, mcpCallItem, "output")

		// Verify arguments is valid JSON string
		arguments := mcpCallItem["arguments"].(string)
		var argMap map[string]interface{}
		err = json.Unmarshal([]byte(arguments), &argMap)
		assert.NoError(t, err, "Arguments should be valid JSON")
		assert.Contains(t, argMap, "owner")
		assert.Contains(t, argMap, "repo")

		// Verify output contains mock GitHub API response
		mcpOutput := mcpCallItem["output"].(string)
		var outputMap map[string]interface{}
		err = json.Unmarshal([]byte(mcpOutput), &outputMap)
		assert.NoError(t, err, "Output should be valid JSON")
		assert.Contains(t, outputMap, "tag_name")
		assert.Equal(t, "v1.95.0", outputMap["tag_name"])

		// Verify message item reflects MCP tool usage
		assert.NotNil(t, messageItem, "Should have message output item")
		assert.Equal(t, "message", messageItem["type"])
		content := messageItem["content"].([]interface{})
		assert.Greater(t, len(content), 0)
		textContent := content[0].(map[string]interface{})
		assert.Contains(t, textContent["text"], "GitHub MCP tool results")
	})

	t.Run("should handle MCP server validation errors", func(t *testing.T) {
		payload := CreateResponseRequest{
			Input: "Test MCP validation",
			Model: "llama-3.1-8b",
			MCPServers: []MCPServer{
				{
					// Missing ServerLabel - should cause validation error
					ServerURL: "https://api.githubcopilot.com/mcp/x/repos/readonly",
					Headers: map[string]string{
						"Authorization": "Bearer test-token",
					},
				},
			},
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		// Simulate AttachLlamaStackClient middleware
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateResponseHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		assert.Contains(t, string(body), "server_label is required")
	})

	t.Run("should handle missing MCP server URL validation", func(t *testing.T) {
		payload := CreateResponseRequest{
			Input: "Test MCP validation",
			Model: "llama-3.1-8b",
			MCPServers: []MCPServer{
				{
					ServerLabel: "github",
					// Missing ServerURL - should cause validation error
					Headers: map[string]string{
						"Authorization": "Bearer test-token",
					},
				},
			},
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		// Simulate AttachLlamaStackClient middleware
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateResponseHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		assert.Contains(t, string(body), "server_url is required")
	})

	t.Run("should create response with previous response ID", func(t *testing.T) {
		// Create a mock client that returns a valid response for GetResponse
		mockClient := lsmocks.NewMockLlamaStackClient()
		llamaStackClientFactory.SetMockClient(mockClient)

		// Mock the GetResponse call to return a valid response
		mockClient.SetGetResponseResult("prev-response-123", &lsmocks.MockResponse{
			ID:     "prev-response-123",
			Model:  "llama-3.1-8b",
			Status: "completed",
		})

		payload := CreateResponseRequest{
			Input:              "Continue our conversation",
			Model:              "llama-3.1-8b",
			PreviousResponseID: "prev-response-123",
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		// Simulate AttachLlamaStackClient middleware: create client and add to context
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateResponseHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)
		assert.Contains(t, response, "data")

		// Verify the response data includes the previous response ID
		data := response["data"].(map[string]interface{})
		assert.Equal(t, "prev-response-123", data["previous_response_id"])
	})

	t.Run("should reject invalid previous response ID", func(t *testing.T) {
		// Create a mock client that returns an error for GetResponse
		mockClient := lsmocks.NewMockLlamaStackClient()
		llamaStackClientFactory.SetMockClient(mockClient)

		// Mock the GetResponse call to return an error
		mockClient.SetGetResponseError("invalid-response-id", assert.AnError)

		payload := CreateResponseRequest{
			Input:              "Continue our conversation",
			Model:              "llama-3.1-8b",
			PreviousResponseID: "invalid-response-id",
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		// Simulate AttachLlamaStackClient middleware: create client and add to context
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateResponseHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		assert.Contains(t, string(body), "invalid previous response ID")
	})

	t.Run("should handle empty previous response ID", func(t *testing.T) {
		payload := CreateResponseRequest{
			Input:              "Hello, how are you?",
			Model:              "llama-3.1-8b",
			PreviousResponseID: "", // Empty string should be valid
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		// Simulate AttachLlamaStackClient middleware: create client and add to context
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateResponseHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)
		assert.Contains(t, response, "data")

		// Verify the response data does not include previous_response_id when empty
		data := response["data"].(map[string]interface{})
		_, hasPreviousID := data["previous_response_id"]
		assert.False(t, hasPreviousID)
	})

	t.Run("should reject request with both chat_context and previous_response_id", func(t *testing.T) {
		payload := CreateResponseRequest{
			Input: "Continue our conversation",
			Model: "llama-3.1-8b",
			ChatContext: []ChatContextMessage{
				{
					Role:    "user",
					Content: "Hello",
				},
				{
					Role:    "assistant",
					Content: "Hi there!",
				},
			},
			PreviousResponseID: "prev-response-123",
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		// Simulate AttachLlamaStackClient middleware: create client and add to context
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateResponseHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		assert.Contains(t, string(body), "chat_context and previous_response_id cannot be used together")
	})

	t.Run("should pass previous_response_id to LlamaStack client", func(t *testing.T) {
		// Create a mock client that returns a valid response for GetResponse
		mockClient := lsmocks.NewMockLlamaStackClient()
		llamaStackClientFactory.SetMockClient(mockClient)

		// Mock the GetResponse call to return a valid response
		mockClient.SetGetResponseResult("prev-response-123", &lsmocks.MockResponse{
			ID:     "prev-response-123",
			Model:  "llama-3.1-8b",
			Status: "completed",
		})

		payload := CreateResponseRequest{
			Input:              "Continue our conversation",
			Model:              "llama-3.1-8b",
			PreviousResponseID: "prev-response-123",
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		// Simulate AttachLlamaStackClient middleware: create client and add to context
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateResponseHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)
		assert.Contains(t, response, "data")

		// Verify the response data includes the previous response ID
		data := response["data"].(map[string]interface{})
		assert.Equal(t, "prev-response-123", data["previous_response_id"])

		// Verify the response text acknowledges the previous response ID
		// This confirms that the PreviousResponseID was passed to the mock client
		output := data["output"].([]interface{})
		assert.Greater(t, len(output), 0)
		firstOutput := output[0].(map[string]interface{})
		content := firstOutput["content"].([]interface{})
		assert.Greater(t, len(content), 0)
		firstContent := content[0].(map[string]interface{})
		text := firstContent["text"].(string)
		assert.Contains(t, text, "Continuing from previous response prev-response-123")
	})
}
