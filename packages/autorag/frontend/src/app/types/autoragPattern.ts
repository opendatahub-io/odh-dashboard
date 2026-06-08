import type React from 'react';

export type AutoragPatternScoreMetric = {
  mean: number;
  ci_low: number | null;
  ci_high: number | null;
};

export type AutoragPatternScores = Partial<Record<string, AutoragPatternScoreMetric>>;

import type { ResponsesTemplate } from '@odh-dashboard/gen-ai/types';

export type { ResponsesTemplate } from '@odh-dashboard/gen-ai/types';

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
  responses_template?: ResponsesTemplate;
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
