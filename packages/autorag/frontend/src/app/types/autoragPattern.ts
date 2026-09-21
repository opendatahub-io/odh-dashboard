import type React from 'react';

export type AutoragPatternScoreMetric = {
  mean: number | null;
  ci_low: number | null;
  ci_high: number | null;
};

export type AutoragPatternScores = Partial<Record<string, AutoragPatternScoreMetric>>;

/** Shared metric identity used by aggregate and sample evaluation results. */
export type MetricReference = Readonly<{
  name: string;
  evaluator?: string;
}>;

/** Canonical metric identity used for comparisons and opaque UI keys. */
export type NormalizedMetricReference = Readonly<{
  name: string;
  evaluator?: string;
}>;

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
  vector_store_binding?: AutoragLegacyVectorStoreBinding;
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

export type AutoragLegacyVectorStoreBinding = {
  provider_id: string;
  provider_type: string;
  /** Possibly null when the pipeline did not bind a collection */
  vector_store_id: string | null;
};

export type AutoragVectorStoreBinding = {
  provider_type: string;
  collection_name: string;
};

export type AutoragEvaluationMetric = MetricReference & {
  evaluator: string;
  description?: string;
  scores: AutoragPatternScoreMetric;
  model_id?: string;
  // Backend marker for the selected objective metric. The run's `optimization_metric` pipeline
  // parameter remains authoritative when this marker is absent on a pattern.
  optimization_metric?: boolean;
};

export type AutoragEvaluation = {
  metrics: AutoragEvaluationMetric[];
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
    ranker_alpha?: number;
  };
  generation: {
    model_id: string;
    temperature?: number;
    max_completion_tokens?: number;
    context_template_text?: string;
    user_message_text?: string;
    system_message_text?: string;
    language?: DetectedLanguageMetadata;
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
  document_key: string;
};

export type AutoRAGEvaluationMetricResult = MetricReference & {
  evaluator: string;
  score: number | null;
};

export type AutoRAGEvaluationResult = {
  question: string;
  correct_answers: string[];
  question_id?: string;
  answer: string;
  answer_contexts: AutoRAGEvaluationAnswerContext[];
  metrics: AutoRAGEvaluationMetricResult[];
};

/**
 * Bundled pattern data passed to tab components in the pattern details modal.
 */
export type PatternDataBundle = {
  pattern: AutoragPattern;
  rank?: number;
  evaluationResults?: AutoRAGEvaluationResult[];
  isEvaluationLoading: boolean;
  isEvaluationError: boolean;
};

/**
 * Props passed to every tab component in the pattern details modal.
 */
export type TabContentProps = {
  primaryPattern: PatternDataBundle;
  comparisonPattern: PatternDataBundle | null;
  optimizationMetric?: MetricReference;
  onChangeComparisonPattern?: () => void;
};

/**
 * Definition for a single tab in the pattern details modal sidebar.
 */
export type TabDefinition = {
  key: string;
  label: string;
  tooltip: string;
  description?: string;
  section: 'Pattern configuration' | 'Retrieval & generation';
  component: React.ComponentType<TabContentProps>;
};
