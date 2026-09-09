package models

// --- Responses API (endpoint 1) ---

type InputContent struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

type InputMessage struct {
	Type    string         `json:"type"`
	Role    string         `json:"role"`
	Content []InputContent `json:"content"`
}

type RankingOptions struct {
	Ranker       string  `json:"ranker,omitempty"`
	Alpha        float64 `json:"alpha,omitempty"`
	ImpactFactor float64 `json:"impact_factor,omitempty"`
}

type FileSearchTool struct {
	Type           string         `json:"type"`
	VectorStoreIDs []string       `json:"vector_store_ids"`
	MaxNumResults  int            `json:"max_num_results,omitempty"`
	RankingOptions RankingOptions `json:"ranking_options,omitempty"`
}

type ToolChoice struct {
	Type string `json:"type"`
}

type ResponsesRequest struct {
	Model           string            `json:"model"`
	Input           []InputMessage    `json:"input"`
	Instructions    string            `json:"instructions,omitempty"`
	Tools           []FileSearchTool  `json:"tools,omitempty"`
	ToolChoice      *ToolChoice       `json:"tool_choice,omitempty"`
	Temperature     float64           `json:"temperature,omitempty"`
	MaxOutputTokens int               `json:"max_output_tokens,omitempty"`
	Stream          bool              `json:"stream,omitempty"`
	Store           bool              `json:"store,omitempty"`
	Include         []string          `json:"include,omitempty"`
	Metadata        map[string]string `json:"metadata,omitempty"`
}

// --- RAG response ---

type SourceChunk struct {
	Text  string  `json:"text"`
	Score float32 `json:"score"`
}

type RAGResponse struct {
	Answer  string        `json:"answer"`
	Sources []SourceChunk `json:"sources,omitempty"`
}

// --- Streaming SSE event types (Responses API format) ---

type StreamResponseMeta struct {
	ID        string `json:"id"`
	Model     string `json:"model"`
	Status    string `json:"status"`
	CreatedAt int64  `json:"created_at"`
}

type StreamOutputItem struct {
	ID      string                `json:"id"`
	Type    string                `json:"type"`
	Role    string                `json:"role"`
	Status  string                `json:"status"`
	Queries []string              `json:"queries,omitempty"`
	Content []StreamOutputContent `json:"content,omitempty"`
	Output  string                `json:"output"`
}

type StreamOutputContent struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

type StreamResponseMetaFull struct {
	ID        string             `json:"id"`
	Model     string             `json:"model"`
	Status    string             `json:"status"`
	CreatedAt int64              `json:"created_at"`
	Output    []StreamOutputItem `json:"output,omitempty"`
}

type StreamEvent struct {
	Type           string             `json:"type"`
	SequenceNumber int                `json:"sequence_number,omitempty"`
	OutputIndex    int                `json:"output_index,omitempty"`
	ItemID         string             `json:"item_id,omitempty"`
	Delta          string             `json:"delta,omitempty"`
	Response       StreamResponseMeta `json:"response"`
}

type StreamEventCompleted struct {
	Type           string                 `json:"type"`
	SequenceNumber int                    `json:"sequence_number"`
	OutputIndex    int                    `json:"output_index"`
	Response       StreamResponseMetaFull `json:"response"`
}

type StreamMetricsUsage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
	TotalTokens  int `json:"total_tokens"`
}

type StreamMetrics struct {
	LatencyMs        int64              `json:"latency_ms"`
	TimeToFirstToken int64              `json:"time_to_first_token_ms"`
	Usage            StreamMetricsUsage `json:"usage"`
}

type StreamEventMetrics struct {
	Type    string        `json:"type"`
	Metrics StreamMetrics `json:"metrics"`
}

// RAGStreamResult holds the result of a streaming RAG operation.
type RAGStreamResult struct {
	Answer       string
	Sources      []SourceChunk
	InputTokens  int
	OutputTokens int
	LatencyMs    int64
	FirstTokenMs int64
}
