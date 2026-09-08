/* eslint-disable camelcase */
import { normalizePattern } from '~/app/hooks/useAutoragResults';
import type { AutoragRawPattern } from '~/app/hooks/patternSchema';

const pattern: AutoragRawPattern = {
  name: 'pattern0',
  iteration: 0,
  max_combinations: 20,
  duration_seconds: 120,
  settings: {
    chunking: { method: 'recursive', chunk_size: 256, chunk_overlap: 128 },
    embedding: { model_id: 'embed', embedding_params: { embedding_dimension: 768 } },
    retrieval: { method: 'window', number_of_chunks: 5 },
    generation: { model_id: 'generate' },
  },
  evaluation: {
    metrics: [
      {
        evaluator: 'unitxt',
        name: 'faithfulness',
        description: 'Unitxt faithfulness',
        scores: { mean: 0.8, ci_low: 0.7, ci_high: 0.9 },
      },
      {
        evaluator: 'ragas',
        name: 'faithfulness',
        description: 'Ragas faithfulness',
        scores: { mean: 0.6, ci_low: 0.5, ci_high: 0.7 },
        optimization_metric: true,
      },
    ],
  },
};

describe('normalizePattern', () => {
  it('should pass through the strict pattern without synthesizing legacy scores', () => {
    expect(normalizePattern(pattern)).toEqual(pattern);
  });
});
