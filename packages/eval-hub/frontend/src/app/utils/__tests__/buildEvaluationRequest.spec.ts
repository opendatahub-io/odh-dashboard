/* eslint-disable camelcase */
import type { FlatBenchmark, Collection } from '~/app/types';
import buildEvaluationRequest from '~/app/utils/buildEvaluationRequest';

const baseParams = {
  evaluationName: ' My Eval ',
  description: '',
  inputMode: 'inference' as const,
  benchmark: undefined as FlatBenchmark | undefined,
  collection: undefined as Collection | undefined,
  modelName: 'llama-7b',
  endpointUrl: 'http://localhost:8080/v1',
  apiKey: '',
  sourceName: '',
  datasetUrl: '',
  accessToken: '',
  additionalArgs: {} as Record<string, unknown>,
};

const makeBenchmark = (overrides?: Partial<FlatBenchmark>): FlatBenchmark => ({
  id: 'arc_easy',
  name: 'ARC Easy',
  providerId: 'lm_harness',
  primary_score: { metric: 'accuracy', lower_is_better: false },
  pass_criteria: { threshold: 0.5 },
  ...overrides,
});

const makeCollection = (overrides?: Partial<Collection>): Collection => ({
  resource: { id: 'col-1' },
  name: 'My Collection',
  benchmarks: [
    {
      id: 'mmlu',
      provider_id: 'lm_harness',
      weight: 0.6,
      primary_score: { metric: 'accuracy', lower_is_better: false },
      pass_criteria: { threshold: 0.7 },
      parameters: { num_few_shot: 5 },
    },
    {
      id: 'hellaswag',
      provider_id: 'lm_harness',
      weight: 0.4,
    },
  ],
  ...overrides,
});

describe('buildEvaluationRequest', () => {
  describe('basic fields', () => {
    it('should trim the evaluation name', () => {
      const result = buildEvaluationRequest({
        ...baseParams,
        benchmark: makeBenchmark(),
      });
      expect(result.name).toBe('My Eval');
    });

    it('should include description when provided', () => {
      const result = buildEvaluationRequest({
        ...baseParams,
        description: ' some desc ',
        benchmark: makeBenchmark(),
      });
      expect(result.description).toBe('some desc');
    });

    it('should omit description when empty or whitespace-only', () => {
      const result = buildEvaluationRequest({
        ...baseParams,
        description: '   ',
        benchmark: makeBenchmark(),
      });
      expect(result).not.toHaveProperty('description');
    });
  });

  describe('inference mode', () => {
    it('should use modelName and endpointUrl for the model field', () => {
      const result = buildEvaluationRequest({
        ...baseParams,
        benchmark: makeBenchmark(),
      });
      expect(result.model).toEqual({
        url: 'http://localhost:8080/v1',
        name: 'llama-7b',
      });
    });

    it('should include auth when apiKey is provided', () => {
      const result = buildEvaluationRequest({
        ...baseParams,
        apiKey: 'my-secret',
        benchmark: makeBenchmark(),
      });
      expect(result.model.auth).toEqual({ secret_ref: 'my-secret' });
    });

    it('should omit auth when apiKey is empty', () => {
      const result = buildEvaluationRequest({
        ...baseParams,
        benchmark: makeBenchmark(),
      });
      expect(result.model).not.toHaveProperty('auth');
    });

    it('should not include test_data_ref on benchmarks', () => {
      const result = buildEvaluationRequest({
        ...baseParams,
        benchmark: makeBenchmark(),
      });
      expect(result.benchmarks[0]).not.toHaveProperty('test_data_ref');
    });
  });

  describe('prerecorded mode', () => {
    const prerecordedBase = {
      ...baseParams,
      inputMode: 'prerecorded' as const,
      sourceName: ' gpt-4o ',
      datasetUrl: ' s3://bucket/data.jsonl ',
      accessToken: ' tok-123 ',
    };

    it('should use sourceName as model.name and set url to empty', () => {
      const result = buildEvaluationRequest({
        ...prerecordedBase,
        benchmark: makeBenchmark(),
      });
      expect(result.model.name).toBe('gpt-4o');
      expect(result.model.url).toBe('');
    });

    it('should not include model.auth even if apiKey is set', () => {
      const result = buildEvaluationRequest({
        ...prerecordedBase,
        apiKey: 'should-be-ignored',
        benchmark: makeBenchmark(),
      });
      expect(result.model).not.toHaveProperty('auth');
    });

    it('should add test_data_ref with s3 key and secret_ref to benchmarks', () => {
      const result = buildEvaluationRequest({
        ...prerecordedBase,
        benchmark: makeBenchmark(),
      });
      expect(result.benchmarks[0].test_data_ref).toEqual({
        s3: {
          key: 's3://bucket/data.jsonl',
          secret_ref: 'tok-123',
        },
      });
    });

    it('should omit secret_ref when accessToken is empty', () => {
      const result = buildEvaluationRequest({
        ...prerecordedBase,
        accessToken: '',
        benchmark: makeBenchmark(),
      });
      expect(result.benchmarks[0].test_data_ref).toEqual({
        s3: { key: 's3://bucket/data.jsonl' },
      });
    });

    it('should not add test_data_ref when datasetUrl is empty', () => {
      const result = buildEvaluationRequest({
        ...prerecordedBase,
        datasetUrl: '   ',
        benchmark: makeBenchmark(),
      });
      expect(result.benchmarks[0]).not.toHaveProperty('test_data_ref');
    });
  });

  describe('single benchmark flow', () => {
    it('should build a single benchmark entry with id, provider_id, primary_score, pass_criteria', () => {
      const bm = makeBenchmark();
      const result = buildEvaluationRequest({ ...baseParams, benchmark: bm });

      expect(result.benchmarks).toHaveLength(1);
      expect(result.benchmarks[0]).toEqual({
        id: 'arc_easy',
        provider_id: 'lm_harness',
        primary_score: { metric: 'accuracy', lower_is_better: false },
        pass_criteria: { threshold: 0.5 },
      });
    });

    it('should not include collection in the request', () => {
      const result = buildEvaluationRequest({
        ...baseParams,
        benchmark: makeBenchmark(),
      });
      expect(result).not.toHaveProperty('collection');
    });
  });

  describe('collection flow', () => {
    it('should build benchmark entries from collection.benchmarks', () => {
      const col = makeCollection();
      const result = buildEvaluationRequest({ ...baseParams, collection: col });

      expect(result.benchmarks).toHaveLength(2);
      expect(result.benchmarks[0]).toEqual(
        expect.objectContaining({ id: 'mmlu', provider_id: 'lm_harness', weight: 0.6 }),
      );
      expect(result.benchmarks[1]).toEqual(
        expect.objectContaining({ id: 'hellaswag', provider_id: 'lm_harness', weight: 0.4 }),
      );
    });

    it('should preserve existing parameters on collection benchmarks', () => {
      const col = makeCollection();
      const result = buildEvaluationRequest({ ...baseParams, collection: col });

      expect(result.benchmarks[0].parameters).toEqual({ num_few_shot: 5 });
    });

    it('should include collection.id in the request', () => {
      const col = makeCollection();
      const result = buildEvaluationRequest({ ...baseParams, collection: col });

      expect(result.collection).toEqual({ id: 'col-1' });
    });

    it('should not include parameters when collection benchmark has none', () => {
      const col = makeCollection();
      const result = buildEvaluationRequest({ ...baseParams, collection: col });

      expect(result.benchmarks[1]).not.toHaveProperty('parameters');
    });

    it('should add test_data_ref to all collection benchmarks in prerecorded mode', () => {
      const col = makeCollection();
      const result = buildEvaluationRequest({
        ...baseParams,
        inputMode: 'prerecorded',
        sourceName: 'src',
        datasetUrl: 's3://bucket/data',
        accessToken: '',
        collection: col,
      });

      result.benchmarks.forEach((b) => {
        expect(b.test_data_ref).toEqual({ s3: { key: 's3://bucket/data' } });
      });
    });
  });

  describe('additional arguments', () => {
    it('should add non-top-level keys as benchmark parameters', () => {
      const result = buildEvaluationRequest({
        ...baseParams,
        benchmark: makeBenchmark(),
        additionalArgs: { num_examples: 10, limit: 5, tokenizer: 'google/flan-t5-small' },
      });

      expect(result.benchmarks[0].parameters).toEqual({
        num_examples: 10,
        limit: 5,
        tokenizer: 'google/flan-t5-small',
      });
    });

    it('should spread top-level keys (experiment, tags, custom, exports, pass_criteria) onto the request root', () => {
      const experiment = { name: 'test-exp', tags: [{ key: 'env', value: 'test' }] };
      const result = buildEvaluationRequest({
        ...baseParams,
        benchmark: makeBenchmark(),
        additionalArgs: { experiment, custom: { foo: 'bar' } },
      });

      expect(result).toHaveProperty('experiment', experiment);
      expect(result).toHaveProperty('custom', { foo: 'bar' });
    });

    it('should split mixed keys correctly between top-level and benchmark parameters', () => {
      const result = buildEvaluationRequest({
        ...baseParams,
        benchmark: makeBenchmark(),
        additionalArgs: {
          num_examples: 10,
          experiment: { name: 'exp-1' },
          tokenizer: 'gpt2',
          pass_criteria: { threshold: 0.8 },
        },
      });

      expect(result.benchmarks[0].parameters).toEqual({
        num_examples: 10,
        tokenizer: 'gpt2',
      });
      expect(result).toHaveProperty('experiment', { name: 'exp-1' });
      expect(result).toHaveProperty('pass_criteria', { threshold: 0.8 });
    });

    it('should merge additional params with existing collection benchmark parameters', () => {
      const col = makeCollection();
      const result = buildEvaluationRequest({
        ...baseParams,
        collection: col,
        additionalArgs: { limit: 5 },
      });

      expect(result.benchmarks[0].parameters).toEqual({ num_few_shot: 5, limit: 5 });
      expect(result.benchmarks[1].parameters).toEqual({ limit: 5 });
    });

    it('should not add parameters when additionalArgs is empty', () => {
      const result = buildEvaluationRequest({
        ...baseParams,
        benchmark: makeBenchmark(),
        additionalArgs: {},
      });

      expect(result.benchmarks[0]).not.toHaveProperty('parameters');
    });
  });

  describe('edge cases', () => {
    it('should return empty benchmarks when neither benchmark nor collection is provided', () => {
      const result = buildEvaluationRequest(baseParams);
      expect(result.benchmarks).toEqual([]);
    });

    it('should prefer benchmark over collection when both are provided', () => {
      const result = buildEvaluationRequest({
        ...baseParams,
        benchmark: makeBenchmark(),
        collection: makeCollection(),
      });

      expect(result.benchmarks).toHaveLength(1);
      expect(result.benchmarks[0].id).toBe('arc_easy');
    });

    it('should handle collection with no benchmarks array', () => {
      const col = makeCollection({ benchmarks: undefined });
      const result = buildEvaluationRequest({ ...baseParams, collection: col });

      expect(result.benchmarks).toEqual([]);
      expect(result.collection).toEqual({ id: 'col-1' });
    });
  });
});
