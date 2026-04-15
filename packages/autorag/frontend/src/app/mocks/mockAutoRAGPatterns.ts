/* eslint-disable camelcase */
import type { AutoragPattern } from '~/app/types/autoragPattern';

const basePattern = {
  max_combinations: 20,
  duration_seconds: 0,
  settings: {
    vector_store: { datasource_type: 'milvus', collection_name: 'collection0' },
    chunking: { method: 'recursive', chunk_size: 256, chunk_overlap: 128 },
    embedding: {
      model_id: 'mock-embed-a',
      distance_metric: 'cosine',
      embedding_params: {
        embedding_dimension: 768,
        context_length: 512,
        timeout: null,
        model_type: null,
        provider_id: null,
        provider_resource_id: null,
      },
    },
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

// Simple seeded PRNG for deterministic mock data
// Using a seed ensures mock patterns are consistent across test runs,
// which is critical for snapshot testing and reproducible test results
const seededRandom = (seed: number): number => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const makePattern = (index: number, modelId: string): AutoragPattern => {
  // Generate deterministic values based on index
  const finalScore = 0.4 + seededRandom(index * 3) * 0.4;
  const acMean = 0.4 + seededRandom(index * 3 + 1) * 0.4;
  const faithMean = 0.3 + seededRandom(index * 3 + 2) * 0.5;

  // Ensure CI bounds are consistent: ci_low <= mean <= ci_high
  const acDeltaLow = 0.1;
  const acDeltaHigh = 0.2;
  const faithDeltaLow = 0.15;
  const faithDeltaHigh = 0.25;

  return {
    ...basePattern,
    name: `pattern${index}`,
    iteration: index,
    settings: {
      ...basePattern.settings,
      generation: { ...basePattern.settings.generation, model_id: modelId },
    },
    scores: {
      ...basePattern.scores,
      answer_correctness: {
        mean: acMean,
        ci_low: Math.max(0, acMean - acDeltaLow),
        ci_high: Math.min(1, acMean + acDeltaHigh),
      },
      faithfulness: {
        mean: faithMean,
        ci_low: Math.max(0, faithMean - faithDeltaLow),
        ci_high: Math.min(1, faithMean + faithDeltaHigh),
      },
    },
    final_score: finalScore,
  };
};

export const mockAutoragPatterns: AutoragPattern[] = [
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
