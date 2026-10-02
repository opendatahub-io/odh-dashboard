package api

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/maas"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/vectordb"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

type responsesRepository interface {
	HandleResponses(ctx context.Context, params repositories.ResponsesParams, req *models.ResponsesRequest) (*models.RAGResponse, error)
	HandleResponsesStream(ctx context.Context, params repositories.ResponsesParams, req *models.ResponsesRequest, onDelta func(string)) (*models.RAGStreamResult, error)
	ValidateResponses(ctx context.Context, params repositories.ResponsesParams, req *models.ResponsesRequest) error
}

type ResponsesHandler struct {
	logger *slog.Logger
	repo   responsesRepository
}

type RAGResponseEnvelope Envelope[*models.RAGResponse, None]

const (
	maxFileSearchResults = 100
	// maxResponsesOutputTokens matches the public API contract and bounds MaaS work.
	maxResponsesOutputTokens = 4096
	// Keep decoded request strings below the 10 MiB HTTP body limit to leave room for JSON overhead.
	maxResponsesInputBytes         = 1 << 20
	maxResponsesStringBytes        = maxResponsesInputBytes
	maxResponsesInputMessages      = 1000
	maxResponsesContentItems       = 1000
	maxResponsesTotalContent       = 2000
	maxResponsesTotalInputMessages = 1000
	maxResponsesTools              = 100
	maxResponsesTotalTools         = 100
	maxResponsesVectorStoreIDs     = 100
	maxResponsesTotalVectorIDs     = 200
	maxResponsesIncludeItems       = 100
	maxResponsesTotalIncludeItems  = 100
	maxResponsesMetadataItems      = 100
	maxResponsesRootProperties     = 16
	maxResponsesMessageFields      = 3
	maxResponsesContentFields      = 2
	maxResponsesToolFields         = 5
	maxResponsesToolChoiceFields   = 1
	maxResponsesRankingFields      = 2
)

const genericStreamingErrorMessage = "The response could not be completed."

const (
	vectorDBUnavailableMessage = "The vector database is unavailable."
	vectorDBTimeoutMessage     = "The vector database request timed out."
	vectorDBUnavailableCode    = "vector_database_unavailable"
	vectorDBTimeoutCode        = "vector_database_timeout"
)

// ResponsesHandler handles POST /api/v1/responses.
func (h *ResponsesHandler) HandleResponsesEndpoint(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	params, ok := h.extractParams(w, r)
	if !ok {
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxRequestBodyBytes)
	body, err := io.ReadAll(r.Body)
	if err != nil {
		badRequestResponse(h.logger, w, r, fmt.Sprintf("invalid request body: %s", err))
		return
	}
	if err := preflightResponsesJSON(body); err != nil {
		badRequestResponse(h.logger, w, r, fmt.Sprintf("invalid request body: %s", err))
		return
	}
	var req models.ResponsesRequest
	decoder := json.NewDecoder(bytes.NewReader(body))
	if err := decoder.Decode(&req); err != nil {
		badRequestResponse(h.logger, w, r, fmt.Sprintf("invalid request body: %s", err))
		return
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		if err == nil {
			err = errors.New("body must only contain a single JSON value")
		}
		badRequestResponse(h.logger, w, r, fmt.Sprintf("invalid request body: %s", err))
		return
	}
	if err := validateResponsesRequest(&req); err != nil {
		badRequestResponse(h.logger, w, r, err.Error())
		return
	}
	if err := repositories.ValidateResponsesRequest(&req); err != nil {
		badRequestResponse(h.logger, w, r, err.Error())
		return
	}

	executionCtx, cancel := context.WithTimeout(r.Context(), repositories.ResponsesExecutionTimeout)
	defer cancel()
	if req.Stream {
		if err := h.repo.ValidateResponses(executionCtx, params, &req); err != nil {
			h.mapError(w, r, err)
			return
		}
		h.handleStreamingResponse(w, r.WithContext(executionCtx), params, &req)
		return
	}

	result, err := h.repo.HandleResponses(executionCtx, params, &req)
	if err != nil {
		h.mapError(w, r, err)
		return
	}

	if err := writeJSON(w, http.StatusOK, RAGResponseEnvelope{Data: result}, nil); err != nil {
		serverErrorResponse(h.logger, w, r, err)
	}
}

func validateResponsesRequest(req *models.ResponsesRequest) error {
	if strings.TrimSpace(req.Model) == "" {
		return errors.New("model is required")
	}
	if !req.HasInput() {
		return errors.New("input is required")
	}
	if len(req.Input) == 0 {
		return errors.New("input must contain at least one message")
	}
	if req.Input[len(req.Input)-1].Role != "user" {
		return errors.New("input must end with a user message")
	}
	if req.MaxOutputTokens < 0 {
		return errors.New("max_output_tokens must be nonnegative")
	}
	if req.MaxOutputTokens > maxResponsesOutputTokens {
		return fmt.Errorf("max_output_tokens must not exceed %d", maxResponsesOutputTokens)
	}
	if req.Temperature != nil && (math.IsNaN(*req.Temperature) || math.IsInf(*req.Temperature, 0) || *req.Temperature < 0 || *req.Temperature > 2) {
		return errors.New("temperature must be between 0 and 2")
	}
	requestSize := responseRequestSize{}
	if err := requestSize.addString("model", req.Model); err != nil {
		return err
	}
	if err := requestSize.addString("instructions", req.Instructions); err != nil {
		return err
	}
	if len(req.Input) > maxResponsesInputMessages {
		return fmt.Errorf("input must not contain more than %d messages", maxResponsesInputMessages)
	}
	for _, msg := range req.Input {
		if err := requestSize.addString("input message type", msg.Type); err != nil {
			return err
		}
		if err := requestSize.addString("input message role", msg.Role); err != nil {
			return err
		}
		if len(msg.Content) > maxResponsesContentItems {
			return fmt.Errorf("input message content must not contain more than %d items", maxResponsesContentItems)
		}
		for _, content := range msg.Content {
			if err := requestSize.addString("input content type", content.Type); err != nil {
				return err
			}
			if err := requestSize.addString("input content text", content.Text); err != nil {
				return err
			}
		}
	}
	if len(req.Tools) > maxResponsesTools {
		return fmt.Errorf("tools must not contain more than %d items", maxResponsesTools)
	}
	for _, tool := range req.Tools {
		if err := requestSize.addString("tool type", tool.Type); err != nil {
			return err
		}
		if len(tool.VectorStoreIDs) > maxResponsesVectorStoreIDs {
			return fmt.Errorf("file_search vector_store_ids must not contain more than %d items", maxResponsesVectorStoreIDs)
		}
		for _, id := range tool.VectorStoreIDs {
			if err := requestSize.addString("vector_store_id", id); err != nil {
				return err
			}
		}
		if err := requestSize.addString("file_search ranking_options.ranker", tool.RankingOptions.Ranker); err != nil {
			return err
		}
	}
	if req.ToolChoice != nil {
		if err := requestSize.addString("tool_choice.type", req.ToolChoice.Type); err != nil {
			return err
		}
	}
	if len(req.Include) > maxResponsesIncludeItems {
		return fmt.Errorf("include must not contain more than %d items", maxResponsesIncludeItems)
	}
	for _, value := range req.Include {
		if err := requestSize.addString("include", value); err != nil {
			return err
		}
	}
	if len(req.Metadata) > maxResponsesMetadataItems {
		return fmt.Errorf("metadata must not contain more than %d entries", maxResponsesMetadataItems)
	}
	for key, value := range req.Metadata {
		if err := requestSize.addString("metadata key", key); err != nil {
			return err
		}
		if err := requestSize.addString("metadata value", value); err != nil {
			return err
		}
	}
	if requestSize.total > maxResponsesInputBytes {
		return fmt.Errorf("request input exceeds the maximum supported size of %d bytes", maxResponsesInputBytes)
	}
	for _, tool := range req.Tools {
		if tool.Type != "file_search" {
			continue
		}
		if tool.MaxNumResults < 0 || tool.MaxNumResults > maxFileSearchResults {
			return fmt.Errorf("file_search max_num_results must be between 0 and %d", maxFileSearchResults)
		}
		if tool.RankingOptions.Alpha != nil && (math.IsNaN(*tool.RankingOptions.Alpha) || math.IsInf(*tool.RankingOptions.Alpha, 0) || *tool.RankingOptions.Alpha < 0 || *tool.RankingOptions.Alpha > 1) {
			return fmt.Errorf("file_search ranking_options.alpha must be between 0 and 1")
		}
		if tool.RankingOptions.Ranker != "" && tool.RankingOptions.Ranker != "rrf" {
			return fmt.Errorf("file_search ranking_options.ranker %q is unsupported; only rrf is supported for hybrid search", tool.RankingOptions.Ranker)
		}
		if tool.RankingOptions.Alpha != nil && tool.RankingOptions.Ranker == "" {
			return fmt.Errorf("file_search ranking_options.alpha requires ranking_options.ranker")
		}
	}
	return nil
}

type responseRequestSize struct {
	total int
}

func (s *responseRequestSize) addString(field, value string) error {
	if len(value) > maxResponsesStringBytes {
		return fmt.Errorf("%s exceeds the maximum supported size of %d bytes", field, maxResponsesStringBytes)
	}
	if len(value) > maxResponsesInputBytes-s.total {
		return fmt.Errorf("request input exceeds the maximum supported size of %d bytes", maxResponsesInputBytes)
	}
	s.total += len(value)
	return nil
}

// extractParams pulls and validates the common parameters for the responses endpoint.
func (h *ResponsesHandler) extractParams(w http.ResponseWriter, r *http.Request) (repositories.ResponsesParams, bool) {
	namespace, ok := r.Context().Value(constants.NamespaceHeaderParameterKey).(string)
	if !ok || namespace == "" {
		badRequestResponse(h.logger, w, r, "missing namespace in context - ensure AttachNamespace middleware is used first")
		return repositories.ResponsesParams{}, false
	}

	dbSecretName := r.URL.Query().Get("dbSecretName")
	if dbSecretName == "" {
		badRequestResponse(h.logger, w, r, "missing required query parameter: dbSecretName")
		return repositories.ResponsesParams{}, false
	}
	if err := kubernetes.ValidateResourceName("dbSecretName", dbSecretName); err != nil {
		badRequestResponse(h.logger, w, r, "invalid dbSecretName: must be a valid Kubernetes resource name")
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
		Namespace:      namespace,
		DBSecretName:   dbSecretName,
		MaasSecretName: maasSecretName,
	}, true
}

func newID(prefix string) string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return fmt.Sprintf("%s_%x-%x-%x-%x-%x", prefix, b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}

func sseData(w http.ResponseWriter, flusher http.Flusher, v any) error {
	js, err := json.Marshal(v)
	if err != nil {
		return err
	}
	if _, err := fmt.Fprintf(w, "data: %s\n\n", js); err != nil {
		return err
	}
	return flushSSE(w, flusher)
}

func flushSSE(w http.ResponseWriter, flusher http.Flusher) error {
	if flusher == nil {
		return nil
	}
	if flushErrer, ok := flusher.(interface{ FlushError() error }); ok {
		return flushErrer.FlushError()
	}
	if err := http.NewResponseController(w).Flush(); err == nil {
		return nil
	} else if !errors.Is(err, http.ErrNotSupported) {
		return err
	}
	flusher.Flush()
	return nil
}

func sseDone(w http.ResponseWriter, flusher http.Flusher) error {
	if _, err := fmt.Fprint(w, "data: [DONE]\n\n"); err != nil {
		return err
	}
	return flushSSE(w, flusher)
}

// handleStreamingResponse streams a RAG response using the OpenAI Responses API SSE event format.
func (h *ResponsesHandler) handleStreamingResponse(w http.ResponseWriter, r *http.Request, params repositories.ResponsesParams, req *models.ResponsesRequest) {
	// The server applies a bounded deadline to ordinary responses. SSE is a live
	// stream, so remove that deadline before committing the streaming response.
	_ = http.NewResponseController(w).SetWriteDeadline(time.Time{})
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
	streamCtx, cancel := context.WithCancel(r.Context())
	defer cancel()
	var streamWriteErr error
	writeEvent := func(v any) bool {
		if streamCtx.Err() != nil {
			return false
		}
		if streamWriteErr != nil {
			return false
		}
		if err := sseData(w, flusher, v); err != nil {
			streamWriteErr = err
			cancel()
			return false
		}
		return true
	}
	writeDone := func() bool {
		if streamCtx.Err() != nil {
			return false
		}
		if streamWriteErr != nil {
			return false
		}
		if err := sseDone(w, flusher); err != nil {
			streamWriteErr = err
			cancel()
			return false
		}
		return true
	}

	emptyResp := map[string]any{"id": "", "model": "", "status": "", "created_at": 0}

	// Extract only the final user question for file_search_call.queries.
	question := finalUserInputText(req.Input)

	if !writeEvent(map[string]any{
		"type":            "response.created",
		"sequence_number": next(),
		"output_index":    0,
		"response": map[string]any{
			"id": responseID, "model": req.Model,
			"status": "in_progress", "created_at": createdAt,
		},
	}) {
		return
	}

	if !writeEvent(map[string]any{
		"type":            "response.content_part.added",
		"sequence_number": next(),
		"item_id":         msgID,
		"output_index":    1,
		"response":        emptyResp,
	}) {
		return
	}

	result, err := h.repo.HandleResponsesStream(streamCtx, params, req, func(delta string) {
		writeEvent(map[string]any{
			"type":            "response.output_text.delta",
			"sequence_number": next(),
			"item_id":         msgID,
			"output_index":    1,
			"delta":           delta,
			"response":        emptyResp,
		})
	})
	if streamWriteErr != nil {
		return
	}

	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) || errors.Is(streamCtx.Err(), context.DeadlineExceeded) {
			if streamWriteErr == nil {
				_ = sseData(w, flusher, map[string]any{"type": "error", "sequence_number": next(), "message": genericStreamingErrorMessage})
				_ = sseDone(w, flusher)
			}
			return
		}
		if streamCtx.Err() != nil || errors.Is(err, context.Canceled) {
			return
		}
		h.logger.Error("RAG streaming response failed",
			"namespace", params.Namespace,
			"db_secret_name", params.DBSecretName,
			"maas_secret_name", params.MaasSecretName,
			"error", sanitizeErrorForLog(err),
		)
		errorEvent := map[string]any{"type": "error", "sequence_number": next(), "message": genericStreamingErrorMessage}
		if errors.Is(err, vectordb.ErrDatabaseTimeout) {
			errorEvent["code"] = vectorDBTimeoutCode
			errorEvent["message"] = vectorDBTimeoutMessage
		} else if errors.Is(err, vectordb.ErrDatabaseUnavailable) {
			errorEvent["code"] = vectorDBUnavailableCode
			errorEvent["message"] = vectorDBUnavailableMessage
		}
		if !writeEvent(errorEvent) {
			return
		}
		if !writeDone() {
			return
		}
		return
	}

	if !writeEvent(map[string]any{
		"type":            "response.content_part.done",
		"sequence_number": next(),
		"item_id":         msgID,
		"output_index":    1,
		"response":        emptyResp,
	}) {
		return
	}

	if !writeEvent(map[string]any{
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
					"queries": []string{question}, "results": result.Sources, "output": "",
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
	}) {
		return
	}

	if !writeEvent(map[string]any{
		"type":            "response.metrics",
		"sequence_number": next(),
		"metrics": map[string]any{
			"latency_ms":             result.LatencyMs,
			"time_to_first_token_ms": result.FirstTokenMs,
			"usage": map[string]any{
				"input_tokens":  result.InputTokens,
				"output_tokens": result.OutputTokens,
				"total_tokens":  result.InputTokens + result.OutputTokens,
			},
		},
	}) {
		return
	}

	if !writeDone() {
		return
	}
}

func finalUserInputText(input []models.InputMessage) string {
	for i := len(input) - 1; i >= 0; i-- {
		if input[i].Role != "user" {
			continue
		}
		var question strings.Builder
		for _, content := range input[i].Content {
			if content.Type == "input_text" {
				question.WriteString(content.Text)
			}
		}
		return question.String()
	}
	return ""
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
	if errors.Is(err, maas.ErrMaaSResponseBodyLimit) {
		serviceUnavailableResponseWithMessage(h.logger, w, r, err, "MaaS response exceeded the supported size")
		return
	}
	if errors.Is(err, vectordb.ErrUnsupportedSearch) {
		badRequestResponse(h.logger, w, r, err.Error())
		return
	}
	if errors.Is(err, vectordb.ErrUnsupportedVectorDB) {
		badRequestResponse(h.logger, w, r, err.Error())
		return
	}
	if errors.Is(err, vectordb.ErrResultContentLimit) {
		serviceUnavailableResponseWithMessage(h.logger, w, r, err, "vector search results exceeded the supported size")
		return
	}
	if errors.Is(err, vectordb.ErrDatabaseTimeout) {
		serviceUnavailableResponseWithMessage(h.logger, w, r, err, vectorDBTimeoutMessage)
		return
	}
	if errors.Is(err, vectordb.ErrDatabaseUnavailable) {
		serviceUnavailableResponseWithMessage(h.logger, w, r, err, vectorDBUnavailableMessage)
		return
	}
	var maaSErr *maas.MaaSError
	if errors.As(err, &maaSErr) {
		switch maaSErr.Code {
		case maas.ErrCodeInvalidRequest:
			badRequestResponse(h.logger, w, r, "MaaS rejected the request")
		case maas.ErrCodeUnauthorized:
			unauthorizedResponse(h.logger, w, r, "MaaS authorization failed")
		case maas.ErrCodeForbidden:
			forbiddenResponse(h.logger, w, r, "MaaS access was forbidden")
		case maas.ErrCodeNotFound:
			notFoundResponse(h.logger, w, r)
		case maas.ErrCodeTimeout:
			serviceUnavailableResponseWithMessage(h.logger, w, r, err, "MaaS request timed out")
		case maas.ErrCodeServerUnavailable:
			serviceUnavailableResponseWithMessage(h.logger, w, r, err, "MaaS service temporarily unavailable")
		default:
			badGatewayResponseWithMessage(h.logger, w, r, err, "MaaS service returned an invalid response")
		}
		return
	}
	if errors.Is(err, context.DeadlineExceeded) {
		serviceUnavailableResponseWithMessage(h.logger, w, r, err, genericStreamingErrorMessage)
		return
	}
	serverErrorResponse(h.logger, w, r, err)
}
