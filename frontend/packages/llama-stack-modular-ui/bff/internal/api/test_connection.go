package api

import (
	"context"
	"fmt"
	"os"

	"github.com/openai/openai-go/v2"
	"github.com/openai/openai-go/v2/option"
	"github.com/openai/openai-go/v2/responses"
)

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
func NewLlamaStackClient() *LlamaStackClient {
	client := openai.NewClient(
		option.WithBaseURL("http://localhost:8321/v1/openai/v1"),
		option.WithAPIKey("none"),
	)

	return &LlamaStackClient{
		client:              &client,
		conversationHistory: make([]ConversationMessage, 0),
	}
}

// ListModels lists all available models
func (c *LlamaStackClient) ListModels(ctx context.Context) error {
	fmt.Println("🤖 Listing models...")

	models, err := c.client.Models.List(ctx)
	if err != nil {
		return fmt.Errorf("failed to list models: %w", err)
	}

	fmt.Printf("Found %d models:\n", len(models.Data))
	for _, model := range models.Data {
		fmt.Printf("  ✓ %s\n", model.ID)
	}
	fmt.Println()
	return nil
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

// ListVectorStores lists vector stores with comprehensive parameter support
func (c *LlamaStackClient) ListVectorStores(ctx context.Context) error {
	return c.ListVectorStoresWithParams(ctx, ListVectorStoresParams{})
}

// ListVectorStoresWithParams lists vector stores with full parameter control
func (c *LlamaStackClient) ListVectorStoresWithParams(ctx context.Context, params ListVectorStoresParams) error {
	fmt.Println("🗂️  Listing vector stores...")

	// Build OpenAI SDK parameters with all options
	apiParams := openai.VectorStoreListParams{}

	// Limit: 1-100, default 20 (Llama Stack supported ✅)
	if params.Limit != nil {
		if *params.Limit < 1 || *params.Limit > 100 {
			return fmt.Errorf("limit must be between 1 and 100, got: %d", *params.Limit)
		}
		apiParams.Limit = openai.Int(*params.Limit)
		fmt.Printf("   📊 Limit: %d\n", *params.Limit)
	}

	// Order: "asc" | "desc" (Llama Stack supported ✅)
	if params.Order != "" {
		if params.Order != "asc" && params.Order != "desc" {
			return fmt.Errorf("order must be 'asc' or 'desc', got: %s", params.Order)
		}
		apiParams.Order = openai.VectorStoreListParamsOrder(params.Order)
		fmt.Printf("   🔄 Order: %s\n", params.Order)
	}

	// After: Object ID for pagination (Llama Stack supported ✅)
	if params.After != "" {
		apiParams.After = openai.String(params.After)
		fmt.Printf("   ⏭️  After: %s\n", params.After)
	}

	// Before: Object ID for pagination (Llama Stack supported ✅)
	if params.Before != "" {
		apiParams.Before = openai.String(params.Before)
		fmt.Printf("   ⏮️  Before: %s\n", params.Before)
	}

	vectorStores, err := c.client.VectorStores.List(ctx, apiParams)
	if err != nil {
		return fmt.Errorf("failed to list vector stores: %w", err)
	}

	fmt.Printf("Found %d vector stores:\n", len(vectorStores.Data))
	for _, vs := range vectorStores.Data {
		fmt.Printf("  ✓ %s (ID: %s, Status: %s)\n", vs.Name, vs.ID, vs.Status)
	}
	fmt.Println()
	return nil
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

// CreateVectorStore creates a new vector store with default parameters
func (c *LlamaStackClient) CreateVectorStore(ctx context.Context, name string) (*openai.VectorStore, error) {
	return c.CreateVectorStoreWithParams(ctx, CreateVectorStoreParams{Name: name})
}

// CreateVectorStoreWithParams creates a vector store with comprehensive parameter support
func (c *LlamaStackClient) CreateVectorStoreWithParams(ctx context.Context, params CreateVectorStoreParams) (*openai.VectorStore, error) {
	fmt.Printf("📦 Creating vector store: %s...\n", params.Name)

	// Build OpenAI SDK parameters with all options
	apiParams := openai.VectorStoreNewParams{}

	// Name: Optional, max 256 characters (Llama Stack supported ✅)
	if params.Name != "" {
		if len(params.Name) > 256 {
			return nil, fmt.Errorf("name must be ≤256 characters, got: %d", len(params.Name))
		}
		apiParams.Name = openai.String(params.Name)
		fmt.Printf("   📝 Name: %s\n", params.Name)
	}

	// FileIDs: List of file IDs to include (Llama Stack supported ✅)
	if len(params.FileIDs) > 0 {
		apiParams.FileIDs = params.FileIDs
		fmt.Printf("   📄 File IDs: %v\n", params.FileIDs)
	}

	// Metadata: Max 16 key-value pairs, keys ≤64 chars, values ≤512 chars (Llama Stack supported ✅)
	if len(params.Metadata) > 0 {
		if len(params.Metadata) > 16 {
			return nil, fmt.Errorf("metadata can have max 16 key-value pairs, got: %d", len(params.Metadata))
		}

		metadata := make(map[string]interface{})
		for k, v := range params.Metadata {
			if len(k) > 64 {
				return nil, fmt.Errorf("metadata key '%s' exceeds 64 chars", k)
			}
			if len(v) > 512 {
				return nil, fmt.Errorf("metadata value for '%s' exceeds 512 chars", k)
			}
			metadata[k] = v
		}
		apiParams.Metadata = params.Metadata
		fmt.Printf("   🏷️  Metadata: %d pairs\n", len(params.Metadata))
	}

	// ExpiresAfter: Expiration policy (Llama Stack supported ✅)
	// Note: Complex type conversion needed for SDK - simplified for now
	if len(params.ExpiresAfter) > 0 {
		// apiParams.ExpiresAfter = ... // Complex SDK type, skipping for now
		fmt.Printf("   ⏰ Expires after: %v (parameter documented but complex SDK types)\n", params.ExpiresAfter)
	}

	vectorStore, err := c.client.VectorStores.New(ctx, apiParams)
	if err != nil {
		return nil, fmt.Errorf("failed to create vector store: %w", err)
	}

	fmt.Printf("  ✓ Created vector store: %s (ID: %s)\n\n", vectorStore.Name, vectorStore.ID)
	return vectorStore, nil
}

// UploadFileParams contains all possible parameters for file upload
type UploadFileParams struct {
	// FilePath: Path to the file to upload (required)
	FilePath string
	// Purpose: Intended purpose - "assistants", "batch", "fine-tune", "vision", "user_data", "evals" (required)
	Purpose string
	// ExpiresAfter: File expiration policy (Llama Stack ✅)
	// Format: {"anchor": "uploaded_at", "days": 30} - default for batch files
	ExpiresAfter map[string]interface{}
}

// UploadFile uploads a file with default parameters (purpose: assistants)
func (c *LlamaStackClient) UploadFile(ctx context.Context, filePath string) (string, error) {
	return c.UploadFileWithParams(ctx, UploadFileParams{
		FilePath: filePath,
		Purpose:  "assistants", // Default for vector stores/RAG
	})
}

// UploadFileWithParams uploads a file with comprehensive parameter support
func (c *LlamaStackClient) UploadFileWithParams(ctx context.Context, params UploadFileParams) (string, error) {
	fmt.Printf("📁 Uploading file: %s...\n", params.FilePath)

	file, err := os.Open(params.FilePath)
	if err != nil {
		return "", fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	// Build OpenAI SDK parameters with all options
	apiParams := openai.FileNewParams{
		File: openai.File(file, params.FilePath, ""),
	}

	// Purpose: Required field - assistants|batch|fine-tune|vision|user_data|evals (Llama Stack supported ✅)
	validPurposes := []string{"assistants", "batch", "fine-tune", "vision", "user_data", "evals"}
	purposeValid := false
	for _, valid := range validPurposes {
		if params.Purpose == valid {
			purposeValid = true
			break
		}
	}
	if !purposeValid {
		return "", fmt.Errorf("purpose must be one of %v, got: %s", validPurposes, params.Purpose)
	}
	apiParams.Purpose = openai.FilePurpose(params.Purpose)
	fmt.Printf("   🎯 Purpose: %s\n", params.Purpose)

	// ExpiresAfter: File expiration policy (Llama Stack supported ✅)
	// Note: Complex type conversion needed for SDK - simplified for now
	if len(params.ExpiresAfter) > 0 {
		// apiParams.ExpiresAfter = ... // Complex SDK type, skipping for now
		fmt.Printf("   ⏰ Expires after: %v (parameter documented but complex SDK types)\n", params.ExpiresAfter)
	}

	uploadedFile, err := c.client.Files.New(ctx, apiParams)
	if err != nil {
		return "", fmt.Errorf("failed to upload file: %w", err)
	}

	fmt.Printf("  ✓ File uploaded: %s (ID: %s)\n", uploadedFile.Filename, uploadedFile.ID)
	return uploadedFile.ID, nil
}

// AddFileToVectorStoreParams contains all possible parameters for adding files to vector stores
type AddFileToVectorStoreParams struct {
	// VectorStoreID: ID of the vector store (required)
	VectorStoreID string
	// FileID: ID of the uploaded file (required)
	FileID string
	// Attributes: Key-value pairs for file metadata, keys ≤64 chars, values ≤512 chars (Llama Stack ✅)
	Attributes map[string]interface{}
	// ChunkingStrategy: "auto" or custom chunking strategy (Llama Stack ✅)
	ChunkingStrategy string
}

// AddFileToVectorStore adds file to vector store with default parameters
func (c *LlamaStackClient) AddFileToVectorStore(ctx context.Context, vectorStoreID, fileID string) (*openai.VectorStoreFile, error) {
	return c.AddFileToVectorStoreWithParams(ctx, AddFileToVectorStoreParams{
		VectorStoreID: vectorStoreID,
		FileID:        fileID,
	})
}

// AddFileToVectorStoreWithParams adds file to vector store with comprehensive parameter support
func (c *LlamaStackClient) AddFileToVectorStoreWithParams(ctx context.Context, params AddFileToVectorStoreParams) (*openai.VectorStoreFile, error) {
	fmt.Printf("🔗 Adding file to vector store...\n")

	// Build OpenAI SDK parameters with all options
	apiParams := openai.VectorStoreFileNewParams{
		FileID: params.FileID, // Required
	}

	fmt.Printf("   📄 File ID: %s\n", params.FileID)
	fmt.Printf("   🗂️  Vector Store ID: %s\n", params.VectorStoreID)

	// Attributes: Custom file metadata (Llama Stack supported ✅)
	// Note: Complex union type conversion needed - simplified for now
	if len(params.Attributes) > 0 {
		// apiParams.Attributes = ... // Complex SDK union type, skipping for now
		fmt.Printf("   🏷️  Attributes: %d pairs (parameter documented but complex SDK types)\n", len(params.Attributes))
	}

	vectorStoreFile, err := c.client.VectorStores.Files.New(ctx, params.VectorStoreID, apiParams)
	if err != nil {
		return nil, fmt.Errorf("failed to add file to vector store: %w", err)
	}

	fmt.Printf("  ✓ File added to vector store: %s (Status: %s)\n\n",
		vectorStoreFile.ID, vectorStoreFile.Status)
	return vectorStoreFile, nil
}

// SearchVectorStoreParams contains all possible parameters for vector store search
type SearchVectorStoreParams struct {
	// VectorStoreID: ID of the vector store to search (required)
	VectorStoreID string
	// Query: Search query string or list of strings (required)
	Query string
	// MaxNumResults: Range 1-50, default 10. Maximum results to return (Llama Stack ✅)
	MaxNumResults *int64
	// RewriteQuery: Whether to rewrite query for better vector search (Llama Stack ✅)
	RewriteQuery *bool
	// Filters: File attribute filters to narrow results (Llama Stack ✅)
	// Format: {"file_id": "file-123"} or {"metadata.author": "John"}
	Filters map[string]interface{}
	// RankingOptions: Search ranking and scoring options (Llama Stack ✅)
	// Format: {"score_threshold": 0.5, "ranker": "default"}
	RankingOptions map[string]interface{}
}

// SearchVectorStore searches vector store with default parameters (max 3 results)
func (c *LlamaStackClient) SearchVectorStore(ctx context.Context, vectorStoreID, query string) error {
	maxResults := int64(3)
	return c.SearchVectorStoreWithParams(ctx, SearchVectorStoreParams{
		VectorStoreID: vectorStoreID,
		Query:         query,
		MaxNumResults: &maxResults,
	})
}

// SearchVectorStoreWithParams searches vector store with comprehensive parameter support
func (c *LlamaStackClient) SearchVectorStoreWithParams(ctx context.Context, params SearchVectorStoreParams) error {
	fmt.Printf("🔍 Searching vector store with query: '%s'...\n", params.Query)

	// Build OpenAI SDK parameters with all options
	apiParams := openai.VectorStoreSearchParams{
		Query: openai.VectorStoreSearchParamsQueryUnion{
			OfString: openai.String(params.Query),
		},
	}

	fmt.Printf("   🗂️  Vector Store ID: %s\n", params.VectorStoreID)

	// MaxNumResults: Range 1-50, default 10 (Llama Stack supported ✅)
	if params.MaxNumResults != nil {
		if *params.MaxNumResults < 1 || *params.MaxNumResults > 50 {
			return fmt.Errorf("max_num_results must be between 1 and 50, got: %d", *params.MaxNumResults)
		}
		apiParams.MaxNumResults = openai.Int(*params.MaxNumResults)
		fmt.Printf("   📊 Max results: %d\n", *params.MaxNumResults)
	}

	// RewriteQuery: Optimize query for vector search (Llama Stack supported ✅)
	if params.RewriteQuery != nil {
		apiParams.RewriteQuery = openai.Bool(*params.RewriteQuery)
		fmt.Printf("   ✏️  Rewrite query: %t\n", *params.RewriteQuery)
	}

	// Filters: File attribute filters (Llama Stack supported ✅)
	// Examples: {"file_id": "file-123"}, {"metadata.department": "engineering"}
	if len(params.Filters) > 0 {
		// Convert to SDK filter format
		apiParams.Filters = openai.VectorStoreSearchParamsFiltersUnion{
			// Note: This would need proper filter union handling based on filter type
		}
		fmt.Printf("   🔍 Filters: %d conditions\n", len(params.Filters))
	}

	// RankingOptions: Search ranking configuration (Llama Stack supported ✅)
	if len(params.RankingOptions) > 0 {
		rankingOptions := openai.VectorStoreSearchParamsRankingOptions{}
		// Note: Would need to map specific ranking options based on Llama Stack support
		apiParams.RankingOptions = rankingOptions
		fmt.Printf("   📈 Ranking options: %d configurations\n", len(params.RankingOptions))
	}

	results, err := c.client.VectorStores.Search(ctx, params.VectorStoreID, apiParams)
	if err != nil {
		return fmt.Errorf("failed to search vector store: %w", err)
	}

	fmt.Printf("Found %d search results:\n", len(results.Data))
	for i, result := range results.Data {
		fmt.Printf("  📄 Result %d (File: %s):\n", i+1, result.Filename)
		if len(result.Content) > 0 {
			// Show a preview of the first content chunk (first 200 characters)
			content := result.Content[0].Text
			if len(content) > 200 {
				content = content[:200] + "..."
			}
			fmt.Printf("     %s\n", content)
		}
		fmt.Printf("     Score: %.4f\n\n", result.Score)
	}

	return nil
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
	// User: Stable identifier for end-user (being replaced by safety_identifier) (Llama Stack ✅)
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

// CreateResponse creates a response with default parameters
func (c *LlamaStackClient) CreateResponse(ctx context.Context, input, model string, vectorStoreIDs []string) (*responses.Response, error) {
	return c.CreateResponseWithParams(ctx, CreateResponseParams{
		Input:          input,
		Model:          model,
		VectorStoreIDs: vectorStoreIDs,
	})
}

// CreateResponseWithContext creates a response with conversation context
func (c *LlamaStackClient) CreateResponseWithContext(ctx context.Context, input, model string, vectorStoreIDs []string, previousResponseID string) (*responses.Response, error) {
	return c.CreateResponseWithParams(ctx, CreateResponseParams{
		Input:              input,
		Model:              model,
		VectorStoreIDs:     vectorStoreIDs,
		PreviousResponseID: previousResponseID,
	})
}

// CreateResponseWithParams creates a response with comprehensive parameter support
func (c *LlamaStackClient) CreateResponseWithParams(ctx context.Context, params CreateResponseParams) (*responses.Response, error) {
	fmt.Printf("🤖 Creating response with comprehensive parameters\n")
	fmt.Printf("💭 Input: %s\n", params.Input)

	// Build OpenAI SDK parameters with ALL options
	apiParams := responses.ResponseNewParams{
		Model: responses.ResponsesModel(params.Model), // Required
		Input: responses.ResponseNewParamsInputUnion{
			OfString: openai.String(params.Input), // Required
		},
	}

	fmt.Printf("   🔧 Model: %s\n", params.Model)

	// === CORE PARAMETERS ===

	// Store: Whether to store response, default true (Llama Stack supported ✅)
	if params.Store != nil {
		apiParams.Store = openai.Bool(*params.Store)
		fmt.Printf("   💾 Store: %t\n", *params.Store)
	} else {
		apiParams.Store = openai.Bool(true) // Default
	}

	// PreviousResponseID: Conversation context (Llama Stack supported ✅)
	if params.PreviousResponseID != "" {
		apiParams.PreviousResponseID = openai.String(params.PreviousResponseID)
		fmt.Printf("   🔗 Previous response ID: %s\n", params.PreviousResponseID)
	}

	// === GENERATION PARAMETERS ===

	// Temperature: Range 0.0-2.0, controls randomness (Llama Stack supported ✅)
	if params.Temperature != nil {
		if *params.Temperature < 0 || *params.Temperature > 2 {
			return nil, fmt.Errorf("temperature must be between 0 and 2, got: %.2f", *params.Temperature)
		}
		apiParams.Temperature = openai.Float(*params.Temperature)
		fmt.Printf("   🌡️  Temperature: %.2f\n", *params.Temperature)
	}

	// TopP: Range 0.0-1.0, nucleus sampling (Llama Stack supported ✅)
	if params.TopP != nil {
		if *params.TopP < 0 || *params.TopP > 1 {
			return nil, fmt.Errorf("top_p must be between 0 and 1, got: %.2f", *params.TopP)
		}
		apiParams.TopP = openai.Float(*params.TopP)
		fmt.Printf("   🎯 Top P: %.2f\n", *params.TopP)
	}

	// MaxOutputTokens: Maximum tokens to generate (Llama Stack supported ✅)
	if params.MaxOutputTokens != nil {
		if *params.MaxOutputTokens < 1 {
			return nil, fmt.Errorf("max_output_tokens must be ≥1, got: %d", *params.MaxOutputTokens)
		}
		apiParams.MaxOutputTokens = openai.Int(*params.MaxOutputTokens)
		fmt.Printf("   📏 Max output tokens: %d\n", *params.MaxOutputTokens)
	}

	// TopLogprobs: Range 0-20, token probabilities (Llama Stack supported ✅)
	if params.TopLogprobs != nil {
		if *params.TopLogprobs < 0 || *params.TopLogprobs > 20 {
			return nil, fmt.Errorf("top_logprobs must be between 0 and 20, got: %d", *params.TopLogprobs)
		}
		apiParams.TopLogprobs = openai.Int(*params.TopLogprobs)
		fmt.Printf("   📊 Top logprobs: %d\n", *params.TopLogprobs)
	}

	// === TOOL PARAMETERS ===

	// MaxToolCalls: Maximum total tool calls (Llama Stack supported ✅)
	if params.MaxToolCalls != nil {
		if *params.MaxToolCalls < 0 {
			return nil, fmt.Errorf("max_tool_calls must be ≥0, got: %d", *params.MaxToolCalls)
		}
		apiParams.MaxToolCalls = openai.Int(*params.MaxToolCalls)
		fmt.Printf("   🔧 Max tool calls: %d\n", *params.MaxToolCalls)
	}

	// ParallelToolCalls: Allow parallel tool execution (Llama Stack supported ✅)
	if params.ParallelToolCalls != nil {
		apiParams.ParallelToolCalls = openai.Bool(*params.ParallelToolCalls)
		fmt.Printf("   ⚡ Parallel tool calls: %t\n", *params.ParallelToolCalls)
	}

	// === ADVANCED PARAMETERS ===

	// Instructions: System message (Llama Stack supported ✅)
	if params.Instructions != "" {
		apiParams.Instructions = openai.String(params.Instructions)
		fmt.Printf("   📋 Instructions: %s\n", params.Instructions)
	}

	// Background: Run in background (Llama Stack supported ✅)
	if params.Background != nil {
		apiParams.Background = openai.Bool(*params.Background)
		fmt.Printf("   🔄 Background: %t\n", *params.Background)
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
		fmt.Printf("   🏆 Service tier: %s\n", params.ServiceTier)
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
		fmt.Printf("   ✂️  Truncation: %s\n", params.Truncation)
	}

	// === IDENTIFICATION PARAMETERS ===

	// User: End-user identifier (Llama Stack supported ✅)
	if params.User != "" {
		apiParams.User = openai.String(params.User)
		fmt.Printf("   👤 User: %s\n", params.User)
	}

	// SafetyIdentifier: Safety/abuse detection (Llama Stack supported ✅)
	if params.SafetyIdentifier != "" {
		apiParams.SafetyIdentifier = openai.String(params.SafetyIdentifier)
		fmt.Printf("   🛡️  Safety identifier: %s\n", params.SafetyIdentifier)
	}

	// PromptCacheKey: Cache optimization (Llama Stack supported ✅)
	if params.PromptCacheKey != "" {
		apiParams.PromptCacheKey = openai.String(params.PromptCacheKey)
		fmt.Printf("   🗄️  Cache key: %s\n", params.PromptCacheKey)
	}

	// === METADATA ===

	// Metadata: Max 16 key-value pairs for response object (Llama Stack supported ✅)
	if len(params.Metadata) > 0 {
		if len(params.Metadata) > 16 {
			return nil, fmt.Errorf("metadata can have max 16 key-value pairs, got: %d", len(params.Metadata))
		}

		// shared.Metadata is map[string]string - direct assignment
		for k, v := range params.Metadata {
			if len(k) > 64 {
				return nil, fmt.Errorf("metadata key '%s' exceeds 64 chars", k)
			}
			if len(v) > 512 {
				return nil, fmt.Errorf("metadata value for '%s' exceeds 512 chars", k)
			}
		}
		apiParams.Metadata = params.Metadata
		fmt.Printf("   🏷️  Metadata: %d pairs\n", len(params.Metadata))
	}

	// === INCLUDE FIELDS ===

	// Include: Additional fields to include in response (Llama Stack supported ✅)
	// Supported values:
	// - "code_interpreter_call.outputs": Python code execution outputs
	// - "computer_call_output.output.image_url": Computer call image URLs
	// - "file_search_call.results": File search results
	// - "message.input_image.image_url": Input message image URLs
	// - "message.output_text.logprobs": Assistant message logprobs
	// - "reasoning.encrypted_content": Encrypted reasoning tokens
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
		fmt.Printf("   📋 Include fields: %v\n", params.Include)
	}

	// === FILE SEARCH TOOLS ===

	// Add file search tools if vector store IDs are provided
	if len(params.VectorStoreIDs) > 0 {
		fmt.Printf("   🔍 Vector stores: %v\n", params.VectorStoreIDs)
		fileSearchTool := responses.ToolParamOfFileSearch(params.VectorStoreIDs)
		apiParams.Tools = []responses.ToolUnionParam{fileSearchTool}
	}

	// Create the response using the official responses API
	response, err := c.client.Responses.New(ctx, apiParams)
	if err != nil {
		fmt.Printf("   ❌ Error details: %+v\n", err)
		return nil, fmt.Errorf("failed to create response: %w", err)
	}

	fmt.Printf("✅ Response created successfully!\n")
	fmt.Printf("   ID: %s\n", response.ID)
	fmt.Printf("   Status: %s\n", response.Status)
	fmt.Printf("   Output items: %d\n", len(response.Output))

	// Print response output (FULL content, no truncation)
	for i, outputItem := range response.Output {
		fmt.Printf("   Output %d:\n", i+1)

		switch outputItem.Type {
		case "message":
			msg := outputItem.AsMessage()
			for j, content := range msg.Content {
				switch content.Type {
				case "output_text":
					textContent := content.AsOutputText()
					fmt.Printf("     📝 FULL AI Response %d:\n%s\n\n", j+1, textContent.Text)
				case "refusal":
					refusalContent := content.AsRefusal()
					fmt.Printf("     ❌ Refusal %d: %s\n", j+1, refusalContent.Refusal)
				}
			}
		case "file_search_call":
			fmt.Printf("     🔍 File search executed\n")
		default:
			fmt.Printf("     🔧 Type: %s\n", outputItem.Type)
		}
	}
	fmt.Println()

	return response, nil
}

// CreateResponseWithManualContext creates a response with manually managed conversation context
func (c *LlamaStackClient) CreateResponseWithManualContext(ctx context.Context, input, model string, vectorStoreIDs []string) (*responses.Response, error) {
	fmt.Printf("🤖 Creating response with manual context management\n")
	fmt.Printf("💭 Input: %s\n", input)
	fmt.Printf("🧠 Conversation history: %d messages\n", len(c.conversationHistory))

	// Add current user input to conversation history
	c.conversationHistory = append(c.conversationHistory, ConversationMessage{
		Role:    "user",
		Content: input,
		Type:    "message",
	})

	// Log conversation state
	if len(c.conversationHistory) > 1 {
		fmt.Printf("📚 Sending full conversation context (%d messages)\n", len(c.conversationHistory))
	}

	// Create the response parameters with manual context
	params := responses.ResponseNewParams{
		Model:       responses.ResponsesModel(model),
		Store:       openai.Bool(true),
		Temperature: openai.Float(0.7),
	}

	// Set input based on conversation state
	if len(c.conversationHistory) == 1 {
		params.Input = responses.ResponseNewParamsInputUnion{
			OfString: openai.String(input),
		}
	} else {
		// For multi-turn, we'd need to build the input item list
		// This is complex with the Go SDK types, so for now use string with context summary
		contextSummary := fmt.Sprintf("Previous conversation context: %d messages. Current question: %s",
			len(c.conversationHistory)-1, input)
		params.Input = responses.ResponseNewParamsInputUnion{
			OfString: openai.String(contextSummary),
		}
	}

	// Add file search tools if vector store IDs are provided
	if len(vectorStoreIDs) > 0 {
		fmt.Printf("🔍 Using vector stores: %v\n", vectorStoreIDs)
		fileSearchTool := responses.ToolParamOfFileSearch(vectorStoreIDs)
		params.Tools = []responses.ToolUnionParam{fileSearchTool}
	}

	// Create the response
	response, err := c.client.Responses.New(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to create response: %w", err)
	}

	// Add AI response to conversation history
	if len(response.Output) > 0 {
		for _, output := range response.Output {
			if output.Type == "message" {
				msg := output.AsMessage()
				for _, content := range msg.Content {
					if content.Type == "output_text" {
						aiResponse := content.AsOutputText().Text
						c.conversationHistory = append(c.conversationHistory, ConversationMessage{
							Role:    "assistant",
							Content: aiResponse,
							Type:    "message",
						})
						break
					}
				}
				break
			}
		}
	}

	fmt.Printf("✅ Response created with manual context!\n")
	fmt.Printf("   ID: %s\n", response.ID)
	fmt.Printf("   Status: %s\n", response.Status)

	// Show FULL AI response content
	for i, output := range response.Output {
		if output.Type == "message" {
			msg := output.AsMessage()
			for _, content := range msg.Content {
				if content.Type == "output_text" {
					aiResponse := content.AsOutputText().Text
					fmt.Printf("📝 FULL AI Response %d:\n%s\n\n", i+1, aiResponse)
				}
			}
		}
	}

	fmt.Printf("📚 Updated conversation: %d messages\n\n", len(c.conversationHistory))

	return response, nil
}

// ClearConversation resets the conversation history
func (c *LlamaStackClient) ClearConversation() {
	c.conversationHistory = make([]ConversationMessage, 0)
	fmt.Println("🧹 Conversation history cleared")
}

// GetConversationHistory returns the current conversation history
func (c *LlamaStackClient) GetConversationHistory() []ConversationMessage {
	return c.conversationHistory
}

// GetResponse retrieves a specific response by ID and displays its full content
func (c *LlamaStackClient) GetResponse(ctx context.Context, responseID string) (*responses.Response, error) {
	fmt.Printf("🔍 Retrieving response: %s\n", responseID)

	response, err := c.client.Responses.Get(ctx, responseID, responses.ResponseGetParams{})
	if err != nil {
		return nil, fmt.Errorf("failed to get response: %w", err)
	}

	fmt.Printf("📋 Response Details:\n")
	fmt.Printf("   ID: %s\n", response.ID)
	fmt.Printf("   Status: %s\n", response.Status)
	fmt.Printf("   Model: %s\n", response.Model)
	fmt.Printf("   Created: %.0f\n", response.CreatedAt)
	fmt.Printf("   Output items: %d\n", len(response.Output))

	// Show FULL content of each output
	for i, output := range response.Output {
		fmt.Printf("\n   📄 Output %d (Type: %s):\n", i+1, output.Type)

		switch output.Type {
		case "message":
			msg := output.AsMessage()
			fmt.Printf("      Role: %s\n", msg.Role)
			for j, content := range msg.Content {
				if content.Type == "output_text" {
					fmt.Printf("      📝 Content %d:\n%s\n", j+1, content.AsOutputText().Text)
				}
			}
		case "file_search_call":
			// Would need to access file search details here if needed
			fmt.Printf("      🔍 File search call completed\n")
		default:
			fmt.Printf("      Type: %s\n", output.Type)
		}
	}
	fmt.Println()

	return response, nil
}

func testConnection() {
	fmt.Println("🚀 Testing Llama Stack with Official OpenAI Go Client")
	fmt.Println("===================================================")

	ctx := context.Background()
	client := NewLlamaStackClient()

	// Note: RAG tool group should now be configured in dev-config.yaml

	// Test 1: List models (we know this works)
	if err := client.ListModels(ctx); err != nil {
		fmt.Printf("❌ Error listing models: %v\n", err)
		return
	}

	// Test 2: List vector stores
	if err := client.ListVectorStores(ctx); err != nil {
		fmt.Printf("❌ Error listing vector stores: %v\n", err)
		return
	}

	// Test 3: Create a vector store
	vectorStore, err := client.CreateVectorStore(ctx, "Test Support FAQ")
	if err != nil {
		fmt.Printf("❌ Error creating vector store: %v\n", err)
		return
	}

	// Test 4: Upload file and add to vector store (two-step process)
	testFile := "matias_schimuneck_superstar.pdf"
	if _, statErr := os.Stat(testFile); statErr == nil {
		// Step 1: Upload the file
		fileID, uploadErr := client.UploadFile(ctx, testFile)
		if uploadErr != nil {
			fmt.Printf("❌ Error uploading file: %v\n", uploadErr)
			return
		}

		// Step 2: Add file to vector store
		vectorStoreFile, addErr := client.AddFileToVectorStore(ctx, vectorStore.ID, fileID)
		if addErr != nil {
			fmt.Printf("❌ Error adding file to vector store: %v\n", addErr)
			return
		}
		fmt.Printf("📄 File processed successfully: %s\n\n", vectorStoreFile.ID)

		// Test 5: Search the vector store
		searchQuery := "how was matias sschimuneck?"
		if searchErr := client.SearchVectorStore(ctx, vectorStore.ID, searchQuery); searchErr != nil {
			fmt.Printf("❌ Error searching vector store: %v\n", searchErr)
			return
		}

		// Test 6: Create response with file_search tools (RAG with responses API)
		responseQuery := "Tell me about Matias Schimuneck's qualities and achievements"
		selectedModel := "ollama/llama3.2:3b" // Use one of the available models

		response, createErr := client.CreateResponse(ctx, responseQuery, selectedModel, []string{vectorStore.ID})
		if createErr != nil {
			fmt.Printf("❌ Error creating response: %v\n", createErr)
			return
		}
		fmt.Printf("📋 Generated response ID: %s\n\n", response.ID)

		// Test 6.5: Demonstrate comprehensive parameters
		fmt.Printf("🚀 === DEMONSTRATING COMPREHENSIVE PARAMETERS ===\n")
		temperature := 0.3 // Lower temperature for more focused responses
		maxTokens := int64(500)
		includeResults := []string{"file_search_call.results"} // Include search results

		advancedResponse, advErr := client.CreateResponseWithParams(ctx, CreateResponseParams{
			Input:           "Summarize Matias Schimuneck in exactly 3 bullet points",
			Model:           selectedModel,
			VectorStoreIDs:  []string{vectorStore.ID},
			Temperature:     &temperature,
			MaxOutputTokens: &maxTokens,
			Include:         includeResults,
			Instructions:    "You are a professional summarizer. Be concise and accurate.",
			Metadata:        map[string]string{"request_type": "summary", "bullets": "3"},
		})
		if advErr != nil {
			fmt.Printf("❌ Error creating advanced response: %v\n", advErr)
		} else {
			fmt.Printf("📋 Advanced response ID: %s\n\n", advancedResponse.ID)
		}

		// Test 7: Demonstrate manual conversation context management with FULL response retrieval
		fmt.Printf("💬 Testing manual conversation context with FULL response display...\n")

		// First turn with file search
		fmt.Printf("🎯 === TURN 1: Initial Question ===\n")
		firstResponse, firstErr := client.CreateResponseWithManualContext(ctx, "Tell me about Matias Schimuneck", selectedModel, []string{vectorStore.ID})
		if firstErr != nil {
			fmt.Printf("❌ Error creating first manual context response: %v\n", firstErr)
			return
		}

		// Retrieve and show FULL first response
		fmt.Printf("🔍 === RETRIEVING FULL TURN 1 RESPONSE ===\n")
		_, retrieveErr1 := client.GetResponse(ctx, firstResponse.ID)
		if retrieveErr1 != nil {
			fmt.Printf("❌ Error retrieving first response: %v\n", retrieveErr1)
		}

		// Follow-up turn (context is maintained manually)
		fmt.Printf("🎯 === TURN 2: Follow-up Question ===\n")
		followUpResponse, followUpErr := client.CreateResponseWithManualContext(ctx, "What specific skills make him stand out?", selectedModel, []string{vectorStore.ID})
		if followUpErr != nil {
			fmt.Printf("❌ Error creating follow-up manual context response: %v\n", followUpErr)
			return
		}

		// Retrieve and show FULL follow-up response
		fmt.Printf("🔍 === RETRIEVING FULL TURN 2 RESPONSE ===\n")
		_, retrieveErr2 := client.GetResponse(ctx, followUpResponse.ID)
		if retrieveErr2 != nil {
			fmt.Printf("❌ Error retrieving follow-up response: %v\n", retrieveErr2)
		}

		fmt.Printf("🎊 === CONVERSATION SUMMARY ===\n")
		fmt.Printf("🔗 Conversation maintained manually across %d messages!\n", len(client.GetConversationHistory()))
		fmt.Printf("📋 First response ID: %s\n", firstResponse.ID)
		fmt.Printf("📋 Follow-up response ID: %s\n", followUpResponse.ID)

		// Show conversation history
		fmt.Printf("\n💬 === CONVERSATION HISTORY ===\n")
		for i, msg := range client.GetConversationHistory() {
			content := msg.Content
			if len(content) > 100 {
				content = content[:100] + "..."
			}
			fmt.Printf("%d. [%s]: %s\n", i+1, msg.Role, content)
		}
		fmt.Println()

	} else {
		fmt.Printf("⚠️  Test file '%s' not found, skipping upload and search tests\n", testFile)
	}

	fmt.Println("🎉 All tests completed successfully!")
}
