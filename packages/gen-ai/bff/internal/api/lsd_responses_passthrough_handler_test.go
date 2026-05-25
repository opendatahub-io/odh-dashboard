package api

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"

	. "github.com/onsi/ginkgo/v2"
	"github.com/openai/openai-go/v2/responses"
	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack/lsmocks"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
	"github.com/stretchr/testify/assert"
)

var _ = Describe("LlamaStackPassthroughResponseHandler", func() {
	var app App

	BeforeEach(func() {
		logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))
		app = App{
			config:                  config.EnvConfig{Port: 4000},
			logger:                  logger,
			llamaStackClientFactory: lsmocks.NewMockClientFactory(),
			repositories:            repositories.NewRepositories(),
		}
	})

	createPassthroughRequest := func(body map[string]interface{}) *http.Request {
		jsonData, _ := json.Marshal(body)
		req := httptest.NewRequest(http.MethodPost, "/gen-ai/api/v1/lsd/responses/passthrough", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")

		mockClient := lsmocks.NewMockClientFactory().CreateClient("http://mock", "mock-token", false, nil, "/v1")
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, mockClient)
		return req.WithContext(ctx)
	}

	It("should reject request with store=true", func() {
		t := GinkgoT()
		body := map[string]interface{}{
			"model": "test-model",
			"store": true,
			"input": []interface{}{},
		}

		req := createPassthroughRequest(body)
		rr := httptest.NewRecorder()

		app.LlamaStackPassthroughResponseHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "server-side storage is not supported")
	})

	It("should accept request with store=false", func() {
		t := GinkgoT()
		body := map[string]interface{}{
			"model": "test-model",
			"store": false,
			"input": []interface{}{
				map[string]interface{}{
					"type": "message",
					"role": "user",
					"content": []interface{}{
						map[string]interface{}{
							"type": "input_text",
							"text": "Hello",
						},
					},
				},
			},
		}

		req := createPassthroughRequest(body)
		rr := httptest.NewRecorder()

		app.LlamaStackPassthroughResponseHandler(rr, req, nil)

		// Should succeed and start streaming (SSE content type)
		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Header().Get("Content-Type"), "text/event-stream")
	})

	It("should reject invalid JSON body", func() {
		t := GinkgoT()
		req := httptest.NewRequest(http.MethodPost, "/gen-ai/api/v1/lsd/responses/passthrough", bytes.NewBufferString("{invalid json"))
		req.Header.Set("Content-Type", "application/json")

		mockClient := lsmocks.NewMockClientFactory().CreateClient("http://mock", "mock-token", false, nil, "/v1")
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, mockClient)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		app.LlamaStackPassthroughResponseHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "invalid JSON")
	})

	It("should return error when LlamaStack client is missing from context", func() {
		t := GinkgoT()
		body := map[string]interface{}{
			"model": "test-model",
			"store": false,
			"input": []interface{}{},
		}
		jsonData, _ := json.Marshal(body)
		req := httptest.NewRequest(http.MethodPost, "/gen-ai/api/v1/lsd/responses/passthrough", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()

		app.LlamaStackPassthroughResponseHandler(rr, req, nil)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
	})

	It("should stream response events with metrics", func() {
		t := GinkgoT()
		body := map[string]interface{}{
			"model": "test-model",
			"store": false,
			"input": []interface{}{
				map[string]interface{}{
					"type": "message",
					"role": "user",
					"content": []interface{}{
						map[string]interface{}{
							"type": "input_text",
							"text": "Hello",
						},
					},
				},
			},
		}

		req := createPassthroughRequest(body)
		rr := httptest.NewRecorder()

		app.LlamaStackPassthroughResponseHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		responseBody := rr.Body.String()
		// Should contain at least a metrics event
		assert.Contains(t, responseBody, "response.metrics")
	})
})

var _ = Describe("extractResponseFailedError", func() {
	It("should return empty string for non-failed events", func() {
		event := responses.ResponseStreamEventUnion{
			Type: "response.output_text.delta",
		}
		assert.Equal(GinkgoT(), "", extractResponseFailedError(event))
	})

	It("should extract error message from response.failed event", func() {
		event := responses.ResponseStreamEventUnion{
			Type: "response.failed",
			Response: responses.Response{
				Error: responses.ResponseError{
					Message: "tool_choice requires --tool-call-parser to be set",
				},
			},
		}
		result := extractResponseFailedError(event)
		assert.Equal(GinkgoT(), "tool_choice requires --tool-call-parser to be set", result)
	})

	It("should return fallback message when error message is empty", func() {
		event := responses.ResponseStreamEventUnion{
			Type: "response.failed",
		}
		result := extractResponseFailedError(event)
		assert.Equal(GinkgoT(), "upstream OGX server returned response.failed", result)
	})
})
