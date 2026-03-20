export type AutoMLPatternScoreMetric = {
  mean: number;
  ci_low: number;
  ci_high: number;
};

export type AutoMLPatternScores = {
  answer_correctness?: AutoMLPatternScoreMetric;
  faithfulness?: AutoMLPatternScoreMetric;
  context_correctness?: AutoMLPatternScoreMetric;
};

export type AutoMLPatternSettings = {
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
  };
  retrieval: {
    method: string;
    number_of_chunks: number;
  };
  generation: {
    model_id: string;
    context_template_text: string;
    user_message_text: string;
    system_message_text: string;
  };
};

export type AutoMLPattern = {
  name: string;
  iteration: number;
  max_combinations: number;
  duration_seconds: number;
  settings: AutoMLPatternSettings;
  scores: AutoMLPatternScores;
  final_score: number;
};
