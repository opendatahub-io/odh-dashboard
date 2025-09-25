export type LlamaModelType = 'llm' | 'embedding';

export type LlamaModel = {
  id: string;
  object: string;
  created: number;
  owned_by: string;
};

export type FileCounts = {
  /** Number of cancelled file operations */
  cancelled: number;
  /** Number of successfully processed files */
  completed: number;
  /** Number of files that failed processing */
  failed: number;
  /** Number of files currently being processed */
  in_progress: number;
  /** Total number of files in vector store */
  total: number;
};

export type VectorStore = {
  /** Unix timestamp when vector store was created */
  created_at: number;
  /** File processing counts */
  file_counts: FileCounts;
  /** Unique vector store identifier */
  id: string;
  /** Unix timestamp of last activity */
  last_active_at: number;
  /** Key-value metadata (max 16 pairs, keys ≤64 chars, values ≤512 chars) */
  metadata: {
    description?: string;
    [key: string]: string | undefined;
  };
  /** Human-readable name (max 256 characters) */
  name: string;
  /** Object type (always "vector_store") */
  object: string;
  /** Vector store processing status */
  status: 'pending' | 'completed' | 'failed';
  /** Storage usage in bytes */
  usage_bytes: number;
};

export type ChatbotSourceSettings = {
  embeddingModel: string;
  vectorStore: string;
  delimiter?: string;
  maxChunkLength?: number;
  chunkOverlap?: number;
};

export type Source = {
  file: File;
};

export enum ChatMessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
}

export type ChatContextMessage = {
  role: ChatMessageRole;
  content: string;
};

export type CreateResponseRequest = {
  input: string;
  model: string;
  vector_store_ids?: string[];
  chat_context?: ChatContextMessage[];
  temperature?: number;
  top_p?: number;
  instructions?: string;
  stream?: boolean;
};

export type SimplifiedUsage = {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
};

// Backend response types (matches the actual API structure)
export type ContentItem = {
  type: string;
  text: string;
};

export type OutputItem = {
  id?: string;
  type: string;
  role?: string;
  status?: string;
  content?: ContentItem[];
};

export type BackendResponseData = {
  id: string;
  model: string;
  status: string;
  created_at: number;
  output?: OutputItem[];
  usage?: SimplifiedUsage;
};

// Frontend-friendly response type (flattened)
export type SimplifiedResponseData = {
  id: string;
  model: string;
  status: string;
  created_at: number;
  content: string;
  usage?: SimplifiedUsage; // Optional - only present when Llama Stack API returns token data
};

export type FileError = {
  code: string;
  message: string;
};

export type ChunkingStrategyResult = {
  static?: {
    chunk_overlap_tokens?: number;
    max_chunk_size_tokens?: number;
  };
  type: 'auto' | 'static';
};

export type VectorStoreFile = {
  attributes: {
    description?: string;
  };
  chunking_strategy: ChunkingStrategyResult;
  created_at: number;
  id: string;
  last_error?: FileError;
  object: string;
  status: 'pending' | 'completed' | 'failed';
  usage_bytes: number;
  vector_store_id: string;
};

export type FileUploadResult = {
  file_id: string;
  vector_store_file: VectorStoreFile;
};

// Roles must be 'user' and 'assistant' according to the Llama Stack API
export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  stop_reason?: string;
};

export type Metric = {
  /** Name of the metric
   * @example "completion_tokens"
   */
  metric: string;

  /** Value of the metric */
  value: unknown;

  /** Unit of the metric */
  unit?: unknown;
};

export type CompletionMessage = {
  role: string;
  content: string;
  stop_reason: string;
  tool_calls?: unknown[];
};

export type CodeExportTool = {
  type: string;
  vector_store_ids: string[];
};

export type CodeExportRequest = {
  input: string;
  instructions?: string;
  model: string;
  stream?: boolean;
  temperature?: number;
  tools?: CodeExportTool[];
};

export type CodeExportData = {
  code: string;
};

export type CodeExportResponse = {
  data: CodeExportData;
};

export type LlamaStackDistributionModel = {
  name: string;
  phase: 'Initializing' | 'Ready' | 'Failed' | 'Terminating' | 'Pending';
  version: string;
  distributionConfig: {
    activeDistribution: string;
    providers: Array<{
      providerID: string;
      providerType: string;
      api: string;
      config?: Record<string, unknown> | null;
      health: {
        status: string;
        message: string;
      };
    }>;
    availableDistributions: Record<string, string>;
  };
};

export interface AAModelResponse {
  model_name: string;
  serving_runtime: string;
  api_protocol: string;
  version: string;
  usecase: string;
  description: string;
  endpoints: string[];
}

export interface AIModel extends AAModelResponse {
  id: string;
  playgroundStatus: string;
  // Parse endpoints into usable format
  internalEndpoint?: string;
  externalEndpoint?: string;
}
