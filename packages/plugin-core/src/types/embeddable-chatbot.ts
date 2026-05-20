/**
 * Configuration for which playground features are visible in embedded mode.
 * When used standalone (full mode), all flags default to `true`.
 * When provided via the embedded wrapper, flags default to `false`.
 */
type PlaygroundFeatureConfig = {
  showModelPicker?: boolean;
  showMcpServerConfig?: boolean;
  showRagToggle?: boolean;
  showCompareMode?: boolean;
  showViewCodeModal?: boolean;
  showNewChatModal?: boolean;
  showSystemInstructions?: boolean;
  showGuardrailConfig?: boolean;
};

/**
 * OpenAI Responses API template structure used by AutoRAG to define
 * how queries should be sent to the OGX instance.
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
      search_mode: string;
      ranker_strategy: string;
      ranker_k: number;
      ranker_alpha: number;
    };
  }>;
  tool_choice: {
    type: string;
  };
  include: string[];
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
  bffBasePath: string;
  features?: PlaygroundFeatureConfig;
};

export type { PlaygroundFeatureConfig, ResponsesTemplate, EmbeddableChatbotPlaygroundProps };
