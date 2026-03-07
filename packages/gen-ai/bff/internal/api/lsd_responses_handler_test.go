package api

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/openai/openai-go/v2/responses"
	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack/lsmocks"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
	"github.com/opendatahub-io/gen-ai/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var _ = Describe("LlamaStackCreateResponseHandler", func() {
	var app App

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

	BeforeEach(func() {
		llamaStackClientFactory := lsmocks.NewMockClientFactory()
		logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))
		app = App{
			config: config.EnvConfig{
				Port: 4000,
			},
			logger:                  logger,
			llamaStackClientFactory: llamaStackClientFactory,
			repositories:            repositories.NewRepositories(),
		}
	})

	It("should create response with required parameters only", func() {
		t := GinkgoT()
		payload := CreateResponseRequest{
			Input: "Hello, how are you?",
			Model: testutil.GetTestLlamaStackModel(),
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
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
		data := response["data"].(map[string]interface{})

		assert.NotEmpty(t, data["id"])
		assert.Equal(t, "completed", data["status"])
		assert.Contains(t, data, "created_at")
		assert.Contains(t, data, "output")

		output := data["output"].([]interface{})
		assert.Greater(t, len(output), 0)

		messageItem := output[len(output)-1].(map[string]interface{})
		assert.Equal(t, "message", messageItem["type"])
		assert.Equal(t, "assistant", messageItem["role"])
		assert.Contains(t, messageItem, "content")
	})

	It("should create response with all optional parameters", func() {
		t := GinkgoT()
		temperature := 0.7

		payload := CreateResponseRequest{
			Input: "Tell me about AI",
			Model: testutil.GetTestLlamaStackModel(),
			ChatContext: []ChatContextMessage{
				{Role: "user", Content: "What is machine learning?"},
				{Role: "assistant", Content: "Machine learning is a subset of AI."},
			},
			Temperature:  &temperature,
			Instructions: "You are a helpful AI assistant.",
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateResponseHandler(rr, req, nil)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		assert.Equal(t, http.StatusCreated, rr.Code, "response body: %s", string(body))

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		data := response["data"].(map[string]interface{})
		assert.NotEmpty(t, data["id"])
		assert.Equal(t, "completed", data["status"])
	})

	It("should return error when input is missing", func() {
		t := GinkgoT()
		payload := CreateResponseRequest{
			Model: testutil.GetTestLlamaStackModel(),
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

	It("should return error when model is missing", func() {
		t := GinkgoT()
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

	It("should return error when allowed_tools contains empty string", func() {
		t := GinkgoT()
		payload := CreateResponseRequest{
			Input: "Test MCP with allowed_tools validation",
			Model: testutil.GetTestLlamaStackModel(),
			MCPServers: []MCPServer{
				{
					ServerLabel:   "slack",
					ServerURL:     "http://127.0.0.1:13080/sse",
					Authorization: "test-token",
					AllowedTools:  []string{"send_message", "", "get_channel_history"},
				},
			},
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
		assert.Contains(t, errorObj["message"], "allowed_tools[1] cannot be empty")
		assert.Contains(t, errorObj["message"], "slack")
	})

	It("should handle chat context correctly", func() {
		t := GinkgoT()
		payload := CreateResponseRequest{
			Input: "Continue the conversation",
			Model: testutil.GetTestLlamaStackModel(),
			ChatContext: []ChatContextMessage{
				{Role: "user", Content: "Hello"},
				{Role: "assistant", Content: "Hi there! How can I help you?"},
				{Role: "user", Content: "Tell me about AI"},
			},
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
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
		assert.NotEmpty(t, data["id"])
		assert.Equal(t, "completed", data["status"])
	})

	It("should use unified repository pattern", func() {
		t := GinkgoT()
		assert.NotNil(t, app.repositories)
		assert.NotNil(t, app.repositories.Responses)

		payload := CreateResponseRequest{
			Input: "Test unified repository",
			Model: testutil.GetTestLlamaStackModel(),
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateResponseHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		data := response["data"].(map[string]interface{})

		expectedFields := []string{"id", "model", "status", "created_at", "output"}
		for _, field := range expectedFields {
			assert.Contains(t, data, field)
		}

		output := data["output"].([]interface{})
		assert.Greater(t, len(output), 0)

		messageItem := output[len(output)-1].(map[string]interface{})
		assert.Equal(t, "message", messageItem["type"])
		assert.Equal(t, "assistant", messageItem["role"])
		assert.Contains(t, messageItem, "content")

		assert.NotContains(t, data, "object")
		assert.NotContains(t, data, "metadata")
	})

	It("should return error for invalid JSON", func() {
		t := GinkgoT()
		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/responses?namespace="+testutil.TestNamespace, bytes.NewBuffer([]byte("invalid json")))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		rr := httptest.NewRecorder()
		app.LlamaStackCreateResponseHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	It("should validate MCP server parameters in request", func() {
		t := GinkgoT()
		payload := CreateResponseRequest{
			Input: "Test MCP server integration",
			Model: testutil.GetTestLlamaStackModel(),
			MCPServers: []MCPServer{
				{
					ServerLabel:   "github",
					ServerURL:     "https://api.githubcopilot.com/mcp/x/repos/readonly",
					Authorization: "test-token",
				},
			},
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateResponseHandler(rr, req, nil)

		assert.True(t, rr.Code == http.StatusCreated || rr.Code == http.StatusInternalServerError,
			"Expected 201 (success) or 500 (MCP server unreachable), got %d", rr.Code)
	})

	It("should handle MCP server validation errors", func() {
		t := GinkgoT()
		payload := CreateResponseRequest{
			Input: "Test MCP validation",
			Model: testutil.GetTestLlamaStackModel(),
			MCPServers: []MCPServer{
				{
					ServerURL:     "https://api.githubcopilot.com/mcp/x/repos/readonly",
					Authorization: "test-token",
				},
			},
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
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

	It("should handle missing MCP server URL validation", func() {
		t := GinkgoT()
		payload := CreateResponseRequest{
			Input: "Test MCP validation",
			Model: testutil.GetTestLlamaStackModel(),
			MCPServers: []MCPServer{
				{
					ServerLabel:   "github",
					Authorization: "test-token",
				},
			},
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
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

	It("should create response with previous response ID", func() {
		t := GinkgoT()
		firstPayload := CreateResponseRequest{
			Input: "First message in conversation",
			Model: testutil.GetTestLlamaStackModel(),
		}

		firstReq, err := createJSONRequest(firstPayload)
		assert.NoError(t, err)

		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
		ctx := context.WithValue(firstReq.Context(), constants.LlamaStackClientKey, llamaStackClient)
		firstReq = firstReq.WithContext(ctx)

		firstRR := httptest.NewRecorder()
		app.LlamaStackCreateResponseHandler(firstRR, firstReq, nil)
		assert.Equal(t, http.StatusCreated, firstRR.Code)

		var firstResponse map[string]interface{}
		body, err := io.ReadAll(firstRR.Result().Body)
		assert.NoError(t, err)
		err = json.Unmarshal(body, &firstResponse)
		assert.NoError(t, err)
		firstData, ok := firstResponse["data"].(map[string]interface{})
		require.True(t, ok, "expected data to be a map")
		prevResponseID, ok := firstData["id"].(string)
		require.True(t, ok, "expected id to be a string")

		payload := CreateResponseRequest{
			Input:              "Continue our conversation",
			Model:              testutil.GetTestLlamaStackModel(),
			PreviousResponseID: prevResponseID,
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		ctx = context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateResponseHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		body, err = io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)
		assert.Contains(t, response, "data")

		data := response["data"].(map[string]interface{})
		assert.Equal(t, prevResponseID, data["previous_response_id"])
	})

	It("should reject invalid previous response ID", func() {
		t := GinkgoT()
		payload := CreateResponseRequest{
			Input:              "Continue our conversation",
			Model:              testutil.GetTestLlamaStackModel(),
			PreviousResponseID: "invalid-response-id-does-not-exist",
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
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

	It("should handle empty previous response ID", func() {
		t := GinkgoT()
		payload := CreateResponseRequest{
			Input:              "Hello, how are you?",
			Model:              testutil.GetTestLlamaStackModel(),
			PreviousResponseID: "",
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
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

		data := response["data"].(map[string]interface{})
		_, hasPreviousID := data["previous_response_id"]
		assert.False(t, hasPreviousID)
	})

	It("should reject request with both chat_context and previous_response_id", func() {
		t := GinkgoT()
		payload := CreateResponseRequest{
			Input: "Continue our conversation",
			Model: testutil.GetTestLlamaStackModel(),
			ChatContext: []ChatContextMessage{
				{Role: "user", Content: "Hello"},
				{Role: "assistant", Content: "Hi there!"},
			},
			PreviousResponseID: "prev-response-123",
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
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

	It("should create response with vector store IDs for RAG file_search", func() {
		t := GinkgoT()

		vsID := testCtx.llamaStackState.Seed.VectorStoreID
		require.NotEmpty(t, vsID, "SeedResult.VectorStoreID must be set by SeedData")

		payload := CreateResponseRequest{
			Input:          "What is machine learning?",
			Model:          testutil.GetTestLlamaStackModel(),
			VectorStoreIDs: []string{vsID},
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateResponseHandler(rr, req, nil)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		assert.Equal(t, http.StatusCreated, rr.Code, "RAG response failed: %s", string(body))

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		responseData, ok := response["data"].(map[string]interface{})
		require.True(t, ok, "expected data to be a map")
		assert.NotEmpty(t, responseData["id"])
		assert.Equal(t, "completed", responseData["status"])
		assert.NotNil(t, responseData["output"], "expected output from RAG response")
	})
})

var _ = Describe("StreamingContextCancellation", func() {
	var app App

	BeforeEach(func() {
		llamaStackClientFactory := lsmocks.NewMockClientFactory()
		logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))
		app = App{
			config: config.EnvConfig{
				Port: 4000,
			},
			logger:                  logger,
			llamaStackClientFactory: llamaStackClientFactory,
			repositories:            repositories.NewRepositories(),
		}
	})

	It("should stop streaming when context is cancelled (simulating stop button)", func() {
		t := GinkgoT()
		payload := CreateResponseRequest{
			Input:  "Tell me a long story",
			Model:  testutil.GetTestLlamaStackModel(),
			Stream: true,
		}

		jsonData, err := json.Marshal(payload)
		require.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/responses?namespace="+testutil.TestNamespace, bytes.NewBuffer(jsonData))
		require.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		ctx, cancel := context.WithCancel(context.Background())

		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := &testResponseRecorder{
			ResponseRecorder: httptest.NewRecorder(),
		}

		done := make(chan bool)
		go func() {
			app.LlamaStackCreateResponseHandler(rr, req, nil)
			done <- true
		}()

		time.Sleep(500 * time.Millisecond)

		writesBefore := rr.writeCount.Load()

		cancel()

		select {
		case <-done:
		case <-time.After(5 * time.Second):
			Fail("Handler did not exit after context cancellation")
		}

		assert.Greater(t, writesBefore, int32(0), "Should have written some events before cancellation")

		body := rr.Body.String()
		assert.NotEmpty(t, body, "Should have some response data")

		events := parseSSEEvents(body)
		assert.Greater(t, len(events), 0, "Should have received at least one event")
	})

	It("should handle immediate context cancellation (already cancelled)", func() {
		t := GinkgoT()
		payload := CreateResponseRequest{
			Input:  "Hello",
			Model:  testutil.GetTestLlamaStackModel(),
			Stream: true,
		}

		jsonData, err := json.Marshal(payload)
		require.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/responses?namespace="+testutil.TestNamespace, bytes.NewBuffer(jsonData))
		require.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		ctx, cancel := context.WithCancel(context.Background())
		cancel()

		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		done := make(chan bool)
		go func() {
			app.LlamaStackCreateResponseHandler(rr, req, nil)
			done <- true
		}()

		select {
		case <-done:
		case <-time.After(5 * time.Second):
			Fail("Handler did not exit quickly for already-cancelled context")
		}

		body := rr.Body.String()
		events := parseSSEEvents(body)

		assert.LessOrEqual(t, len(events), 2, "Should have very few events for immediately cancelled context")
	})

	It("should cleanup resources when context is cancelled", func() {
		payload := CreateResponseRequest{
			Input:  "Test cleanup",
			Model:  testutil.GetTestLlamaStackModel(),
			Stream: true,
		}

		jsonData, err := json.Marshal(payload)
		Expect(err).NotTo(HaveOccurred())

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/responses?namespace="+testutil.TestNamespace, bytes.NewBuffer(jsonData))
		Expect(err).NotTo(HaveOccurred())
		req.Header.Set("Content-Type", "application/json")

		ctx, cancel := context.WithCancel(context.Background())

		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		done := make(chan bool)
		go func() {
			app.LlamaStackCreateResponseHandler(rr, req, nil)
			done <- true
		}()

		time.Sleep(300 * time.Millisecond)

		cancel()

		select {
		case <-done:
		case <-time.After(5 * time.Second):
			Fail("Handler did not clean up resources and exit after cancellation")
		}
	})
})

// testResponseRecorder wraps httptest.ResponseRecorder and tracks write count
type testResponseRecorder struct {
	*httptest.ResponseRecorder
	writeCount atomic.Int32
}

func (trr *testResponseRecorder) Write(buf []byte) (int, error) {
	trr.writeCount.Add(1)
	return trr.ResponseRecorder.Write(buf)
}

// parseSSEEvents parses Server-Sent Events from response body
func parseSSEEvents(body string) []map[string]interface{} {
	events := []map[string]interface{}{}
	scanner := bufio.NewScanner(strings.NewReader(body))

	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "data: ") {
			jsonData := strings.TrimPrefix(line, "data: ")
			var event map[string]interface{}
			if err := json.Unmarshal([]byte(jsonData), &event); err == nil {
				events = append(events, event)
			}
		}
	}

	return events
}

var _ = Describe("ResponseMetrics", func() {
	var app App

	BeforeEach(func() {
		llamaStackClientFactory := lsmocks.NewMockClientFactory()
		logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))
		app = App{
			config: config.EnvConfig{
				Port: 4000,
			},
			logger:                  logger,
			llamaStackClientFactory: llamaStackClientFactory,
			repositories:            repositories.NewRepositories(),
		}
	})

	It("should include metrics with latency and usage in non-streaming response", func() {
		t := GinkgoT()
		payload := CreateResponseRequest{
			Input: "Hello",
			Model: testutil.GetTestLlamaStackModel(),
		}

		jsonData, err := json.Marshal(payload)
		require.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/responses?namespace="+testutil.TestNamespace, bytes.NewBuffer(jsonData))
		require.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateResponseHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		require.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		require.NoError(t, err)

		data, ok := response["data"].(map[string]interface{})
		require.True(t, ok, "response should have data field")

		metrics, ok := data["metrics"].(map[string]interface{})
		require.True(t, ok, "data should have metrics field")

		latencyMs, ok := metrics["latency_ms"].(float64)
		require.True(t, ok, "metrics should have latency_ms field")
		assert.GreaterOrEqual(t, latencyMs, float64(0), "latency_ms should be non-negative")

		usage, ok := metrics["usage"].(map[string]interface{})
		require.True(t, ok, "metrics should have usage field")

		inputTokens, ok := usage["input_tokens"].(float64)
		require.True(t, ok, "usage should have input_tokens")
		assert.GreaterOrEqual(t, inputTokens, float64(0), "input_tokens should be non-negative")

		outputTokens, ok := usage["output_tokens"].(float64)
		require.True(t, ok, "usage should have output_tokens")
		assert.GreaterOrEqual(t, outputTokens, float64(0), "output_tokens should be non-negative")

		totalTokens, ok := usage["total_tokens"].(float64)
		require.True(t, ok, "usage should have total_tokens")
		assert.GreaterOrEqual(t, totalTokens, float64(0), "total_tokens should be non-negative")
	})
})

var _ = Describe("StreamingResponseMetrics", func() {
	var app App

	BeforeEach(func() {
		llamaStackClientFactory := lsmocks.NewMockClientFactory()
		logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))
		app = App{
			config: config.EnvConfig{
				Port: 4000,
			},
			logger:                  logger,
			llamaStackClientFactory: llamaStackClientFactory,
			repositories:            repositories.NewRepositories(),
		}
	})

	It("should emit response.metrics event at end of stream", func() {
		t := GinkgoT()
		payload := CreateResponseRequest{
			Input:  "Hello",
			Model:  testutil.GetTestLlamaStackModel(),
			Stream: true,
		}

		jsonData, err := json.Marshal(payload)
		require.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/responses?namespace="+testutil.TestNamespace, bytes.NewBuffer(jsonData))
		require.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		done := make(chan bool)
		go func() {
			app.LlamaStackCreateResponseHandler(rr, req, nil)
			done <- true
		}()

		select {
		case <-done:
		case <-time.After(30 * time.Second):
			Fail("Handler did not complete in time")
		}

		body := rr.Body.String()
		events := parseSSEEvents(body)

		require.Greater(t, len(events), 0, "Should have received events")

		var metricsEvent map[string]interface{}
		for _, event := range events {
			if eventType, ok := event["type"].(string); ok && eventType == "response.metrics" {
				metricsEvent = event
			}
		}

		require.NotNil(t, metricsEvent, "Should have response.metrics event")

		metrics, ok := metricsEvent["metrics"].(map[string]interface{})
		require.True(t, ok, "response.metrics event should have metrics field")

		latencyMs, ok := metrics["latency_ms"].(float64)
		require.True(t, ok, "metrics should have latency_ms")
		assert.Greater(t, latencyMs, float64(0), "latency_ms should be positive")

		ttft, ok := metrics["time_to_first_token_ms"].(float64)
		require.True(t, ok, "metrics should have time_to_first_token_ms for streaming")
		assert.Greater(t, ttft, float64(0), "time_to_first_token_ms should be positive")

		assert.Less(t, ttft, latencyMs, "TTFT should be less than total latency")

		usage, ok := metrics["usage"].(map[string]interface{})
		require.True(t, ok, "metrics should have usage field")

		inputTokens, ok := usage["input_tokens"].(float64)
		require.True(t, ok, "usage should have input_tokens")
		assert.GreaterOrEqual(t, inputTokens, float64(0), "input_tokens should be non-negative")

		outputTokens, ok := usage["output_tokens"].(float64)
		require.True(t, ok, "usage should have output_tokens")
		assert.GreaterOrEqual(t, outputTokens, float64(0), "output_tokens should be non-negative")

		totalTokens, ok := usage["total_tokens"].(float64)
		require.True(t, ok, "usage should have total_tokens")
		assert.GreaterOrEqual(t, totalTokens, float64(0), "total_tokens should be non-negative")
	})

	It("should stream response with vector store IDs for RAG file_search", func() {
		t := GinkgoT()

		vsID := testCtx.llamaStackState.Seed.VectorStoreID
		require.NotEmpty(t, vsID, "SeedResult.VectorStoreID must be set by SeedData")

		payload := CreateResponseRequest{
			Input:          "What is machine learning?",
			Model:          testutil.GetTestLlamaStackModel(),
			Stream:         true,
			VectorStoreIDs: []string{vsID},
		}

		jsonData, err := json.Marshal(payload)
		require.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/responses?namespace="+testutil.TestNamespace, bytes.NewBuffer(jsonData))
		require.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		done := make(chan bool)
		go func() {
			app.LlamaStackCreateResponseHandler(rr, req, nil)
			done <- true
		}()

		select {
		case <-done:
		case <-time.After(60 * time.Second):
			Fail("Streaming RAG handler did not complete in time")
		}

		body := rr.Body.String()
		assert.NotEmpty(t, body, "expected streaming output from RAG response")

		events := parseSSEEvents(body)
		require.Greater(t, len(events), 0, "Should have received SSE events from RAG stream")

		// Verify at least one text delta event was emitted
		hasTextDelta := false
		for _, event := range events {
			if eventType, ok := event["type"].(string); ok && eventType == "response.output_text.delta" {
				hasTextDelta = true
				break
			}
		}
		assert.True(t, hasTextDelta, "expected at least one response.output_text.delta event in RAG stream")
	})
})

// TestExtractUsage tests the extractUsage helper function
func TestExtractUsage(t *testing.T) {
	t.Run("should extract usage from response with usage data", func(t *testing.T) {
		response := &responses.Response{
			ID:     "resp_123",
			Model:  "test-model",
			Status: "completed",
			Usage: responses.ResponseUsage{
				InputTokens:  100,
				OutputTokens: 200,
				TotalTokens:  300,
			},
		}

		usage := extractUsage(response)

		require.NotNil(t, usage)
		assert.Equal(t, 100, usage.InputTokens)
		assert.Equal(t, 200, usage.OutputTokens)
		assert.Equal(t, 300, usage.TotalTokens)
	})

	t.Run("should return nil for non-Response type", func(t *testing.T) {
		// Non-Response types should return nil
		response := map[string]interface{}{
			"id":     "resp_123",
			"model":  "test-model",
			"status": "completed",
		}

		usage := extractUsage(response)

		assert.Nil(t, usage)
	})

	t.Run("should return nil for nil response", func(t *testing.T) {
		usage := extractUsage(nil)
		assert.Nil(t, usage)
	})
}

// TestExtractUsageFromEvent tests the extractUsageFromEvent helper function
func TestExtractUsageFromEvent(t *testing.T) {
	t.Run("should extract usage from response.completed event", func(t *testing.T) {
		event := map[string]interface{}{
			"type": "response.completed",
			"response": map[string]interface{}{
				"id":     "resp_123",
				"model":  "test-model",
				"status": "completed",
				"usage": map[string]interface{}{
					"input_tokens":  50,
					"output_tokens": 150,
					"total_tokens":  200,
				},
			},
		}

		usage := extractUsageFromEvent(event)

		require.NotNil(t, usage)
		assert.Equal(t, 50, usage.InputTokens)
		assert.Equal(t, 150, usage.OutputTokens)
		assert.Equal(t, 200, usage.TotalTokens)
	})

	t.Run("should return nil for event without response", func(t *testing.T) {
		event := map[string]interface{}{
			"type":  "response.output_text.delta",
			"delta": "hello",
		}

		usage := extractUsageFromEvent(event)

		assert.Nil(t, usage)
	})

	t.Run("should return nil for event with response but no usage", func(t *testing.T) {
		event := map[string]interface{}{
			"type": "response.completed",
			"response": map[string]interface{}{
				"id":     "resp_123",
				"model":  "test-model",
				"status": "completed",
			},
		}

		usage := extractUsageFromEvent(event)

		assert.Nil(t, usage)
	})
}

// TestCalculateTTFT tests the calculateTTFT helper function
func TestCalculateTTFT(t *testing.T) {
	t.Run("should calculate TTFT correctly", func(t *testing.T) {
		// Use fixed time values to avoid flaky tests
		startTime := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
		firstTokenTime := startTime.Add(50 * time.Millisecond)

		ttft := calculateTTFT(startTime, &firstTokenTime)

		require.NotNil(t, ttft)
		assert.Equal(t, int64(50), *ttft, "TTFT should be exactly 50ms")
	})

	t.Run("should return nil when firstTokenTime is nil", func(t *testing.T) {
		startTime := time.Now()

		ttft := calculateTTFT(startTime, nil)

		assert.Nil(t, ttft)
	})
}
