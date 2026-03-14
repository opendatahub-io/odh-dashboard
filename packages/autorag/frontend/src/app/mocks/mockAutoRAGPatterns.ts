/* eslint-disable camelcase */
import type { AutoRAGPattern } from '~/app/types/autoragPattern';

const basePattern = {
  max_combinations: 20,
  duration_seconds: 0,
  settings: {
    vector_store: { datasource_type: 'ls_milvus', collection_name: 'collection0' },
    chunking: { method: 'recursive', chunk_size: 256, chunk_overlap: 128 },
    embedding: { model_id: 'mock-embed-a', distance_metric: 'cosine' },
    retrieval: { method: 'window', number_of_chunks: 5 },
    generation: {
      model_id: '',
      context_template_text: '{document}',
      user_message_text: '',
      system_message_text: '',
    },
  },
  scores: {
    answer_correctness: { mean: 0.5, ci_low: 0.4, ci_high: 0.7 },
    faithfulness: { mean: 0.2, ci_low: 0.1, ci_high: 0.5 },
    context_correctness: { mean: 1.0, ci_low: 0.9, ci_high: 1.0 },
  },
  final_score: 0.5,
};

const models = [
  'granite-3.1-8b-instruct',
  'llama-3.3-70b-instruct',
  'mistral-7b-instruct-v0.3',
  'deepseek-r1-distill-llama-70b',
  'qwen-2.5-72b-instruct',
];

const makePattern = (index: number, modelId: string): AutoRAGPattern => ({
  ...basePattern,
  name: `pattern${index}`,
  iteration: index,
  settings: {
    ...basePattern.settings,
    generation: { ...basePattern.settings.generation, model_id: modelId },
  },
  scores: {
    ...basePattern.scores,
    answer_correctness: { mean: 0.4 + Math.random() * 0.4, ci_low: 0.3, ci_high: 0.8 },
    faithfulness: { mean: 0.3 + Math.random() * 0.5, ci_low: 0.1, ci_high: 0.7 },
  },
  final_score: 0.4 + Math.random() * 0.4,
});

export const mockAutoRAGPatterns: AutoRAGPattern[] = [
  makePattern(0, models[0]),
  makePattern(1, models[0]),
  makePattern(2, models[0]),
  makePattern(3, models[0]),
  makePattern(4, models[1]),
  makePattern(5, models[1]),
  makePattern(6, models[1]),
  makePattern(7, models[2]),
  makePattern(8, models[2]),
  makePattern(9, models[2]),
  makePattern(10, models[2]),
  makePattern(11, models[2]),
  makePattern(12, models[3]),
  makePattern(13, models[3]),
  makePattern(14, models[3]),
  makePattern(15, models[4]),
  makePattern(16, models[4]),
  makePattern(17, models[4]),
  makePattern(18, models[4]),
  makePattern(19, models[4]),
];
