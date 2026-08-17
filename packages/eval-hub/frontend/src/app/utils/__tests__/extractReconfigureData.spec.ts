import { mockEvaluationJob } from '~/__tests__/unit/testUtils/mockEvaluationData';
import type { Collection, EvaluationJob, InferenceServiceItem } from '~/app/types';
import extractReconfigureData, { inferSourceMode } from '~/app/utils/extractReconfigureData';

const mockInferenceService = (name: string, url?: string): InferenceServiceItem => ({
  name,
  url,
  ready: true,
});

/* eslint-disable camelcase */

describe('inferSourceMode', () => {
  it('should return prerecorded when benchmark has test_data_ref', () => {
    const job = mockEvaluationJob();
    job.benchmarks = [{ id: 'b1', test_data_ref: { s3: { key: 's3://bucket/data' } } }];

    expect(inferSourceMode(job, [])).toEqual({
      sourceMode: 'prerecorded',
      modelSelection: 'external',
    });
  });

  it('should return prerecorded when collection benchmark has test_data_ref', () => {
    const job = mockEvaluationJob({ collectionId: 'col-1' });
    job.collection = {
      id: 'col-1',
      benchmarks: [{ id: 'b1', test_data_ref: { s3: { key: 's3://bucket/data' } } }],
    };
    job.benchmarks = null;

    expect(inferSourceMode(job, [])).toEqual({
      sourceMode: 'prerecorded',
      modelSelection: 'external',
    });
  });

  it('should return model/cluster when model name matches an inference service', () => {
    const job = mockEvaluationJob({ modelName: 'my-model' });
    const services = [mockInferenceService('my-model', 'http://svc/v1')];

    expect(inferSourceMode(job, services)).toEqual({
      sourceMode: 'model',
      modelSelection: 'cluster',
    });
  });

  it('should return agent/external when model has url but no matching service', () => {
    const job = mockEvaluationJob({ modelName: 'external-agent' });
    job.model.url = 'https://agent.example.com/v1';

    expect(inferSourceMode(job, [])).toEqual({
      sourceMode: 'agent',
      modelSelection: 'external',
    });
  });

  it('should return model/external when no url and no matching service', () => {
    const job = mockEvaluationJob({ modelName: 'unknown-model' });

    expect(inferSourceMode(job, [])).toEqual({
      sourceMode: 'model',
      modelSelection: 'external',
    });
  });
});

describe('extractReconfigureData', () => {
  it('should extract basic fields from a job', () => {
    const job = mockEvaluationJob({ name: 'My Eval', modelName: 'test-model' });
    job.model.url = 'https://endpoint.example.com/v1';
    job.model.auth = { secret_ref: 'my-secret' };
    job.experiment = { name: 'my-experiment' };

    const result = extractReconfigureData(job, []);

    expect(result.evaluationName).toBe('My Eval');
    expect(result.modelName).toBe('test-model');
    expect(result.endpointUrl).toBe('https://endpoint.example.com/v1');
    expect(result.apiKeySecretRef).toBe('my-secret');
    expect(result.experimentName).toBe('my-experiment');
  });

  it('should set selectedInferenceService when model matches a cluster service', () => {
    const job = mockEvaluationJob({ modelName: 'cluster-model' });
    const services = [mockInferenceService('cluster-model', 'http://svc/v1')];

    const result = extractReconfigureData(job, services);

    expect(result.sourceMode).toBe('model');
    expect(result.modelSelection).toBe('cluster');
    expect(result.selectedInferenceService).toEqual(services[0]);
  });

  it('should not set selectedInferenceService for external models', () => {
    const job = mockEvaluationJob({ modelName: 'ext-model' });
    job.model.url = 'https://ext.example.com/v1';

    const result = extractReconfigureData(job, []);

    expect(result.selectedInferenceService).toBeUndefined();
  });

  it('should construct a FlatBenchmark for single-benchmark jobs', () => {
    const job = mockEvaluationJob({ benchmarkId: 'mmlu', providerId: 'lm_eval' });
    job.benchmarks = [
      {
        id: 'mmlu',
        provider_id: 'lm_eval',
        primary_score: { metric: 'accuracy', lower_is_better: false },
        pass_criteria: { threshold: 0.8 },
      },
    ];

    const result = extractReconfigureData(job, []);

    expect(result.isCollectionFlow).toBe(false);
    expect(result.benchmark).toEqual({
      id: 'mmlu',
      providerId: 'lm_eval',
      providerName: '',
      name: 'mmlu',
      primary_score: { metric: 'accuracy', lower_is_better: false },
      pass_criteria: { threshold: 0.8 },
      metrics: ['accuracy'],
    });
    expect(result.collection).toBeUndefined();
  });

  it('should construct a Collection for collection-flow jobs', () => {
    const job = mockEvaluationJob({ collectionId: 'safety-suite' });
    job.collection = {
      id: 'safety-suite',
      benchmarks: [
        { id: 'b1', provider_id: 'p1', parameters: { num_fewshot: 5 } },
        { id: 'b2', provider_id: 'p2' },
      ],
    };
    job.benchmarks = null;
    job.pass_criteria = { threshold: 0.75 };

    const result = extractReconfigureData(job, []);

    expect(result.isCollectionFlow).toBe(true);
    expect(result.benchmark).toBeUndefined();
    expect(result.collection).toEqual({
      resource: { id: 'safety-suite' },
      name: 'safety-suite',
      pass_criteria: { threshold: 0.75 },
      benchmarks: [
        {
          id: 'b1',
          provider_id: 'p1',
          primary_score: undefined,
          pass_criteria: undefined,
          parameters: { num_fewshot: 5 },
        },
        {
          id: 'b2',
          provider_id: 'p2',
          primary_score: undefined,
          pass_criteria: undefined,
          parameters: undefined,
        },
      ],
    });
  });

  it('should extract threshold from pass_criteria', () => {
    const job = mockEvaluationJob();
    job.pass_criteria = { threshold: 0.75 };

    const result = extractReconfigureData(job, []);

    expect(result.threshold).toBe(75);
  });

  it('should default threshold to 0 when no pass_criteria', () => {
    const job = mockEvaluationJob();

    const result = extractReconfigureData(job, []);

    expect(result.threshold).toBe(0);
  });

  it('should extract primary metric from first benchmark', () => {
    const job = mockEvaluationJob();
    job.benchmarks = [
      {
        id: 'b1',
        primary_score: { metric: 'f1_score', lower_is_better: false },
      },
    ];

    const result = extractReconfigureData(job, []);

    expect(result.primaryMetric).toBe('f1_score');
  });

  it('should extract benchmark parameters as JSON', () => {
    const job = mockEvaluationJob();
    job.benchmarks = [{ id: 'b1', parameters: { num_fewshot: 5, limit: 100 } }];

    const result = extractReconfigureData(job, []);

    expect(result.additionalArgs).toBe(JSON.stringify({ num_fewshot: 5, limit: 100 }, null, 2));
  });

  it('should return empty additionalArgs when no parameters', () => {
    const job = mockEvaluationJob();
    job.benchmarks = [{ id: 'b1' }];

    const result = extractReconfigureData(job, []);

    expect(result.additionalArgs).toBe('');
  });

  it('should extract prerecorded fields from test_data_ref', () => {
    const job = mockEvaluationJob({ modelName: 'dataset-source' });
    job.benchmarks = [
      {
        id: 'b1',
        test_data_ref: {
          s3: { key: 's3://my-bucket/data.jsonl', secret_ref: 'access-token-123' },
        },
      },
    ];

    const result = extractReconfigureData(job, []);

    expect(result.sourceMode).toBe('prerecorded');
    expect(result.sourceName).toBe('dataset-source');
    expect(result.datasetUrl).toBe('s3://my-bucket/data.jsonl');
    expect(result.accessToken).toBe('access-token-123');
  });

  it('should extract prerecorded fields when only a later benchmark has test_data_ref', () => {
    const job = mockEvaluationJob({ modelName: 'dataset-source', collectionId: 'col-1' });
    job.collection = {
      id: 'col-1',
      benchmarks: [
        { id: 'b1', provider_id: 'p1' },
        {
          id: 'b2',
          provider_id: 'p2',
          test_data_ref: {
            s3: { key: 's3://bucket/later.jsonl', secret_ref: 'token-456' },
          },
        },
      ],
    };
    job.benchmarks = null;

    const result = extractReconfigureData(job, []);

    expect(result.sourceMode).toBe('prerecorded');
    expect(result.datasetUrl).toBe('s3://bucket/later.jsonl');
    expect(result.accessToken).toBe('token-456');
  });

  it('should default prerecorded fields when no benchmark has test_data_ref', () => {
    const job = mockEvaluationJob({ modelName: 'dataset-source' });
    job.benchmarks = [{ id: 'b1' }];
    job.model.url = 'https://ext.example.com/v1';

    const result = extractReconfigureData(job, []);

    expect(result.datasetUrl).toBe('');
    expect(result.accessToken).toBe('');
  });

  it('should fall back to resource id for evaluation name when name is not set', () => {
    const job = mockEvaluationJob({ id: 'fallback-id' });

    const result = extractReconfigureData(job, []);

    expect(result.evaluationName).toBe('fallback-id');
  });

  it('should handle job with no benchmarks', () => {
    const job: EvaluationJob = {
      ...mockEvaluationJob(),
      benchmarks: null,
    };

    const result = extractReconfigureData(job, []);

    expect(result.benchmark).toBeUndefined();
    expect(result.primaryMetric).toBeUndefined();
    expect(result.additionalArgs).toBe('');
  });

  it('should populate benchmarks from resolvedCollection when job.collection has only id', () => {
    const job = mockEvaluationJob({ collectionId: 'col-only' });
    job.pass_criteria = { threshold: 0.8 };

    const resolved: Collection = {
      resource: { id: 'col-only' },
      name: 'My Collection',
      benchmarks: [
        {
          id: 'rb1',
          provider_id: 'prov-a',
          primary_score: { metric: 'acc', lower_is_better: false },
        },
        { id: 'rb2', provider_id: 'prov-b' },
      ],
    };

    const result = extractReconfigureData(job, [], resolved);

    expect(result.isCollectionFlow).toBe(true);
    expect(result.collection).toEqual({
      resource: { id: 'col-only' },
      name: 'My Collection',
      pass_criteria: { threshold: 0.8 },
      benchmarks: resolved.benchmarks,
    });
  });

  it('should prefer job.collection.benchmarks over resolvedCollection when both exist', () => {
    const job = mockEvaluationJob({ collectionId: 'col-both' });
    job.collection = {
      id: 'col-both',
      benchmarks: [{ id: 'jb1', provider_id: 'jp1' }],
    };
    job.benchmarks = null;

    const resolved: Collection = {
      resource: { id: 'col-both' },
      name: 'Resolved Name',
      benchmarks: [
        { id: 'rb1', provider_id: 'rp1' },
        { id: 'rb2', provider_id: 'rp2' },
      ],
    };

    const result = extractReconfigureData(job, [], resolved);

    expect(result.collection?.benchmarks).toEqual([
      {
        id: 'jb1',
        provider_id: 'jp1',
        primary_score: undefined,
        pass_criteria: undefined,
        parameters: undefined,
      },
    ]);
  });

  it('should fall back to resolvedCollection.benchmarks when job.collection.benchmarks is empty', () => {
    const job = mockEvaluationJob({ collectionId: 'col-empty-bench', modelName: 'my-model' });
    job.collection = { id: 'col-empty-bench', benchmarks: [] };
    job.benchmarks = null;
    job.pass_criteria = { threshold: 0.85 };

    const resolved: Collection = {
      resource: { id: 'col-empty-bench' },
      name: 'S3 Collection',
      benchmarks: [
        {
          id: 's3-bench-1',
          provider_id: 'unitxt',
          primary_score: { metric: 'f1', lower_is_better: false },
          parameters: { template: 'default' },
        },
      ],
    };

    const result = extractReconfigureData(job, [], resolved);

    expect(result.isCollectionFlow).toBe(true);
    expect(result.sourceMode).not.toBe('prerecorded');
    expect(result.primaryMetric).toBe('f1');
    expect(result.additionalArgs).toBe(JSON.stringify({ template: 'default' }, null, 2));
    expect(result.collection).toEqual({
      resource: { id: 'col-empty-bench' },
      name: 'S3 Collection',
      pass_criteria: { threshold: 0.85 },
      benchmarks: [
        {
          id: 's3-bench-1',
          provider_id: 'unitxt',
          primary_score: { metric: 'f1', lower_is_better: false },
          parameters: { template: 'default' },
        },
      ],
    });
  });

  it('should use collection id as name when resolvedCollection is absent', () => {
    const job = mockEvaluationJob({ collectionId: 'no-resolved' });

    const result = extractReconfigureData(job, []);

    expect(result.collection?.name).toBe('no-resolved');
  });
});

/* eslint-enable camelcase */
