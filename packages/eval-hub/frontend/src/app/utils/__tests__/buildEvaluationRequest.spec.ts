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
  apiKeySecretRef: '',
  sourceName: '',
  datasetUrl: '',
  accessToken: '',
  additionalArgs: {} as Record<string, unknown>,
};

const makeBenchmark = (overrides?: Partial<FlatBenchmark>): FlatBenchmark => ({
  id: 'arc_easy',
  name: 'ARC Easy',
  providerId: 'lm_harness',
  providerName: 'LM Evaluation Harness',
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

    it('should include auth when apiKeySecretRef is provided', () => {
      const result = buildEvaluationRequest({
        ...baseParams,
        apiKeySecretRef: 'my-model-credentials',
        benchmark: makeBenchmark(),
      });
      expect(result.model.auth).toEqual({ secret_ref: 'my-model-credentials' });
    });

    it('should omit auth when apiKeySecretRef is empty', () => {
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
      expect(result.benchmarks![0]).not.toHaveProperty('test_data_ref');
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

    it('should not include model.auth even if apiKeySecretRef is set', () => {
      const result = buildEvaluationRequest({
        ...prerecordedBase,
        apiKeySecretRef: 'should-be-ignored',
        benchmark: makeBenchmark(),
      });
      expect(result.model).not.toHaveProperty('auth');
    });

    it('should add test_data_ref with s3 key and secret_ref to benchmarks', () => {
      const result = buildEvaluationRequest({
        ...prerecordedBase,
        benchmark: makeBenchmark(),
      });
      expect(result.benchmarks![0].test_data_ref).toEqual({
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
      expect(result.benchmarks![0].test_data_ref).toEqual({
        s3: { key: 's3://bucket/data.jsonl' },
      });
    });

    it('should not add test_data_ref when datasetUrl is empty', () => {
      const result = buildEvaluationRequest({
        ...prerecordedBase,
        datasetUrl: '   ',
        benchmark: makeBenchmark(),
      });
      expect(result.benchmarks![0]).not.toHaveProperty('test_data_ref');
    });
  });

  describe('single benchmark flow', () => {
    it('should build a single benchmark entry with id, provider_id, primary_score, pass_criteria', () => {
      const bm = makeBenchmark();
      const result = buildEvaluationRequest({ ...baseParams, benchmark: bm });

      expect(result.benchmarks).toHaveLength(1);
      expect(result.benchmarks![0]).toEqual({
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
    it('should include collection.id with benchmark configs and omit top-level benchmarks', () => {
      const col = makeCollection();
      const result = buildEvaluationRequest({ ...baseParams, collection: col });

      expect(result.collection).toEqual({
        id: 'col-1',
        benchmarks: [
          {
            id: 'mmlu',
            provider_id: 'lm_harness',
            primary_score: { metric: 'accuracy', lower_is_better: false },
            pass_criteria: { threshold: 0.7 },
          },
          {
            id: 'hellaswag',
            provider_id: 'lm_harness',
            primary_score: undefined,
            pass_criteria: undefined,
          },
        ],
      });
      expect(result).not.toHaveProperty('benchmarks');
    });

    it('should include collection.id in the request', () => {
      const col = makeCollection();
      const result = buildEvaluationRequest({ ...baseParams, collection: col });

      expect(result.collection?.id).toBe('col-1');
    });

    it('should not include top-level benchmarks when using a collection', () => {
      const col = makeCollection();
      const result = buildEvaluationRequest({ ...baseParams, collection: col });

      expect(result).not.toHaveProperty('benchmarks');
    });

    it('should handle collection with no benchmarks', () => {
      const col = makeCollection({ benchmarks: undefined });
      const result = buildEvaluationRequest({ ...baseParams, collection: col });

      expect(result.collection).toEqual({ id: 'col-1', benchmarks: undefined });
      expect(result).not.toHaveProperty('benchmarks');
    });
  });

  describe('additional arguments', () => {
    it('should add non-top-level keys as benchmark parameters', () => {
      const result = buildEvaluationRequest({
        ...baseParams,
        benchmark: makeBenchmark(),
        additionalArgs: { num_examples: 10, limit: 5, tokenizer: 'google/flan-t5-small' },
      });

      expect(result.benchmarks![0].parameters).toEqual({
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

      expect(result.benchmarks![0].parameters).toEqual({
        num_examples: 10,
        tokenizer: 'gpt2',
      });
      expect(result).toHaveProperty('experiment', { name: 'exp-1' });
      expect(result).toHaveProperty('pass_criteria', { threshold: 0.8 });
    });

    it('should still apply top-level keys from additionalArgs when using a collection', () => {
      const col = makeCollection();
      const experiment = { name: 'col-exp' };
      const result = buildEvaluationRequest({
        ...baseParams,
        collection: col,
        additionalArgs: { limit: 5, experiment },
      });

      expect(result).not.toHaveProperty('benchmarks');
      expect(result.collection?.id).toBe('col-1');
      expect(result).toHaveProperty('experiment', experiment);
    });

    it('should not add parameters when additionalArgs is empty', () => {
      const result = buildEvaluationRequest({
        ...baseParams,
        benchmark: makeBenchmark(),
        additionalArgs: {},
      });

      expect(result.benchmarks![0]).not.toHaveProperty('parameters');
    });
  });

  describe('experimentName parameter', () => {
    it('should set experiment.name when experimentName is provided', () => {
      const result = buildEvaluationRequest({
        ...baseParams,
        benchmark: makeBenchmark(),
        experimentName: 'my-experiment',
      });

      expect(result.experiment).toEqual({ name: 'my-experiment' });
    });

    it('should omit experiment when experimentName is undefined', () => {
      const result = buildEvaluationRequest({
        ...baseParams,
        benchmark: makeBenchmark(),
      });

      expect(result).not.toHaveProperty('experiment');
    });

    it('should use experimentName for name but preserve tags from additionalArgs', () => {
      const result = buildEvaluationRequest({
        ...baseParams,
        benchmark: makeBenchmark(),
        experimentName: 'from-selector',
        additionalArgs: { experiment: { name: 'from-args', tags: [{ key: 'k', value: 'v' }] } },
      });

      expect(result.experiment).toEqual({
        name: 'from-selector',
        tags: [{ key: 'k', value: 'v' }],
      });
    });

    it('should merge artifact_location from additionalArgs when experimentName is provided', () => {
      const result = buildEvaluationRequest({
        ...baseParams,
        benchmark: makeBenchmark(),
        experimentName: 'my-exp',
        additionalArgs: {
          experiment: { name: 'ignored', artifact_location: 's3://bucket/artifacts' },
        },
      });

      expect(result.experiment).toEqual({
        name: 'my-exp',
        artifact_location: 's3://bucket/artifacts',
      });
    });

    it('should fall back to experiment from additionalArgs when experimentName is not provided', () => {
      const experiment = { name: 'from-args', tags: [{ key: 'env', value: 'test' }] };
      const result = buildEvaluationRequest({
        ...baseParams,
        benchmark: makeBenchmark(),
        additionalArgs: { experiment },
      });

      expect(result.experiment).toEqual(experiment);
    });

    it('should work with collection flow', () => {
      const col = makeCollection();
      const result = buildEvaluationRequest({
        ...baseParams,
        collection: col,
        experimentName: 'col-experiment',
      });

      expect(result.experiment).toEqual({ name: 'col-experiment' });
      expect(result.collection?.id).toBe('col-1');
      expect(result).not.toHaveProperty('benchmarks');
    });

    it('should treat empty string experimentName as no experiment', () => {
      const result = buildEvaluationRequest({
        ...baseParams,
        benchmark: makeBenchmark(),
        experimentName: '',
      });

      expect(result).not.toHaveProperty('experiment');
    });

    it('should ignore non-object experiment in additionalArgs', () => {
      const result = buildEvaluationRequest({
        ...baseParams,
        benchmark: makeBenchmark(),
        additionalArgs: { experiment: 'not-an-object' },
      });

      expect(result).not.toHaveProperty('experiment');
    });

    it('should include experimentTags when provided with experimentName', () => {
      const result = buildEvaluationRequest({
        ...baseParams,
        benchmark: makeBenchmark(),
        experimentName: 'EvalHub',
        experimentTags: [{ key: 'context', value: 'eval-hub' }],
      });

      expect(result.experiment).toEqual({
        name: 'EvalHub',
        tags: [{ key: 'context', value: 'eval-hub' }],
      });
    });

    it('should omit experimentTags when experimentName is not provided', () => {
      const result = buildEvaluationRequest({
        ...baseParams,
        benchmark: makeBenchmark(),
        experimentTags: [{ key: 'context', value: 'eval-hub' }],
      });

      expect(result).not.toHaveProperty('experiment');
    });

    it('should not interfere with other top-level overrides when experimentName is set', () => {
      const result = buildEvaluationRequest({
        ...baseParams,
        benchmark: makeBenchmark(),
        experimentName: 'my-exp',
        additionalArgs: {
          custom: { foo: 'bar' },
          tags: ['perf-test'],
          experiment: { name: 'ignored' },
        },
      });

      expect(result.experiment).toEqual({ name: 'my-exp' });
      expect(result).toHaveProperty('custom', { foo: 'bar' });
      expect(result).toHaveProperty('tags', ['perf-test']);
    });
  });

  describe('edge cases', () => {
    it('should return empty benchmarks when neither benchmark nor collection is provided', () => {
      const result = buildEvaluationRequest(baseParams);
      expect(result.benchmarks).toEqual([]);
    });

    it('should prefer collection over benchmark when both are provided', () => {
      const result = buildEvaluationRequest({
        ...baseParams,
        benchmark: makeBenchmark(),
        collection: makeCollection(),
      });

      expect(result.collection?.id).toBe('col-1');
      expect(result).not.toHaveProperty('benchmarks');
    });

    it('should handle collection with no benchmarks array', () => {
      const col = makeCollection({ benchmarks: undefined });
      const result = buildEvaluationRequest({ ...baseParams, collection: col });

      expect(result).not.toHaveProperty('benchmarks');
      expect(result.collection).toEqual({ id: 'col-1', benchmarks: undefined });
    });
  });
});
