import type React from 'react';

export type AutoragPatternScoreMetric = {
  mean: number;
  ci_low: number | null;
  ci_high: number | null;
};

export type AutoragPatternScores = Partial<Record<string, AutoragPatternScoreMetric>>;

import type { ResponsesTemplate } from '@odh-dashboard/gen-ai/types';

export type { ResponsesTemplate } from '@odh-dashboard/gen-ai/types';

export type DetectedLanguageMetadata = {
  code: string;
  name: string;
};

// ---------------------------------------------------------------------------
// V1 (legacy) schema — pattern.json before RHOAIENG-75826
// ---------------------------------------------------------------------------

export type AutoragPatternSettingsV1 = {
  vector_store?: {
    datasource_type: string;
    collection_name: string;
  };
  vector_store_binding?: AutoragVectorStoreBinding;
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
    /** Populated by the AutoRAG pipeline after language detection (pipelines-components PR #116). */
    detected_language?: DetectedLanguageMetadata;
  };
  responses_template?: ResponsesTemplate;
};

export type AutoragPatternV1 = {
  name: string;
  iteration: number;
  max_combinations: number;
  duration_seconds: number;
  settings: AutoragPatternSettingsV1;
  scores: AutoragPatternScores;
  final_score: number;
};

// ---------------------------------------------------------------------------
// V2 (current) schema — inference-oriented structure
// ---------------------------------------------------------------------------

export type AutoragVectorStoreBinding = {
  provider_id: string;
  provider_type: string;
  vector_store_id: string;
};

export type AutoragEvaluator = 'unitxt' | 'judge' | 'custom';

export type AutoragEvaluationMetric = {
  evaluator: AutoragEvaluator;
  name: string;
  description?: string;
  scores: AutoragPatternScoreMetric;
  model_id?: string;
};

export type AutoragEvaluation = {
  metrics: AutoragEvaluationMetric[];
  optimization_metric: string;
  final_score: number;
};

export type AutoragIndexingPipelineSpec = {
  pipeline_name: string;
  parameters: Record<string, unknown>;
  overrides_allowed: string[];
};

export type AutoragPatternSettings = {
  vector_store_binding?: AutoragVectorStoreBinding;
  chunking: {
    method: string;
    chunk_size: number;
    chunk_overlap: number;
  };
  embedding: {
    model_id: string;
    distance_metric?: string;
    embedding_params: {
      embedding_dimension: number;
      context_length?: number;
      timeout?: null | number;
      model_type?: null | string;
      provider_id?: null | string;
      provider_resource_id?: null | string;
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
    context_template_text?: string;
    user_message_text?: string;
    system_message_text?: string;
    detected_language?: DetectedLanguageMetadata;
  };
};

export type AutoragPattern = {
  name: string;
  iteration: number;
  max_combinations: number;
  duration_seconds: number;
  settings: AutoragPatternSettings;
  evaluation: AutoragEvaluation;
  inference?: {
    responses_template?: ResponsesTemplate;
  };
  indexing?: {
    pipeline_spec?: AutoragIndexingPipelineSpec;
  };
};

// ---------------------------------------------------------------------------
// Evaluation result types
// ---------------------------------------------------------------------------

export type AutoRAGEvaluationAnswerContext = {
  text: string;
  document_id: string;
};

export type AutoRAGEvaluationMetricResult = {
  name: string;
  evaluator: string;
  score: number;
};

export type AutoRAGEvaluationResult = {
  question: string;
  correct_answers: string[];
  question_id?: string;
  answer: string;
  answer_contexts: AutoRAGEvaluationAnswerContext[];
  metrics: AutoRAGEvaluationMetricResult[];
};

export type ScoreType = 'mean' | 'ci_high' | 'ci_low';

/**
 * Bundled pattern data passed to tab components in the pattern details modal.
 */
export type PatternDataBundle = {
  pattern: AutoragPattern;
  rank: number;
  evaluationResults?: AutoRAGEvaluationResult[];
  isEvaluationLoading: boolean;
};

/**
 * Props passed to every tab component in the pattern details modal.
 */
export type TabContentProps = {
  primaryPattern: PatternDataBundle;
  comparisonPattern: PatternDataBundle | null;
  optimizedMetric?: string;
  scoreType: ScoreType;
  onScoreTypeChange?: (type: ScoreType) => void;
  onChangeComparisonPattern?: () => void;
};

/**
 * Definition for a single tab in the pattern details modal sidebar.
 */
export type TabDefinition = {
  key: string;
  label: string;
  component: React.ComponentType<TabContentProps>;
};
