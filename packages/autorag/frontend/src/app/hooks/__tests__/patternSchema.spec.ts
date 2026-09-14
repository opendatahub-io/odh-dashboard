/* eslint-disable camelcase */
import {
  CanonicalPatternSchema,
  isCanonicalRawPattern,
  parsePatternArtifact,
} from '~/app/hooks/patternSchema';
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
};

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
});
