export type LlamaModelType = 'llm' | 'embedding';

export type LlamaModel = {
  identifier: string;
  metadata: Record<string, boolean | number | string | Array<unknown> | unknown | null>;
  model_type: LlamaModelType;
  provider_id: string;
  provider_resource_id: string;
};

export type VectorDB = {
  identifier: string;
  provider_id: string;
  provider_resource_id: string;
  embedding_dimension?: number;
  embedding_model?: string;
};

export type ChatbotSourceSettings = {
  embeddingModel: string;
  vectorDB: string;
  delimiter: string;
  maxChunkLength: string;
  chunkOverlap: string;
};

export type Source = {
  documents: {
    document_id: string;
    content: string;
    metadata?: Record<string, string>;
  }[];
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
};

export type SuccessResponse = {
  message?: string;
  vector_db_id?: string;
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
