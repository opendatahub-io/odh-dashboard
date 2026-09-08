/* eslint-disable camelcase */
import { AutoragPatternSchema } from '~/app/hooks/patternSchema';

const validPattern = {
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
        scores: { mean: 0.7, ci_low: 0.6, ci_high: 0.8 },
        optimization_metric: true,
      },
    ],
  },
};

describe('AutoragPatternSchema', () => {
  it('should parse a strict ADR-0004 pattern', () => {
    expect(AutoragPatternSchema.safeParse(validPattern).success).toBe(true);
  });

  it('should reject legacy top-level scores and final_score-only patterns', () => {
    expect(
      AutoragPatternSchema.safeParse({
        ...validPattern,
        evaluation: undefined,
        scores: {},
        final_score: 1,
      }).success,
    ).toBe(false);
  });

  it('should require metric descriptions and scores', () => {
    const metric = { ...validPattern.evaluation.metrics[0] };
    delete (metric as Record<string, unknown>).description;
    expect(
      AutoragPatternSchema.safeParse({
        ...validPattern,
        evaluation: { metrics: [metric, validPattern.evaluation.metrics[1]] },
      }).success,
    ).toBe(false);
  });

  it('should require exactly one optimization metric', () => {
    const noOptimization = {
      ...validPattern,
      evaluation: {
        metrics: validPattern.evaluation.metrics.map((metric) => {
          const copy = { ...metric };
          delete copy.optimization_metric;
          return copy;
        }),
      },
    };
    const twoOptimizations = {
      ...validPattern,
      evaluation: {
        metrics: validPattern.evaluation.metrics.map((metric) => ({
          ...metric,
          optimization_metric: true,
        })),
      },
    };
    expect(AutoragPatternSchema.safeParse(noOptimization).success).toBe(false);
    expect(AutoragPatternSchema.safeParse(twoOptimizations).success).toBe(false);
  });

  it('should preserve unrelated passthrough fields', () => {
    const result = AutoragPatternSchema.safeParse({ ...validPattern, extra_field: 'kept' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.extra_field).toBe('kept');
    }
  });
});
