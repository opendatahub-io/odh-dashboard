package api

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/maas"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

type responsesRepository interface {
	HandleResponses(ctx context.Context, params repositories.ResponsesParams, req *models.ResponsesRequest) (*models.RAGResponse, error)
	HandleResponsesStream(ctx context.Context, params repositories.ResponsesParams, req *models.ResponsesRequest, onDelta func(string)) (*models.RAGStreamResult, error)
}

type ResponsesHandler struct {
	logger *slog.Logger
	repo   responsesRepository
}

type RAGResponseEnvelope Envelope[*models.RAGResponse, None]

// ResponsesHandler handles POST /api/v1/pipeline-runs/:runId/patterns/:patternName/responses
func (h *ResponsesHandler) HandleResponsesEndpoint(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	params, ok := h.extractParams(w, r)
	if !ok {
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxRequestBodyBytes)
	var req models.ResponsesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		badRequestResponse(h.logger, w, r, fmt.Sprintf("invalid request body: %s", err))
		return
	}

	if req.Stream {
		h.handleStreamingResponse(w, r, params, &req)
		return
	}

	result, err := h.repo.HandleResponses(r.Context(), params, &req)
	if err != nil {
		h.mapError(w, r, err)
		return
	}

	if err := writeJSON(w, http.StatusOK, RAGResponseEnvelope{Data: result}, nil); err != nil {
		serverErrorResponse(h.logger, w, r, err)
	}
}

// extractParams pulls and validates the common parameters for the responses endpoint.
func (h *ResponsesHandler) extractParams(w http.ResponseWriter, r *http.Request) (repositories.ResponsesParams, bool) {
	namespace, ok := r.Context().Value(constants.NamespaceHeaderParameterKey).(string)
	if !ok || namespace == "" {
		badRequestResponse(h.logger, w, r, "missing namespace in context - ensure AttachNamespace middleware is used first")
		return repositories.ResponsesParams{}, false
	}

	vectorDbSecretName := r.URL.Query().Get("vectorDbSecretName")
	if vectorDbSecretName == "" {
		badRequestResponse(h.logger, w, r, "missing required query parameter: vectorDbSecretName")
		return repositories.ResponsesParams{}, false
	}
	if err := kubernetes.ValidateResourceName("vectorDbSecretName", vectorDbSecretName); err != nil {
		badRequestResponse(h.logger, w, r, "invalid vectorDbSecretName: must be a valid Kubernetes resource name")
		return repositories.ResponsesParams{}, false
	}

	maasSecretName := r.URL.Query().Get("maasSecretName")
	if maasSecretName == "" {
		badRequestResponse(h.logger, w, r, "missing required query parameter: maasSecretName")
		return repositories.ResponsesParams{}, false
	}
	if err := kubernetes.ValidateResourceName("maasSecretName", maasSecretName); err != nil {
		badRequestResponse(h.logger, w, r, "invalid maasSecretName: must be a valid Kubernetes resource name")
		return repositories.ResponsesParams{}, false
	}

	return repositories.ResponsesParams{
		Namespace:          namespace,
		VectorDbSecretName: vectorDbSecretName,
		MaasSecretName:     maasSecretName,
	}, true
}

func newID(prefix string) string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return fmt.Sprintf("%s_%x-%x-%x-%x-%x", prefix, b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}

func sseData(w http.ResponseWriter, flusher http.Flusher, v any) {
	js, _ := json.Marshal(v)
	fmt.Fprintf(w, "data: %s\n\n", js)
	if flusher != nil {
		flusher.Flush()
	}
}

// handleStreamingResponse streams a RAG response using the OpenAI Responses API SSE event format.
func (h *ResponsesHandler) handleStreamingResponse(w http.ResponseWriter, r *http.Request, params repositories.ResponsesParams, req *models.ResponsesRequest) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)

	flusher, _ := w.(http.Flusher)

	responseID := newID("resp")
	msgID := newID("msg")
	fcID := newID("fc")
	createdAt := time.Now().Unix()

	seq := 0
	next := func() int { n := seq; seq++; return n }

	emptyResp := map[string]any{"id": "", "model": "", "status": "", "created_at": 0}

	// Extract last user question for file_search_call.queries
	var question string
	for _, msg := range req.Input {
		if msg.Role == "user" {
			for _, c := range msg.Content {
				if c.Type == "input_text" {
					question = c.Text
				}
			}
		}
	}

	sseData(w, flusher, map[string]any{
		"type":            "response.created",
		"sequence_number": next(),
		"output_index":    0,
		"response": map[string]any{
			"id": responseID, "model": req.Model,
			"status": "in_progress", "created_at": createdAt,
		},
	})

	sseData(w, flusher, map[string]any{
		"type":            "response.content_part.added",
		"sequence_number": next(),
		"item_id":         msgID,
		"output_index":    1,
		"response":        emptyResp,
	})

	result, err := h.repo.HandleResponsesStream(r.Context(), params, req, func(delta string) {
		sseData(w, flusher, map[string]any{
			"type":            "response.output_text.delta",
			"sequence_number": next(),
			"item_id":         msgID,
			"output_index":    1,
			"delta":           delta,
			"response":        emptyResp,
		})
	})

	if err != nil {
		sseData(w, flusher, map[string]any{"type": "error", "message": err.Error()})
		fmt.Fprintf(w, "data: [DONE]\n\n")
		if flusher != nil {
			flusher.Flush()
		}
		return
	}

	sseData(w, flusher, map[string]any{
		"type":            "response.content_part.done",
		"sequence_number": next(),
		"item_id":         msgID,
		"output_index":    1,
		"response":        emptyResp,
	})

	sseData(w, flusher, map[string]any{
		"type":            "response.completed",
		"sequence_number": next(),
		"output_index":    0,
		"response": map[string]any{
			"id": responseID, "model": req.Model,
			"status": "completed", "created_at": createdAt,
			"output": []any{
				map[string]any{
					"id": fcID, "type": "file_search_call",
					"role": "assistant", "status": "completed",
					"queries": []string{question}, "output": "",
				},
				map[string]any{
					"id": msgID, "type": "message",
					"role": "assistant", "status": "completed",
					"content": []any{
						map[string]any{"type": "output_text", "text": result.Answer},
					},
					"output": "",
				},
			},
		},
	})

	sseData(w, flusher, map[string]any{
		"type": "response.metrics",
		"metrics": map[string]any{
			"latency_ms":             result.LatencyMs,
			"time_to_first_token_ms": result.FirstTokenMs,
			"usage": map[string]any{
				"input_tokens":  result.InputTokens,
				"output_tokens": result.OutputTokens,
				"total_tokens":  result.InputTokens + result.OutputTokens,
			},
		},
	})

	fmt.Fprintf(w, "data: [DONE]\n\n")
	if flusher != nil {
		flusher.Flush()
	}
}

func (h *ResponsesHandler) mapError(w http.ResponseWriter, r *http.Request, err error) {
	if errors.Is(err, kubernetes.ErrNotFound) {
		notFoundResponseWithMessage(h.logger, w, r, err.Error())
		return
	}
	if errors.Is(err, kubernetes.ErrForbidden) {
		forbiddenResponse(h.logger, w, r, err.Error())
		return
	}
	if errors.Is(err, kubernetes.ErrUnauthorized) {
		unauthorizedResponse(h.logger, w, r, err.Error())
		return
	}
	if errors.Is(err, maas.ErrMaasUnavailable) {
		badGatewayResponseWithMessage(h.logger, w, r, err, "MaaS service unavailable")
		return
	}
	serverErrorResponse(h.logger, w, r, err)
}
