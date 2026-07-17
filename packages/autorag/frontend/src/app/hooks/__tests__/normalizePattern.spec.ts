/* eslint-disable camelcase */
import { normalizePattern } from '~/app/hooks/useAutoragResults';
import type { AutoragRawPatternV1, AutoragRawPatternV2 } from '~/app/hooks/patternSchema';

const baseSettings = {
  chunking: { method: 'recursive', chunk_size: 256, chunk_overlap: 128 },
  embedding: {
    model_id: 'embed-model',
    embedding_params: { embedding_dimension: 768 },
  },
  retrieval: { method: 'window', number_of_chunks: 5 },
  generation: { model_id: 'gen-model' },
};

const baseFields = {
  name: 'pattern0',
  iteration: 0,
  max_combinations: 20,
  duration_seconds: 120,
};

describe('normalizePattern', () => {
  describe('V1 patterns', () => {
    const v1: AutoragRawPatternV1 = {
      ...baseFields,
      settings: {
        ...baseSettings,
        vector_store: { datasource_type: 'milvus', collection_name: 'col0' },
      },
      scores: {
        faithfulness: { mean: 0.8, ci_low: 0.7, ci_high: 0.9 },
        answer_correctness: { mean: 0.6, ci_low: 0.5, ci_high: 0.7 },
      },
      final_score: 0.7,
    };

    it('should convert V1 scores to evaluation.metrics', () => {
      const result = normalizePattern(v1);
      // 2 original metrics + 1 synthesized overall_score
      expect(result.evaluation.metrics).toHaveLength(3);
      expect(result.evaluation.metrics[0]).toEqual({
        evaluator: 'unitxt',
        name: 'faithfulness',
        scores: { mean: 0.8, ci_low: 0.7, ci_high: 0.9 },
      });
    });

    it('should synthesize overall_score metric from final_score', () => {
      const result = normalizePattern(v1);
      const overallScore = result.evaluation.metrics.find((m) => m.optimization_metric);
      expect(overallScore).toBeDefined();
      expect(overallScore?.name).toBe('overall_score');
      expect(overallScore?.scores.mean).toBe(0.7);
    });

    it('should mark the synthesized overall_score metric as optimization_metric', () => {
      const result = normalizePattern(v1);
      const overallScore = result.evaluation.metrics.find((m) => m.name === 'overall_score');
      expect(overallScore?.optimization_metric).toBe(true);
    });

    it('should synthesize vector_store_binding from vector_store', () => {
      const result = normalizePattern(v1, 'my-provider');
      expect(result.settings.vector_store_binding).toEqual({
        provider_id: 'my-provider',
        provider_type: 'milvus',
        vector_store_id: 'col0',
      });
    });

    it('should use empty provider_id when vectorIoProviderId is not given', () => {
      const result = normalizePattern(v1);
      expect(result.settings.vector_store_binding?.provider_id).toBe('');
    });

    it('should prefer existing vector_store_binding over vector_store', () => {
      const v1WithBinding: AutoragRawPatternV1 = {
        ...v1,
        settings: {
          ...v1.settings,
          vector_store_binding: {
            provider_id: 'existing',
            provider_type: 'pgvector',
            vector_store_id: 'vs-1',
          },
        },
      };
      const result = normalizePattern(v1WithBinding);
      expect(result.settings.vector_store_binding).toEqual({
        provider_id: 'existing',
        provider_type: 'pgvector',
        vector_store_id: 'vs-1',
      });
    });

    it('should move responses_template to inference block', () => {
      const v1WithTemplate: AutoragRawPatternV1 = {
        ...v1,
        settings: { ...v1.settings, responses_template: { model: 'test' } },
      };
      const result = normalizePattern(v1WithTemplate);
      expect(result.inference?.responses_template).toEqual({ model: 'test' });
    });

    it('should leave inference undefined when no responses_template', () => {
      const result = normalizePattern(v1);
      expect(result.inference).toBeUndefined();
    });

    it('should replace existing overall_score in scores rather than duplicate', () => {
      const v1WithOverallScore: AutoragRawPatternV1 = {
        ...v1,
        scores: {
          ...v1.scores,
          overall_score: { mean: 0.99, ci_low: 0.9, ci_high: 1.0 },
        },
        final_score: 0.7,
      };
      const result = normalizePattern(v1WithOverallScore);
      const overallScores = result.evaluation.metrics.filter((m) => m.name === 'overall_score');
      expect(overallScores).toHaveLength(1);
      expect(overallScores[0].scores.mean).toBe(0.7);
      expect(overallScores[0].optimization_metric).toBe(true);
    });
  });

  describe('V2 patterns', () => {
    const v2: AutoragRawPatternV2 = {
      ...baseFields,
      settings: {
        ...baseSettings,
        vector_store_binding: {
          provider_id: 'prov-1',
          provider_type: 'milvus',
          vector_store_id: 'col0',
        },
      },
      evaluation: {
        metrics: [
          {
            evaluator: 'unitxt',
            name: 'faithfulness',
            scores: { mean: 0.8, ci_low: 0.7, ci_high: 0.9 },
          },
          {
            evaluator: 'custom',
            name: 'overall_score',
            scores: { mean: 0.8, ci_low: null, ci_high: null },
            optimization_metric: true,
          },
        ],
      },
      inference: { responses_template: { model: 'test' } },
      indexing: {
        pipeline_spec: {
          pipeline_name: 'pipe',
          parameters: {},
          overrides_allowed: [],
        },
      },
    };

    it('should pass V2 pattern through with all fields', () => {
      const result = normalizePattern(v2);
      expect(result.evaluation).toEqual(v2.evaluation);
      expect(result.inference).toEqual(v2.inference);
      expect(result.indexing).toEqual(v2.indexing);
      expect(result.settings).toEqual(v2.settings);
    });

    it('should preserve name and top-level fields', () => {
      const result = normalizePattern(v2);
      expect(result.name).toBe('pattern0');
      expect(result.iteration).toBe(0);
      expect(result.max_combinations).toBe(20);
      expect(result.duration_seconds).toBe(120);
    });
  });
});
