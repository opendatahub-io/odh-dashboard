package repositories

import (
	"bytes"
	"encoding/json"
	"fmt"

	"github.com/opendatahub-io/rag-playground/internal/integrations"
	"github.com/opendatahub-io/rag-playground/internal/integrations/llamastack"
)

const insertRagToolPath = "/v1/tool-runtime/rag-tool/insert"
const queryRagToolPath = "/v1/tool-runtime/rag-tool/query"
const chatCompletionPath = "/v1/inference/chat-completion"

// RAGToolInterface defines the interface for RAG tool operations
type RAGToolInterface interface {
	InsertDocuments(client integrations.HTTPClientInterface, request llamastack.DocumentInsertRequest) error
	QueryEmbeddingModel(client integrations.HTTPClientInterface, request llamastack.QueryEmbeddingModelRequest) (llamastack.QueryEmbeddingModelResponse, error)
	ChatCompletion(client integrations.HTTPClientInterface, request llamastack.ChatCompletionRequest) (llamastack.ChatCompletionResponse, error)
}

type UIRAGTool struct {
}

func (r UIRAGTool) InsertDocuments(client integrations.HTTPClientInterface, request llamastack.DocumentInsertRequest) error {
	jsonBody, err := json.Marshal(request)
	if err != nil {
		return fmt.Errorf("error marshaling request body: %w", err)
	}

	bodyReader := bytes.NewReader(jsonBody)
	response, err := client.POST(insertRagToolPath, bodyReader)
	if err != nil {
		return fmt.Errorf("failed to insert documents: %w", err)
	}
	fmt.Printf("Document insertion response: %s\n", string(response))

	return nil
}

func (r UIRAGTool) QueryEmbeddingModel(client integrations.HTTPClientInterface, request llamastack.QueryEmbeddingModelRequest) (response llamastack.QueryEmbeddingModelResponse, err error) {
	jsonBody, err := json.Marshal(request)
	if err != nil {
		return llamastack.QueryEmbeddingModelResponse{}, fmt.Errorf("error marshaling request body: %w", err)
	}

	bodyReader := bytes.NewReader(jsonBody)
	responseBody, err := client.POST(queryRagToolPath, bodyReader)
	if err != nil {
		return llamastack.QueryEmbeddingModelResponse{}, fmt.Errorf("failed to query embedding model: %w", err)
	}

	if err := json.Unmarshal(responseBody, &response); err != nil {
		return llamastack.QueryEmbeddingModelResponse{}, fmt.Errorf("error decoding response data: %w", err)
	}

	return response, nil
}

func (r UIRAGTool) ChatCompletion(client integrations.HTTPClientInterface, request llamastack.ChatCompletionRequest) (response llamastack.ChatCompletionResponse, err error) {
	jsonBody, err := json.Marshal(request)
	if err != nil {
		return llamastack.ChatCompletionResponse{}, fmt.Errorf("error marshaling request body: %w", err)
	}

	bodyReader := bytes.NewReader(jsonBody)
	responseBody, err := client.POST(chatCompletionPath, bodyReader)
	if err != nil {
		return llamastack.ChatCompletionResponse{}, fmt.Errorf("failed to complete chat: %w", err)
	}

	if err := json.Unmarshal(responseBody, &response); err != nil {
		return llamastack.ChatCompletionResponse{}, fmt.Errorf("error decoding response data: %w", err)
	}

	return response, nil
}
