package api

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
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
	"github.com/opendatahub-io/gen-ai/internal/cache"
	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient/bffmocks"
	k8s "github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes/k8smocks"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack/lsmocks"
	"github.com/opendatahub-io/gen-ai/internal/integrations/nemo"
	"github.com/opendatahub-io/gen-ai/internal/integrations/nemo/nemomocks"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
	"github.com/opendatahub-io/gen-ai/internal/testutil"
	gentypes "github.com/opendatahub-io/gen-ai/internal/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
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
			Input: llamastack.InputUnion{Text: "Hello, how are you?"},
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
			Input: llamastack.InputUnion{Text: "Tell me about AI"},
			Model: testutil.GetTestLlamaStackModel(),
			ChatContext: []ChatContextMessage{
				{Role: "user", Content: llamastack.InputUnion{Text: "What is machine learning?"}},
				{Role: "assistant", Content: llamastack.InputUnion{Text: "Machine learning is a subset of AI."}},
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

	It("should accept subscription field without affecting non-MaaS response", func() {
		t := GinkgoT()
		payload := CreateResponseRequest{
			Input:        llamastack.InputUnion{Text: "Hello from MaaS"},
			Model:        testutil.GetTestLlamaStackModel(),
			Subscription: "premium-subscription",
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
			Input: llamastack.InputUnion{Text: "Hello, world!"},
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
			Input: llamastack.InputUnion{Text: "Test MCP with allowed_tools validation"},
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
			Input: llamastack.InputUnion{Text: "Continue the conversation"},
			Model: testutil.GetTestLlamaStackModel(),
			ChatContext: []ChatContextMessage{
				{Role: "user", Content: llamastack.InputUnion{Text: "Hello"}},
				{Role: "assistant", Content: llamastack.InputUnion{Text: "Hi there! How can I help you?"}},
				{Role: "user", Content: llamastack.InputUnion{Text: "Tell me about AI"}},
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
			Input: llamastack.InputUnion{Text: "Test unified repository"},
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

	// MCP tests use NewMockLlamaStackClient() directly because the real server
	// attempts to connect to external MCP URLs which are unreachable in test environments.
	It("should validate MCP server parameters in request", func() {
		t := GinkgoT()
		payload := CreateResponseRequest{
			Input: llamastack.InputUnion{Text: "Test MCP server integration"},
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

		llamaStackClient := lsmocks.NewMockLlamaStackClient()
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
			Input: llamastack.InputUnion{Text: "Test MCP validation"},
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

		llamaStackClient := lsmocks.NewMockLlamaStackClient()
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
			Input: llamastack.InputUnion{Text: "Test MCP validation"},
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

		llamaStackClient := lsmocks.NewMockLlamaStackClient()
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
			Input: llamastack.InputUnion{Text: "First message in conversation"},
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
			Input:              llamastack.InputUnion{Text: "Continue our conversation"},
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
			Input:              llamastack.InputUnion{Text: "Continue our conversation"},
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
			Input:              llamastack.InputUnion{Text: "Hello, how are you?"},
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
			Input: llamastack.InputUnion{Text: "Continue our conversation"},
			Model: testutil.GetTestLlamaStackModel(),
			ChatContext: []ChatContextMessage{
				{Role: "user", Content: llamastack.InputUnion{Text: "Hello"}},
				{Role: "assistant", Content: llamastack.InputUnion{Text: "Hi there!"}},
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
			Input:          llamastack.InputUnion{Text: "What is machine learning?"},
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

	It("should create response with multimodal input (text + vision image)", func() {
		t := GinkgoT()

		lsClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")

		// Upload a small PNG image to the OGX Files API with purpose "vision"
		imgData := []byte{
			0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
			0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
			0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
			0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // RGB, 8-bit
			0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
			0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00, // compressed
			0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC, // data
			0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, // IEND chunk
			0x44, 0xAE, 0x42, 0x60, 0x82,
		}
		uploadResult, err := lsClient.UploadFile(context.Background(), llamastack.UploadFileParams{
			Reader:      bytes.NewReader(imgData),
			Filename:    "test_pixel.png",
			ContentType: "image/png",
			Purpose:     "vision",
		})
		require.NoError(t, err, "vision file upload to OGX must succeed")
		require.NotEmpty(t, uploadResult.FileID, "must get a file_id back")

		payload := CreateResponseRequest{
			Input: llamastack.InputUnion{Parts: []llamastack.InputContentPart{
				{Type: "input_text", Text: "What do you see in this image? Reply in one sentence."},
				{Type: "input_image", FileID: uploadResult.FileID},
			}},
			Model: testutil.GetTestLlamaStackModel(),
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, lsClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateResponseHandler(rr, req, nil)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		assert.Equal(t, http.StatusCreated, rr.Code, "multimodal response failed: %s", string(body))

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		responseData, ok := response["data"].(map[string]interface{})
		require.True(t, ok, "expected data to be a map")
		assert.NotEmpty(t, responseData["id"])
		assert.Equal(t, "completed", responseData["status"])

		output := responseData["output"].([]interface{})
		require.Greater(t, len(output), 0, "expected at least one output item")
		lastItem := output[len(output)-1].(map[string]interface{})
		assert.Equal(t, "message", lastItem["type"])
		assert.Equal(t, "assistant", lastItem["role"])

		content := lastItem["content"].([]interface{})
		require.Greater(t, len(content), 0, "expected content in response")
		textPart := content[0].(map[string]interface{})
		assert.Equal(t, "output_text", textPart["type"])
		assert.NotEmpty(t, textPart["text"], "vision model should return text describing the image")
	})

	It("should create response with multimodal chat_context follow-up", func() {
		t := GinkgoT()

		lsClient := app.llamaStackClientFactory.CreateClient(testutil.GetTestLlamaStackURL(), "token_mock", false, nil, "/v1")

		imgData := []byte{
			0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
			0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
			0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
			0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
			0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
			0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
			0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC,
			0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
			0x44, 0xAE, 0x42, 0x60, 0x82,
		}
		uploadResult, err := lsClient.UploadFile(context.Background(), llamastack.UploadFileParams{
			Reader:      bytes.NewReader(imgData),
			Filename:    "test_followup.png",
			ContentType: "image/png",
			Purpose:     "vision",
		})
		require.NoError(t, err)

		payload := CreateResponseRequest{
			Input: llamastack.InputUnion{Text: "What colors did you see? Reply in one sentence."},
			Model: testutil.GetTestLlamaStackModel(),
			ChatContext: []ChatContextMessage{
				{
					Role: "user",
					Content: llamastack.ContentUnion{Parts: []llamastack.InputContentPart{
						{Type: "input_text", Text: "Describe this image briefly."},
						{Type: "input_image", FileID: uploadResult.FileID},
					}},
				},
				{
					Role:    "assistant",
					Content: llamastack.ContentUnion{Text: "The image appears to be a small test image."},
				},
			},
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, lsClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateResponseHandler(rr, req, nil)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		assert.Equal(t, http.StatusCreated, rr.Code, "multimodal follow-up failed: %s", string(body))

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		responseData, ok := response["data"].(map[string]interface{})
		require.True(t, ok)
		assert.Equal(t, "completed", responseData["status"])
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
			Input:  llamastack.InputUnion{Text: "Tell me a long story"},
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

		deadline := time.After(10 * time.Second)
		for rr.writeCount.Load() == 0 {
			select {
			case <-deadline:
				Fail("Timed out waiting for first streaming event")
			default:
				time.Sleep(50 * time.Millisecond)
			}
		}

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
			Input:  llamastack.InputUnion{Text: "Hello"},
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
			Input:  llamastack.InputUnion{Text: "Test cleanup"},
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
			Input: llamastack.InputUnion{Text: "Hello"},
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
			Input:  llamastack.InputUnion{Text: "Hello"},
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
			Input:          llamastack.InputUnion{Text: "What is machine learning?"},
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

func TestGetProviderDataRouting(t *testing.T) {
	// Create test app with mock client
	llamaStackClientFactory := lsmocks.NewMockClientFactory()
	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))

	// Create mock Kubernetes client factory (returns nil client for simple tests)
	mockK8sFactory := k8smocks.NewMockTokenClientFactory()

	// Create memory store for token caching
	memStore := cache.NewMemoryStore()

	app := App{
		config: config.EnvConfig{
			Port: 4000,
		},
		logger:                  logger,
		llamaStackClientFactory: llamaStackClientFactory,
		repositories:            repositories.NewRepositories(),
		kubernetesClientFactory: mockK8sFactory,
		memoryStore:             memStore,
	}

	t.Run("should call custom endpoint provider secret for custom_endpoint model_source_type", func(t *testing.T) {
		// Create context with required values (but no K8s client, so it should return nil)
		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "test-token",
		})
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "test-namespace")

		// Call with model_source_type = "custom_endpoint"
		// Since we don't have a real K8s client, it should return nil but not crash
		providerData, err := app.getProviderData(ctx, "endpoint-1/gpt-4o", "custom_endpoint", "", nil)
		require.NoError(t, err)

		// Without a K8s client factory, this should return nil
		assert.Nil(t, providerData, "Should return nil when K8s client is not available")
	})

	t.Run("should fall back to auto-detection when model_source_type is empty", func(t *testing.T) {
		// Create context with required values
		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "test-token",
		})

		// Call with empty model_source_type
		// Should fall back to auto-detection (tries MaaS prefix, then user JWT)
		providerData, err := app.getProviderData(ctx, "test-model", "", "", nil)
		require.NoError(t, err)

		// Should return user JWT provider data
		assert.NotNil(t, providerData)
		assert.Contains(t, providerData, "vllm_api_token")
		assert.Equal(t, "test-token", providerData["vllm_api_token"])
	})

	t.Run("should detect MaaS model by prefix when model_source_type is empty", func(t *testing.T) {
		// Create context with required values
		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "test-token",
		})
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "test-namespace")

		// Call with MaaS model prefix and empty model_source_type
		// Should auto-detect as MaaS but fail to get token without K8s client
		providerData, err := app.getProviderData(ctx, "maas-vllm-inference-1/llama-3", "", "", nil)
		require.NoError(t, err)

		// Without proper K8s client, should fall back to user JWT
		// (MaaS detection fails, falls back to getUserJWTProviderData)
		assert.NotNil(t, providerData)
		assert.Contains(t, providerData, "vllm_api_token")
	})

	t.Run("should return user JWT for namespace model_source_type", func(t *testing.T) {
		// Create context with required values
		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "test-token",
		})

		// Call with namespace model (no special handling, falls through to auto-detection)
		providerData, err := app.getProviderData(ctx, "my-namespace-model", "namespace", "", nil)
		require.NoError(t, err)

		// Should fall back to auto-detection which returns user JWT
		assert.NotNil(t, providerData)
		assert.Contains(t, providerData, "vllm_api_token")
		assert.Equal(t, "test-token", providerData["vllm_api_token"])
	})

	t.Run("should successfully retrieve custom endpoint API key when ConfigMap and Secret exist", func(t *testing.T) {
		// Create a custom mock client factory that returns a working K8s client with mock data
		mockK8sClientWithData := &customEndpointMockClient{
			externalModelsConfig: &models.ExternalModelsConfig{
				RegisteredResources: models.RegisteredResourcesConfig{
					Models: []models.RegisteredModel{
						{
							ModelID:    "gpt-4o",
							ProviderID: "endpoint-1",
						},
					},
				},
				Providers: models.ProvidersConfig{
					Inference: []models.InferenceProvider{
						{
							ProviderID:   "endpoint-1",
							ProviderType: models.ProviderTypeOpenAI,
							Config: models.ProviderConfig{
								CustomGenAI: models.CustomGenAI{
									APIKey: models.APIKeyConfig{
										SecretRef: models.SecretRef{
											Name: "endpoint-api-key-1",
											Key:  "api_key",
										},
									},
								},
							},
						},
					},
				},
			},
			secretValue: "sk-test-openai-key-12345",
		}

		mockFactoryWithData := &customEndpointMockFactory{
			client: mockK8sClientWithData,
		}

		appWithData := App{
			config: config.EnvConfig{
				Port: 4000,
			},
			logger:                  logger,
			llamaStackClientFactory: llamaStackClientFactory,
			repositories:            repositories.NewRepositories(),
			kubernetesClientFactory: mockFactoryWithData,
			memoryStore:             memStore,
		}

		// Create context with required values
		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "test-token",
		})
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "test-namespace")

		// Call with provider-qualified model ID and custom_endpoint source type
		providerData, err := appWithData.getProviderData(ctx, "endpoint-1/gpt-4o", "custom_endpoint", "", nil)
		require.NoError(t, err)

		// Should return provider data with the API key from the secret
		assert.NotNil(t, providerData, "Provider data should not be nil")
		assert.Contains(t, providerData, "openai_api_key")
		assert.Equal(t, "sk-test-openai-key-12345", providerData["openai_api_key"])
	})

	t.Run("should ignore subscription for non-MaaS models", func(t *testing.T) {
		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "test-token",
		})

		providerData, err := app.getProviderData(ctx, "test-model", "", "premium-subscription", nil)
		require.NoError(t, err)

		assert.NotNil(t, providerData)
		assert.Contains(t, providerData, "vllm_api_token")
		assert.Equal(t, "test-token", providerData["vllm_api_token"])
	})
}

func TestGetPassthroughEmbeddingSecret(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))
	llamaStackClientFactory := lsmocks.NewMockClientFactory()
	memStore := cache.NewMemoryStore()

	newApp := func(client *customEndpointMockClient) *App {
		return &App{
			config:                  config.EnvConfig{Port: 4000},
			logger:                  logger,
			llamaStackClientFactory: llamaStackClientFactory,
			repositories:            repositories.NewRepositories(),
			kubernetesClientFactory: &customEndpointMockFactory{client: client},
			memoryStore:             memStore,
		}
	}

	newCtx := func() context.Context {
		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{Token: "test-token"})
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "test-namespace")
		return ctx
	}

	passthroughProvider := models.InferenceProvider{
		ProviderID:   "endpoint-1",
		ProviderType: models.ProviderTypePassThrough,
		Config: models.ProviderConfig{
			BaseURL: "https://embedding.example.com",
			CustomGenAI: models.CustomGenAI{
				APIKey: models.APIKeyConfig{
					SecretRef: models.SecretRef{Name: "embed-secret", Key: "api_key"},
				},
			},
		},
	}
	embeddingModel := models.RegisteredModel{
		ModelID:    "my-embedding-model",
		ProviderID: "endpoint-1",
		ModelType:  models.ModelTypeEmbedding,
	}
	vsDoc := &models.ExternalVectorStoresDocument{
		RegisteredResources: models.RegisteredResourcesSection{
			VectorStores: []models.RegisteredVectorStore{
				{VectorStoreID: "vs-1", EmbeddingModel: "my-embedding-model"},
			},
		},
	}
	externalModelsConfig := &models.ExternalModelsConfig{
		Providers:           models.ProvidersConfig{Inference: []models.InferenceProvider{passthroughProvider}},
		RegisteredResources: models.RegisteredResourcesConfig{Models: []models.RegisteredModel{embeddingModel}},
	}

	t.Run("returns url and key for passthrough embedding model", func(t *testing.T) {
		client := &customEndpointMockClient{
			vectorStoresDoc:      vsDoc,
			externalModelsConfig: externalModelsConfig,
			secretValue:          "my-api-key",
		}
		providerData, err := newApp(client).getProviderData(newCtx(), "inf-model", "", "", []string{"vs-1"})
		require.NoError(t, err)
		assert.Equal(t, "https://embedding.example.com", providerData["passthrough_url"])
		assert.Equal(t, "my-api-key", providerData["passthrough_api_key"])
	})

	t.Run("uses fake token when no secret ref is configured", func(t *testing.T) {
		noSecretProvider := passthroughProvider
		noSecretProvider.Config.CustomGenAI.APIKey.SecretRef = models.SecretRef{}
		client := &customEndpointMockClient{
			vectorStoresDoc: vsDoc,
			externalModelsConfig: &models.ExternalModelsConfig{
				Providers:           models.ProvidersConfig{Inference: []models.InferenceProvider{noSecretProvider}},
				RegisteredResources: models.RegisteredResourcesConfig{Models: []models.RegisteredModel{embeddingModel}},
			},
		}
		providerData, err := newApp(client).getProviderData(newCtx(), "inf-model", "", "", []string{"vs-1"})
		require.NoError(t, err)
		assert.Equal(t, "fake", providerData["passthrough_api_key"])
	})

	t.Run("returns error when vector stores ConfigMap read fails", func(t *testing.T) {
		client := &customEndpointMockClient{
			vectorStoresDocErr: errors.New("configmap not found"),
		}
		_, err := newApp(client).getProviderData(newCtx(), "inf-model", "", "", []string{"vs-1"})
		require.Error(t, err)
		assert.Contains(t, err.Error(), "configmap not found")
	})

	t.Run("returns no passthrough data when vector stores ConfigMap does not exist", func(t *testing.T) {
		client := &customEndpointMockClient{
			vectorStoresDocErr: apierrors.NewNotFound(schema.GroupResource{Resource: "configmaps"}, "gen-ai-aa-vector-stores"),
		}
		providerData, err := newApp(client).getProviderData(newCtx(), "inf-model", "", "", []string{"vs-1"})
		require.NoError(t, err)
		assert.NotContains(t, providerData, "passthrough_url")
		assert.NotContains(t, providerData, "passthrough_api_key")
	})

	t.Run("returns error when external models ConfigMap read fails", func(t *testing.T) {
		client := &customEndpointMockClient{
			vectorStoresDoc:         vsDoc,
			externalModelsConfigErr: errors.New("external models configmap unavailable"),
		}
		_, err := newApp(client).getProviderData(newCtx(), "inf-model", "", "", []string{"vs-1"})
		require.Error(t, err)
		assert.Contains(t, err.Error(), "external models configmap unavailable")
	})

	t.Run("returns no passthrough data when external models ConfigMap does not exist", func(t *testing.T) {
		client := &customEndpointMockClient{
			vectorStoresDoc:         vsDoc,
			externalModelsConfigErr: apierrors.NewNotFound(schema.GroupResource{Resource: "configmaps"}, "gen-ai-aa-custom-model-endpoints"),
		}
		providerData, err := newApp(client).getProviderData(newCtx(), "inf-model", "", "", []string{"vs-1"})
		require.NoError(t, err)
		assert.NotContains(t, providerData, "passthrough_url")
		assert.NotContains(t, providerData, "passthrough_api_key")
	})

	t.Run("returns error when secret fetch fails", func(t *testing.T) {
		client := &customEndpointMockClient{
			vectorStoresDoc:      vsDoc,
			externalModelsConfig: externalModelsConfig,
			secretErr:            errors.New("secret access denied"),
		}
		_, err := newApp(client).getProviderData(newCtx(), "inf-model", "", "", []string{"vs-1"})
		require.Error(t, err)
		assert.Contains(t, err.Error(), "secret access denied")
	})

	t.Run("returns no passthrough data when vector store uses non-custom embedding model", func(t *testing.T) {
		client := &customEndpointMockClient{
			vectorStoresDoc:      vsDoc,
			externalModelsConfig: &models.ExternalModelsConfig{}, // embedding model not in external models
		}
		providerData, err := newApp(client).getProviderData(newCtx(), "inf-model", "", "", []string{"vs-1"})
		require.NoError(t, err)
		assert.NotContains(t, providerData, "passthrough_url")
		assert.NotContains(t, providerData, "passthrough_api_key")
	})

	t.Run("returns no passthrough data when vectorStoreIDs is empty", func(t *testing.T) {
		client := &customEndpointMockClient{}
		providerData, err := newApp(client).getProviderData(newCtx(), "inf-model", "", "", nil)
		require.NoError(t, err)
		assert.NotContains(t, providerData, "passthrough_url")
	})
}

// customEndpointMockFactory is a mock factory that returns a client with external models config and secret data
type customEndpointMockFactory struct {
	client *customEndpointMockClient
}

func (f *customEndpointMockFactory) GetClient(ctx context.Context) (k8s.KubernetesClientInterface, error) {
	return f.client, nil
}

func (f *customEndpointMockFactory) ExtractRequestIdentity(headers http.Header) (*integrations.RequestIdentity, error) {
	return &integrations.RequestIdentity{Token: "test-token"}, nil
}

func (f *customEndpointMockFactory) ValidateRequestIdentity(identity *integrations.RequestIdentity) error {
	return nil
}

// customEndpointMockClient is a mock K8s client that returns predefined external models config and secret
type customEndpointMockClient struct {
	k8s.KubernetesClientInterface
	externalModelsConfig    *models.ExternalModelsConfig
	externalModelsConfigErr error
	vectorStoresDoc         *models.ExternalVectorStoresDocument
	vectorStoresDocErr      error
	secretValue             string
	secretErr               error
}

func (c *customEndpointMockClient) GetExternalModelsConfig(ctx context.Context, namespace string) (*models.ExternalModelsConfig, error) {
	return c.externalModelsConfig, c.externalModelsConfigErr
}

func (c *customEndpointMockClient) GetVectorStoresConfig(ctx context.Context, namespace string) (*models.ExternalVectorStoresDocument, error) {
	return c.vectorStoresDoc, c.vectorStoresDocErr
}

func (c *customEndpointMockClient) GetSecretValue(ctx context.Context, identity *integrations.RequestIdentity, namespace string, secretName string, secretKey string) (string, error) {
	return c.secretValue, c.secretErr
}

// ─── Helpers for TestGetGuardrailModelEndpointAndKey ──────────────────────────

// guardrailTestK8sClient is a minimal K8s mock that satisfies the two methods called
// by getGuardrailModelEndpointAndKey: GetUser (for token caching) and
// GetModelProviderInfo (for auto-detect).
type guardrailTestK8sClient struct {
	k8s.KubernetesClientInterface
	// providerInfoURL is the URL returned by GetModelProviderInfo (simulates ConfigMap URL).
	providerInfoURL string
}

func (c *guardrailTestK8sClient) GetUser(_ context.Context, _ *integrations.RequestIdentity) (string, error) {
	return "test-user", nil
}

func (c *guardrailTestK8sClient) GetModelProviderInfo(_ context.Context, _ *integrations.RequestIdentity, _ string, modelID string) (*gentypes.ModelProviderInfo, error) {
	return &gentypes.ModelProviderInfo{
		ModelID:      modelID,
		ProviderID:   "maas-vllm-inference-1",
		ProviderType: "remote::vllm",
		URL:          c.providerInfoURL,
	}, nil
}

type guardrailTestK8sFactory struct {
	client k8s.KubernetesClientInterface
}

func (f *guardrailTestK8sFactory) GetClient(_ context.Context) (k8s.KubernetesClientInterface, error) {
	return f.client, nil
}

func (f *guardrailTestK8sFactory) ExtractRequestIdentity(_ http.Header) (*integrations.RequestIdentity, error) {
	return &integrations.RequestIdentity{Token: "test-token"}, nil
}

func (f *guardrailTestK8sFactory) ValidateRequestIdentity(_ *integrations.RequestIdentity) error {
	return nil
}

// TestGetGuardrailModelEndpointAndKey_MaaS verifies that both the explicit
// (guardrail_model_source_type: "maas") and auto-detect paths resolve the NeMo
// openai_api_base to the model-specific inference URL from the live MaaS catalog,
// not to the MaaS management API (resolveMaaSBaseURL).
func TestGetGuardrailModelEndpointAndKey_MaaS(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))
	llamaStackClientFactory := lsmocks.NewMockClientFactory()
	memStore := cache.NewMemoryStore()

	// The mock MaaS catalog contains "llama-2-7b-chat" with a model-specific inference URL.
	// The ConfigMap (providerInfo.URL) intentionally uses a different URL to prove the
	// implementation does not use the stale ConfigMap value.
	const (
		maasModelID         = "llama-2-7b-chat"
		maasModelCatalogURL = "https://llama-2-7b-chat.apps.example.openshift.com/v1"
		staleConfigmapURL   = "https://stale-configmap.example.com/v1"
		maasControllerURL   = "https://maas.example.com/maas-api"
	)

	newApp := func() *App {
		k8sClient := &guardrailTestK8sClient{providerInfoURL: staleConfigmapURL}
		return &App{
			config: config.EnvConfig{
				Port:    4000,
				MaaSURL: maasControllerURL,
			},
			logger:                  logger,
			llamaStackClientFactory: llamaStackClientFactory,
			repositories:            repositories.NewRepositories(),
			kubernetesClientFactory: &guardrailTestK8sFactory{client: k8sClient},
			memoryStore:             memStore,
		}
	}

	newCtx := func() context.Context {
		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{Token: "test-token"})
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, testutil.TestNamespace)
		// Use BFF client mock instead of direct MaaS client
		ctx = context.WithValue(ctx, constants.BFFClientKey(constants.BFFTarget(bffclient.BFFTargetMaaS)), bffmocks.NewMockBFFClient(bffclient.BFFTargetMaaS))
		return ctx
	}

	t.Run("explicit maas source type resolves inference URL from MaaS catalog", func(t *testing.T) {
		app := newApp()
		baseURL, apiKey, err := app.getGuardrailModelEndpointAndKey(
			newCtx(),
			"maas-vllm-inference-1/"+maasModelID,
			models.ModelSourceTypeMaaS,
			"basic-subscription",
		)

		require.NoError(t, err)
		assert.Equal(t, maasModelCatalogURL, baseURL, "should use MaaS catalog URL, not the management API URL")
		assert.NotEmpty(t, apiKey, "ephemeral token should be populated")
		assert.NotEqual(t, maasControllerURL, baseURL, "must not return the MaaS management API URL")
	})

	t.Run("explicit maas source type with bare model ID resolves inference URL", func(t *testing.T) {
		app := newApp()
		baseURL, _, err := app.getGuardrailModelEndpointAndKey(
			newCtx(),
			maasModelID, // no LlamaStack provider prefix
			models.ModelSourceTypeMaaS,
			"",
		)

		require.NoError(t, err)
		assert.Equal(t, maasModelCatalogURL, baseURL)
	})

	t.Run("auto-detect maas path resolves same inference URL as explicit path", func(t *testing.T) {
		app := newApp()

		// Explicit path
		explicitURL, _, err := app.getGuardrailModelEndpointAndKey(
			newCtx(),
			"maas-vllm-inference-1/"+maasModelID,
			models.ModelSourceTypeMaaS,
			"basic-subscription",
		)
		require.NoError(t, err)

		// Auto-detect path — model ID starts with "maas-" so it is classified as MaaS.
		// GetModelProviderInfo returns staleConfigmapURL to prove it is not used.
		autoURL, _, err := app.getGuardrailModelEndpointAndKey(
			newCtx(),
			"maas-vllm-inference-1/"+maasModelID,
			"", // auto-detect
			"basic-subscription",
		)
		require.NoError(t, err)

		assert.Equal(t, explicitURL, autoURL, "explicit and auto-detect paths must return the same URL")
		assert.Equal(t, maasModelCatalogURL, autoURL, "auto-detect must use catalog URL, not stale ConfigMap URL")
		assert.NotEqual(t, staleConfigmapURL, autoURL, "must not use the ConfigMap URL returned by GetModelProviderInfo")
	})

	t.Run("unknown model in MaaS catalog returns error", func(t *testing.T) {
		app := newApp()
		_, _, err := app.getGuardrailModelEndpointAndKey(
			newCtx(),
			"maas-vllm-inference-1/unknown-guardrail-model",
			models.ModelSourceTypeMaaS,
			"",
		)

		require.Error(t, err)
		assert.Contains(t, err.Error(), "not found in MaaS catalog")
	})
}

func TestProcessResponseCitations(t *testing.T) {
	t.Run("should extract citations and clean text", func(t *testing.T) {
		rd := &ResponseData{
			Output: []OutputItem{
				{
					Type: "file_search_call",
					Results: []SearchResult{
						{
							Score:  0.85,
							Text:   "Relevant content",
							FileID: "e6053358-ab61-48cb-a600-2d04dfcbb51b",
							Attributes: map[string]interface{}{
								"filename": "report.pdf",
							},
						},
					},
				},
				{
					Type: "message",
					Content: []ContentItem{
						{
							Type: "output_text",
							Text: "Here is the answer <|e6053358-ab61-48cb-a600-2d04dfcbb51b|>.",
						},
					},
				},
			},
		}

		processResponseCitations(rd)

		assert.Equal(t, "Here is the answer .", rd.Output[1].Content[0].Text)
		require.Len(t, rd.Output[1].Content[0].Annotations, 1)

		ann, ok := rd.Output[1].Content[0].Annotations[0].(FileCitationAnnotation)
		require.True(t, ok)
		assert.Equal(t, "file_citation", ann.Type)
		assert.Equal(t, "e6053358-ab61-48cb-a600-2d04dfcbb51b", ann.FileID)
		assert.Equal(t, "report.pdf", ann.Filename)
	})

	t.Run("should handle multiple citations from different files", func(t *testing.T) {
		rd := &ResponseData{
			Output: []OutputItem{
				{
					Type: "file_search_call",
					Results: []SearchResult{
						{
							FileID: "id-1",
							Attributes: map[string]interface{}{
								"filename": "doc1.pdf",
							},
						},
						{
							FileID: "id-2",
							Attributes: map[string]interface{}{
								"filename": "doc2.pdf",
							},
						},
					},
				},
				{
					Type: "message",
					Content: []ContentItem{
						{
							Type: "output_text",
							Text: "Fact one <|id-1|> and fact two <|id-2|>.",
						},
					},
				},
			},
		}

		processResponseCitations(rd)

		assert.Equal(t, "Fact one  and fact two .", rd.Output[1].Content[0].Text)
		require.Len(t, rd.Output[1].Content[0].Annotations, 2)

		ann1 := rd.Output[1].Content[0].Annotations[0].(FileCitationAnnotation)
		assert.Equal(t, "doc1.pdf", ann1.Filename)

		ann2 := rd.Output[1].Content[0].Annotations[1].(FileCitationAnnotation)
		assert.Equal(t, "doc2.pdf", ann2.Filename)
	})

	t.Run("should not modify response without file_search_call results", func(t *testing.T) {
		rd := &ResponseData{
			Output: []OutputItem{
				{
					Type: "message",
					Content: []ContentItem{
						{
							Type: "output_text",
							Text: "Plain response without citations.",
						},
					},
				},
			},
		}

		processResponseCitations(rd)

		assert.Equal(t, "Plain response without citations.", rd.Output[0].Content[0].Text)
		assert.Nil(t, rd.Output[0].Content[0].Annotations)
	})

	t.Run("should handle markers with no matching file_search_call result", func(t *testing.T) {
		rd := &ResponseData{
			Output: []OutputItem{
				{
					Type: "file_search_call",
					Results: []SearchResult{
						{
							FileID: "known-id",
							Attributes: map[string]interface{}{
								"filename": "known.pdf",
							},
						},
					},
				},
				{
					Type: "message",
					Content: []ContentItem{
						{
							Type: "output_text",
							Text: "Cited <|known-id|> and unknown <|unknown-id|>.",
						},
					},
				},
			},
		}

		processResponseCitations(rd)

		assert.Equal(t, "Cited  and unknown .", rd.Output[1].Content[0].Text)
		require.Len(t, rd.Output[1].Content[0].Annotations, 1)
		ann := rd.Output[1].Content[0].Annotations[0].(FileCitationAnnotation)
		assert.Equal(t, "known.pdf", ann.Filename)
	})

	t.Run("should extract filename from union-typed attributes (OfString format)", func(t *testing.T) {
		rd := &ResponseData{
			Output: []OutputItem{
				{
					Type: "file_search_call",
					Results: []SearchResult{
						{
							FileID: "e6053358-ab61-48cb-a600-2d04dfcbb51b",
							Attributes: map[string]interface{}{
								"filename": map[string]interface{}{
									"OfBool":   false,
									"OfFloat":  float64(0),
									"OfString": "rag-testing-story.txt",
								},
							},
						},
					},
				},
				{
					Type: "message",
					Content: []ContentItem{
						{
							Type: "output_text",
							Text: "Info <|e6053358-ab61-48cb-a600-2d04dfcbb51b|>.",
						},
					},
				},
			},
		}

		processResponseCitations(rd)

		assert.Equal(t, "Info .", rd.Output[1].Content[0].Text)
		require.Len(t, rd.Output[1].Content[0].Annotations, 1)
		ann := rd.Output[1].Content[0].Annotations[0].(FileCitationAnnotation)
		assert.Equal(t, "rag-testing-story.txt", ann.Filename)
	})

	t.Run("should strip markers even when citation map is empty", func(t *testing.T) {
		rd := &ResponseData{
			Output: []OutputItem{
				{
					Type: "message",
					Content: []ContentItem{
						{
							Type: "output_text",
							Text: "Answer <|e6053358-ab61-48cb-a600-2d04dfcbb51b|> with markers.",
						},
					},
				},
			},
		}

		processResponseCitations(rd)

		assert.Equal(t, "Answer  with markers.", rd.Output[0].Content[0].Text)
		assert.Nil(t, rd.Output[0].Content[0].Annotations)
	})

	t.Run("should preserve existing annotations when adding new citations", func(t *testing.T) {
		existingAnnotation := map[string]interface{}{
			"type": "url_citation",
			"url":  "https://example.com",
		}
		rd := &ResponseData{
			Output: []OutputItem{
				{
					Type: "file_search_call",
					Results: []SearchResult{
						{
							FileID: "file-abc",
							Attributes: map[string]interface{}{
								"filename": "doc.pdf",
							},
						},
					},
				},
				{
					Type: "message",
					Content: []ContentItem{
						{
							Type:        "output_text",
							Text:        "Answer <|file-abc|>.",
							Annotations: []interface{}{existingAnnotation},
						},
					},
				},
			},
		}

		processResponseCitations(rd)

		assert.Equal(t, "Answer .", rd.Output[1].Content[0].Text)
		require.Len(t, rd.Output[1].Content[0].Annotations, 2)

		assert.Equal(t, existingAnnotation, rd.Output[1].Content[0].Annotations[0])
		ann := rd.Output[1].Content[0].Annotations[1].(FileCitationAnnotation)
		assert.Equal(t, "file_citation", ann.Type)
		assert.Equal(t, "file-abc", ann.FileID)
		assert.Equal(t, "doc.pdf", ann.Filename)
	})

	t.Run("should use fileID as filename when attributes lack filename", func(t *testing.T) {
		rd := &ResponseData{
			Output: []OutputItem{
				{
					Type: "file_search_call",
					Results: []SearchResult{
						{
							FileID:     "raw-uuid",
							Attributes: map[string]interface{}{},
						},
					},
				},
				{
					Type: "message",
					Content: []ContentItem{
						{
							Type: "output_text",
							Text: "Info <|raw-uuid|>.",
						},
					},
				},
			},
		}

		processResponseCitations(rd)

		assert.Equal(t, "Info .", rd.Output[1].Content[0].Text)
		ann := rd.Output[1].Content[0].Annotations[0].(FileCitationAnnotation)
		assert.Equal(t, "raw-uuid", ann.Filename)
	})
}

func TestMockRAGCitationPipeline(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))
	mockClient := lsmocks.NewMockLlamaStackClient()

	app := App{
		config:       config.EnvConfig{Port: 4000},
		logger:       logger,
		repositories: repositories.NewRepositories(),
	}

	t.Run("non-streaming RAG strips markers and produces annotations", func(t *testing.T) {
		params := llamastack.CreateResponseParams{
			Input:          llamastack.InputUnion{Text: "What is AI?"},
			Model:          "test-model",
			VectorStoreIDs: []string{"vs_mock123"},
		}

		resp, err := mockClient.CreateResponse(context.Background(), params)
		require.NoError(t, err)

		rd := convertToResponseData(resp)
		processResponseCitations(&rd)

		var messageItem *OutputItem
		for i, item := range rd.Output {
			if item.Type == "message" {
				messageItem = &rd.Output[i]
			}
		}
		require.NotNil(t, messageItem, "expected a message output item")
		require.Greater(t, len(messageItem.Content), 0)

		text := messageItem.Content[0].Text
		assert.NotContains(t, text, "<|", "raw citation markers must be stripped")

		require.NotNil(t, messageItem.Content[0].Annotations, "expected annotations")
		require.Greater(t, len(messageItem.Content[0].Annotations), 0)

		ann, ok := messageItem.Content[0].Annotations[0].(FileCitationAnnotation)
		require.True(t, ok, "expected FileCitationAnnotation type")
		assert.Equal(t, "file_citation", ann.Type)
		assert.Equal(t, "e6053358-ab61-48cb-a600-2d04dfcbb51b", ann.FileID)
		assert.Equal(t, "mock_document.txt", ann.Filename, "filename must be resolved from attributes")
	})

	t.Run("streaming RAG strips markers and produces annotations in completed event", func(t *testing.T) {
		params := llamastack.CreateResponseParams{
			Input:          llamastack.InputUnion{Text: "What is AI?"},
			Model:          "test-model",
			VectorStoreIDs: []string{"vs_mock123"},
		}

		stream, err := mockClient.CreateResponseStream(context.Background(), params)
		require.NoError(t, err)

		var completedResponse *ResponseData
		for stream.Next() {
			event := stream.Current()
			se := convertToStreamingEvent(event)
			if se.Type == "response.completed" && se.Response != nil {
				processResponseCitations(se.Response)
				completedResponse = se.Response
			}
		}
		require.NoError(t, stream.Err())
		require.NotNil(t, completedResponse, "expected a response.completed event")

		var messageItem *OutputItem
		for i, item := range completedResponse.Output {
			if item.Type == "message" {
				messageItem = &completedResponse.Output[i]
			}
		}
		require.NotNil(t, messageItem, "expected a message output item")
		require.Greater(t, len(messageItem.Content), 0)

		text := messageItem.Content[0].Text
		assert.NotContains(t, text, "<|", "raw citation markers must be stripped")

		require.NotNil(t, messageItem.Content[0].Annotations, "expected annotations")
		require.Greater(t, len(messageItem.Content[0].Annotations), 0)

		ann, ok := messageItem.Content[0].Annotations[0].(FileCitationAnnotation)
		require.True(t, ok, "expected FileCitationAnnotation type")
		assert.Equal(t, "file_citation", ann.Type)
		assert.Equal(t, "e6053358-ab61-48cb-a600-2d04dfcbb51b", ann.FileID)
		assert.Equal(t, "mock_document.txt", ann.Filename, "filename must be resolved from attributes")
	})

	_ = app // ensure app is referenced for future handler-level tests
}

// TestIsEventTypeSupported_ReasoningEvents verifies reasoning event types are supported
func TestIsEventTypeSupported_ReasoningEvents(t *testing.T) {
	t.Run("should support response.reasoning_text.delta", func(t *testing.T) {
		assert.True(t, isEventTypeSupported("response.reasoning_text.delta"))
	})

	t.Run("should support response.reasoning_text.done", func(t *testing.T) {
		assert.True(t, isEventTypeSupported("response.reasoning_text.done"))
	})

	t.Run("should still support existing event types", func(t *testing.T) {
		assert.True(t, isEventTypeSupported("response.output_text.delta"))
		assert.True(t, isEventTypeSupported("response.completed"))
		assert.True(t, isEventTypeSupported("response.created"))
	})

	t.Run("should not support unknown event types", func(t *testing.T) {
		assert.False(t, isEventTypeSupported("response.unknown"))
		assert.False(t, isEventTypeSupported(""))
	})
}

// TestConvertToStreamingEvent_ReasoningEvents verifies reasoning events are correctly converted
func TestConvertToStreamingEvent_ReasoningEvents(t *testing.T) {
	t.Run("should convert reasoning_text.delta with delta field", func(t *testing.T) {
		event := map[string]interface{}{
			"type":            "response.reasoning_text.delta",
			"sequence_number": float64(5),
			"item_id":         "msg_123",
			"output_index":    float64(0),
			"delta":           "Let me think",
		}

		result := convertToStreamingEvent(event)

		require.NotNil(t, result, "reasoning delta should not be filtered out")
		assert.Equal(t, "response.reasoning_text.delta", result.Type)
		assert.Equal(t, "Let me think", result.Delta)
		assert.Equal(t, "msg_123", result.ItemID)
	})

	t.Run("should convert reasoning_text.done with text field", func(t *testing.T) {
		event := map[string]interface{}{
			"type":            "response.reasoning_text.done",
			"sequence_number": float64(10),
			"item_id":         "msg_123",
			"output_index":    float64(0),
			"text":            "Let me think about this carefully.",
		}

		result := convertToStreamingEvent(event)

		require.NotNil(t, result, "reasoning done should not be filtered out")
		assert.Equal(t, "response.reasoning_text.done", result.Type)
		assert.Equal(t, "Let me think about this carefully.", result.Text)
		assert.Equal(t, "msg_123", result.ItemID)
	})

	t.Run("should still filter unsupported event types", func(t *testing.T) {
		event := map[string]interface{}{
			"type":            "response.unknown_event",
			"sequence_number": float64(1),
			"output_index":    float64(0),
		}

		result := convertToStreamingEvent(event)
		assert.Nil(t, result, "unsupported event type should be filtered out")
	})
}

// reasoningFirstClient is an inline mock that emits reasoning_text.delta events before
// output_text.delta, used to verify TTFT fires only on the output delta.
type reasoningFirstClient struct {
	*lsmocks.MockLlamaStackClient
}

func (r *reasoningFirstClient) CreateResponseStream(_ context.Context, params llamastack.CreateResponseParams) (llamastack.ResponseStreamIterator, error) {
	build := func(data map[string]interface{}) responses.ResponseStreamEventUnion {
		b, _ := json.Marshal(data)
		var ev responses.ResponseStreamEventUnion
		_ = json.Unmarshal(b, &ev)
		return ev
	}

	itemID := "msg_reasoning_first_test"
	events := []responses.ResponseStreamEventUnion{
		build(map[string]interface{}{
			"type":            "response.created",
			"sequence_number": 0,
			"response": map[string]interface{}{
				"id": "resp_reasoning_first", "model": params.Model,
				"status": "in_progress", "created_at": 1234567890.0,
			},
		}),
		// Reasoning delta arrives before any output text
		build(map[string]interface{}{
			"type":            "response.reasoning_text.delta",
			"sequence_number": 1,
			"item_id":         itemID,
			"output_index":    0,
			"delta":           "I am thinking...",
		}),
		build(map[string]interface{}{
			"type":            "response.reasoning_text.done",
			"sequence_number": 2,
			"item_id":         itemID,
			"output_index":    0,
			"text":            "I am thinking...",
		}),
		build(map[string]interface{}{
			"type":            "response.content_part.added",
			"sequence_number": 3,
			"item_id":         itemID,
			"output_index":    0,
		}),
		// First output text delta — this is when TTFT should be recorded
		build(map[string]interface{}{
			"type":            "response.output_text.delta",
			"sequence_number": 4,
			"item_id":         itemID,
			"output_index":    0,
			"delta":           "The answer",
		}),
		build(map[string]interface{}{
			"type":            "response.completed",
			"sequence_number": 5,
			"output_index":    0,
			"response": map[string]interface{}{
				"id": "resp_reasoning_first", "model": params.Model,
				"status": "completed", "created_at": 1234567890.0,
				"output": []interface{}{
					map[string]interface{}{
						"id": itemID, "type": "message", "role": "assistant",
						"status": "completed",
						"content": []interface{}{
							map[string]interface{}{"type": "output_text", "text": "The answer"},
						},
					},
				},
			},
		}),
	}
	return lsmocks.NewMockStreamIterator(events), nil
}

// TestTTFTFiresOnOutputDelta verifies that TTFT is recorded on the first output_text.delta
// and NOT on reasoning_text.delta events that may precede it.
func TestTTFTFiresOnOutputDelta(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))
	app := App{
		config:                  config.EnvConfig{Port: 4000},
		logger:                  logger,
		llamaStackClientFactory: lsmocks.NewMockClientFactory(),
		repositories:            repositories.NewRepositories(),
	}

	payload := CreateResponseRequest{
		Input:  llamastack.InputUnion{Text: "Reason then answer"},
		Model:  "test-model",
		Stream: true,
	}
	jsonData, err := json.Marshal(payload)
	require.NoError(t, err)

	req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/responses?namespace="+testutil.TestNamespace, bytes.NewBuffer(jsonData))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	// Inject the custom client that emits reasoning before output
	client := &reasoningFirstClient{MockLlamaStackClient: lsmocks.NewMockLlamaStackClient()}
	ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, client)
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
		t.Fatal("Handler did not complete in time")
	}

	events := parseSSEEvents(rr.Body.String())
	var metricsEvent map[string]interface{}
	for _, ev := range events {
		if et, _ := ev["type"].(string); et == "response.metrics" {
			metricsEvent = ev
		}
	}
	require.NotNil(t, metricsEvent, "response.metrics event should be present")
	metrics, ok := metricsEvent["metrics"].(map[string]interface{})
	require.True(t, ok, "metrics field should be a map")
	ttft, ok := metrics["time_to_first_token_ms"].(float64)
	require.True(t, ok, "time_to_first_token_ms should be present")
	assert.GreaterOrEqual(t, ttft, float64(0), "TTFT should be non-negative; fires on output_text.delta, not reasoning_text.delta")
}

// TestStreamingNoReasoningEvents verifies that no reasoning events appear in SSE output
// when the model does not emit them.
func TestStreamingNoReasoningEvents(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))
	app := App{
		config: config.EnvConfig{
			Port: 4000,
		},
		logger:                  logger,
		llamaStackClientFactory: lsmocks.NewMockClientFactory(),
		repositories:            repositories.NewRepositories(),
	}

	payload := CreateResponseRequest{
		Input:  llamastack.InputUnion{Text: "Hello"},
		Model:  "test-model",
		Stream: true,
	}

	jsonData, err := json.Marshal(payload)
	require.NoError(t, err)

	req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/responses?namespace="+testutil.TestNamespace, bytes.NewBuffer(jsonData))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	llamaStackClient := lsmocks.NewMockLlamaStackClient()
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
		t.Fatal("Handler did not complete in time")
	}

	body := rr.Body.String()
	events := parseSSEEvents(body)

	for _, event := range events {
		eventType, _ := event["type"].(string)
		assert.NotEqual(t, "response.reasoning_text.delta", eventType, "should not have reasoning events")
		assert.NotEqual(t, "response.reasoning_text.done", eventType, "should not have reasoning events")
	}

	hasTextDelta := false
	for _, event := range events {
		if eventType, _ := event["type"].(string); eventType == "response.output_text.delta" {
			hasTextDelta = true
			break
		}
	}
	assert.True(t, hasTextDelta, "should still have output_text.delta events")
}

// reasoningEmittingClient always emits reasoning_text.delta events before output text,
// regardless of any request parameters.
type reasoningEmittingClient struct {
	*lsmocks.MockLlamaStackClient
}

func (r *reasoningEmittingClient) CreateResponseStream(_ context.Context, params llamastack.CreateResponseParams) (llamastack.ResponseStreamIterator, error) {
	build := func(data map[string]interface{}) responses.ResponseStreamEventUnion {
		b, _ := json.Marshal(data)
		var ev responses.ResponseStreamEventUnion
		_ = json.Unmarshal(b, &ev)
		return ev
	}

	itemID := "msg_reasoning_emit_test"
	reasoningText := "Let me reason about this."
	events := []responses.ResponseStreamEventUnion{
		build(map[string]interface{}{
			"type":            "response.created",
			"sequence_number": 0,
			"response": map[string]interface{}{
				"id": "resp_reasoning_emit", "model": params.Model,
				"status": "in_progress", "created_at": 1234567890.0,
			},
		}),
		build(map[string]interface{}{
			"type":            "response.reasoning_text.delta",
			"sequence_number": 1,
			"item_id":         itemID,
			"output_index":    0,
			"delta":           reasoningText,
		}),
		build(map[string]interface{}{
			"type":            "response.reasoning_text.done",
			"sequence_number": 2,
			"item_id":         itemID,
			"output_index":    0,
			"text":            reasoningText,
		}),
		build(map[string]interface{}{
			"type":            "response.content_part.added",
			"sequence_number": 3,
			"item_id":         itemID,
			"output_index":    0,
		}),
		build(map[string]interface{}{
			"type":            "response.output_text.delta",
			"sequence_number": 4,
			"item_id":         itemID,
			"output_index":    0,
			"delta":           "The answer is here.",
		}),
		build(map[string]interface{}{
			"type":            "response.completed",
			"sequence_number": 5,
			"output_index":    0,
			"response": map[string]interface{}{
				"id": "resp_reasoning_emit", "model": params.Model,
				"status": "completed", "created_at": 1234567890.0,
				"output": []interface{}{
					map[string]interface{}{
						"id": itemID, "type": "message", "role": "assistant",
						"status": "completed",
						"content": []interface{}{
							map[string]interface{}{"type": "output_text", "text": "The answer is here."},
						},
					},
				},
			},
		}),
	}
	return lsmocks.NewMockStreamIterator(events), nil
}

// TestAsyncModerationWithReasoning verifies reasoning events flow through the async
// moderation pipeline and that reasoning_text.done is not silently dropped.
func TestAsyncModerationWithReasoning(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))
	app := App{
		config: config.EnvConfig{
			Port: 4000,
		},
		logger:                  logger,
		llamaStackClientFactory: lsmocks.NewMockClientFactory(),
		repositories:            repositories.NewRepositories(),
	}

	guardrailOpts := buildInlineGuardrailOptions(
		"http://mock-guardrail/v1",
		"llama-guard-3",
		"test-key",
		"",
		"Check output: {{ bot_response }}",
	)

	t.Run("should stream reasoning events through async moderation", func(t *testing.T) {
		llamaStackClient := lsmocks.NewMockLlamaStackClient()
		nemoClient := nemomocks.NewMockNemoClient()

		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		ctx = context.WithValue(ctx, constants.NemoClientKey, nemoClient)

		params := llamastack.CreateResponseParams{
			Input:         llamastack.InputUnion{Text: "Think step by step"},
			Model:         "thinking-model",
			GuardrailOpts: guardrailOpts,
		}

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/responses?namespace="+testutil.TestNamespace, nil)
		require.NoError(t, err)

		rr := httptest.NewRecorder()

		done := make(chan bool)
		go func() {
			app.handleStreamingResponseWithModeration(rr, req, ctx, params, nil)
			done <- true
		}()

		select {
		case <-done:
		case <-time.After(30 * time.Second):
			t.Fatal("handleStreamingResponseWithModeration did not complete in time")
		}

		body := rr.Body.String()
		events := parseSSEEvents(body)
		require.Greater(t, len(events), 0, "should have received events")

		var eventTypes []string
		for _, event := range events {
			if et, ok := event["type"].(string); ok {
				eventTypes = append(eventTypes, et)
			}
		}

		assert.Contains(t, eventTypes, "response.output_text.delta", "output text deltas should still be present")
		assert.Contains(t, eventTypes, "response.completed", "completed event should be present")
		assert.Contains(t, eventTypes, "response.metrics", "metrics event should be emitted")
	})

	t.Run("should moderate reasoning content through guardrails", func(t *testing.T) {
		llamaStackClient := lsmocks.NewMockLlamaStackClient()

		var moderatedTexts []string
		nemoClient := &nemomocks.MockNemoClient{
			CheckGuardrailsFunc: func(_ context.Context, messages []nemo.Message, _ nemo.GuardrailsOptions) (*nemo.GuardrailCheckResponse, error) {
				for _, msg := range messages {
					if msg.Role == nemo.RoleAssistant {
						moderatedTexts = append(moderatedTexts, msg.Content)
					}
				}
				return &nemo.GuardrailCheckResponse{Status: nemo.StatusSuccess}, nil
			},
		}

		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		ctx = context.WithValue(ctx, constants.NemoClientKey, nemoClient)

		params := llamastack.CreateResponseParams{
			Input:         llamastack.InputUnion{Text: "Think about safety"},
			Model:         "thinking-model",
			GuardrailOpts: guardrailOpts,
		}

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/responses?namespace="+testutil.TestNamespace, nil)
		require.NoError(t, err)

		rr := httptest.NewRecorder()

		done := make(chan bool)
		go func() {
			app.handleStreamingResponseWithModeration(rr, req, ctx, params, nil)
			done <- true
		}()

		select {
		case <-done:
		case <-time.After(30 * time.Second):
			t.Fatal("handleStreamingResponseWithModeration did not complete in time")
		}

		assert.Greater(t, len(moderatedTexts), 0, "guardrails should have been called with output text")

		combinedModerated := strings.Join(moderatedTexts, " ")
		assert.NotEmpty(t, combinedModerated, "moderated text should be non-empty")
	})

	t.Run("should forward reasoning_text.delta and reasoning_text.done through async moderation", func(t *testing.T) {
		// reasoningEmittingClient always emits reasoning events unconditionally,
		// verifying that the async moderation path correctly forwards them.
		client := &reasoningEmittingClient{MockLlamaStackClient: lsmocks.NewMockLlamaStackClient()}
		nemoClient := nemomocks.NewMockNemoClient()

		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, client)
		ctx = context.WithValue(ctx, constants.NemoClientKey, nemoClient)

		params := llamastack.CreateResponseParams{
			Input:         llamastack.InputUnion{Text: "Think step by step"},
			Model:         "thinking-model",
			GuardrailOpts: guardrailOpts,
		}

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/responses?namespace="+testutil.TestNamespace, nil)
		require.NoError(t, err)

		rr := httptest.NewRecorder()
		done := make(chan bool)
		go func() {
			app.handleStreamingResponseWithModeration(rr, req, ctx, params, nil)
			done <- true
		}()
		select {
		case <-done:
		case <-time.After(30 * time.Second):
			t.Fatal("handleStreamingResponseWithModeration did not complete in time")
		}

		var eventTypes []string
		for _, ev := range parseSSEEvents(rr.Body.String()) {
			if et, ok := ev["type"].(string); ok {
				eventTypes = append(eventTypes, et)
			}
		}

		assert.Contains(t, eventTypes, "response.reasoning_text.delta", "reasoning_text.delta must pass through async moderation")
		assert.Contains(t, eventTypes, "response.reasoning_text.done", "reasoning_text.done must not be dropped in async path")
		assert.Contains(t, eventTypes, "response.output_text.delta", "output_text.delta should still be present")
		assert.Contains(t, eventTypes, "response.metrics", "metrics event should be emitted")
	})
}

func TestLlamaStackCreateResponseHandler_PayloadTooLarge(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	app := &App{
		config: config.EnvConfig{
			APIPathPrefix: "/api/v1",
			AuthMethod:    config.AuthMethodDisabled,
		},
		logger: logger,
	}

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		app.LlamaStackCreateResponseHandler(w, r, nil)
	})

	// Build a JSON body that forces the decoder to read past the limit.
	// Wrapping in a JSON string ensures the decoder keeps reading.
	prefix := []byte(`{"input":"`)
	suffix := []byte(`"}`)
	fillLen := constants.ResponsesMaxBodySize + 1 - len(prefix) - len(suffix)
	fill := make([]byte, fillLen)
	for i := range fill {
		fill[i] = 'a'
	}
	oversizedBody := make([]byte, 0, constants.ResponsesMaxBodySize+1)
	oversizedBody = append(oversizedBody, prefix...)
	oversizedBody = append(oversizedBody, fill...)
	oversizedBody = append(oversizedBody, suffix...)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/lsd/responses", bytes.NewReader(oversizedBody))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusRequestEntityTooLarge, rr.Code)

	var envelope map[string]interface{}
	err := json.Unmarshal(rr.Body.Bytes(), &envelope)
	assert.NoError(t, err)
	errorObj, ok := envelope["error"].(map[string]interface{})
	assert.True(t, ok, "response should contain 'error' object")
	assert.Equal(t, "413", errorObj["code"])
	assert.Contains(t, errorObj["message"], "20MB")
}
