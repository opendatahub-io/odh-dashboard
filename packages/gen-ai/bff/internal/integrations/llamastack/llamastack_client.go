package llamastack

import (
	"context"
	"fmt"
	"io"
	"os"
	"strings"

	"github.com/openai/openai-go/v2"
	"github.com/openai/openai-go/v2/option"
	"github.com/openai/openai-go/v2/packages/ssestream"
	"github.com/openai/openai-go/v2/responses"
)

// LlamaStackClient wraps the OpenAI client for Llama Stack communication.
type LlamaStackClient struct {
	client *openai.Client
}

// NewLlamaStackClient creates a new client configured for Llama Stack.
func NewLlamaStackClient(baseURL string) *LlamaStackClient {
	client := openai.NewClient(
		option.WithBaseURL(baseURL+"/v1/openai/v1"),
		option.WithAPIKey("none"),
	)

	return &LlamaStackClient{
		client: &client,
	}
}

// ListModels retrieves all available models from Llama Stack.
func (c *LlamaStackClient) ListModels(ctx context.Context) ([]openai.Model, error) {
	modelsPage, err := c.client.Models.List(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list models: %w", err)
	}
	return modelsPage.Data, nil
}

// ListVectorStoresParams contains parameters for listing vector stores.
type ListVectorStoresParams struct {
	// Limit specifies the number of objects to return (range: 1-100, default: 20).
	Limit *int64
	// Order specifies the sort order by created_at timestamp ("asc" or "desc").
	Order string
}

// ListFilesParams contains parameters for listing files.
type ListFilesParams struct {
	// Limit specifies the number of objects to return (range: 1-10000, default: 20).
	Limit *int64
	// Order specifies the sort order by created_at timestamp ("asc" or "desc").
	Order string
	// Purpose specifies the intended use case to filter by.
	Purpose string
}

// ListVectorStoreFilesParams contains parameters for listing files in a vector store.
type ListVectorStoreFilesParams struct {
	// Limit specifies the number of objects to return (range: 1-100, default: 20).
	Limit *int64
	// Order specifies the sort order by created_at timestamp ("asc" or "desc").
	Order string
	// Filter specifies the filter on file status ("in_progress", "completed", "failed", "cancelled").
	Filter string
}

// ListVectorStores retrieves vector stores with optional filtering parameters.
func (c *LlamaStackClient) ListVectorStores(ctx context.Context, params ListVectorStoresParams) ([]openai.VectorStore, error) {
	apiParams := openai.VectorStoreListParams{}

	if params.Limit != nil {
		if *params.Limit < 1 || *params.Limit > 100 {
			return nil, fmt.Errorf("limit must be between 1 and 100, got: %d", *params.Limit)
		}
		apiParams.Limit = openai.Int(*params.Limit)
	}

	if params.Order != "" {
		if params.Order != "asc" && params.Order != "desc" {
			return nil, fmt.Errorf("order must be 'asc' or 'desc', got: %s", params.Order)
		}
		apiParams.Order = openai.VectorStoreListParamsOrder(params.Order)
	}

	vectorStoresPage, err := c.client.VectorStores.List(ctx, apiParams)
	if err != nil {
		return nil, fmt.Errorf("failed to list vector stores: %w", err)
	}

	return vectorStoresPage.Data, nil
}

// CreateVectorStoreParams contains parameters for creating vector stores.
type CreateVectorStoreParams struct {
	// Name is the required name for the vector store (1-256 characters).
	Name string
	// Metadata contains optional key-value pairs (max 16 pairs, keys ≤64 chars, values ≤512 chars).
	Metadata map[string]string
}

// CreateVectorStore creates a new vector store with the specified parameters.
func (c *LlamaStackClient) CreateVectorStore(ctx context.Context, params CreateVectorStoreParams) (*openai.VectorStore, error) {
	// Validate required fields first
	if strings.TrimSpace(params.Name) == "" {
		return nil, fmt.Errorf("name is required")
	}

	apiParams := openai.VectorStoreNewParams{}

	// Validate name length and set parameter
	if len(params.Name) > 256 {
		return nil, fmt.Errorf("name must be ≤256 characters, got: %d", len(params.Name))
	}
	apiParams.Name = openai.String(params.Name)

	if len(params.Metadata) > 0 {
		if len(params.Metadata) > 16 {
			return nil, fmt.Errorf("metadata can have max 16 key-value pairs, got: %d", len(params.Metadata))
		}

		for k, v := range params.Metadata {
			if len(k) > 64 {
				return nil, fmt.Errorf("metadata key '%s' exceeds 64 chars", k)
			}
			if len(v) > 512 {
				return nil, fmt.Errorf("metadata value for '%s' exceeds 512 chars", k)
			}
		}
		apiParams.Metadata = params.Metadata
	}

	vectorStore, err := c.client.VectorStores.New(ctx, apiParams)
	if err != nil {
		return nil, fmt.Errorf("failed to create vector store: %w", err)
	}

	return vectorStore, nil
}

// ChunkingStrategy represents chunking configuration for file processing.
type ChunkingStrategy struct {
	// Type specifies the chunking strategy type ("auto" or "static").
	Type string `json:"type"`
	// Static contains configuration for static chunking (only used when Type is "static").
	Static *StaticChunkingConfig `json:"static,omitempty"`
}

// StaticChunkingConfig represents static chunking parameters.
type StaticChunkingConfig struct {
	// MaxChunkSizeTokens specifies the maximum tokens per chunk.
	MaxChunkSizeTokens int `json:"max_chunk_size_tokens"`
	// ChunkOverlapTokens specifies the token overlap between chunks.
	ChunkOverlapTokens int `json:"chunk_overlap_tokens"`
}

// UploadFileParams contains parameters for file upload operations.
type UploadFileParams struct {
	// FilePath is the path to the file to upload (use this OR Reader+Filename).
	FilePath string
	// Reader provides file content for direct streaming (use this OR FilePath).
	Reader io.Reader
	// Filename is required when using Reader (ignored when using FilePath).
	Filename string
	// ContentType is optional when using Reader (auto-detected if empty).
	ContentType string
	// Purpose specifies the intended use case (optional, defaults to "assistants").
	// Valid values: "assistants", "batch", "fine-tune", "vision", "user_data", "evals".
	Purpose string
	// VectorStoreID specifies the vector store to add the file to after upload (optional).
	VectorStoreID string
	// ChunkingStrategy specifies how to chunk the file when adding to vector store (optional).
	ChunkingStrategy *ChunkingStrategy
}

// FileUploadResult contains the result of a file upload operation.
type FileUploadResult struct {
	FileID          string                  `json:"file_id"`
	VectorStoreFile *openai.VectorStoreFile `json:"vector_store_file,omitempty"`
}

// UploadFile uploads a file with optional parameters and optionally adds to vector store
func (c *LlamaStackClient) UploadFile(ctx context.Context, params UploadFileParams) (*FileUploadResult, error) {
	var apiParams openai.FileNewParams

	// Handle both streaming and file path approaches
	if params.Reader != nil {
		// Direct streaming approach
		if params.Filename == "" {
			return nil, fmt.Errorf("filename is required when using Reader")
		}
		apiParams.File = openai.File(params.Reader, params.Filename, params.ContentType)
	} else if params.FilePath != "" {
		// File path approach
		file, err := os.Open(params.FilePath)
		if err != nil {
			return nil, fmt.Errorf("failed to open file: %w", err)
		}
		defer file.Close()
		apiParams.File = openai.File(file, params.FilePath, "")
	} else {
		return nil, fmt.Errorf("either FilePath or Reader+Filename must be provided")
	}

	purpose := params.Purpose
	if purpose == "" {
		purpose = "assistants"
	}

	validPurposes := []string{"assistants", "batch", "fine-tune", "vision", "user_data", "evals"}
	purposeValid := false
	for _, valid := range validPurposes {
		if purpose == valid {
			purposeValid = true
			break
		}
	}
	if !purposeValid {
		return nil, fmt.Errorf("purpose must be one of %v, got: %s", validPurposes, purpose)
	}
	apiParams.Purpose = openai.FilePurpose(purpose)

	uploadedFile, err := c.client.Files.New(ctx, apiParams)
	if err != nil {
		return nil, fmt.Errorf("failed to upload file: %w", err)
	}

	result := &FileUploadResult{
		FileID: uploadedFile.ID,
	}

	// If vector store ID is provided, add file to vector store
	if params.VectorStoreID != "" {
		vectorStoreFileParams := openai.VectorStoreFileNewParams{
			FileID: uploadedFile.ID,
		}

		// Add chunking strategy if provided
		if params.ChunkingStrategy != nil {
			if params.ChunkingStrategy.Type == "auto" {
				autoStrategy := openai.NewAutoFileChunkingStrategyParam()
				vectorStoreFileParams.ChunkingStrategy = openai.FileChunkingStrategyParamUnion{
					OfAuto: &autoStrategy,
				}
			} else if params.ChunkingStrategy.Type == "static" && params.ChunkingStrategy.Static != nil {
				vectorStoreFileParams.ChunkingStrategy = openai.FileChunkingStrategyParamOfStatic(
					openai.StaticFileChunkingStrategyParam{
						MaxChunkSizeTokens: int64(params.ChunkingStrategy.Static.MaxChunkSizeTokens),
						ChunkOverlapTokens: int64(params.ChunkingStrategy.Static.ChunkOverlapTokens),
					},
				)
			}
		}

		vectorStoreFile, err := c.client.VectorStores.Files.New(ctx, params.VectorStoreID, vectorStoreFileParams)
		if err != nil {
			return nil, fmt.Errorf("failed to add file to vector store: %w", err)
		}

		result.VectorStoreFile = vectorStoreFile
	}

	return result, nil
}

// ChatContextMessage represents a message in chat context history.
type ChatContextMessage struct {
	// Role specifies the message role ("user" or "assistant").
	Role string `json:"role"`
	// Content contains the message text.
	Content string `json:"content"`
}

// MCPServerParam represents MCP server configuration for LlamaStack
type MCPServerParam struct {
	// ServerLabel is the label identifier for the MCP server
	ServerLabel string
	// ServerURL is the URL endpoint for the MCP server
	ServerURL string
	// Headers contains custom headers for MCP server authentication
	Headers map[string]string
}

// CreateResponseParams contains parameters for creating AI responses.
type CreateResponseParams struct {
	// Input is the text input for response generation (required).
	Input string
	// Model specifies the model ID to use for generation (required).
	Model string
	// VectorStoreIDs contains vector store IDs for file search functionality.
	VectorStoreIDs []string
	// ChatContext contains the full conversation history for multi-turn conversations.
	ChatContext []ChatContextMessage
	// Temperature controls response creativity/randomness (range: 0.0-2.0).
	Temperature *float64
	// TopP controls nucleus sampling for response variety (range: 0.0-1.0).
	TopP *float64
	// Instructions provides system-level guidance for AI behavior.
	Instructions string
	// Tools contains MCP server configurations for tool-enabled responses.
	Tools []MCPServerParam
}

// prepareResponseParams validates input parameters and prepares the API parameters for response creation.
func (c *LlamaStackClient) prepareResponseParams(params CreateResponseParams) (*responses.ResponseNewParams, error) {
	if params.Input == "" {
		return nil, fmt.Errorf("input is required")
	}
	if params.Model == "" {
		return nil, fmt.Errorf("model is required")
	}

	apiParams := &responses.ResponseNewParams{
		Model: responses.ResponsesModel(params.Model),
		Store: openai.Bool(true),
	}

	if len(params.ChatContext) > 0 {
		inputItems := make(responses.ResponseInputParam, 0)

		// Add chat context messages first
		for _, msg := range params.ChatContext {
			// Convert role string to appropriate enum
			var role responses.EasyInputMessageRole
			switch msg.Role {
			case "user":
				role = responses.EasyInputMessageRoleUser
			case "assistant":
				role = responses.EasyInputMessageRoleAssistant
			case "system":
				role = responses.EasyInputMessageRoleSystem
			default:
				role = responses.EasyInputMessageRoleUser // fallback to user
			}

			inputItems = append(inputItems, responses.ResponseInputItemParamOfMessage(
				msg.Content,
				role,
			))
		}

		// Add the new user input
		inputItems = append(inputItems, responses.ResponseInputItemParamOfMessage(
			params.Input,
			responses.EasyInputMessageRoleUser,
		))

		apiParams.Input = responses.ResponseNewParamsInputUnion{
			OfInputItemList: inputItems,
		}

		// Set instructions separately for chat context mode
		if params.Instructions != "" {
			apiParams.Instructions = openai.String(params.Instructions)
		}
	} else {
		apiParams.Input = responses.ResponseNewParamsInputUnion{
			OfString: openai.String(params.Input),
		}

		// Set instructions normally for single message mode
		if params.Instructions != "" {
			apiParams.Instructions = openai.String(params.Instructions)
		}
	}

	if params.Temperature != nil {
		if *params.Temperature < 0 || *params.Temperature > 2 {
			return nil, fmt.Errorf("temperature must be between 0 and 2, got: %.2f", *params.Temperature)
		}
		apiParams.Temperature = openai.Float(*params.Temperature)
	}

	if params.TopP != nil {
		if *params.TopP < 0 || *params.TopP > 1 {
			return nil, fmt.Errorf("top_p must be between 0 and 1, got: %.2f", *params.TopP)
		}
		apiParams.TopP = openai.Float(*params.TopP)
	}

	// Handle tools (both file search and MCP tools)
	var tools []responses.ToolUnionParam

	// Add file search tools if vector store IDs are provided
	if len(params.VectorStoreIDs) > 0 {
		fileSearchTool := responses.ToolParamOfFileSearch(params.VectorStoreIDs)
		tools = append(tools, fileSearchTool)
	}

	// Add MCP servers if provided
	if len(params.Tools) > 0 {
		for _, mcpServer := range params.Tools {
			// Validate MCP server parameters
			if mcpServer.ServerLabel == "" {
				return nil, fmt.Errorf("server_label is required for MCP server")
			}
			if mcpServer.ServerURL == "" {
				return nil, fmt.Errorf("server_url is required for MCP server")
			}

			// Create MCP tool parameter for OpenAI client
			mcpServerToolParam := responses.ToolUnionParam{
				OfMcp: &responses.ToolMcpParam{
					ServerLabel: mcpServer.ServerLabel,
					ServerURL:   openai.String(mcpServer.ServerURL),
					Headers:     mcpServer.Headers,
				},
			}
			tools = append(tools, mcpServerToolParam)
		}
	}

	// Set tools if any are configured
	if len(tools) > 0 {
		apiParams.Tools = tools
	}

	return apiParams, nil
}

// CreateResponse creates an AI response using the specified parameters.
func (c *LlamaStackClient) CreateResponse(ctx context.Context, params CreateResponseParams) (*responses.Response, error) {
	apiParams, err := c.prepareResponseParams(params)
	if err != nil {
		return nil, err
	}

	response, err := c.client.Responses.New(ctx, *apiParams)
	if err != nil {
		return nil, fmt.Errorf("failed to create response: %w", err)
	}

	return response, nil
}

// CreateResponseStream creates an AI response stream using the specified parameters.
func (c *LlamaStackClient) CreateResponseStream(ctx context.Context, params CreateResponseParams) (*ssestream.Stream[responses.ResponseStreamEventUnion], error) {
	apiParams, err := c.prepareResponseParams(params)
	if err != nil {
		return nil, err
	}

	stream := c.client.Responses.NewStreaming(ctx, *apiParams)
	return stream, nil
}

// DeleteVectorStore deletes a vector store by ID.
func (c *LlamaStackClient) DeleteVectorStore(ctx context.Context, vectorStoreID string) error {
	if vectorStoreID == "" {
		return fmt.Errorf("vectorStoreID is required")
	}

	_, err := c.client.VectorStores.Delete(ctx, vectorStoreID)
	if err != nil {
		return fmt.Errorf("failed to delete vector store: %w", err)
	}

	return nil
}

// ListFiles retrieves files with optional filtering parameters.
func (c *LlamaStackClient) ListFiles(ctx context.Context, params ListFilesParams) ([]openai.FileObject, error) {
	apiParams := openai.FileListParams{}

	if params.Limit != nil {
		if *params.Limit < 1 || *params.Limit > 10000 {
			return nil, fmt.Errorf("limit must be between 1 and 10000, got: %d", *params.Limit)
		}
		apiParams.Limit = openai.Int(*params.Limit)
	}

	if params.Order != "" {
		if params.Order != "asc" && params.Order != "desc" {
			return nil, fmt.Errorf("order must be 'asc' or 'desc', got: %s", params.Order)
		}
		apiParams.Order = openai.FileListParamsOrder(params.Order)
	}

	if params.Purpose != "" {
		validPurposes := []string{"assistants", "batch", "fine-tune", "vision", "user_data", "evals"}
		purposeValid := false
		for _, valid := range validPurposes {
			if params.Purpose == valid {
				purposeValid = true
				break
			}
		}
		if !purposeValid {
			return nil, fmt.Errorf("purpose must be one of %v, got: %s", validPurposes, params.Purpose)
		}
		apiParams.Purpose = openai.String(params.Purpose)
	}

	filesPage, err := c.client.Files.List(ctx, apiParams)
	if err != nil {
		return nil, fmt.Errorf("failed to list files: %w", err)
	}

	return filesPage.Data, nil
}

// DeleteFile deletes a file by ID.
func (c *LlamaStackClient) DeleteFile(ctx context.Context, fileID string) error {
	if fileID == "" {
		return fmt.Errorf("fileID is required")
	}

	_, err := c.client.Files.Delete(ctx, fileID)
	if err != nil {
		return fmt.Errorf("failed to delete file: %w", err)
	}

	return nil
}

// ListVectorStoreFiles retrieves files in a vector store with optional filtering parameters.
func (c *LlamaStackClient) ListVectorStoreFiles(ctx context.Context, vectorStoreID string, params ListVectorStoreFilesParams) ([]openai.VectorStoreFile, error) {
	if vectorStoreID == "" {
		return nil, fmt.Errorf("vectorStoreID is required")
	}

	apiParams := openai.VectorStoreFileListParams{}

	if params.Limit != nil {
		if *params.Limit < 1 || *params.Limit > 100 {
			return nil, fmt.Errorf("limit must be between 1 and 100, got: %d", *params.Limit)
		}
		apiParams.Limit = openai.Int(*params.Limit)
	}

	if params.Order != "" {
		if params.Order != "asc" && params.Order != "desc" {
			return nil, fmt.Errorf("order must be 'asc' or 'desc', got: %s", params.Order)
		}
		apiParams.Order = openai.VectorStoreFileListParamsOrder(params.Order)
	}

	if params.Filter != "" {
		validFilters := []string{"in_progress", "completed", "failed", "cancelled"}
		filterValid := false
		for _, valid := range validFilters {
			if params.Filter == valid {
				filterValid = true
				break
			}
		}
		if !filterValid {
			return nil, fmt.Errorf("filter must be one of %v, got: %s", validFilters, params.Filter)
		}
		apiParams.Filter = openai.VectorStoreFileListParamsFilter(params.Filter)
	}

	filesPage, err := c.client.VectorStores.Files.List(ctx, vectorStoreID, apiParams)
	if err != nil {
		return nil, fmt.Errorf("failed to list vector store files: %w", err)
	}

	return filesPage.Data, nil
}

// DeleteVectorStoreFile removes a file from a vector store.
func (c *LlamaStackClient) DeleteVectorStoreFile(ctx context.Context, vectorStoreID, fileID string) error {
	if vectorStoreID == "" {
		return fmt.Errorf("vectorStoreID is required")
	}
	if fileID == "" {
		return fmt.Errorf("fileID is required")
	}

	_, err := c.client.VectorStores.Files.Delete(ctx, vectorStoreID, fileID)
	if err != nil {
		return fmt.Errorf("failed to delete file from vector store: %w", err)
	}

	return nil
}
