package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/constants"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations/llamastack"
)

// QueryRequest represents the request body for querying documents
type QueryRequest struct {
	Content     string                      `json:"content"`
	VectorDBIDs []string                    `json:"vector_db_ids,omitempty"`
	QueryConfig llamastack.QueryConfigParam `json:"query_config,omitempty"`
	// Chat completion options (LLM model for generating responses)
	LLMModelID     string                     `json:"llm_model_id"`
	SamplingParams *llamastack.SamplingParams `json:"sampling_params,omitempty"`
	// System prompt for the chat completion
	SystemPrompt string `json:"system_prompt,omitempty"`
}

func (app *App) QueryHandler(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	client, ok := r.Context().Value(constants.LlamaStackHttpClientKey).(integrations.HTTPClientInterface)

	if !ok {
		app.serverErrorResponse(w, r, errors.New("REST client not found"))
		return
	}

	// Parse the request body
	var queryRequest QueryRequest
	if err := json.NewDecoder(r.Body).Decode(&queryRequest); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// Validate required fields
	if queryRequest.Content == "" {
		app.badRequestResponse(w, r, errors.New("content is required"))
		return
	}
	if queryRequest.LLMModelID == "" {
		app.badRequestResponse(w, r, errors.New("llm_model_id is required"))
		return
	}

	// Check if we should perform RAG query
	hasVectorDBs := len(queryRequest.VectorDBIDs) > 0
	var response llamastack.QueryEmbeddingModelResponse
	var hasRAGContent bool

	if hasVectorDBs {
		// Create default query configuration if not provided
		queryConfig := queryRequest.QueryConfig
		if queryConfig.MaxChunks == 0 {
			queryConfig.MaxChunks = 5 // Default value
		}
		if queryConfig.MaxTokensInContext == 0 {
			queryConfig.MaxTokensInContext = 1000 // Default value
		}
		if queryConfig.ChunkTemplate == "" {
			queryConfig.ChunkTemplate = "Result {index}\nContent: {chunk.content}\nMetadata: {metadata}\n" // Default template
		}

		// Create the query embedding model request
		queryEmbeddingModelRequest := llamastack.QueryEmbeddingModelRequest{
			Content:     queryRequest.Content,
			VectorDBIDs: queryRequest.VectorDBIDs,
			QueryConfig: queryConfig,
		}

		// Query the embedding model
		ragResponse, err := app.repositories.LlamaStackClient.QueryEmbeddingModel(client, queryEmbeddingModelRequest)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}
		response = ragResponse

		// Check if we have RAG content
		for _, contentItem := range response.Content {
			if contentItem.Type == "text" {
				hasRAGContent = true
				break
			}
		}
	}

	// Extract text content from the query response
	var contextText string
	for _, contentItem := range response.Content {
		if contentItem.Type == "text" {
			contextText += contentItem.Text + "\n"
		}
	}

	// Create messages for chat completion
	var messages []llamastack.ChatMessage

	// Determine system prompt - use provided one or fall back to default
	var systemPrompt string
	if queryRequest.SystemPrompt != "" {
		systemPrompt = queryRequest.SystemPrompt
	} else {
		systemPrompt = "You are a helpful assistant that explains concepts. If you have specific context about the topic, use it to provide accurate and concise answers."
	}

	if hasRAGContent {
		// Use RAG context if available
		messages = []llamastack.ChatMessage{
			{
				Role:    "system",
				Content: systemPrompt,
			},
			{
				Role:    "user",
				Content: fmt.Sprintf("Based on this context, answer the following question:\n\nContext:\n%s\n\nQuestion: %s", contextText, queryRequest.Content),
			},
		}
	} else {
		// No RAG content available, provide a general response
		messages = []llamastack.ChatMessage{
			{
				Role:    "system",
				Content: systemPrompt,
			},
			{
				Role:    "user",
				Content: fmt.Sprintf("Please explain: %s", queryRequest.Content),
			},
		}
	}

	// Use provided sampling params or defaults
	samplingParams := llamastack.SamplingParams{
		Strategy: llamastack.SamplingStrategy{
			Type: "greedy",
		},
		MaxTokens: 500,
	}
	if queryRequest.SamplingParams != nil {
		samplingParams = *queryRequest.SamplingParams
	}

	// Create chat completion request
	chatCompletionRequest := llamastack.ChatCompletionRequest{
		ModelID:        queryRequest.LLMModelID,
		Messages:       messages,
		SamplingParams: samplingParams,
	}

	// Generate chat completion
	chatResponse, err := app.repositories.LlamaStackClient.ChatCompletion(client, chatCompletionRequest)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Return consistent response format regardless of RAG usage
	combinedResponse := map[string]interface{}{
		"rag_response":      response,
		"chat_completion":   chatResponse,
		"has_rag_content":   hasRAGContent,
		"used_vector_dbs":   hasVectorDBs,
		"assistant_message": chatResponse.CompletionMessage.Content,
	}

	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(combinedResponse); err != nil {
		app.logger.Error("Failed to encode response", "error", err)
	}
}
