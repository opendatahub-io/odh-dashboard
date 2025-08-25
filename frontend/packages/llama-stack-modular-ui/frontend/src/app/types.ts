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
};

export type SimplifiedUsage = {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
};

export type SimplifiedResponseData = {
  id: string;
  model: string;
  status: string;
  created_at: number;
  content: string;
  usage?: SimplifiedUsage; // Optional - only present when Llama Stack API returns token data
};

export type SuccessResponse = {
  message?: string;
  vector_db_id?: string;
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
