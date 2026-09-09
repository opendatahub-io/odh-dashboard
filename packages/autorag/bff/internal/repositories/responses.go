package repositories

import (
	"context"
	"fmt"
	"log/slog"
	"strconv"
	"strings"

	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/maas"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/vectordb"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	openai "github.com/sashabaranov/go-openai"
)

// ResponsesParams holds the per-request parameters for the responses endpoint.
type ResponsesParams struct {
	Namespace          string
	VectorDbSecretName string
	MaasSecretName     string
}

// ResponsesRepository handles RAG query execution for the responses endpoint.
type ResponsesRepository struct {
	logger     *slog.Logger
	k8sService kubernetes.Service
}

func NewResponsesRepository(logger *slog.Logger, k8sService kubernetes.Service) *ResponsesRepository {
	return &ResponsesRepository{
		logger:     logger,
		k8sService: k8sService,
	}
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
	return maas.NewClient(baseURL, apiKey), nil
}

// resolveVectorDB fetches vector DB credentials from K8s and returns the VectorDB.
// DB type is auto-detected from secret key prefixes (MILVUS_URI → Milvus, PGVECTOR_HOST → pgvector).
func (r *ResponsesRepository) resolveVectorDB(ctx context.Context, namespace, secretName string) (vectordb.VectorDB, error) {
	secret, err := r.k8sService.GetSecret(ctx, namespace, secretName)
	if err != nil {
		return nil, fmt.Errorf("failed to get vector DB secret %q: %w", secretName, err)
	}
	db, err := vectordb.NewFromSecretData(ctx, secret.Data)
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
	for _, res := range results {
		chunks = append(chunks, models.SourceChunk{Text: res.Text, Score: res.Score})
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
	history []openai.ChatCompletionMessage,
	question string,
	sources []models.SourceChunk,
) []openai.ChatCompletionMessage {
	var contextParts []string
	for i, s := range sources {
		if contextTemplate != "" {
			part := strings.NewReplacer(
				"{document}", s.Text,
				"{doc_number}", strconv.Itoa(i+1),
			).Replace(contextTemplate)
			contextParts = append(contextParts, part)
		} else {
			contextParts = append(contextParts, fmt.Sprintf("Document %d:\n%s", i+1, s.Text))
		}
	}
	context := strings.Join(contextParts, "\n")

	var userContent string
	if userTemplate != "" {
		userContent = strings.NewReplacer(
			"{reference_documents}", context,
			"{question}", question,
		).Replace(userTemplate)
	} else if context != "" {
		userContent = context + "\n" + question
	} else {
		userContent = question
	}

	msgs := make([]openai.ChatCompletionMessage, 0, len(history)+2)

	if systemPrompt != "" {
		msgs = append(msgs, openai.ChatCompletionMessage{
			Role:    openai.ChatMessageRoleSystem,
			Content: systemPrompt,
		})
	}

	msgs = append(msgs, history...)

	msgs = append(msgs, openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleUser,
		Content: userContent,
	})

	return msgs
}

// extractHistoryAndQuestion converts the Responses API input into system prompt, history, and last user question.
// System messages are extracted separately so they are not duplicated in history.
// The last user turn is removed from history — buildMessages re-adds it with context injected.
func extractHistoryAndQuestion(input []models.InputMessage) (systemPrompt string, history []openai.ChatCompletionMessage, question string) {
	for _, msg := range input {
		text := ""
		for _, c := range msg.Content {
			if c.Type == "input_text" {
				text = c.Text
			}
		}
		switch msg.Role {
		case "system":
			systemPrompt = text
		case "user":
			question = text
			history = append(history, openai.ChatCompletionMessage{Role: openai.ChatMessageRoleUser, Content: text})
		case "assistant":
			history = append(history, openai.ChatCompletionMessage{Role: openai.ChatMessageRoleAssistant, Content: text})
		}
	}
	if len(history) > 0 && history[len(history)-1].Role == openai.ChatMessageRoleUser {
		history = history[:len(history)-1]
	}
	return systemPrompt, history, question
}

type ragContext struct {
	maasClient *maas.Client
	sources    []models.SourceChunk
	msgs       []openai.ChatCompletionMessage
	chatReq    maas.ChatRequest
}

// prepareRAGContext resolves credentials, does vector search, and assembles the chat messages.
func (r *ResponsesRepository) prepareRAGContext(ctx context.Context, params ResponsesParams, req *models.ResponsesRequest) (*ragContext, error) {
	embeddingModel := req.Metadata["embedding_model"]
	if embeddingModel == "" {
		return nil, fmt.Errorf("metadata.embedding_model is required")
	}

	maasClient, err := r.resolveMaasClient(ctx, params.Namespace, params.MaasSecretName)
	if err != nil {
		return nil, err
	}

	db, err := r.resolveVectorDB(ctx, params.Namespace, params.VectorDbSecretName)
	if err != nil {
		return nil, err
	}
	defer db.Close()

	var collection string
	var topK int = 5
	var alpha float32 = 0.5
	var hybrid bool
	for _, tool := range req.Tools {
		if tool.Type == "file_search" && len(tool.VectorStoreIDs) > 0 {
			collection = tool.VectorStoreIDs[0]
			if tool.MaxNumResults > 0 {
				topK = tool.MaxNumResults
			}
			if tool.RankingOptions.Ranker != "" {
				hybrid = true
				if tool.RankingOptions.Alpha > 0 {
					alpha = float32(tool.RankingOptions.Alpha)
				}
			}
			break
		}
	}
	if collection == "" {
		return nil, fmt.Errorf("no file_search tool with vector_store_ids found in request")
	}

	systemPrompt, history, question := extractHistoryAndQuestion(req.Input)
	if question == "" {
		return nil, fmt.Errorf("no user message found in input")
	}

	sources, err := r.ragSearch(ctx, maasClient, db, embeddingModel, question, collection, topK, alpha, hybrid)
	if err != nil {
		return nil, err
	}

	msgs := buildMessages(
		systemPrompt,
		req.Metadata["context_template_text"],
		req.Metadata["user_message_text"],
		history,
		question,
		sources,
	)

	maxTokens := req.MaxOutputTokens
	if maxTokens == 0 {
		maxTokens = 2048
	}

	return &ragContext{
		maasClient: maasClient,
		sources:    sources,
		msgs:       msgs,
		chatReq: maas.ChatRequest{
			Model:       req.Model,
			Messages:    msgs,
			Temperature: float32(req.Temperature),
			MaxTokens:   maxTokens,
		},
	}, nil
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
