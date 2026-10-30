import { mockEvaluationJob } from '~/__tests__/unit/testUtils/mockEvaluationData';
import type { Collection, EvaluationJob, InferenceServiceItem, TestDataRef } from '~/app/types';
import extractReconfigureData, { inferSourceMode } from '~/app/utils/extractReconfigureData';
import buildEvaluationRequest from '~/app/utils/buildEvaluationRequest';
import { testDataRefDefaultValues } from '~/app/schemas/testDataRef.schema';

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

  it('should scrub each non-S3 prerecorded reference variant on reconfigure', () => {
    const unsupportedRefs: TestDataRef[] = [
      { pvc: { claim_name: 'responses', type: 'pre_recorded_data' } },
      {
        git: {
          url: 'https://git.example.com/responses.git',
          ref: 'main',
          type: 'pre_recorded_data',
        },
      },
      { hf: { repo_id: 'org/responses', type: 'pre_recorded_data' } },
    ];

    unsupportedRefs.forEach((test_data_ref) => {
      const job = mockEvaluationJob({ modelName: 'model-a' });
      job.benchmarks = [{ id: 'b1', test_data_ref }];
      job.model.url = 'https://ext.example.com/v1';

      const result = extractReconfigureData(job, []);

      // The UI only supports S3 prerecorded responses, so these jobs fall back
      // to model mode and their reference is not hydrated.
      expect(result.sourceMode).toBe('model');
      expect(result.testDataRef).toEqual(testDataRefDefaultValues);
    });
  });

  it('should scrub non-S3 prerecorded references from collection benchmarks', () => {
    const job = mockEvaluationJob({ collectionId: 'col-1' });
    job.collection = {
      id: 'col-1',
      benchmarks: [
        {
          id: 'b1',
          provider_id: 'p1',
          test_data_ref: { pvc: { claim_name: 'responses', type: 'pre_recorded_data' } },
        },
        {
          id: 'b2',
          provider_id: 'p2',
          test_data_ref: {
            git: {
              url: 'https://git.example.com/data.git',
              ref: 'main',
              type: 'data_set',
            },
          },
        },
      ],
    };
    job.benchmarks = null;

    const result = extractReconfigureData(job, []);

    expect(result.collection?.benchmarks?.[0].test_data_ref).toBeUndefined();
    // Supported data_set references still pass through.
    expect(result.collection?.benchmarks?.[1].test_data_ref).toEqual({
      git: { url: 'https://git.example.com/data.git', ref: 'main', type: 'data_set' },
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

  it('should return model/external when model has url but no matching service', () => {
    const job = mockEvaluationJob({ modelName: 'external-agent' });
    job.model.url = 'https://agent.example.com/v1';

    expect(inferSourceMode(job, [])).toEqual({
      sourceMode: 'model',
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

  it('should preserve hardware profile and queue configuration when reconfiguring', () => {
    const job = mockEvaluationJob();
    job.hardware_config = {
      hardware_profile_name: 'gpu-small',
      queue: { kind: 'kueue', name: 'gpu-default' },
    };

    const result = extractReconfigureData(job, []);

    expect(result.hardwareProfile).toBe('gpu-small');
    expect(result.queue).toBe('gpu-default');
  });

  it('should return an undefined queue when hardware_config is absent', () => {
    const job = mockEvaluationJob();

    const result = extractReconfigureData(job, []);

    expect(result.hardwareProfile).toBeUndefined();
    expect(result.queue).toBeUndefined();
  });

  it('should ignore removed legacy queue fields on status and resource', () => {
    const job = mockEvaluationJob();
    // The queue fields were removed from the API contract; simulate a legacy
    // payload that still carries them to guard against fallback reintroduction.
    Object.assign(job.status, { queue: 'legacy-status-queue' });
    Object.assign(job.resource, { queue: 'legacy-resource-queue' });

    const result = extractReconfigureData(job, []);

    expect(result.queue).toBeUndefined();
  });

  it('should preserve raw metric thresholds when reconfiguring a benchmark', () => {
    const job = mockEvaluationJob({ benchmarkId: 'constant', providerId: 'guidellm' });
    job.benchmarks = [
      {
        id: 'constant',
        provider_id: 'guidellm',
        primary_score: { metric: 'output_tokens_per_second', lower_is_better: false },
        pass_criteria: { threshold: 10 },
      },
    ];

    const result = extractReconfigureData(job, []);

    expect(result.threshold).toBe(10);
    expect(result.primaryMetric).toBe('output_tokens_per_second');
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

  it('should hydrate from the first prerecorded s3 ref, skipping earlier data_set s3 refs', () => {
    const job = mockEvaluationJob({ modelName: 'dataset-source', collectionId: 'col-mixed' });
    job.collection = {
      id: 'col-mixed',
      benchmarks: [
        {
          id: 'b1',
          provider_id: 'p1',
          test_data_ref: {
            s3: { bucket: 'eval-data', key: 'ragas', secret_ref: 'data-secret', type: 'data_set' },
          },
        },
        {
          id: 'b2',
          provider_id: 'p2',
          test_data_ref: {
            s3: {
              bucket: 'responses',
              key: 'data.jsonl',
              secret_ref: 'prerecorded-token',
              type: 'pre_recorded_data',
            },
          },
        },
      ],
    };
    job.benchmarks = null;

    const result = extractReconfigureData(job, []);

    expect(result.sourceMode).toBe('prerecorded');
    expect(result.datasetUrl).toBe('s3://responses/data.jsonl');
    expect(result.accessToken).toBe('prerecorded-token');
  });

  it('should default prerecorded fields when no benchmark has test_data_ref', () => {
    const job = mockEvaluationJob({ modelName: 'dataset-source' });
    job.benchmarks = [{ id: 'b1' }];
    job.model.url = 'https://ext.example.com/v1';

    const result = extractReconfigureData(job, []);

    expect(result.datasetUrl).toBe('');
    expect(result.accessToken).toBe('');
  });

  it('should infer prerecorded from an explicit pre_recorded_data type', () => {
    const job = mockEvaluationJob({ modelName: 'dataset-source' });
    job.benchmarks = [
      {
        id: 'b1',
        test_data_ref: {
          s3: { key: 's3://bucket/data.jsonl', secret_ref: 'tok', type: 'pre_recorded_data' },
        },
      },
    ];

    const result = extractReconfigureData(job, []);

    expect(result.sourceMode).toBe('prerecorded');
    expect(result.datasetUrl).toBe('s3://bucket/data.jsonl');
    expect(result.accessToken).toBe('tok');
  });

  it('should rebuild the dataset url from a split bucket and key', () => {
    const job = mockEvaluationJob({ modelName: 'dataset-source' });
    job.benchmarks = [
      {
        id: 'b1',
        test_data_ref: {
          s3: {
            bucket: 'my-bucket',
            key: 'path/to/data.jsonl',
            secret_ref: 'tok',
            type: 'pre_recorded_data',
          },
        },
      },
    ];

    const result = extractReconfigureData(job, []);

    expect(result.sourceMode).toBe('prerecorded');
    expect(result.datasetUrl).toBe('s3://my-bucket/path/to/data.jsonl');
    expect(result.accessToken).toBe('tok');
  });

  it('should not infer prerecorded from a data_set s3 ref on a model run', () => {
    const job = mockEvaluationJob({ modelName: 'model-a' });
    job.benchmarks = [
      {
        id: 'b1',
        test_data_ref: {
          s3: { bucket: 'eval-data', key: 'ragas', secret_ref: 's3-secret', type: 'data_set' },
        },
      },
    ];
    job.model.url = 'https://ext.example.com/v1';

    const result = extractReconfigureData(job, []);

    expect(result.sourceMode).toBe('model');
    expect(result.datasetUrl).toBe('');
  });

  it('should keep an untyped split bucket and key dataset ref in model mode through a round-trip', () => {
    const job = mockEvaluationJob({ modelName: 'model-a', benchmarkId: 'b1' });
    job.benchmarks = [
      {
        id: 'b1',
        test_data_ref: {
          // Omitted type defaults to data_set per the contract.
          s3: { bucket: 'eval-data', key: 'ragas', secret_ref: 's3-secret' },
        },
      },
    ];
    job.model.url = 'https://ext.example.com/v1';
    job.model.auth = { secret_ref: 'model-secret' };

    const result = extractReconfigureData(job, []);

    expect(result.sourceMode).toBe('model');
    expect(result.testDataRef).toEqual({
      ...testDataRefDefaultValues,
      source: 's3',
      bucket: 'eval-data',
      key: 'ragas',
      secretRef: 's3-secret',
    });

    const request = buildEvaluationRequest({
      evaluationName: result.evaluationName,
      sourceMode: result.sourceMode,
      benchmark: result.benchmark,
      collection: result.collection,
      modelName: result.modelName,
      endpointUrl: result.endpointUrl,
      apiKeySecretRef: result.apiKeySecretRef,
      sourceName: result.sourceName,
      datasetUrl: result.datasetUrl,
      accessToken: result.accessToken,
      testDataRef: result.testDataRef,
      additionalArgs: {},
    });

    expect(request.model).toEqual({
      name: 'model-a',
      url: 'https://ext.example.com/v1',
      auth: { secret_ref: 'model-secret' },
    });
    expect(request.benchmarks?.[0].test_data_ref).toEqual({
      s3: { bucket: 'eval-data', key: 'ragas', secret_ref: 's3-secret', type: 'data_set' },
    });
  });

  it('should hydrate testDataRef for model-mode reconfigures from any variant', () => {
    const job = mockEvaluationJob({ modelName: 'model-a' });
    job.benchmarks = [
      {
        id: 'b1',
        test_data_ref: {
          git: {
            url: 'https://github.com/org/datasets.git',
            ref: 'main',
            sub_path: 'benchmark-a',
            type: 'data_set',
          },
        },
      },
    ];
    job.model.url = 'https://ext.example.com/v1';

    const result = extractReconfigureData(job, []);

    expect(result.sourceMode).toBe('model');
    expect(result.testDataRef).toEqual({
      ...testDataRefDefaultValues,
      source: 'git',
      type: 'data_set',
      url: 'https://github.com/org/datasets.git',
      ref: 'main',
      subPath: 'benchmark-a',
    });
  });

  it('should not hydrate testDataRef for prerecorded reconfigures', () => {
    const job = mockEvaluationJob({ modelName: 'dataset-source' });
    job.benchmarks = [
      {
        id: 'b1',
        test_data_ref: {
          s3: { key: 's3://bucket/data.jsonl', secret_ref: 'tok', type: 'pre_recorded_data' },
        },
      },
    ];

    const result = extractReconfigureData(job, []);

    expect(result.sourceMode).toBe('prerecorded');
    expect(result.testDataRef).toEqual(testDataRefDefaultValues);
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
