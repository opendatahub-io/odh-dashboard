/* eslint-disable camelcase */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import {
  CanonicalPatternSchema,
  isCanonicalRawPattern,
  parsePatternArtifact,
} from '~/app/hooks/patternSchema';
import { normalizePattern } from '~/app/hooks/useAutoragResults';
import { getOptimizedScore } from '~/app/utilities/metricUtils';
import { LegacyPatternSchema } from '~/app/hooks/legacyPattern';

const baseSettings = {
  chunking: { method: 'recursive', chunk_size: 256, chunk_overlap: 128 },
  embedding: { model_id: 'embed-model', embedding_params: { embedding_dimension: 768 } },
  retrieval: { method: 'window', number_of_chunks: 5 },
  generation: { model_id: 'gen-model' },
};

const baseFields = { name: 'pattern0', iteration: 0, max_combinations: 20, duration_seconds: 120 };

const legacyPattern = {
  ...baseFields,
  settings: {
    ...baseSettings,
    vector_store: { datasource_type: 'milvus', collection_name: 'col0' },
  },
  scores: { faithfulness: { mean: 0.8, ci_low: 0.7, ci_high: 0.9 } },
  final_score: 0.7,
};

const canonicalPattern = {
  ...baseFields,
  settings: {
    ...baseSettings,
    vector_store_binding: {
      provider_type: 'milvus',
      collection_name: 'col0',
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
};

const bundledPatternsDirectory = path.resolve(
  __dirname,
  '../../../../../bff/internal/fake/s3-bucket/documents-rag-optimization-pipeline/e78c5f2a-5726-4e1c-bcb6-60434e77e453/rag-templates-optimization/e9920e43-b0cc-497a-ac3a-c7ee794a7787/rag_patterns',
);

describe('CanonicalPatternSchema', () => {
  it('should parse canonical evaluator-qualified aggregate metrics', () => {
    const result = CanonicalPatternSchema.safeParse(canonicalPattern);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.evaluation.metrics[1]).toMatchObject({
        evaluator: 'custom',
        name: 'overall_score',
      });
    }
  });

  it('should parse the delivered canonical binding shape', () => {
    const result = CanonicalPatternSchema.safeParse({
      ...canonicalPattern,
      settings: {
        ...canonicalPattern.settings,
        vector_store_binding: { provider_type: 'milvus', collection_name: 'run-collection' },
      },
    });

    expect(result.success).toBe(true);
  });

  it('should normalize a legacy vector_store_id in a canonical artifact', () => {
    const result = parsePatternArtifact({
      ...canonicalPattern,
      inference: { responses_template: { model: 'test' } },
      settings: {
        ...canonicalPattern.settings,
        vector_store_binding: {
          provider_id: 'milvus',
          provider_type: 'milvus',
          vector_store_id: 'legacy-collection',
        },
      },
    });

    expect(isCanonicalRawPattern(result)).toBe(true);
    if (isCanonicalRawPattern(result)) {
      expect(result.settings.vector_store_binding).toEqual({
        provider_id: 'milvus',
        provider_type: 'milvus',
        vector_store_id: 'legacy-collection',
        collection_name: 'legacy-collection',
      });
      expect(result.inference?.responses_template).toEqual({ model: 'test' });
    }
  });

  it('should prefer collection_name when both binding fields exist', () => {
    const result = CanonicalPatternSchema.safeParse({
      ...canonicalPattern,
      settings: {
        ...canonicalPattern.settings,
        vector_store_binding: {
          provider_type: 'milvus',
          collection_name: 'canonical-collection',
          vector_store_id: 'legacy-collection',
        },
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.settings.vector_store_binding?.collection_name).toBe(
        'canonical-collection',
      );
    }
  });

  it('should reject a canonical binding with neither collection field', () => {
    const result = CanonicalPatternSchema.safeParse({
      ...canonicalPattern,
      settings: {
        ...canonicalPattern.settings,
        vector_store_binding: { provider_type: 'milvus' },
      },
    });

    expect(result.success).toBe(false);
  });

  it('should preserve nullable canonical aggregate scores', () => {
    const result = CanonicalPatternSchema.safeParse({
      ...canonicalPattern,
      evaluation: {
        metrics: [
          {
            evaluator: 'judge',
            name: 'answer_relevance',
            scores: { mean: null, ci_low: null, ci_high: null },
          },
        ],
      },
    });
    expect(result.success).toBe(true);
  });

  it('should reject non-finite canonical aggregate scores', () => {
    const nonFiniteScore = JSON.parse('{"mean":1e999}');
    const result = CanonicalPatternSchema.safeParse({
      ...canonicalPattern,
      evaluation: {
        metrics: [
          {
            ...canonicalPattern.evaluation.metrics[1],
            scores: { ...canonicalPattern.evaluation.metrics[1].scores, mean: nonFiniteScore.mean },
          },
        ],
      },
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-finite canonical row scores', () => {
    const nonFiniteScore = JSON.parse('{"mean":1e999}');
    const result = CanonicalPatternSchema.safeParse({
      ...canonicalPattern,
      evaluation: {
        metrics: [
          {
            ...canonicalPattern.evaluation.metrics[0],
            scores: { ...canonicalPattern.evaluation.metrics[0].scores, mean: nonFiniteScore.mean },
          },
        ],
      },
    });
    expect(result.success).toBe(false);
  });

  it('should reject whitespace-only model IDs', () => {
    const result = CanonicalPatternSchema.safeParse({
      ...canonicalPattern,
      settings: {
        ...canonicalPattern.settings,
        embedding: { ...canonicalPattern.settings.embedding, model_id: '   ' },
      },
    });
    expect(result.success).toBe(false);
  });

  it('should reject malformed canonical patterns', () => {
    expect(CanonicalPatternSchema.safeParse({ name: 'bad', evaluation: {} }).success).toBe(false);
  });
});

describe('LegacyPatternSchema', () => {
  it('should parse persisted final_score and scores fields', () => {
    expect(LegacyPatternSchema.safeParse(legacyPattern).success).toBe(true);
  });

  it('should reject mixed legacy fields without canonical evaluation data', () => {
    expect(LegacyPatternSchema.safeParse({ ...legacyPattern, final_score: 'bad' }).success).toBe(
      false,
    );
  });
});

describe('parsePatternArtifact', () => {
  it('should dispatch canonical artifacts by explicit evaluation presence', () => {
    const parsed = parsePatternArtifact({ ...canonicalPattern, scores: {} });
    expect(isCanonicalRawPattern(parsed)).toBe(true);
  });

  it('should dispatch legacy artifacts by explicit scores presence', () => {
    const parsed = parsePatternArtifact(legacyPattern);
    expect(isCanonicalRawPattern(parsed)).toBe(false);
  });

  it('should prefer the canonical path when evaluation is explicitly present', () => {
    expect(isCanonicalRawPattern(parsePatternArtifact({ ...canonicalPattern, scores: {} }))).toBe(
      true,
    );
  });

  it('should reject malformed artifacts', () => {
    expect(() => parsePatternArtifact({ name: 'bad' })).toThrow();
  });

  it('should parse every bundled canonical fixture with inference responses only', () => {
    const patternNames = readdirSync(bundledPatternsDirectory)
      .filter((name) => /^Pattern\d+$/.test(name))
      .toSorted();

    expect(patternNames).toHaveLength(8);

    patternNames.forEach((patternName) => {
      const fixture = JSON.parse(
        readFileSync(path.join(bundledPatternsDirectory, patternName, 'pattern.json'), 'utf8'),
      ) as Record<string, unknown>;
      const parsed = parsePatternArtifact(fixture);

      expect(isCanonicalRawPattern(parsed)).toBe(true);
      if (isCanonicalRawPattern(parsed)) {
        expect(parsed.inference?.responses_template).toBeDefined();
        expect((parsed.settings as Record<string, unknown>).responses_template).toBeUndefined();
      }
    });
  });

  it('should preserve Pattern1 objective metadata for final score display', () => {
    const fixture = JSON.parse(
      readFileSync(path.join(bundledPatternsDirectory, 'Pattern1', 'pattern.json'), 'utf8'),
    ) as Record<string, unknown>;
    const parsed = parsePatternArtifact(fixture);

    expect(isCanonicalRawPattern(parsed)).toBe(true);
    if (isCanonicalRawPattern(parsed)) {
      const optimizationMetrics = parsed.evaluation.metrics.filter(
        (metric) => metric.optimization_metric === true,
      );

      expect(optimizationMetrics).toHaveLength(1);
      expect(optimizationMetrics[0]).toMatchObject({
        evaluator: 'unitxt',
        name: 'faithfulness',
      });
      expect(getOptimizedScore(normalizePattern(parsed))).toBe(0.5895);
    }
  });
});
