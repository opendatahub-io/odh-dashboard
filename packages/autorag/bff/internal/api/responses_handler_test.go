package api

import (
	"bufio"
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/maas"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
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
	Namespace:          "test-ns",
	VectorDbSecretName: "milvus",
	MaasSecretName:     "maas-secret",
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
			url:       "/api/v1/responses?vectorDbSecretName=milvus&maasSecretName=maas-secret",
			namespace: "test-ns",
			wantOK:    true,
		},
		{
			name:      "missing namespace",
			url:       "/api/v1/responses?vectorDbSecretName=milvus&maasSecretName=maas-secret",
			namespace: "",
			wantOK:    false,
			wantCode:  http.StatusBadRequest,
		},
		{
			name:      "missing vectorDbSecretName",
			url:       "/api/v1/responses?maasSecretName=maas-secret",
			namespace: "test-ns",
			wantOK:    false,
			wantCode:  http.StatusBadRequest,
		},
		{
			name:      "invalid vectorDbSecretName",
			url:       "/api/v1/responses?vectorDbSecretName=INVALID!!&maasSecretName=maas-secret",
			namespace: "test-ns",
			wantOK:    false,
			wantCode:  http.StatusBadRequest,
		},
		{
			name:      "missing maasSecretName",
			url:       "/api/v1/responses?vectorDbSecretName=milvus",
			namespace: "test-ns",
			wantOK:    false,
			wantCode:  http.StatusBadRequest,
		},
		{
			name:      "invalid maasSecretName",
			url:       "/api/v1/responses?vectorDbSecretName=milvus&maasSecretName=INVALID!!",
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
	url := "/api/v1/responses?vectorDbSecretName=milvus&maasSecretName=maas-secret"

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
			name:           "generic error returns 500",
			body:           validResponsesBody,
			repoResult:     nil,
			repoErr:        errors.New("something broke"),
			wantStatusCode: http.StatusInternalServerError,
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
			repo.AssertExpectations(t)
		})
	}
}

// ---------- HandleResponsesEndpoint (streaming) ----------

func TestHandleResponsesEndpoint_Streaming(t *testing.T) {
	ns := "test-ns"
	url := "/api/v1/responses?vectorDbSecretName=milvus&maasSecretName=maas-secret"

	t.Run("streaming success emits SSE events", func(t *testing.T) {
		h, repo := newTestResponsesHandler()

		streamResult := &models.RAGStreamResult{
			Answer:       "hello world",
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
		assert.Contains(t, body, "response.metrics")
		assert.Contains(t, body, "[DONE]")

		// Sequence numbers must be monotonically increasing
		scanner := bufio.NewScanner(strings.NewReader(body))
		lastSeq := -1
		for scanner.Scan() {
			line := scanner.Text()
			if !strings.HasPrefix(line, "data: ") {
				continue
			}
			var seq int
			if n, _ := fmt.Sscanf(line, `data: {"`, new(string)); n == 0 {
				continue
			}
			if strings.Contains(line, `"sequence_number":`) {
				fmt.Sscanf(strings.SplitAfter(line, `"sequence_number":`)[1], "%d", &seq)
				assert.Greater(t, seq, lastSeq, "sequence numbers must increase")
				lastSeq = seq
			}
		}
		repo.AssertExpectations(t)
	})

	t.Run("streaming error emits error event then DONE", func(t *testing.T) {
		h, repo := newTestResponsesHandler()

		repo.On("HandleResponsesStream", mock.Anything, validParams, mock.Anything, mock.AnythingOfType("func(string)")).
			Return(nil, errors.New("stream failed"))

		req := responsesRequestWithNamespace(http.MethodPost, url, streamingResponsesBody, ns)
		rr := httptest.NewRecorder()
		h.HandleResponsesEndpoint(rr, req, httprouter.Params{})

		assert.Equal(t, http.StatusOK, rr.Code)
		body := rr.Body.String()
		assert.Contains(t, body, `"type":"error"`)
		assert.Contains(t, body, "stream failed")
		assert.Contains(t, body, "[DONE]")
		repo.AssertExpectations(t)
	})
}
