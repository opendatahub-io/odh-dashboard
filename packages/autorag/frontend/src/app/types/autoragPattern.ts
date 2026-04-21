export type AutoragPatternScoreMetric = {
  mean: number;
  ci_low: number | null;
  ci_high: number | null;
};

export type AutoragPatternScores = Partial<Record<string, AutoragPatternScoreMetric>>;

export type AutoragPatternSettings = {
  vector_store: {
    datasource_type: string;
    collection_name: string;
  };
  chunking: {
    method: string;
    chunk_size: number;
    chunk_overlap: number;
  };
  embedding: {
    model_id: string;
    distance_metric: string;
    embedding_params: {
      embedding_dimension: number;
      context_length: number;
      timeout: null | number;
      model_type: null | string;
      provider_id: null | string;
      provider_resource_id: null | string;
    };
  };
  retrieval: {
    method: string;
    number_of_chunks: number;
    search_mode?: string;
    ranker_strategy?: string;
  };
  generation: {
    model_id: string;
    context_template_text: string;
    user_message_text: string;
    system_message_text: string;
  };
};

export type AutoragPattern = {
  name: string;
  iteration: number;
  max_combinations: number;
  duration_seconds: number;
  settings: AutoragPatternSettings;
  scores: AutoragPatternScores;
  final_score: number;
};

export type AutoRAGEvaluationAnswerContext = {
  text: string;
  document_id: string;
};

export type AutoRAGEvaluationScores = {
  answer_correctness: number;
  faithfulness: number;
  context_correctness: number;
};

export type AutoRAGEvaluationResult = {
  question: string;
  correct_answers: string[];
  question_id?: string;
  answer: string;
  answer_contexts: AutoRAGEvaluationAnswerContext[];
  scores: AutoRAGEvaluationScores;
};
