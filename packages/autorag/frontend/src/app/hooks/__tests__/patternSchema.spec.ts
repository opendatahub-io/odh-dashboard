/* eslint-disable camelcase */
import { AutoragPatternSchema, isV1RawPattern } from '~/app/hooks/patternSchema';

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

const v1Pattern = {
  ...baseFields,
  settings: {
    ...baseSettings,
    vector_store: { datasource_type: 'milvus', collection_name: 'col0' },
    responses_template: { model: 'test' },
  },
  scores: {
    faithfulness: { mean: 0.8, ci_low: 0.7, ci_high: 0.9 },
    answer_correctness: { mean: 0.6, ci_low: 0.5, ci_high: 0.7 },
  },
  final_score: 0.7,
};

const v2Pattern = {
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
  inference: {
    responses_template: { model: 'test' },
  },
  indexing: {
    pipeline_spec: {
      pipeline_name: 'index-pipe',
      parameters: { key: 'val' },
      overrides_allowed: ['chunk_size'],
    },
  },
};

describe('AutoragPatternSchema', () => {
  it('should parse a valid V2 pattern', () => {
    const result = AutoragPatternSchema.safeParse(v2Pattern);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('pattern0');
      expect('evaluation' in result.data).toBe(true);
    }
  });

  it('should parse a valid V1 pattern', () => {
    const result = AutoragPatternSchema.safeParse(v1Pattern);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('pattern0');
      expect('scores' in result.data).toBe(true);
    }
  });

  it('should parse a V2 pattern with null metric mean', () => {
    const patternWithNullMean = {
      ...v2Pattern,
      evaluation: {
        metrics: [
          {
            evaluator: 'judge',
            name: 'answer_relevance',
            scores: { mean: null, ci_low: null, ci_high: null },
          },
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
    const result = AutoragPatternSchema.safeParse(patternWithNullMean);
    expect(result.success).toBe(true);
  });

  it('should parse a V1 pattern with null metric mean', () => {
    const v1WithNullMean = {
      ...v1Pattern,
      scores: {
        ...v1Pattern.scores,
        answer_relevance: { mean: null, ci_low: null, ci_high: null },
      },
    };
    const result = AutoragPatternSchema.safeParse(v1WithNullMean);
    expect(result.success).toBe(true);
  });

  it('should reject data missing required fields', () => {
    const result = AutoragPatternSchema.safeParse({ name: 'bad' });
    expect(result.success).toBe(false);
  });

  it('should preserve extra fields via passthrough', () => {
    const extended = { ...v2Pattern, extra_field: 'hello' };
    const result = AutoragPatternSchema.safeParse(extended);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>).extra_field).toBe('hello');
    }
  });

  it('should parse V2 pattern without optional inference/indexing blocks', () => {
    const minimal = { ...v2Pattern };
    delete (minimal as Record<string, unknown>).inference;
    delete (minimal as Record<string, unknown>).indexing;
    const result = AutoragPatternSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it('should parse V1 pattern without optional vector_store', () => {
    const settings = { ...v1Pattern.settings };
    delete (settings as Record<string, unknown>).vector_store;
    const result = AutoragPatternSchema.safeParse({ ...v1Pattern, settings });
    expect(result.success).toBe(true);
  });
});

describe('isV1RawPattern', () => {
  it('should return true for a V1 pattern (has scores, no evaluation)', () => {
    const parsed = AutoragPatternSchema.parse(v1Pattern);
    expect(isV1RawPattern(parsed)).toBe(true);
  });

  it('should return false for a V2 pattern (has evaluation, no scores)', () => {
    const parsed = AutoragPatternSchema.parse(v2Pattern);
    expect(isV1RawPattern(parsed)).toBe(false);
  });

  it('should return false for a V2 pattern that also has a passthrough scores field', () => {
    const hybrid = { ...v2Pattern, scores: {} };
    const parsed = AutoragPatternSchema.parse(hybrid);
    // V2 schema matches first due to union order, so evaluation is present
    expect(isV1RawPattern(parsed)).toBe(false);
  });
});
