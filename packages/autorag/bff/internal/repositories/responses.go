package repositories

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/openai/openai-go"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/maas"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/vectordb"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

// maxTopK bounds max_num_results so a caller-controlled value can't drive an
// unbounded LIMIT/allocation in the vector DB search.
const maxTopK = 100

const (
	ResponsesExecutionTimeout    = 2 * time.Minute
	ResponsesWriteTimeout        = ResponsesExecutionTimeout + 10*time.Second
	maxRAGContextBytes           = 4 << 20
	defaultResponsesOutputTokens = 2048
)

const responsesInstructionsSeparator = "\n\n"

var ErrInvalidResponsesRequest = errors.New("invalid Responses API request")

// validVectorStoreID accepts logical vector store IDs. Hyphens and dots are
// canonicalized before they reach a vector DB adapter. Logical names that
// canonicalize to the same ID cannot coexist.
var validVectorStoreID = regexp.MustCompile(`^[A-Za-z0-9_.-]+$`)

func ValidVectorStoreID(value string) bool { return validVectorStoreID.MatchString(value) }

func VectorStoreIDPattern() string { return validVectorStoreID.String() }

// ResponsesParams holds the per-request parameters for the responses endpoint.
type ResponsesParams struct {
	Namespace      string
	DBSecretName   string
	MaasSecretName string
}

// ResponsesRepository handles RAG query execution for the responses endpoint.
type ResponsesRepository struct {
	logger        *slog.Logger
	k8sService    kubernetes.Service
	urlForwarder  URLForwarder
	newMaaSClient maas.ClientFactory
	newVectorDB   func(context.Context, map[string][]byte, func(context.Context, string) (string, error)) (vectordb.VectorDB, error)
}

// URLForwarder rewrites a URL to a locally forwarded endpoint when applicable.
// The concrete implementation is only supplied for local development.
type URLForwarder interface {
	ForwardURL(context.Context, string, string) (string, error)
}

type forwardedVectorDBData struct {
	data map[string][]byte
}

func NewResponsesRepository(logger *slog.Logger, k8sService kubernetes.Service, forwarders ...URLForwarder) *ResponsesRepository {
	return newResponsesRepository(logger, k8sService, nil, forwarders...)
}

// NewResponsesRepositoryWithMaaSClientFactory injects the configured MaaS
// client factory used by the application for per-secret Responses requests.
func NewResponsesRepositoryWithMaaSClientFactory(logger *slog.Logger, k8sService kubernetes.Service, newMaaSClient maas.ClientFactory, forwarders ...URLForwarder) *ResponsesRepository {
	return newResponsesRepository(logger, k8sService, newMaaSClient, forwarders...)
}

func newResponsesRepository(logger *slog.Logger, k8sService kubernetes.Service, newMaaSClient maas.ClientFactory, forwarders ...URLForwarder) *ResponsesRepository {
	var urlForwarder URLForwarder
	if len(forwarders) > 0 {
		urlForwarder = forwarders[0]
	}
	return &ResponsesRepository{
		logger:        logger,
		k8sService:    k8sService,
		urlForwarder:  urlForwarder,
		newMaaSClient: newMaaSClient,
		newVectorDB:   vectordb.NewFromSecretDataWithForwarder,
	}
}

func classifyForwardingError(requestCtx, operationCtx context.Context, err error) error {
	_, hasOperationDeadline := operationCtx.Deadline()
	if errors.Is(err, context.DeadlineExceeded) && requestCtx.Err() == nil && hasOperationDeadline {
		return fmt.Errorf("%w: %w", vectordb.ErrDatabaseTimeout, err)
	}
	return err
}

func (r *ResponsesRepository) forwardVectorDBEndpoint(requestCtx, operationCtx context.Context, namespace string, data map[string][]byte) (forwardedVectorDBData, error) {
	rawURI, ok := data["MILVUS_URI"]
	if !ok || strings.TrimSpace(string(rawURI)) == "" {
		return forwardedVectorDBData{data: data}, nil
	}

	uri := strings.TrimSpace(string(rawURI))
	if err := vectordb.ValidateMilvusEndpoint(uri); err != nil {
		return forwardedVectorDBData{}, fmt.Errorf("invalid Milvus endpoint: %w", err)
	}
	if r.urlForwarder == nil {
		return forwardedVectorDBData{data: data}, nil
	}
	forwardedURI, err := r.urlForwarder.ForwardURL(operationCtx, namespace, uri)
	if err != nil {
		return forwardedVectorDBData{}, fmt.Errorf("failed to forward Milvus endpoint: %w", classifyForwardingError(requestCtx, operationCtx, err))
	}
	if forwardedURI == uri {
		return forwardedVectorDBData{data: data}, nil
	}
	if err := vectordb.ValidateForwardedMilvusEndpoint(uri, forwardedURI); err != nil {
		return forwardedVectorDBData{}, fmt.Errorf("invalid forwarded Milvus endpoint: %w", err)
	}

	forwardedData := make(map[string][]byte, len(data))
	for key, value := range data {
		forwardedData[key] = value
	}
	forwardedData["MILVUS_URI"] = []byte(forwardedURI)
	return forwardedVectorDBData{data: forwardedData}, nil
}

// resolveMaasClient fetches MaaS credentials from K8s and returns a configured client.
func (r *ResponsesRepository) resolveMaasClient(ctx context.Context, namespace, secretName string) (*maas.Client, error) {
	secret, err := r.k8sService.GetSecret(ctx, namespace, secretName)
	if err != nil {
		return nil, fmt.Errorf("failed to get MaaS secret %q: %w", secretName, err)
	}
	baseURL := strings.TrimSpace(string(secret.Data["MAAS_BASE_URL"]))
	apiKey := strings.TrimSpace(string(secret.Data["MAAS_API_KEY"]))
	if baseURL == "" {
		return nil, fmt.Errorf("MaaS secret %q missing MAAS_BASE_URL", secretName)
	}
	if apiKey == "" {
		return nil, fmt.Errorf("MaaS secret %q missing MAAS_API_KEY", secretName)
	}
	validatedURL, err := maas.ValidateBaseURL(baseURL)
	if err != nil {
		return nil, fmt.Errorf("invalid MaaS base URL: %w", err)
	}
	if r.newMaaSClient == nil {
		return nil, errors.New("MaaS client factory is not configured")
	}
	client, err := r.newMaaSClient(validatedURL.String(), apiKey)
	if err != nil {
		return nil, err
	}
	return client, nil
}

// resolveVectorDB fetches vector DB credentials from K8s and returns the VectorDB.
// DB type is auto-detected from secret key prefixes (MILVUS_URI → Milvus, PGVECTOR_HOST → pgvector).
func (r *ResponsesRepository) resolveVectorDB(ctx context.Context, namespace, secretName string) (vectordb.VectorDB, error) {
	secret, err := r.k8sService.GetSecret(ctx, namespace, secretName)
	if err != nil {
		return nil, fmt.Errorf("failed to get vector DB secret %q: %w", secretName, err)
	}

	if _, isMilvus := secret.Data["MILVUS_URI"]; isMilvus {
		operationCtx, cancel := context.WithTimeout(ctx, vectordb.MilvusOperationTimeout)
		defer cancel()
		newVectorDB := r.newVectorDB
		if newVectorDB == nil {
			newVectorDB = vectordb.NewFromSecretDataWithForwarder
		}
		var forwardURL func(context.Context, string) (string, error)
		if r.urlForwarder != nil {
			forwardURL = func(forwardCtx context.Context, uri string) (string, error) {
				forwardedURI, forwardErr := r.urlForwarder.ForwardURL(forwardCtx, namespace, uri)
				if forwardErr != nil {
					return "", fmt.Errorf("failed to forward Milvus endpoint: %w", classifyForwardingError(ctx, operationCtx, forwardErr))
				}
				return forwardedURI, nil
			}
		}
		// The Milvus adapter owns the connection timeout. Passing the request
		// context here avoids nesting an equal deadline and misclassifying the
		// adapter's timeout as request cancellation.
		db, err := newVectorDB(ctx, secret.Data, forwardURL)
		if err != nil {
			return nil, fmt.Errorf("failed to connect to vector DB from secret %q: %w", secretName, err)
		}
		return db, nil
	}

	forwarded, err := r.forwardVectorDBEndpoint(ctx, ctx, namespace, secret.Data)
	if err != nil {
		return nil, err
	}

	newVectorDB := r.newVectorDB
	if newVectorDB == nil {
		newVectorDB = vectordb.NewFromSecretDataWithForwarder
	}
	db, err := newVectorDB(ctx, forwarded.data, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to vector DB from secret %q: %w", secretName, err)
	}
	return db, nil
}

// sanitizeCollection normalises a vector store ID for use as a Milvus collection or pgvector table name.
func sanitizeCollection(id string) string {
	return strings.NewReplacer("-", "_", ".", "_").Replace(id)
}

// ragSearch embeds the query and searches the vector DB, returning source chunks.
func (r *ResponsesRepository) ragSearch(
	ctx context.Context,
	maasClient *maas.Client,
	db vectordb.VectorDB,
	embeddingModel, query, collection string,
	topK int,
	alpha float32,
	hybrid bool,
) ([]models.SourceChunk, error) {
	vec, err := maasClient.Embed(ctx, embeddingModel, query)
	if err != nil {
		return nil, fmt.Errorf("embedding failed: %w", err)
	}

	results, err := db.Search(ctx, sanitizeCollection(collection), vec, query, topK, alpha, hybrid)
	if err != nil {
		return nil, fmt.Errorf("vector search failed: %w", err)
	}

	chunks := make([]models.SourceChunk, 0, len(results))
	contextBytes := 0
	for _, res := range results {
		contextBytes += len(res.Text)
		if contextBytes > maxRAGContextBytes {
			return nil, errors.New("retrieved context exceeds the maximum supported size")
		}
		chunks = append(chunks, models.SourceChunk{Text: res.Text, Score: res.Score, FileID: res.ID})
	}
	return chunks, nil
}

// buildMessages assembles Chat Completions messages:
//  1. system message (from input, if present)
//  2. conversation history (all prior turns except the last user turn)
//  3. user message = context chunks (formatted via contextTemplate) concatenated with the question,
//     optionally wrapped by userTemplate ({reference_documents} and {question} placeholders)
func buildMessages(
	systemPrompt, contextTemplate, userTemplate string,
	history []openai.ChatCompletionMessageParamUnion,
	question string,
	sources []models.SourceChunk,
) ([]openai.ChatCompletionMessageParamUnion, error) {
	var contextBuilder strings.Builder
	for i, s := range sources {
		if contextBuilder.Len() > 0 {
			if err := appendBoundedString(&contextBuilder, "\n", maxRAGContextBytes); err != nil {
				return nil, err
			}
		}
		if contextTemplate != "" {
			if err := appendBoundedTemplate(&contextBuilder, contextTemplate, map[string]string{
				"{document}":   s.Text,
				"{doc_number}": strconv.Itoa(i + 1),
			}, maxRAGContextBytes); err != nil {
				return nil, errors.New("assembled retrieval context exceeds the maximum supported size")
			}
		} else {
			if err := appendBoundedTemplate(&contextBuilder, fmt.Sprintf("Document %d:\n", i+1), nil, maxRAGContextBytes); err != nil {
				return nil, errors.New("assembled retrieval context exceeds the maximum supported size")
			}
			if err := appendBoundedTemplate(&contextBuilder, s.Text, nil, maxRAGContextBytes); err != nil {
				return nil, errors.New("assembled retrieval context exceeds the maximum supported size")
			}
		}
	}
	context := contextBuilder.String()

	var userBuilder strings.Builder
	if userTemplate != "" {
		if err := appendBoundedTemplate(&userBuilder, userTemplate, map[string]string{
			"{reference_documents}": context,
			"{question}":            question,
		}, maxRAGContextBytes); err != nil {
			return nil, errors.New("assembled user context exceeds the maximum supported size")
		}
	} else if context != "" {
		if err := appendBoundedTemplate(&userBuilder, context+"\n", nil, maxRAGContextBytes); err != nil {
			return nil, errors.New("assembled user context exceeds the maximum supported size")
		}
		if err := appendBoundedTemplate(&userBuilder, question, nil, maxRAGContextBytes); err != nil {
			return nil, errors.New("assembled user context exceeds the maximum supported size")
		}
	} else {
		if err := appendBoundedTemplate(&userBuilder, question, nil, maxRAGContextBytes); err != nil {
			return nil, errors.New("assembled user context exceeds the maximum supported size")
		}
	}
	userContent := userBuilder.String()

	msgs := make([]openai.ChatCompletionMessageParamUnion, 0, len(history)+2)

	if systemPrompt != "" {
		msgs = append(msgs, openai.SystemMessage(systemPrompt))
	}

	msgs = append(msgs, history...)

	msgs = append(msgs, openai.UserMessage(userContent))

	return msgs, nil
}

func appendBoundedString(builder *strings.Builder, value string, limit int) error {
	if len(value) > limit-builder.Len() {
		return errors.New("bounded string exceeds limit")
	}
	builder.WriteString(value)
	return nil
}

// appendBoundedTemplate substitutes one placeholder at a time so repeated
// placeholders cannot allocate an oversized intermediate string.
func appendBoundedTemplate(builder *strings.Builder, template string, substitutions map[string]string, limit int) error {
	for len(template) > 0 {
		matchStart := len(template)
		match := ""
		for placeholder := range substitutions {
			if index := strings.Index(template, placeholder); index >= 0 && index < matchStart {
				matchStart = index
				match = placeholder
			}
		}
		if match == "" {
			return appendBoundedString(builder, template, limit)
		}
		if err := appendBoundedString(builder, template[:matchStart], limit); err != nil {
			return err
		}
		if err := appendBoundedString(builder, substitutions[match], limit); err != nil {
			return err
		}
		template = template[matchStart+len(match):]
	}
	return nil
}

// extractHistoryAndQuestion converts the Responses API input into system prompt, history, and last user question.
// System messages are extracted separately so they are not duplicated in history.
// The last user turn is removed from history — buildMessages re-adds it with context injected.
//
// maxHistoryUserMessages caps how many past user turns are kept; the system prompt is
// tracked separately from history so capping never drops it.
const maxHistoryUserMessages = 10

func extractHistoryAndQuestion(
	input []models.InputMessage,
) (systemPrompt string, history []openai.ChatCompletionMessageParamUnion, question string) {
	for _, msg := range input {
		text := ""
		for _, c := range msg.Content {
			if c.Type == "input_text" || (msg.Role == "assistant" && c.Type == "output_text") {
				text += c.Text
			}
		}
		switch msg.Role {
		case "system":
			systemPrompt = text
		case "user":
			question = text
			history = append(history, openai.UserMessage(text))
		case "assistant":
			history = append(history, openai.AssistantMessage(text))
		}
	}
	if len(history) > 0 && history[len(history)-1].OfUser != nil {
		history = history[:len(history)-1]
	}
	history = capHistory(history, maxHistoryUserMessages)
	return systemPrompt, history, question
}

// lastNonSystemMessageIsUser reports whether the last non-system input
// message is a user message. Trailing system messages are allowed, but input
// that ends on an assistant turn has no pending question — without this
// check, extractHistoryAndQuestion would silently re-ask the previous user
// message as the new question.
func lastNonSystemMessageIsUser(input []models.InputMessage) bool {
	for i := len(input) - 1; i >= 0; i-- {
		if input[i].Role == "system" {
			continue
		}
		return input[i].Role == "user"
	}
	return false
}

// mergeInstructions combines the request-level instructions with the system
// message extracted from input. Request instructions come first so callers can
// shape the input system message without overriding the deployment's prompt.
func mergeInstructions(instructions, systemPrompt string) string {
	if instructions == "" {
		return systemPrompt
	}
	if systemPrompt == "" {
		return instructions
	}
	return instructions + responsesInstructionsSeparator + systemPrompt
}

// capHistory keeps only the most recent maxUserMessages user turns (and any
// assistant replies interleaved with them), dropping older turns from the front.
// A "turn" spans from one user message up to (but not including) the next.
func capHistory(history []openai.ChatCompletionMessageParamUnion, maxUserMessages int) []openai.ChatCompletionMessageParamUnion {
	var userIdx []int
	for i, m := range history {
		if m.OfUser != nil {
			userIdx = append(userIdx, i)
		}
	}
	if len(userIdx) <= maxUserMessages {
		return history
	}
	toDrop := len(userIdx) - maxUserMessages
	return history[userIdx[toDrop]:]
}

type ragContext struct {
	maasClient *maas.Client
	sources    []models.SourceChunk
	msgs       []openai.ChatCompletionMessageParamUnion
	chatReq    maas.ChatRequest
}

// parseFileSearchTool extracts and validates the file_search tool's vector store
// target and search parameters from the request. It fails fast on a malformed
// request before any credential resolution or vector DB connection is attempted.
func parseFileSearchTool(req *models.ResponsesRequest) (collection string, topK int, alpha float32, hybrid bool, err error) {
	topK = 5
	alpha = 0.5
	fileSearchTools := 0
	for _, tool := range req.Tools {
		if tool.Type != "file_search" {
			continue
		}
		fileSearchTools++
		if fileSearchTools > 1 {
			return "", 0, 0, false, fmt.Errorf("%w: more than one file_search tool is not supported", ErrInvalidResponsesRequest)
		}
		if len(tool.VectorStoreIDs) == 0 {
			continue
		}
		if len(tool.VectorStoreIDs) > 1 {
			return "", 0, 0, false, fmt.Errorf("%w: more than one vector_store_id is not supported", ErrInvalidResponsesRequest)
		}
		for _, id := range tool.VectorStoreIDs {
			if !validVectorStoreID.MatchString(id) {
				return "", 0, 0, false, fmt.Errorf("invalid vector_store_ids value %q: must match %s", id, validVectorStoreID.String())
			}
		}
		collection = tool.VectorStoreIDs[0]
		if tool.MaxNumResults < 0 {
			return "", 0, 0, false, fmt.Errorf("max_num_results %d must be between 0 and %d", tool.MaxNumResults, maxTopK)
		}
		if tool.MaxNumResults > 0 {
			if tool.MaxNumResults > maxTopK {
				return "", 0, 0, false, fmt.Errorf("max_num_results %d exceeds maximum of %d", tool.MaxNumResults, maxTopK)
			}
			topK = tool.MaxNumResults
		}
		if tool.RankingOptions.Ranker != "" {
			if tool.RankingOptions.Ranker != "rrf" {
				return "", 0, 0, false, fmt.Errorf("ranking_options.ranker %q is unsupported; only rrf is supported for hybrid search", tool.RankingOptions.Ranker)
			}
			hybrid = true
			if tool.RankingOptions.Alpha != nil {
				if *tool.RankingOptions.Alpha < 0 || *tool.RankingOptions.Alpha > 1 {
					return "", 0, 0, false, fmt.Errorf("ranking_options.alpha %v must be between 0 and 1", *tool.RankingOptions.Alpha)
				}
				alpha = float32(*tool.RankingOptions.Alpha)
			}
		} else if tool.RankingOptions.Alpha != nil {
			return "", 0, 0, false, fmt.Errorf("ranking_options.alpha requires ranking_options.ranker")
		}
	}
	if collection == "" {
		return "", 0, 0, false, fmt.Errorf("no file_search tool with vector_store_ids found in request")
	}
	return sanitizeCollection(collection), topK, alpha, hybrid, nil
}

// ValidateResponsesRequest contains only caller-controlled validation. It is
// safe to run before resolving credentials or contacting external services.
func ValidateResponsesRequest(req *models.ResponsesRequest) error {
	if strings.TrimSpace(req.Metadata["embedding_model"]) == "" {
		return fmt.Errorf("%w: metadata.embedding_model is required", ErrInvalidResponsesRequest)
	}
	if _, _, question := extractHistoryAndQuestion(req.Input); strings.TrimSpace(question) == "" {
		return fmt.Errorf("%w: no user message found in input", ErrInvalidResponsesRequest)
	}
	if !lastNonSystemMessageIsUser(req.Input) {
		return fmt.Errorf("%w: last non-system input message must be a user message", ErrInvalidResponsesRequest)
	}
	if _, _, _, _, err := parseFileSearchTool(req); err != nil {
		return fmt.Errorf("%w: %s", ErrInvalidResponsesRequest, err)
	}
	if req.Temperature != nil {
		if math.IsNaN(*req.Temperature) || math.IsInf(*req.Temperature, 0) || *req.Temperature < 0 || *req.Temperature > 2 {
			return fmt.Errorf("%w: temperature must be between 0 and 2", ErrInvalidResponsesRequest)
		}
	}
	return nil
}

// prepareRAGContext resolves credentials, does vector search, and assembles the chat messages.
func (r *ResponsesRepository) prepareRAGContext(ctx context.Context, params ResponsesParams, req *models.ResponsesRequest) (*ragContext, error) {
	embeddingModel := req.Metadata["embedding_model"]
	if embeddingModel == "" {
		return nil, fmt.Errorf("metadata.embedding_model is required")
	}

	collection, topK, alpha, hybrid, err := parseFileSearchTool(req)
	if err != nil {
		return nil, err
	}

	systemPrompt, history, question := extractHistoryAndQuestion(req.Input)
	systemPrompt = mergeInstructions(req.Instructions, systemPrompt)

	maasClient, err := r.resolveMaasClient(ctx, params.Namespace, params.MaasSecretName)
	if err != nil {
		return nil, err
	}

	db, err := r.resolveVectorDB(ctx, params.Namespace, params.DBSecretName)
	if err != nil {
		return nil, err
	}
	defer db.Close()

	sources, err := r.ragSearch(ctx, maasClient, db, embeddingModel, question, collection, topK, alpha, hybrid)
	if err != nil {
		return nil, err
	}

	msgs, err := buildMessages(
		systemPrompt,
		req.Metadata["context_template_text"],
		req.Metadata["user_message_text"],
		history,
		question,
		sources,
	)
	if err != nil {
		return nil, err
	}

	maxTokens := req.MaxOutputTokens
	if maxTokens == 0 {
		maxTokens = defaultResponsesOutputTokens
	}

	return &ragContext{
		maasClient: maasClient,
		sources:    sources,
		msgs:       msgs,
		chatReq: maas.ChatRequest{
			Model:    req.Model,
			Messages: msgs,
			Temperature: func() *float32 {
				if req.Temperature == nil {
					return nil
				}
				value := float32(*req.Temperature)
				return &value
			}(),
			MaxTokens: maxTokens,
		},
	}, nil
}

// ValidateResponses checks backend capabilities before a streaming response commits its SSE headers.
// It validates MaaS configuration and database search capabilities without executing a search.
// In local development it may establish a cached port-forward for Milvus.
func (r *ResponsesRepository) ValidateResponses(ctx context.Context, params ResponsesParams, req *models.ResponsesRequest) error {
	_, _, _, hybrid, err := parseFileSearchTool(req)
	if err != nil {
		return err
	}

	if _, err := r.resolveMaasClient(ctx, params.Namespace, params.MaasSecretName); err != nil {
		return err
	}

	secret, err := r.k8sService.GetSecret(ctx, params.Namespace, params.DBSecretName)
	if err != nil {
		return fmt.Errorf("failed to get database secret %q: %w", params.DBSecretName, err)
	}
	validationCtx := ctx
	if _, isMilvus := secret.Data["MILVUS_URI"]; isMilvus {
		var cancel context.CancelFunc
		validationCtx, cancel = context.WithTimeout(ctx, vectordb.MilvusOperationTimeout)
		defer cancel()
	}
	forwarded, err := r.forwardVectorDBEndpoint(ctx, validationCtx, params.Namespace, secret.Data)
	if err != nil {
		return err
	}
	return vectordb.ValidateSearchOptions(forwarded.data, hybrid)
}

// HandleResponses processes a non-streaming RAG request.
func (r *ResponsesRepository) HandleResponses(ctx context.Context, params ResponsesParams, req *models.ResponsesRequest) (*models.RAGResponse, error) {
	rc, err := r.prepareRAGContext(ctx, params, req)
	if err != nil {
		return nil, err
	}
	resp, err := rc.maasClient.ChatComplete(ctx, rc.chatReq)
	if err != nil {
		return nil, fmt.Errorf("MaaS chat completion failed: %w", err)
	}
	return &models.RAGResponse{Answer: resp.Answer, Sources: rc.sources}, nil
}

// HandleResponsesStream processes a streaming RAG request, calling onDelta for each text token.
func (r *ResponsesRepository) HandleResponsesStream(ctx context.Context, params ResponsesParams, req *models.ResponsesRequest, onDelta func(string)) (*models.RAGStreamResult, error) {
	rc, err := r.prepareRAGContext(ctx, params, req)
	if err != nil {
		return nil, err
	}
	sr, err := rc.maasClient.ChatCompleteStreamWithCallback(ctx, rc.chatReq, onDelta)
	if err != nil {
		return nil, fmt.Errorf("MaaS streaming failed: %w", err)
	}
	return &models.RAGStreamResult{
		Answer:       sr.FullAnswer,
		Sources:      rc.sources,
		InputTokens:  sr.InputTokens,
		OutputTokens: sr.OutputTokens,
		LatencyMs:    sr.TotalMs,
		FirstTokenMs: sr.FirstTokenMs,
	}, nil
}
