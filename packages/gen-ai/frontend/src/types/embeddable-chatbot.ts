import type React from 'react';

/**
 * OpenAI Responses API template structure used by AutoRAG to define
 * how queries should be sent to the OGX (Open GenAI Stack) instance.
 */
type ResponsesTemplate = {
  model: string;
  stream: boolean;
  store: boolean;
  input: Array<{
    type: 'message';
    role: 'user';
    content: Array<{
      type: 'input_text';
      text: string;
    }>;
  }>;
  metadata: {
    autorag_run_id: string;
    rag_pattern_name: string;
  };
  instructions: string;
  tools: Array<{
    type: 'file_search';
    vector_store_ids: string[];
    max_num_results: number;
    ranking_options: {
      search_mode: 'hybrid' | 'keyword' | 'semantic';
      ranker_strategy: 'rrf' | 'linear' | 'cross_encoder';
      ranker_k: number;
      ranker_alpha: number;
    };
  }>;
  tool_choice: {
    type: 'auto' | 'required' | 'none' | 'file_search';
  };
  include: Array<'file_search_call.results' | 'file_search_call.output'>;
};

/**
 * Props for the EmbeddableChatbotPlayground component exposed
 * via Module Federation for consumption by other packages (e.g., AutoRAG).
 */
type EmbeddableChatbotPlaygroundProps = {
  namespace: string;
  secretName: string;
  responsesTemplate: ResponsesTemplate;
  patternName?: string;
  /** Base path for the BFF API, e.g. '/gen-ai/api/v1'. No trailing slash. If '/api/v1' is omitted it is appended automatically. */
  bffBasePath: string;
  /** Custom content rendered in place of the default welcome prompt when no messages are present. */
  welcomeContent?: React.ReactNode;
  /** Custom text for the initial bot message. Pass empty string to hide it entirely. */
  placeholderBotContent?: string;
};

export type { ResponsesTemplate, EmbeddableChatbotPlaygroundProps };
