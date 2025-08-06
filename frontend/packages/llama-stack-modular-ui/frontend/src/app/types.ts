export type LlamaModelType = 'llm' | 'embedding';

export type LlamaModel = {
  identifier: string;
  metadata: Record<string, boolean | number | string | Array<unknown> | unknown | null>;
  model_type: LlamaModelType;
  provider_id: string;
  type: 'model';
  provider_resource_id?: string;
};

export type VectorDB = {
  embedding_dimension: string;
  embedding_model: string;
  identifier: string;
  provider_id: string;
  provider_resource_id: string;
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
  }[];
};

export type Query = {
  content: string;
  vector_db_ids: string[];
  query_config: {
    chunk_template: string;
    max_chunks: number;
    max_tokens_in_context: number;
  };
  llm_model_id: string;
  sampling_params: {
    strategy: {
      type: string;
    };
    max_tokens: number;
  };
};

export type QueryResponse = {
  chat_completion: {
    completion_message: {
      role: string;
      content: string;
      stop_reason: string;
    };
  };
};

// Roles must be 'user' and 'assistant' according to the Llama Stack API
export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  stop_reason?: string;
};
