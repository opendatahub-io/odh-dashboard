package api

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/maas"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/vectordb"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func newTestResponsesHandler() (*ResponsesHandler, *mockResponsesRepo) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	repo := new(mockResponsesRepo)
	return &ResponsesHandler{logger: logger, repo: repo}, repo
}

func responsesRequestWithNamespace(method, url, body, namespace string) *http.Request {
	var bodyReader io.Reader
	if body != "" {
		bodyReader = bytes.NewBufferString(body)
	}
	req := httptest.NewRequest(method, url, bodyReader)
	req.Header.Set("Content-Type", "application/json")
	if namespace != "" {
		ctx := context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, namespace)
		req = req.WithContext(ctx)
	}
	return req
}

type failingSSEWriter struct {
	*httptest.ResponseRecorder
	failAt   int
	writes   int
	flushAt  int
	flushes  int
	flushErr error
}

func (w *failingSSEWriter) Write(p []byte) (int, error) {
	if w.failAt >= 0 && w.writes >= w.failAt {
		return 0, errors.New("client disconnected")
	}
	w.writes++
	return w.ResponseRecorder.Write(p)
}

func (w *failingSSEWriter) FlushError() error {
	if w.flushErr != nil && w.flushAt >= 0 && w.flushes >= w.flushAt {
		return w.flushErr
	}
	w.flushes++
	w.Flush()
	return nil
}

const validResponsesBody = `{
	"model": "test-model",
	"input": [{"type":"message","role":"user","content":[{"type":"input_text","text":"hello"}]}],
	"tools": [{"type":"file_search","vector_store_ids":["col1"]}],
	"metadata": {"embedding_model": "emb-model"}
}`

const streamingResponsesBody = `{
	"model": "test-model",
	"stream": true,
	"input": [{"type":"message","role":"user","content":[{"type":"input_text","text":"hello"}]}],
	"tools": [{"type":"file_search","vector_store_ids":["col1"]}],
	"metadata": {"embedding_model": "emb-model"}
}`

var validParams = repositories.ResponsesParams{
	Namespace:      "test-ns",
	DBSecretName:   "milvus",
	MaasSecretName: "maas-secret",
}

// ---------- extractParams ----------

func TestResponsesHandler_extractParams(t *testing.T) {
	tests := []struct {
		name      string
		url       string
		namespace string
		wantOK    bool
		wantCode  int
	}{
		{
			name:      "valid params",
			url:       "/api/v1/responses?dbSecretName=milvus&maasSecretName=maas-secret",
			namespace: "test-ns",
			wantOK:    true,
		},
		{
			name:      "missing namespace",
			url:       "/api/v1/responses?dbSecretName=milvus&maasSecretName=maas-secret",
			namespace: "",
			wantOK:    false,
			wantCode:  http.StatusBadRequest,
		},
		{
			name:      "missing dbSecretName",
			url:       "/api/v1/responses?maasSecretName=maas-secret",
			namespace: "test-ns",
			wantOK:    false,
			wantCode:  http.StatusBadRequest,
		},
		{
			name:      "invalid dbSecretName",
			url:       "/api/v1/responses?dbSecretName=INVALID!!&maasSecretName=maas-secret",
			namespace: "test-ns",
			wantOK:    false,
			wantCode:  http.StatusBadRequest,
		},
		{
			name:      "missing maasSecretName",
			url:       "/api/v1/responses?dbSecretName=milvus",
			namespace: "test-ns",
			wantOK:    false,
			wantCode:  http.StatusBadRequest,
		},
		{
			name:      "invalid maasSecretName",
			url:       "/api/v1/responses?dbSecretName=milvus&maasSecretName=INVALID!!",
			namespace: "test-ns",
			wantOK:    false,
			wantCode:  http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, _ := newTestResponsesHandler()
			req := responsesRequestWithNamespace(http.MethodPost, tt.url, "", tt.namespace)
			rr := httptest.NewRecorder()

			_, ok := h.extractParams(rr, req)

			assert.Equal(t, tt.wantOK, ok)
			if !tt.wantOK {
				assert.Equal(t, tt.wantCode, rr.Code)
			}
		})
	}
}

// ---------- HandleResponsesEndpoint (non-streaming) ----------

func TestHandleResponsesEndpoint_NonStreaming(t *testing.T) {
	ns := "test-ns"
	url := "/api/v1/responses?dbSecretName=milvus&maasSecretName=maas-secret"

	tests := []struct {
		name           string
		body           string
		repoResult     *models.RAGResponse
		repoErr        error
		wantStatusCode int
		wantBodySubstr string
	}{
		{
			name:           "success returns 200 with answer",
			body:           validResponsesBody,
			repoResult:     &models.RAGResponse{Answer: "the answer"},
			repoErr:        nil,
			wantStatusCode: http.StatusOK,
			wantBodySubstr: `"answer": "the answer"`,
		},
		{
			name:           "invalid json body returns 400",
			body:           `{not valid json`,
			repoResult:     nil,
			repoErr:        nil,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "invalid request body",
		},
		{
			name:           "missing model returns 400 without calling repository",
			body:           strings.Replace(validResponsesBody, `"model": "test-model",`, "", 1),
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "model is required",
		},
		{
			name:           "blank model returns 400 without calling repository",
			body:           strings.Replace(validResponsesBody, `"model": "test-model"`, `"model": "   "`, 1),
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "model is required",
		},
		{
			name:           "omitted input returns 400 without calling repository",
			body:           strings.Replace(validResponsesBody, `"input": [{"type":"message","role":"user","content":[{"type":"input_text","text":"hello"}]}],`, "", 1),
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "input is required",
		},
		{
			name:           "null input returns 400 without calling repository",
			body:           strings.Replace(validResponsesBody, `"input": [{"type":"message","role":"user","content":[{"type":"input_text","text":"hello"}]}]`, `"input": null`, 1),
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "input is required",
		},
		{
			name:           "unsupported ranking field returns 400",
			body:           strings.Replace(validResponsesBody, `"vector_store_ids":["col1"]}]`, `"vector_store_ids":["col1"],"ranking_options":{"ranker":"rrf","ranker_k":60}}]`, 1),
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "invalid request body",
		},
		{
			name:           "unsupported ranker returns 400 without calling repository",
			body:           strings.Replace(validResponsesBody, `"vector_store_ids":["col1"]}]`, `"vector_store_ids":["col1"],"ranking_options":{"ranker":"linear"}}]`, 1),
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "unsupported",
		},
		{
			name:           "alpha without ranker returns 400 without calling repository",
			body:           strings.Replace(validResponsesBody, `"vector_store_ids":["col1"]}]`, `"vector_store_ids":["col1"],"ranking_options":{"alpha":0.5}}]`, 1),
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "requires ranking_options.ranker",
		},
		{
			name:           "missing embedding model returns 400 without calling repository",
			body:           strings.Replace(validResponsesBody, `"embedding_model": "emb-model"`, "", 1),
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "metadata.embedding_model is required",
		},
		{
			name:           "missing file search configuration returns 400 without calling repository",
			body:           strings.Replace(validResponsesBody, `"tools": [{"type":"file_search","vector_store_ids":["col1"]}],`, "", 1),
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "no file_search tool",
		},
		{
			name:           "negative max_num_results returns 400 without calling repository",
			body:           strings.Replace(validResponsesBody, `"vector_store_ids":["col1"]`, `"vector_store_ids":["col1"],"max_num_results":-1`, 1),
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "between 0 and 100",
		},
		{
			name:           "out of range temperature returns 400 without calling repository",
			body:           strings.Replace(validResponsesBody, `"model": "test-model",`, `"model": "test-model", "temperature": 2.1,`, 1),
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "temperature must be between 0 and 2",
		},
		{
			name:           "k8s not found returns 404",
			body:           validResponsesBody,
			repoResult:     nil,
			repoErr:        fmt.Errorf("secret: %w", kubernetes.ErrNotFound),
			wantStatusCode: http.StatusNotFound,
		},
		{
			name:           "k8s forbidden returns 403",
			body:           validResponsesBody,
			repoResult:     nil,
			repoErr:        fmt.Errorf("secret: %w", kubernetes.ErrForbidden),
			wantStatusCode: http.StatusForbidden,
		},
		{
			name:           "k8s unauthorized returns 401",
			body:           validResponsesBody,
			repoResult:     nil,
			repoErr:        fmt.Errorf("secret: %w", kubernetes.ErrUnauthorized),
			wantStatusCode: http.StatusUnauthorized,
		},
		{
			name:           "maas unavailable returns 502",
			body:           validResponsesBody,
			repoResult:     nil,
			repoErr:        fmt.Errorf("chat: %w", maas.ErrMaasUnavailable),
			wantStatusCode: http.StatusBadGateway,
		},
		{
			name:           "typed maas upstream error is safe",
			body:           validResponsesBody,
			repoResult:     nil,
			repoErr:        fmt.Errorf("provider https://secret.example/key: %w", maas.NewMaaSError(maas.ErrCodeServerUnavailable, "provider response body", http.StatusServiceUnavailable)),
			wantStatusCode: http.StatusServiceUnavailable,
			wantBodySubstr: "MaaS service temporarily unavailable",
		},
		{
			name:           "oversized maas response returns 503 with safe message",
			body:           validResponsesBody,
			repoResult:     nil,
			repoErr:        fmt.Errorf("chat: %w", maas.ErrMaaSResponseBodyLimit),
			wantStatusCode: http.StatusServiceUnavailable,
			wantBodySubstr: "MaaS response exceeded the supported size",
		},
		{
			name:           "generic error returns 500",
			body:           validResponsesBody,
			repoResult:     nil,
			repoErr:        errors.New("something broke"),
			wantStatusCode: http.StatusInternalServerError,
		},
		{
			name:           "vector database timeout returns 503 with safe message",
			body:           validResponsesBody,
			repoErr:        fmt.Errorf("search: %w: raw endpoint and credentials", vectordb.ErrDatabaseTimeout),
			wantStatusCode: http.StatusServiceUnavailable,
			wantBodySubstr: "vector database request timed out",
		},
		{
			name:           "vector database connection failure returns 503 with safe message",
			body:           validResponsesBody,
			repoErr:        fmt.Errorf("connect: %w: raw endpoint and credentials", vectordb.ErrDatabaseUnavailable),
			wantStatusCode: http.StatusServiceUnavailable,
			wantBodySubstr: "vector database is unavailable",
		},
		{
			name:           "unsupported vector search returns 400",
			body:           validResponsesBody,
			repoResult:     nil,
			repoErr:        fmt.Errorf("search: %w", vectordb.ErrUnsupportedSearch),
			wantStatusCode: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, repo := newTestResponsesHandler()

			if tt.repoResult != nil || tt.repoErr != nil {
				repo.On("HandleResponses", mock.Anything, validParams, mock.Anything).
					Return(tt.repoResult, tt.repoErr)
			}

			req := responsesRequestWithNamespace(http.MethodPost, url, tt.body, ns)
			rr := httptest.NewRecorder()
			h.HandleResponsesEndpoint(rr, req, httprouter.Params{})

			assert.Equal(t, tt.wantStatusCode, rr.Code)
			if tt.wantBodySubstr != "" {
				assert.Contains(t, rr.Body.String(), tt.wantBodySubstr)
			}
			if tt.name == "vector database timeout returns 503 with safe message" {
				assert.NotContains(t, rr.Body.String(), "raw endpoint and credentials")
			}
			repo.AssertExpectations(t)
		})
	}
}

func TestHandleResponsesEndpoint_UnsupportedVectorDBReturnsBadRequest(t *testing.T) {
	h, repo := newTestResponsesHandler()
	repo.On("HandleResponses", mock.Anything, repositories.ResponsesParams{
		Namespace: "test-ns", DBSecretName: "neo4j", MaasSecretName: "maas-secret",
	}, mock.Anything).
		Return(nil, fmt.Errorf("database: %w", vectordb.ErrUnsupportedVectorDB))

	req := responsesRequestWithNamespace(
		http.MethodPost,
		"/api/v1/responses?dbSecretName=neo4j&maasSecretName=maas-secret",
		validResponsesBody,
		"test-ns",
	)
	rr := httptest.NewRecorder()
	h.HandleResponsesEndpoint(rr, req, httprouter.Params{})

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "unsupported vector DB")
	repo.AssertExpectations(t)
}

func TestHandleResponsesEndpoint_NormalizesStringInput(t *testing.T) {
	h, repo := newTestResponsesHandler()
	repo.On("HandleResponses", mock.Anything, validParams, mock.MatchedBy(func(req *models.ResponsesRequest) bool {
		return assert.Equal(t, []models.InputMessage{{
			Type:    "message",
			Role:    "user",
			Content: []models.InputContent{{Type: "input_text", Text: "hello"}},
		}}, req.Input)
	})).Return(&models.RAGResponse{Answer: "the answer"}, nil)

	body := strings.Replace(validResponsesBody, `[{"type":"message","role":"user","content":[{"type":"input_text","text":"hello"}]}]`, `"hello"`, 1)
	req := responsesRequestWithNamespace(
		http.MethodPost,
		"/api/v1/responses?dbSecretName=milvus&maasSecretName=maas-secret",
		body,
		"test-ns",
	)
	rr := httptest.NewRecorder()
	h.HandleResponsesEndpoint(rr, req, httprouter.Params{})

	assert.Equal(t, http.StatusOK, rr.Code)
	repo.AssertExpectations(t)
}

// ---------- HandleResponsesEndpoint (streaming) ----------

func TestHandleResponsesEndpoint_Streaming(t *testing.T) {
	ns := "test-ns"
	url := "/api/v1/responses?dbSecretName=milvus&maasSecretName=maas-secret"

	t.Run("streaming success emits SSE events", func(t *testing.T) {
		h, repo := newTestResponsesHandler()

		streamResult := &models.RAGStreamResult{
			Answer:       "hello world",
			Sources:      []models.SourceChunk{{Text: "source text", Score: 0.9, FileID: "file-1"}},
			InputTokens:  10,
			OutputTokens: 5,
			LatencyMs:    100,
			FirstTokenMs: 20,
		}

		repo.On("HandleResponsesStream", mock.Anything, validParams, mock.Anything, mock.AnythingOfType("func(string)")).
			Run(func(args mock.Arguments) {
				onDelta := args.Get(3).(func(string))
				onDelta("hello")
				onDelta(" world")
			}).
			Return(streamResult, nil)
		repo.On("ValidateResponses", mock.Anything, validParams, mock.Anything).Return(nil)

		req := responsesRequestWithNamespace(http.MethodPost, url, streamingResponsesBody, ns)
		rr := httptest.NewRecorder()
		h.HandleResponsesEndpoint(rr, req, httprouter.Params{})

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "text/event-stream", rr.Header().Get("Content-Type"))

		body := rr.Body.String()
		assert.Contains(t, body, "response.created")
		assert.Contains(t, body, "response.content_part.added")
		assert.Contains(t, body, "response.output_text.delta")
		assert.Contains(t, body, `"delta":"hello"`)
		assert.Contains(t, body, `"delta":" world"`)
		assert.Contains(t, body, "response.content_part.done")
		assert.Contains(t, body, "response.completed")
		assert.Contains(t, body, `"results":[{"text":"source text","score":0.9,"file_id":"file-1"}]`)
		assert.Contains(t, body, "response.metrics")
		assert.Contains(t, body, "[DONE]")

		// Every event except [DONE] has a monotonically increasing sequence number.
		scanner := bufio.NewScanner(strings.NewReader(body))
		lastSeq := -1
		var metricsSequence *int
		for scanner.Scan() {
			line := scanner.Text()
			if !strings.HasPrefix(line, "data: ") {
				continue
			}
			data := strings.TrimPrefix(line, "data: ")
			if data == "[DONE]" {
				continue
			}
			var event struct {
				Type           string `json:"type"`
				SequenceNumber *int   `json:"sequence_number"`
			}
			if assert.NoError(t, json.Unmarshal([]byte(data), &event)) {
				if assert.NotNil(t, event.SequenceNumber, "event must include sequence_number") {
					assert.Greater(t, *event.SequenceNumber, lastSeq, "sequence numbers must increase")
					lastSeq = *event.SequenceNumber
				}
				if event.Type == "response.metrics" {
					metricsSequence = event.SequenceNumber
				}
			}
		}
		if assert.NotNil(t, metricsSequence, "stream must include a response.metrics event") {
			assert.Equal(t, lastSeq, *metricsSequence, "response.metrics must be the final sequenced event")
		}
		repo.AssertExpectations(t)
	})

	t.Run("streaming file search queries contain only the final user input text", func(t *testing.T) {
		h, repo := newTestResponsesHandler()
		repo.On("HandleResponsesStream", mock.Anything, validParams, mock.Anything, mock.AnythingOfType("func(string)")).
			Return(&models.RAGStreamResult{Answer: "answer"}, nil)
		repo.On("ValidateResponses", mock.Anything, validParams, mock.Anything).Return(nil)

		body := strings.Replace(streamingResponsesBody,
			`[{"type":"message","role":"user","content":[{"type":"input_text","text":"hello"}]}]`,
			`[{"type":"message","role":"user","content":[{"type":"input_text","text":"old question"}]},{"type":"message","role":"assistant","content":[{"type":"input_text","text":"old answer"}]},{"type":"message","role":"user","content":[{"type":"input_text","text":"final question"},{"type":"input_text","text":" with details"}]}]`, 1)
		req := responsesRequestWithNamespace(http.MethodPost, url, body, ns)
		rr := httptest.NewRecorder()
		h.HandleResponsesEndpoint(rr, req, httprouter.Params{})

		assert.Contains(t, rr.Body.String(), `"queries":["final question with details"]`)
		assert.NotContains(t, rr.Body.String(), `old question`)
		repo.AssertExpectations(t)
	})

	t.Run("streaming error emits error event then DONE", func(t *testing.T) {
		h, repo := newTestResponsesHandler()

		repo.On("HandleResponsesStream", mock.Anything, validParams, mock.Anything, mock.AnythingOfType("func(string)")).
			Return(nil, errors.New("stream failed"))
		repo.On("ValidateResponses", mock.Anything, validParams, mock.Anything).Return(nil)

		req := responsesRequestWithNamespace(http.MethodPost, url, streamingResponsesBody, ns)
		rr := httptest.NewRecorder()
		h.HandleResponsesEndpoint(rr, req, httprouter.Params{})

		assert.Equal(t, http.StatusOK, rr.Code)
		body := rr.Body.String()
		assert.Contains(t, body, `"type":"error"`)
		assert.Contains(t, body, genericStreamingErrorMessage)
		assert.NotContains(t, body, "stream failed")
		assert.Contains(t, body, "[DONE]")
		repo.AssertExpectations(t)
	})

	t.Run("database timeout emits classified safe error event then DONE", func(t *testing.T) {
		var logs bytes.Buffer
		repo := new(mockResponsesRepo)
		h := &ResponsesHandler{logger: slog.New(slog.NewTextHandler(&logs, nil)), repo: repo}

		repo.On("HandleResponsesStream", mock.Anything, validParams, mock.Anything, mock.AnythingOfType("func(string)")).
			Return(nil, fmt.Errorf("milvus: %w: https://user:password@milvus.example:19530", vectordb.ErrDatabaseTimeout))
		repo.On("ValidateResponses", mock.Anything, validParams, mock.Anything).Return(nil)

		req := responsesRequestWithNamespace(http.MethodPost, url, streamingResponsesBody, ns)
		rr := httptest.NewRecorder()
		h.HandleResponsesEndpoint(rr, req, httprouter.Params{})

		assert.Equal(t, http.StatusOK, rr.Code)
		body := rr.Body.String()
		assert.Contains(t, body, `"code":"vector_database_timeout"`)
		assert.Contains(t, body, `"message":"The vector database request timed out."`)
		assert.NotContains(t, body, "password")
		assert.Contains(t, body, "[DONE]")
		assert.NotContains(t, logs.String(), "password")
		assert.Contains(t, logs.String(), "milvus.example:19530")
		repo.AssertExpectations(t)
	})

	t.Run("unsupported streaming search returns 400 before SSE headers", func(t *testing.T) {
		h, repo := newTestResponsesHandler()
		repo.On("ValidateResponses", mock.Anything, validParams, mock.Anything).
			Return(fmt.Errorf("search: %w", vectordb.ErrUnsupportedSearch))

		req := responsesRequestWithNamespace(http.MethodPost, url, strings.Replace(
			streamingResponsesBody,
			`"vector_store_ids":["col1"]}]`,
			`"vector_store_ids":["col1"],"ranking_options":{"ranker":"rrf","alpha":0.5}}]`,
			1,
		), ns)
		rr := httptest.NewRecorder()
		h.HandleResponsesEndpoint(rr, req, httprouter.Params{})

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.NotEqual(t, "text/event-stream", rr.Header().Get("Content-Type"))
		assert.NotContains(t, rr.Body.String(), "response.created")
		repo.AssertExpectations(t)
	})

	t.Run("unsupported dense vector DB returns 400 before SSE headers", func(t *testing.T) {
		h, repo := newTestResponsesHandler()
		neo4jParams := repositories.ResponsesParams{
			Namespace: "test-ns", DBSecretName: "neo4j", MaasSecretName: "maas-secret",
		}
		repo.On("ValidateResponses", mock.Anything, neo4jParams, mock.Anything).
			Return(fmt.Errorf("database: %w", vectordb.ErrUnsupportedVectorDB))

		req := responsesRequestWithNamespace(http.MethodPost,
			"/api/v1/responses?dbSecretName=neo4j&maasSecretName=maas-secret", streamingResponsesBody, ns)
		rr := httptest.NewRecorder()
		h.HandleResponsesEndpoint(rr, req, httprouter.Params{})

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.NotEqual(t, "text/event-stream", rr.Header().Get("Content-Type"))
		assert.NotContains(t, rr.Body.String(), "response.created")
		repo.AssertExpectations(t)
	})

	t.Run("forwarding failure returns a normal error before SSE headers without secrets", func(t *testing.T) {
		var logs bytes.Buffer
		repo := new(mockResponsesRepo)
		h := &ResponsesHandler{
			logger: slog.New(slog.NewTextHandler(&logs, nil)),
			repo:   repo,
		}
		forwardErr := errors.New("failed to forward Milvus endpoint: http://user:password@milvus.team-a.svc.cluster.local:19530")
		repo.On("ValidateResponses", mock.Anything, validParams, mock.Anything).Return(forwardErr)

		req := responsesRequestWithNamespace(http.MethodPost, url, streamingResponsesBody, ns)
		rr := httptest.NewRecorder()
		h.HandleResponsesEndpoint(rr, req, httprouter.Params{})

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.NotEqual(t, "text/event-stream", rr.Header().Get("Content-Type"))
		assert.NotContains(t, rr.Body.String(), "password")
		assert.NotContains(t, logs.String(), "password")
		assert.Contains(t, logs.String(), "<redacted>@milvus.team-a.svc.cluster.local:19530")
		repo.AssertExpectations(t)
	})

	t.Run("forwarding deadline returns 503 before SSE headers without secrets", func(t *testing.T) {
		var logs bytes.Buffer
		repo := new(mockResponsesRepo)
		h := &ResponsesHandler{
			logger: slog.New(slog.NewTextHandler(&logs, nil)),
			repo:   repo,
		}
		repo.On("ValidateResponses", mock.Anything, validParams, mock.Anything).
			Return(fmt.Errorf("failed to forward Milvus endpoint: %w: https://user:password@milvus.team-a.svc.cluster.local:19530", vectordb.ErrDatabaseTimeout))

		req := responsesRequestWithNamespace(http.MethodPost, url, streamingResponsesBody, ns)
		rr := httptest.NewRecorder()
		h.HandleResponsesEndpoint(rr, req, httprouter.Params{})

		assert.Equal(t, http.StatusServiceUnavailable, rr.Code)
		assert.NotEqual(t, "text/event-stream", rr.Header().Get("Content-Type"))
		assert.Contains(t, rr.Body.String(), "vector database request timed out")
		assert.NotContains(t, rr.Body.String(), "password")
		assert.NotContains(t, logs.String(), "password")
		repo.AssertExpectations(t)
	})
}

func TestHandleResponsesEndpoint_StreamingWriteFailureStopsUpstream(t *testing.T) {
	h, repo := newTestResponsesHandler()
	w := &failingSSEWriter{ResponseRecorder: httptest.NewRecorder(), failAt: 2}
	ctxCanceled := make(chan struct{})
	repo.On("ValidateResponses", mock.Anything, validParams, mock.Anything).Return(nil)
	repo.On("HandleResponsesStream", mock.Anything, validParams, mock.Anything, mock.AnythingOfType("func(string)")).
		Run(func(args mock.Arguments) {
			onDelta := args.Get(3).(func(string))
			onDelta("first delta")
			if args.Get(0).(context.Context).Err() != nil {
				close(ctxCanceled)
			}
		}).
		Return(&models.RAGStreamResult{Answer: "answer"}, nil)

	req := responsesRequestWithNamespace(http.MethodPost,
		"/api/v1/responses?dbSecretName=milvus&maasSecretName=maas-secret", streamingResponsesBody, "test-ns")
	h.HandleResponsesEndpoint(w, req, httprouter.Params{})

	select {
	case <-ctxCanceled:
	default:
		t.Fatal("expected upstream context cancellation after delta write failure")
	}
	body := w.Body.String()
	assert.Contains(t, body, "response.created")
	assert.NotContains(t, body, "first delta")
	assert.NotContains(t, body, "response.completed")
	assert.NotContains(t, body, "[DONE]")
	repo.AssertExpectations(t)
}

func TestHandleResponsesEndpoint_StreamingInitialWriteFailureDoesNotStartRepository(t *testing.T) {
	h, repo := newTestResponsesHandler()
	w := &failingSSEWriter{ResponseRecorder: httptest.NewRecorder(), failAt: 0}
	repo.On("ValidateResponses", mock.Anything, validParams, mock.Anything).Return(nil)

	req := responsesRequestWithNamespace(http.MethodPost,
		"/api/v1/responses?dbSecretName=milvus&maasSecretName=maas-secret", streamingResponsesBody, "test-ns")
	h.HandleResponsesEndpoint(w, req, httprouter.Params{})

	assert.Empty(t, w.Body.String())
	repo.AssertNotCalled(t, "HandleResponsesStream", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
	repo.AssertExpectations(t)
}

func TestHandleResponsesEndpoint_StreamingFlushFailureStopsStream(t *testing.T) {
	h, repo := newTestResponsesHandler()
	w := &failingSSEWriter{
		ResponseRecorder: httptest.NewRecorder(),
		failAt:           -1,
		flushErr:         errors.New("flush failed"),
	}
	repo.On("ValidateResponses", mock.Anything, validParams, mock.Anything).Return(nil)

	req := responsesRequestWithNamespace(http.MethodPost,
		"/api/v1/responses?dbSecretName=milvus&maasSecretName=maas-secret", streamingResponsesBody, "test-ns")
	h.HandleResponsesEndpoint(w, req, httprouter.Params{})

	assert.Contains(t, w.Body.String(), "response.created")
	assert.NotContains(t, w.Body.String(), "response.content_part.added")
	repo.AssertNotCalled(t, "HandleResponsesStream", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
	repo.AssertExpectations(t)
}

func TestHandleResponsesEndpoint_StreamingCancellationIsSilent(t *testing.T) {
	var logs bytes.Buffer
	repo := new(mockResponsesRepo)
	h := &ResponsesHandler{logger: slog.New(slog.NewTextHandler(&logs, nil)), repo: repo}
	repo.On("ValidateResponses", mock.Anything, validParams, mock.Anything).Return(nil)
	repo.On("HandleResponsesStream", mock.Anything, validParams, mock.Anything, mock.AnythingOfType("func(string)")).
		Return(nil, context.Canceled)

	req := responsesRequestWithNamespace(http.MethodPost,
		"/api/v1/responses?dbSecretName=milvus&maasSecretName=maas-secret", streamingResponsesBody, "test-ns")
	rr := httptest.NewRecorder()
	h.HandleResponsesEndpoint(rr, req, httprouter.Params{})

	assert.NotContains(t, rr.Body.String(), `"type":"error"`)
	assert.NotContains(t, rr.Body.String(), "[DONE]")
	assert.Empty(t, logs.String())
	repo.AssertExpectations(t)
}

func TestHandleResponsesEndpoint_StreamingCancellationBeforeFirstEventIsSilent(t *testing.T) {
	var logs bytes.Buffer
	repo := new(mockResponsesRepo)
	h := &ResponsesHandler{logger: slog.New(slog.NewTextHandler(&logs, nil)), repo: repo}
	repo.On("ValidateResponses", mock.Anything, validParams, mock.Anything).Return(nil)

	req := responsesRequestWithNamespace(http.MethodPost,
		"/api/v1/responses?dbSecretName=milvus&maasSecretName=maas-secret", streamingResponsesBody, "test-ns")
	ctx, cancel := context.WithCancel(req.Context())
	req = req.WithContext(ctx)
	cancel()
	w := &failingSSEWriter{ResponseRecorder: httptest.NewRecorder(), failAt: -1}
	h.HandleResponsesEndpoint(w, req, httprouter.Params{})

	assert.Empty(t, w.Body.String())
	assert.Equal(t, 0, w.writes)
	assert.Empty(t, logs.String())
	repo.AssertNotCalled(t, "HandleResponsesStream", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
	repo.AssertExpectations(t)
}

func TestHandleResponsesEndpoint_StreamingCancellationDuringUpstreamErrorIsSilent(t *testing.T) {
	var logs bytes.Buffer
	h, repo := newTestResponsesHandler()
	h.logger = slog.New(slog.NewTextHandler(&logs, nil))
	repo.On("ValidateResponses", mock.Anything, validParams, mock.Anything).Return(nil)

	req := responsesRequestWithNamespace(http.MethodPost,
		"/api/v1/responses?dbSecretName=milvus&maasSecretName=maas-secret", streamingResponsesBody, "test-ns")
	ctx, cancel := context.WithCancel(req.Context())
	req = req.WithContext(ctx)
	repo.On("HandleResponsesStream", mock.Anything, validParams, mock.Anything, mock.AnythingOfType("func(string)")).
		Run(func(mock.Arguments) { cancel() }).
		Return(nil, errors.New("upstream failed after cancellation"))
	rr := httptest.NewRecorder()
	h.HandleResponsesEndpoint(rr, req, httprouter.Params{})

	body := rr.Body.String()
	assert.Contains(t, body, "response.created")
	assert.NotContains(t, body, `"type":"error"`)
	assert.NotContains(t, body, "[DONE]")
	assert.Empty(t, logs.String())
	repo.AssertExpectations(t)
}

func TestHandleResponsesEndpoint_StreamingCancellationBeforeDoneIsSilent(t *testing.T) {
	var logs bytes.Buffer
	h, repo := newTestResponsesHandler()
	h.logger = slog.New(slog.NewTextHandler(&logs, nil))
	repo.On("ValidateResponses", mock.Anything, validParams, mock.Anything).Return(nil)

	req := responsesRequestWithNamespace(http.MethodPost,
		"/api/v1/responses?dbSecretName=milvus&maasSecretName=maas-secret", streamingResponsesBody, "test-ns")
	ctx, cancel := context.WithCancel(req.Context())
	req = req.WithContext(ctx)
	repo.On("HandleResponsesStream", mock.Anything, validParams, mock.Anything, mock.AnythingOfType("func(string)")).
		Run(func(mock.Arguments) { cancel() }).
		Return(&models.RAGStreamResult{Answer: "answer"}, nil)
	rr := httptest.NewRecorder()
	h.HandleResponsesEndpoint(rr, req, httprouter.Params{})

	body := rr.Body.String()
	assert.Contains(t, body, "response.created")
	assert.NotContains(t, body, "response.content_part.done")
	assert.NotContains(t, body, "response.completed")
	assert.NotContains(t, body, "response.metrics")
	assert.NotContains(t, body, "[DONE]")
	assert.Empty(t, logs.String())
	repo.AssertExpectations(t)
}

func TestValidateResponsesRequestOutputTokenAndInputBounds(t *testing.T) {
	tests := []struct {
		name    string
		mutate  func(*models.ResponsesRequest)
		wantErr string
	}{
		{name: "zero uses default", mutate: func(req *models.ResponsesRequest) { req.MaxOutputTokens = 0 }},
		{name: "negative rejected", mutate: func(req *models.ResponsesRequest) { req.MaxOutputTokens = -1 }, wantErr: "nonnegative"},
		{name: "above cap rejected", mutate: func(req *models.ResponsesRequest) { req.MaxOutputTokens = 4097 }, wantErr: "4096"},
		{name: "input cap rejected", mutate: func(req *models.ResponsesRequest) {
			req.Input[0].Content[0].Text = strings.Repeat("x", maxResponsesInputBytes+1)
		}, wantErr: "maximum supported size"},
		{name: "tool vector store ID cap rejected", mutate: func(req *models.ResponsesRequest) {
			req.Tools = []models.FileSearchTool{{VectorStoreIDs: []string{strings.Repeat("x", maxResponsesStringBytes+1)}}}
		}, wantErr: "maximum supported size"},
		{name: "tool choice cap rejected", mutate: func(req *models.ResponsesRequest) {
			req.ToolChoice = &models.ToolChoice{Type: strings.Repeat("x", maxResponsesStringBytes+1)}
		}, wantErr: "maximum supported size"},
		{name: "include item cap rejected", mutate: func(req *models.ResponsesRequest) {
			req.Include = []string{strings.Repeat("x", maxResponsesStringBytes+1)}
		}, wantErr: "maximum supported size"},
		{name: "metadata value cap rejected", mutate: func(req *models.ResponsesRequest) {
			req.Metadata = map[string]string{"credential": strings.Repeat("x", maxResponsesStringBytes+1)}
		}, wantErr: "maximum supported size"},
		{name: "ranking option cap rejected", mutate: func(req *models.ResponsesRequest) {
			req.Tools = []models.FileSearchTool{{RankingOptions: models.RankingOptions{Ranker: strings.Repeat("x", maxResponsesStringBytes+1)}}}
		}, wantErr: "maximum supported size"},
		{name: "too many tools rejected", mutate: func(req *models.ResponsesRequest) {
			req.Tools = make([]models.FileSearchTool, maxResponsesTools+1)
		}, wantErr: "tools must not contain"},
		{name: "too many vector store IDs rejected", mutate: func(req *models.ResponsesRequest) {
			req.Tools = []models.FileSearchTool{{VectorStoreIDs: make([]string, maxResponsesVectorStoreIDs+1)}}
		}, wantErr: "vector_store_ids must not contain"},
		{name: "too many include items rejected", mutate: func(req *models.ResponsesRequest) {
			req.Include = make([]string, maxResponsesIncludeItems+1)
		}, wantErr: "include must not contain"},
		{name: "too many metadata entries rejected", mutate: func(req *models.ResponsesRequest) {
			req.Metadata = make(map[string]string, maxResponsesMetadataItems+1)
			for i := 0; i <= maxResponsesMetadataItems; i++ {
				req.Metadata[fmt.Sprintf("key-%d", i)] = "value"
			}
		}, wantErr: "metadata must not contain"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var req models.ResponsesRequest
			require.NoError(t, json.Unmarshal([]byte(`{"model":"model","input":[{"role":"user","content":[{"type":"input_text","text":"question"}]}]}`), &req))
			reqPtr := &req
			tt.mutate(reqPtr)
			err := validateResponsesRequest(reqPtr)
			if tt.wantErr == "" {
				if err != nil {
					t.Fatalf("validateResponsesRequest() error = %v", err)
				}
				return
			}
			if err == nil || !strings.Contains(err.Error(), tt.wantErr) {
				t.Fatalf("validateResponsesRequest() error = %v, want %q", err, tt.wantErr)
			}
		})
	}
}

func TestHandleResponsesEndpointRejectsAssistantFinalTurnBeforeStreaming(t *testing.T) {
	h, repo := newTestResponsesHandler()
	body := strings.Replace(
		validResponsesBody,
		`"role":"user"`,
		`"role":"assistant"`,
		1,
	)
	body = strings.Replace(body, `"metadata":`, `"stream":true,"metadata":`, 1)
	req := responsesRequestWithNamespace(
		http.MethodPost,
		"/api/v1/responses?dbSecretName=milvus&maasSecretName=maas-secret",
		body,
		"test-ns",
	)
	rr := httptest.NewRecorder()

	h.HandleResponsesEndpoint(rr, req, httprouter.Params{})

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.NotEqual(t, "text/event-stream", rr.Header().Get("Content-Type"))
	assert.Contains(t, rr.Body.String(), "input must end with a user message")
	repo.AssertExpectations(t)
}

func TestPreflightResponsesJSONRejectsNestedCardinalityBeforeUnmarshal(t *testing.T) {
	content := `{"type":"input_text","text":"x"}`
	body := `{"model":"test","input":[{"type":"message","role":"user","content":[` + strings.TrimSuffix(strings.Repeat(content+",", maxResponsesContentItems+1), ",") + `]}]}`

	err := preflightResponsesJSON([]byte(body))
	require.Error(t, err)
	assert.Contains(t, err.Error(), "content must not contain more than")
}

func TestPreflightResponsesJSONEnforcesCumulativeLimitsAtBoundary(t *testing.T) {
	message := `{"type":"message","role":"user","content":[{"type":"input_text","text":"x"},{"type":"input_text","text":"y"}]}`
	body := `{"model":"test","input":[` + strings.TrimSuffix(strings.Repeat(message+",", maxResponsesInputMessages), ",") + `]}`
	require.NoError(t, preflightResponsesJSON([]byte(body)))

	messageWithExtraContent := `{"type":"message","role":"user","content":[{"type":"input_text","text":"x"},{"type":"input_text","text":"y"},{"type":"input_text","text":"z"}]}`
	tooMany := `{"model":"test","input":[` + messageWithExtraContent + `,` + strings.TrimSuffix(strings.Repeat(message+",", maxResponsesInputMessages-1), ",") + `]}`
	err := preflightResponsesJSON([]byte(tooMany))
	require.Error(t, err)
	assert.Contains(t, err.Error(), "input content must not contain more than")
}

func TestHandleResponsesEndpointRejectsCardinalityBeforeRepository(t *testing.T) {
	h, repo := newTestResponsesHandler()
	content := `{"type":"input_text","text":"x"}`
	message := `{"type":"message","role":"user","content":[` + strings.TrimSuffix(strings.Repeat(content+",", maxResponsesContentItems+1), ",") + `]}`
	body := `{"model":"test","input":[` + message + `]}`
	req := responsesRequestWithNamespace(http.MethodPost, "/api/v1/responses?dbSecretName=milvus&maasSecretName=maas-secret", body, "test-ns")
	rr := httptest.NewRecorder()

	h.HandleResponsesEndpoint(rr, req, httprouter.Params{})

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	repo.AssertNotCalled(t, "HandleResponses", mock.Anything, mock.Anything, mock.Anything)
}

func TestPreflightResponsesJSONPreservesMalformedJSONErrors(t *testing.T) {
	err := preflightResponsesJSON([]byte(`{"model":`))
	require.Error(t, err)
}

func TestPreflightResponsesJSONRejectsCaseVariantsAndDuplicates(t *testing.T) {
	for _, body := range []string{
		`{"MODEL":"test","input":[]}`,
		`{"model":"test","INPUT":[]}`,
		`{"model":"test","input":[{"type":"message","role":"user","CONTENT":[]}]}`,
		`{"model":"test","input":[{"type":"message","role":"user","content":[{"type":"input_text","TEXT":"x"}]}]}`,
		`{"model":"test","input":[],"input":[]}`,
		`{"model":"test","tools":[{"type":"file_search","VECTOR_STORE_IDS":[]}]}`,
		`{"model":"test","tool_choice":{"TYPE":"auto"}}`,
		`{"model":"test","tools":[{"type":"file_search","ranking_options":{"RANKER":"rrf"}}]}`,
		`{"model":"test","tools":[{"type":"file_search","ranking_options":{"ranker":"rrf","ranker":"rrf"}}]}`,
	} {
		t.Run(body, func(t *testing.T) {
			require.Error(t, preflightResponsesJSON([]byte(body)))
		})
	}
}

func TestHandleResponsesEndpointAppliesExecutionDeadline(t *testing.T) {
	h, repo := newTestResponsesHandler()
	var observedDeadline time.Time
	repo.On("HandleResponses", mock.Anything, validParams, mock.Anything).
		Run(func(args mock.Arguments) {
			observedDeadline, _ = args.Get(0).(context.Context).Deadline()
		}).Return(&models.RAGResponse{Answer: "answer"}, nil)

	req := responsesRequestWithNamespace(http.MethodPost,
		"/api/v1/responses?dbSecretName=milvus&maasSecretName=maas-secret", validResponsesBody, "test-ns")
	rr := httptest.NewRecorder()
	h.HandleResponsesEndpoint(rr, req, httprouter.Params{})

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.WithinDuration(t, time.Now().Add(repositories.ResponsesExecutionTimeout), observedDeadline, time.Second)
	repo.AssertExpectations(t)
}

func TestHandleResponsesEndpoint_StreamingDoneFailureStopsOutput(t *testing.T) {
	tests := []struct {
		name       string
		errorPath  bool
		failAt     int
		flushAt    int
		wantDone   bool
		wantEvent  string
		wantNoLogs string
		wantWrites int
	}{
		{
			name:       "success write failure",
			failAt:     5,
			flushAt:    -1,
			wantEvent:  "response.metrics",
			wantNoLogs: "client disconnected",
			wantWrites: 5,
		},
		{
			name:       "success flush failure",
			failAt:     -1,
			flushAt:    5,
			wantDone:   true,
			wantEvent:  "response.metrics",
			wantNoLogs: "flush failed",
			wantWrites: 6,
		},
		{
			name:       "error write failure",
			errorPath:  true,
			failAt:     3,
			flushAt:    -1,
			wantEvent:  `"type":"error"`,
			wantNoLogs: "client disconnected",
			wantWrites: 3,
		},
		{
			name:       "error flush failure",
			errorPath:  true,
			failAt:     -1,
			flushAt:    3,
			wantDone:   true,
			wantEvent:  `"type":"error"`,
			wantNoLogs: "flush failed",
			wantWrites: 4,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var logs bytes.Buffer
			h, repo := newTestResponsesHandler()
			h.logger = slog.New(slog.NewTextHandler(&logs, nil))
			w := &failingSSEWriter{
				ResponseRecorder: httptest.NewRecorder(),
				failAt:           tt.failAt,
				flushAt:          tt.flushAt,
				flushErr:         errors.New("flush failed"),
			}

			repo.On("ValidateResponses", mock.Anything, validParams, mock.Anything).Return(nil)
			if tt.errorPath {
				repo.On("HandleResponsesStream", mock.Anything, validParams, mock.Anything, mock.AnythingOfType("func(string)")).Return(nil, errors.New("stream failed"))
			} else {
				repo.On("HandleResponsesStream", mock.Anything, validParams, mock.Anything, mock.AnythingOfType("func(string)")).Return(&models.RAGStreamResult{Answer: "answer"}, nil)
			}

			req := responsesRequestWithNamespace(http.MethodPost,
				"/api/v1/responses?dbSecretName=milvus&maasSecretName=maas-secret", streamingResponsesBody, "test-ns")
			h.HandleResponsesEndpoint(w, req, httprouter.Params{})

			body := w.Body.String()
			assert.Contains(t, body, tt.wantEvent)
			assert.Equal(t, tt.wantDone, strings.HasSuffix(body, "data: [DONE]\n\n"))
			assert.Equal(t, tt.wantWrites, w.writes)
			assert.NotContains(t, body, "client disconnected")
			assert.NotContains(t, logs.String(), tt.wantNoLogs)
			if tt.errorPath {
				assert.NotContains(t, body, "response.completed")
			}
			repo.AssertExpectations(t)
		})
	}
}
