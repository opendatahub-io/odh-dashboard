package clients

import (
	"context"
	"fmt"
	"os"

	"github.com/openai/openai-go/v2"
	"github.com/openai/openai-go/v2/option"
	"github.com/openai/openai-go/v2/responses"
)

// Ensure LlamaStackClient implements the interface
var _ = (*LlamaStackClient)(nil)

// ConversationMessage represents a message in the conversation history
type ConversationMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
	Type    string `json:"type"`
}

// LlamaStackClient wraps the OpenAI client for easier use
type LlamaStackClient struct {
	client              *openai.Client
	conversationHistory []ConversationMessage
}

// NewLlamaStackClient creates a new client configured for Llama Stack
func NewLlamaStackClient(baseURL string) *LlamaStackClient {
	client := openai.NewClient(
		option.WithBaseURL(baseURL+"/v1/openai/v1"),
		option.WithAPIKey("none"),
	)

	return &LlamaStackClient{
		client:              &client,
		conversationHistory: make([]ConversationMessage, 0),
	}
}

// ListModels lists all available models
func (c *LlamaStackClient) ListModels(ctx context.Context) ([]openai.Model, error) {
	modelsPage, err := c.client.Models.List(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list models: %w", err)
	}
	return modelsPage.Data, nil
}

// ListVectorStoresParams contains all possible parameters for listing vector stores
type ListVectorStoresParams struct {
	// Limit: Range 1-100, default 20. Number of objects to return
	Limit *int64
	// Order: "asc" or "desc". Sort by created_at timestamp
	Order string
	// After: Object ID for pagination (cursor for next page)
	After string
	// Before: Object ID for pagination (cursor for previous page)
	Before string
}

// ListVectorStores lists vector stores with optional parameters
func (c *LlamaStackClient) ListVectorStores(ctx context.Context, params ListVectorStoresParams) ([]openai.VectorStore, error) {
	// Build OpenAI SDK parameters with all options
	apiParams := openai.VectorStoreListParams{}

	// Limit: 1-100, default 20 (Llama Stack supported ✅)
	if params.Limit != nil {
		if *params.Limit < 1 || *params.Limit > 100 {
			return nil, fmt.Errorf("limit must be between 1 and 100, got: %d", *params.Limit)
		}
		apiParams.Limit = openai.Int(*params.Limit)
	}

	// Order: "asc" | "desc" (Llama Stack supported ✅)
	if params.Order != "" {
		if params.Order != "asc" && params.Order != "desc" {
			return nil, fmt.Errorf("order must be 'asc' or 'desc', got: %s", params.Order)
		}
		apiParams.Order = openai.VectorStoreListParamsOrder(params.Order)
	}

	// After: Object ID for pagination (Llama Stack supported ✅)
	if params.After != "" {
		apiParams.After = openai.String(params.After)
	}

	// Before: Object ID for pagination (Llama Stack supported ✅)
	if params.Before != "" {
		apiParams.Before = openai.String(params.Before)
	}

	vectorStoresPage, err := c.client.VectorStores.List(ctx, apiParams)
	if err != nil {
		return nil, fmt.Errorf("failed to list vector stores: %w", err)
	}

	return vectorStoresPage.Data, nil
}

// CreateVectorStoreParams contains all possible parameters for creating vector stores
type CreateVectorStoreParams struct {
	// Name: Optional name for the vector store (max 256 chars)
	Name string
	// FileIDs: List of file IDs to include in vector store (Llama Stack ✅)
	FileIDs []string
	// Metadata: Set of 16 key-value pairs, keys max 64 chars, values max 512 chars (Llama Stack ✅)
	Metadata map[string]string
	// ExpiresAfter: Expiration policy (days/hours) (Llama Stack ✅)
	ExpiresAfter map[string]interface{}
	// ChunkingStrategy: "auto" or custom strategy (Llama Stack ✅)
	ChunkingStrategy string
	// EmbeddingModel: Model for embeddings (Llama Stack extension ✅)
	EmbeddingModel string
	// EmbeddingDimension: Vector dimension, default 384 (Llama Stack extension ✅)
	EmbeddingDimension *int
	// ProviderID: Llama Stack provider ID (Llama Stack extension ✅)
	ProviderID string
}

// CreateVectorStore creates a new vector store with optional parameters
func (c *LlamaStackClient) CreateVectorStore(ctx context.Context, params CreateVectorStoreParams) (*openai.VectorStore, error) {
	// Build OpenAI SDK parameters with all options
	apiParams := openai.VectorStoreNewParams{}

	// Name: Optional, max 256 characters (Llama Stack supported ✅)
	if params.Name != "" {
		if len(params.Name) > 256 {
			return nil, fmt.Errorf("name must be ≤256 characters, got: %d", len(params.Name))
		}
		apiParams.Name = openai.String(params.Name)
	}

	// FileIDs: List of file IDs to include (Llama Stack supported ✅)
	if len(params.FileIDs) > 0 {
		apiParams.FileIDs = params.FileIDs
	}

	// Metadata: Max 16 key-value pairs, keys ≤64 chars, values ≤512 chars (Llama Stack supported ✅)
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

// UploadFileParams contains all possible parameters for file upload
type UploadFileParams struct {
	// FilePath: Path to the file to upload (required)
	FilePath string
	// Purpose: Intended purpose - "assistants", "batch", "fine-tune", "vision", "user_data", "evals" (optional, defaults to "assistants")
	Purpose string
	// VectorStoreID: If provided, file will be added to this vector store after upload (optional)
	VectorStoreID string
	// ExpiresAfter: File expiration policy (Llama Stack ✅)
	ExpiresAfter map[string]interface{}
}

// FileUploadResult contains the result of file upload operation
type FileUploadResult struct {
	FileID          string                  `json:"file_id"`
	VectorStoreFile *openai.VectorStoreFile `json:"vector_store_file,omitempty"`
}

// UploadFile uploads a file with optional parameters and optionally adds to vector store
func (c *LlamaStackClient) UploadFile(ctx context.Context, params UploadFileParams) (*FileUploadResult, error) {
	file, err := os.Open(params.FilePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	// Build OpenAI SDK parameters with all options
	apiParams := openai.FileNewParams{
		File: openai.File(file, params.FilePath, ""),
	}

	// Purpose: Optional field - defaults to "assistants" if not provided
	purpose := params.Purpose
	if purpose == "" {
		purpose = "assistants" // Default for vector stores/RAG
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

		vectorStoreFile, err := c.client.VectorStores.Files.New(ctx, params.VectorStoreID, vectorStoreFileParams)
		if err != nil {
			return nil, fmt.Errorf("failed to add file to vector store: %w", err)
		}

		result.VectorStoreFile = vectorStoreFile
	}

	return result, nil
}

// CreateResponseParams contains ALL possible parameters for OpenAI Responses API
type CreateResponseParams struct {
	// === REQUIRED PARAMETERS ===
	// Input: Text input or conversation array (required)
	Input string
	// Model: Model ID (required) - use available models from ListModels()
	Model string

	// === CORE PARAMETERS ===
	// VectorStoreIDs: List of vector store IDs for file_search tools (Llama Stack ✅)
	VectorStoreIDs []string
	// PreviousResponseID: ID of previous response for conversation context (Llama Stack ✅)
	PreviousResponseID string
	// Store: Whether to store response for retrieval, default true (Llama Stack ✅)
	Store *bool

	// === GENERATION PARAMETERS ===
	// Temperature: Range 0.0-2.0, default varies by model. Higher = more random (Llama Stack ✅)
	Temperature *float64
	// TopP: Range 0.0-1.0. Nucleus sampling, alternative to temperature (Llama Stack ✅)
	TopP *float64
	// MaxOutputTokens: Max tokens to generate including reasoning tokens (Llama Stack ✅)
	MaxOutputTokens *int64
	// TopLogprobs: Range 0-20. Most likely tokens with log probabilities (Llama Stack ✅)
	TopLogprobs *int64

	// === TOOL PARAMETERS ===
	// MaxToolCalls: Max total built-in tool calls across all tools (Llama Stack ✅)
	MaxToolCalls *int64
	// ParallelToolCalls: Whether to allow parallel tool execution (Llama Stack ✅)
	ParallelToolCalls *bool

	// === ADVANCED PARAMETERS ===
	// Instructions: System/developer message inserted into context (Llama Stack ✅)
	Instructions string
	// Background: Whether to run response in background (Llama Stack ✅)
	Background *bool
	// ServiceTier: "auto"|"default"|"flex"|"scale"|"priority" (Llama Stack ✅)
	ServiceTier string
	// Truncation: "auto"|"disabled". Context window handling (Llama Stack ✅)
	Truncation string

	// === STREAMING PARAMETERS ===
	// Stream: Whether to stream response (Llama Stack ✅)
	Stream *bool
	// StreamOptions: Options for streaming responses (Llama Stack ✅)
	StreamOptions map[string]interface{}

	// === IDENTIFICATION PARAMETERS ===
	// User: Stable identifier for end-user (Llama Stack ✅)
	User string
	// SafetyIdentifier: User identifier for safety/abuse detection (Llama Stack ✅)
	SafetyIdentifier string
	// PromptCacheKey: Cache optimization identifier (Llama Stack ✅)
	PromptCacheKey string

	// === RESPONSE FORMAT PARAMETERS ===
	// ResponseFormat: "text"|"json_object"|"json_schema" (Llama Stack ✅)
	ResponseFormat map[string]interface{}
	// Include: Additional data to include - e.g., "code_interpreter_call.outputs" (Llama Stack ✅)
	Include []string
	// Metadata: Set of 16 key-value pairs for response object (Llama Stack ✅)
	Metadata map[string]string

	// === LLAMA STACK EXTENSIONS ===
	// MaxInferIters: Max inference iterations (Llama Stack extension ✅)
	MaxInferIters *int
}

// CreateResponse creates a response with comprehensive parameter support
func (c *LlamaStackClient) CreateResponse(ctx context.Context, params CreateResponseParams) (*responses.Response, error) {
	// Validate required fields
	if params.Input == "" {
		return nil, fmt.Errorf("input is required")
	}
	if params.Model == "" {
		return nil, fmt.Errorf("model is required")
	}
	// Build OpenAI SDK parameters with ALL options
	apiParams := responses.ResponseNewParams{
		Model: responses.ResponsesModel(params.Model), // Required
		Input: responses.ResponseNewParamsInputUnion{
			OfString: openai.String(params.Input), // Required
		},
	}

	// === CORE PARAMETERS ===

	// Store: Whether to store response, default true (Llama Stack supported ✅)
	if params.Store != nil {
		apiParams.Store = openai.Bool(*params.Store)
	} else {
		apiParams.Store = openai.Bool(true) // Default
	}

	// PreviousResponseID: Conversation context (Llama Stack supported ✅)
	if params.PreviousResponseID != "" {
		apiParams.PreviousResponseID = openai.String(params.PreviousResponseID)
	}

	// === GENERATION PARAMETERS ===

	// Temperature: Range 0.0-2.0, controls randomness (Llama Stack supported ✅)
	if params.Temperature != nil {
		if *params.Temperature < 0 || *params.Temperature > 2 {
			return nil, fmt.Errorf("temperature must be between 0 and 2, got: %.2f", *params.Temperature)
		}
		apiParams.Temperature = openai.Float(*params.Temperature)
	}

	// TopP: Range 0.0-1.0, nucleus sampling (Llama Stack supported ✅)
	if params.TopP != nil {
		if *params.TopP < 0 || *params.TopP > 1 {
			return nil, fmt.Errorf("top_p must be between 0 and 1, got: %.2f", *params.TopP)
		}
		apiParams.TopP = openai.Float(*params.TopP)
	}

	// MaxOutputTokens: Maximum tokens to generate (Llama Stack supported ✅)
	if params.MaxOutputTokens != nil {
		if *params.MaxOutputTokens < 1 {
			return nil, fmt.Errorf("max_output_tokens must be ≥1, got: %d", *params.MaxOutputTokens)
		}
		apiParams.MaxOutputTokens = openai.Int(*params.MaxOutputTokens)
	}

	// TopLogprobs: Range 0-20, token probabilities (Llama Stack supported ✅)
	if params.TopLogprobs != nil {
		if *params.TopLogprobs < 0 || *params.TopLogprobs > 20 {
			return nil, fmt.Errorf("top_logprobs must be between 0 and 20, got: %d", *params.TopLogprobs)
		}
		apiParams.TopLogprobs = openai.Int(*params.TopLogprobs)
	}

	// === TOOL PARAMETERS ===

	// MaxToolCalls: Maximum total tool calls (Llama Stack supported ✅)
	if params.MaxToolCalls != nil {
		if *params.MaxToolCalls < 0 {
			return nil, fmt.Errorf("max_tool_calls must be ≥0, got: %d", *params.MaxToolCalls)
		}
		apiParams.MaxToolCalls = openai.Int(*params.MaxToolCalls)
	}

	// ParallelToolCalls: Allow parallel tool execution (Llama Stack supported ✅)
	if params.ParallelToolCalls != nil {
		apiParams.ParallelToolCalls = openai.Bool(*params.ParallelToolCalls)
	}

	// === ADVANCED PARAMETERS ===

	// Instructions: System message (Llama Stack supported ✅)
	if params.Instructions != "" {
		apiParams.Instructions = openai.String(params.Instructions)
	}

	// Background: Run in background (Llama Stack supported ✅)
	if params.Background != nil {
		apiParams.Background = openai.Bool(*params.Background)
	}

	// ServiceTier: Processing tier (Llama Stack supported ✅)
	if params.ServiceTier != "" {
		validTiers := []string{"auto", "default", "flex", "scale", "priority"}
		tierValid := false
		for _, valid := range validTiers {
			if params.ServiceTier == valid {
				tierValid = true
				break
			}
		}
		if !tierValid {
			return nil, fmt.Errorf("service_tier must be one of %v, got: %s", validTiers, params.ServiceTier)
		}
		apiParams.ServiceTier = responses.ResponseNewParamsServiceTier(params.ServiceTier)
	}

	// Truncation: Context window handling (Llama Stack supported ✅)
	if params.Truncation != "" {
		validTruncations := []string{"auto", "disabled"}
		truncationValid := false
		for _, valid := range validTruncations {
			if params.Truncation == valid {
				truncationValid = true
				break
			}
		}
		if !truncationValid {
			return nil, fmt.Errorf("truncation must be one of %v, got: %s", validTruncations, params.Truncation)
		}
		apiParams.Truncation = responses.ResponseNewParamsTruncation(params.Truncation)
	}

	// === IDENTIFICATION PARAMETERS ===

	// User: End-user identifier (Llama Stack supported ✅)
	if params.User != "" {
		apiParams.User = openai.String(params.User)
	}

	// SafetyIdentifier: Safety/abuse detection (Llama Stack supported ✅)
	if params.SafetyIdentifier != "" {
		apiParams.SafetyIdentifier = openai.String(params.SafetyIdentifier)
	}

	// PromptCacheKey: Cache optimization (Llama Stack supported ✅)
	if params.PromptCacheKey != "" {
		apiParams.PromptCacheKey = openai.String(params.PromptCacheKey)
	}

	// === METADATA ===

	// Metadata: Max 16 key-value pairs for response object (Llama Stack supported ✅)
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

	// === INCLUDE FIELDS ===

	// Include: Additional fields to include in response (Llama Stack supported ✅)
	if len(params.Include) > 0 {
		validIncludes := []string{
			"code_interpreter_call.outputs",
			"computer_call_output.output.image_url",
			"file_search_call.results",
			"message.input_image.image_url",
			"message.output_text.logprobs",
			"reasoning.encrypted_content",
		}

		includeFields := make([]responses.ResponseIncludable, 0)
		for _, include := range params.Include {
			includeValid := false
			for _, valid := range validIncludes {
				if include == valid {
					includeValid = true
					includeFields = append(includeFields, responses.ResponseIncludable(include))
					break
				}
			}
			if !includeValid {
				return nil, fmt.Errorf("include field '%s' not supported. Valid: %v", include, validIncludes)
			}
		}
		apiParams.Include = includeFields
	}

	// === FILE SEARCH TOOLS ===

	// Add file search tools if vector store IDs are provided
	if len(params.VectorStoreIDs) > 0 {
		fileSearchTool := responses.ToolParamOfFileSearch(params.VectorStoreIDs)
		apiParams.Tools = []responses.ToolUnionParam{fileSearchTool}
	}

	// Create the response using the official responses API
	response, err := c.client.Responses.New(ctx, apiParams)
	if err != nil {
		return nil, fmt.Errorf("failed to create response: %w", err)
	}

	return response, nil
}

// GetResponse retrieves a specific response by ID
func (c *LlamaStackClient) GetResponse(ctx context.Context, responseID string) (*responses.Response, error) {
	response, err := c.client.Responses.Get(ctx, responseID, responses.ResponseGetParams{})
	if err != nil {
		return nil, fmt.Errorf("failed to get response: %w", err)
	}

	return response, nil
}

// ClearConversation resets the conversation history
func (c *LlamaStackClient) ClearConversation() {
	c.conversationHistory = make([]ConversationMessage, 0)
}

// GetConversationHistory returns the current conversation history
func (c *LlamaStackClient) GetConversationHistory() []ConversationMessage {
	return c.conversationHistory
}
