export type LlamaModelType = 'llm' | 'embedding';

export type LlamaModel = {
  identifier: string;
  metadata: Record<string, boolean | number | string | Array<unknown> | unknown | null>;
  model_type: LlamaModelType;
  provider_id: string;
  provider_resource_id: string;
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

export type Query = {
  content: string;
  vector_db_ids?: string[];
  query_config?: {
    chunk_template: string;
    max_chunks: number;
    max_tokens_in_context: number;
  };
  llm_model_id: string;
  sampling_params?: {
    strategy: {
      type: string;
    };
    max_tokens: number;
  };
  system_prompt?: string;
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

export type QueryResponseMetadata = {
  document_ids: string[];
  chunks: string[];
  scores: number[];
};

export type QueryResponse = {
  rag_response: {
    content: {
      type: string;
      text: string;
    }[];
    metadata: QueryResponseMetadata;
  };
  chat_completion: {
    metrics: Metric[];
    completion_message: CompletionMessage;
    logprobs?: unknown | null;
  };
  has_rag_content: boolean;
  used_vector_dbs: boolean;
  assistant_message: string;
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
