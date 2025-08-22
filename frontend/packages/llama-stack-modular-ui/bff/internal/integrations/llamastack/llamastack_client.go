package llamastack

import (
	"context"
	"fmt"
	"io"
	"os"

	"github.com/openai/openai-go/v2"
	"github.com/openai/openai-go/v2/option"
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
	apiParams := openai.VectorStoreNewParams{}

	if params.Name != "" {
		if len(params.Name) > 256 {
			return nil, fmt.Errorf("name must be ≤256 characters, got: %d", len(params.Name))
		}
		apiParams.Name = openai.String(params.Name)
	}

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
}

// CreateResponse creates an AI response using the specified parameters.
func (c *LlamaStackClient) CreateResponse(ctx context.Context, params CreateResponseParams) (*responses.Response, error) {
	if params.Input == "" {
		return nil, fmt.Errorf("input is required")
	}
	if params.Model == "" {
		return nil, fmt.Errorf("model is required")
	}

	apiParams := responses.ResponseNewParams{
		Model: responses.ResponsesModel(params.Model),
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

	apiParams.Store = openai.Bool(true)

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

	if len(params.VectorStoreIDs) > 0 {
		fileSearchTool := responses.ToolParamOfFileSearch(params.VectorStoreIDs)
		apiParams.Tools = []responses.ToolUnionParam{fileSearchTool}
	}

	response, err := c.client.Responses.New(ctx, apiParams)
	if err != nil {
		return nil, fmt.Errorf("failed to create response: %w", err)
	}

	return response, nil
}
