import {
  k8sCreateResource,
  k8sGetResource,
  k8sListResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { mockLMEvaluation } from '#~/__mocks__/mockLMEvaluation';
import { LMEvalModel } from '#~/api/models';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import {
  listModelEvaluations,
  createModelEvaluation,
  getModelEvaluationResult,
} from '#~/api/k8s/lmEval';
import { LMEvalKind } from '#~/k8sTypes';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
  k8sGetResource: jest.fn(),
  k8sCreateResource: jest.fn(),
}));

jest.mock('#~/concepts/k8s/utils', () => ({
  kindApiVersion: jest.fn(() => 'trustyai.opendatahub.io/v1alpha1'),
  translateDisplayNameForK8s: jest.fn((name) => name.toLowerCase().replace(/\s+/g, '-')),
}));

const mockListResource = jest.mocked(k8sListResource);
const mockGetResource = jest.mocked(k8sGetResource);
const mockCreateResource = jest.mocked(k8sCreateResource<LMEvalKind>);

describe('listModelEvaluations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch and return list of model evaluations', async () => {
    const namespace = 'test-project';
    const mockEvaluation = mockLMEvaluation({ name: 'test-evaluation' });
    mockListResource.mockResolvedValue(mockK8sResourceList([mockEvaluation]));

    const result = await listModelEvaluations(namespace);
    expect(mockListResource).toHaveBeenCalledWith({
      model: LMEvalModel,
      queryOptions: {
        ns: namespace,
      },
    });
    expect(mockListResource).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual([mockEvaluation]);
  });

  it('should return empty array when no evaluations exist', async () => {
    const namespace = 'empty-project';
    mockListResource.mockResolvedValue(mockK8sResourceList([]));

    const result = await listModelEvaluations(namespace);
    expect(result).toStrictEqual([]);
    expect(mockListResource).toHaveBeenCalledTimes(1);
  });

  it('should handle errors when fetching list of model evaluations', async () => {
    const namespace = 'test-project';
    mockListResource.mockRejectedValue(new Error('error1'));

    await expect(listModelEvaluations(namespace)).rejects.toThrow('error1');
    expect(mockListResource).toHaveBeenCalledTimes(1);
    expect(mockListResource).toHaveBeenCalledWith({
      model: LMEvalModel,
      queryOptions: {
        ns: namespace,
      },
    });
  });
});

describe('getModelEvaluationResult', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch and return specific model evaluation result', async () => {
    const namespace = 'test-project';
    const evaluationName = 'test-evaluation';
    const mockEvaluation = mockLMEvaluation({ name: evaluationName });
    mockGetResource.mockResolvedValue(mockEvaluation);

    const result = await getModelEvaluationResult(evaluationName, namespace);
    expect(mockGetResource).toHaveBeenCalledWith({
      model: LMEvalModel,
      queryOptions: {
        name: evaluationName,
        ns: namespace,
      },
    });
    expect(mockGetResource).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(mockEvaluation);
  });

  it('should handle errors when fetching a specific model evaluation result', async () => {
    const namespace = 'test-project';
    const evaluationName = 'test-evaluation';
    mockGetResource.mockRejectedValue(new Error('error1'));

    await expect(getModelEvaluationResult(evaluationName, namespace)).rejects.toThrow('error1');
    expect(mockGetResource).toHaveBeenCalledTimes(1);
    expect(mockGetResource).toHaveBeenCalledWith({
      model: LMEvalModel,
      queryOptions: {
        name: evaluationName,
        ns: namespace,
      },
    });
  });

  it('should handle 404 errors when evaluation does not exist', async () => {
    const namespace = 'test-project';
    const evaluationName = 'non-existent-evaluation';
    const notFoundError = new Error('Not Found') as Error & { code: number };
    notFoundError.code = 404;
    mockGetResource.mockRejectedValue(notFoundError);

    await expect(getModelEvaluationResult(evaluationName, namespace)).rejects.toThrow('Not Found');
    expect(mockGetResource).toHaveBeenCalledTimes(1);
  });
});

describe('createModelEvaluation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const modelData = (evaluationName = 'test-evaluation') => ({
    deployedModelName: 'test-model',
    evaluationName,
    tasks: ['mmlu', 'hellaswag'],
    modelType: 'test-model',
    allowRemoteCode: true,
    allowOnline: true,
    model: {
      name: 'test-model',
      url: 'https://test-model.com',
      tokenizedRequest: true,
      tokenizer: 'test-tokenizer',
    },
    deploymentNamespace: 'test-project',
  });

  const expectedResource = (batchSize?: string, evaluationName?: string): LMEvaluationKind => ({
    apiVersion: 'trustyai.opendatahub.io/v1alpha1',
    kind: 'LMEvalJob',
    metadata: {
      name: evaluationName || modelData().evaluationName,
      namespace: modelData().deploymentNamespace,
    },
    spec: {
      allowCodeExecution: modelData().allowRemoteCode,
      allowOnline: modelData().allowOnline,
      taskList: {
        taskNames: modelData().tasks,
      },
      ...(batchSize && { batchSize }),
      logSamples: true,
      model: modelData().modelType,
      modelArgs: [
        {
          name: 'model',
          value: modelData().model.name,
        },
        {
          name: 'base_url',
          value: modelData().model.url,
        },
        {
          name: 'num_concurrent',
          value: '1',
        },
        {
          name: 'max_retries',
          value: '3',
        },
        {
          name: 'tokenized_requests',
          value: 'true',
        },
        {
          name: 'tokenizer',
          value: modelData().model.tokenizer,
        },
      ],
      outputs: {
        pvcManaged: {
          size: '5Gi',
        },
      },
    },
  });

  it('should create a model evaluation with correct structure', async () => {
    const mockEvaluation = mockLMEvaluation({ name: modelData().evaluationName });
    mockCreateResource.mockResolvedValue(mockEvaluation);

    const result = await createModelEvaluation(modelData(), '1');

    expect(mockCreateResource).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: LMEvalModel,
      queryOptions: { queryParams: {} },
      resource: expectedResource('1'),
    });
    expect(mockCreateResource).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(mockEvaluation);
  });

  it('should create a model evaluation with auto-generated name', async () => {
    const modelName = 'My Test Model';
    const namespace = 'test-project';
    const evalConfig = {
      batchSize: '16',
      timeout: 7200,
      taskList: {
        taskNames: ['arc_easy', 'arc_challenge'],
      },
    };

    const expectedResource: LMEvalKind = {
      apiVersion: 'trustyai.opendatahub.io/v1alpha1',
      kind: 'LMEvalJob',
      metadata: {
        name: 'eval-my-test-model',
        namespace,
      },
      spec: {
        model: modelName,
        batchSize: '16',
        timeout: 7200,
        taskList: {
          taskNames: ['arc_easy', 'arc_challenge'],
        },
      },
    };

    const mockEvaluation = mockLMEvaluation({ name: 'eval-my-test-model' });
    mockCreateResource.mockResolvedValue(mockEvaluation);

    const result = await createModelEvaluation(modelName, evalConfig, namespace);

    expect(mockCreateResource).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: LMEvalModel,
      queryOptions: { queryParams: {} },
      resource: expectedResource,
    });
    expect(result).toStrictEqual(mockEvaluation);
  });

  it('should create a model evaluation with minimal config', async () => {
    const modelName = 'minimal-model';
    const namespace = 'test-project';
    const evalConfig = {
      taskList: {
        taskNames: ['truthfulqa'],
      },
    };

    const expectedResource: LMEvalKind = {
      apiVersion: 'trustyai.opendatahub.io/v1alpha1',
      kind: 'LMEvalJob',
      metadata: {
        name: 'eval-minimal-model',
        namespace,
      },
      spec: {
        model: modelName,
        taskList: {
          taskNames: ['truthfulqa'],
        },
      },
    };

    const mockEvaluation = mockLMEvaluation({ name: 'eval-minimal-model' });
    mockCreateResource.mockResolvedValue(mockEvaluation);

    const result = await createModelEvaluation(modelData('eval-minimal-model'));

    expect(mockCreateResource).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: LMEvalModel,
      queryOptions: { queryParams: {} },
      resource: expectedResource(undefined, 'eval-minimal-model'),
    });
    expect(result).toStrictEqual(mockEvaluation);
  });

  it('should create a model evaluation with all optional fields', async () => {
    const modelName = 'comprehensive-model';
    const namespace = 'test-project';
    const evalConfig = {
      batchSize: '32',
      timeout: 7200,
      taskList: {
        taskNames: ['mmlu', 'hellaswag', 'arc_easy', 'arc_challenge', 'truthfulqa'],
      },
    };

    const expectedResource: LMEvalKind = {
      apiVersion: 'trustyai.opendatahub.io/v1alpha1',
      kind: 'LMEvalJob',
      metadata: {
        name: 'eval-comprehensive-model',
        namespace,
      },
      spec: {
        model: modelName,
        batchSize: '32',
        timeout: 7200,
        taskList: {
          taskNames: ['mmlu', 'hellaswag', 'arc_easy', 'arc_challenge', 'truthfulqa'],
        },
      },
    };

    const mockEvaluation = mockLMEvaluation({ name: 'eval-comprehensive-model' });
    mockCreateResource.mockResolvedValue(mockEvaluation);

    const result = await createModelEvaluation(modelData('eval-comprehensive-model'), '1');

    expect(mockCreateResource).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: LMEvalModel,
      queryOptions: { queryParams: {} },
      resource: expectedResource('1', 'eval-comprehensive-model'),
    });
    expect(result).toStrictEqual(mockEvaluation);
  });

  it('should handle special characters in model names', async () => {
    const modelName = 'model/with-special_chars@123';
    const namespace = 'test-project';
    const evalConfig = {
      taskList: {
        taskNames: ['mmlu'],
      },
    };

    const expectedResource: LMEvalKind = {
      apiVersion: 'trustyai.opendatahub.io/v1alpha1',
      kind: 'LMEvalJob',
      metadata: {
        name: 'eval-model/with-special_chars@123',
        namespace,
      },
      spec: {
        model: modelName,
        taskList: {
          taskNames: ['mmlu'],
        },
      },
    };

    const mockEvaluation = mockLMEvaluation({ name: 'eval-model/with-special_chars@123' });
    mockCreateResource.mockResolvedValue(mockEvaluation);

    const result = await createModelEvaluation(modelData('eval-model/with-special_chars@123'));

    expect(mockCreateResource).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: LMEvalModel,
      queryOptions: { queryParams: {} },
      resource: expectedResource(undefined, 'eval-model/with-special_chars@123'),
    });
    expect(result).toStrictEqual(mockEvaluation);
  });

  it('should handle errors and rethrow', async () => {
    mockCreateResource.mockRejectedValue(new Error('Creation failed'));

    await expect(createModelEvaluation(modelData())).rejects.toThrow('Creation failed');

    expect(mockCreateResource).toHaveBeenCalledTimes(1);
  });

  it('should handle validation errors from the API', async () => {
    const validationError = new Error('Invalid task name') as Error & { code: number };
    validationError.code = 422;
    mockCreateResource.mockRejectedValue(validationError);

    await expect(createModelEvaluation(modelData())).rejects.toThrow('Invalid task name');

    expect(mockCreateResource).toHaveBeenCalledTimes(1);
  });

  it('should pass through K8sAPIOptions correctly', async () => {
    const opts = {
      dryRun: true,
    };

    const mockEvaluation = mockLMEvaluation({ name: 'eval-test-model' });
    mockCreateResource.mockResolvedValue(mockEvaluation);

    await createModelEvaluation(modelData('eval-test-model'), '1', opts);

    expect(mockCreateResource).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: LMEvalModel,
      payload: { dryRun: ['All'] },
      queryOptions: {
        queryParams: {
          dryRun: 'All',
        },
      },
      resource: expectedResource('1', 'eval-test-model'),
    });
  });

  it('should handle empty task list', async () => {
    const mockEvaluation = mockLMEvaluation({ name: 'eval-test-model' });
    mockCreateResource.mockResolvedValue(mockEvaluation);

    const testData = {
      ...modelData('eval-test-model'),
      tasks: [],
    };

    const result = await createModelEvaluation(testData);

    const expectedResourceWithEmptyTasks = {
      ...expectedResource(undefined, 'eval-test-model'),
      spec: {
        ...expectedResource(undefined, 'eval-test-model').spec,
        taskList: {
          taskNames: [],
        },
      },
    };

    expect(mockCreateResource).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: LMEvalModel,
      queryOptions: { queryParams: {} },
      resource: expectedResourceWithEmptyTasks,
    });
    expect(result).toStrictEqual(mockEvaluation);
  });
});

describe('mockLMEvaluation status fields', () => {
  it('should include default status fields with test values', () => {
    const mockEvaluation = mockLMEvaluation();

    expect(mockEvaluation.status).toBeDefined();
    expect(mockEvaluation.status?.results).toBe(
      '{"mmlu": {"accuracy": 0.85}, "hellaswag": {"accuracy": 0.78}}',
    );
    expect(mockEvaluation.status?.podName).toBe('test-lm-evaluation-pod-12345');
    expect(mockEvaluation.status?.completeTime).toBe('2024-01-15T10:30:00Z');
    expect(mockEvaluation.status?.lastScheduleTime).toBe('2024-01-15T10:00:00Z');
  });

  it('should create evaluation with completed state', () => {
    const mockEvaluation = mockLMEvaluation({
      state: 'Completed',
      message: 'Evaluation completed successfully',
      reason: 'EvaluationCompleted',
      results: '{"mmlu": {"accuracy": 0.92}, "hellaswag": {"accuracy": 0.88}}',
      completeTime: '2024-01-15T11:45:00Z',
    });

    expect(mockEvaluation.status?.state).toBe('Completed');
    expect(mockEvaluation.status?.message).toBe('Evaluation completed successfully');
    expect(mockEvaluation.status?.reason).toBe('EvaluationCompleted');
    expect(mockEvaluation.status?.results).toBe(
      '{"mmlu": {"accuracy": 0.92}, "hellaswag": {"accuracy": 0.88}}',
    );
    expect(mockEvaluation.status?.completeTime).toBe('2024-01-15T11:45:00Z');
  });

  it('should create evaluation with failed state', () => {
    const mockEvaluation = mockLMEvaluation({
      state: 'Failed',
      message: 'Evaluation failed due to insufficient resources',
      reason: 'InsufficientResources',
      podName: 'test-lm-evaluation-pod-failed-67890',
      results: undefined,
      completeTime: undefined,
    });

    expect(mockEvaluation.status?.state).toBe('Failed');
    expect(mockEvaluation.status?.message).toBe('Evaluation failed due to insufficient resources');
    expect(mockEvaluation.status?.reason).toBe('InsufficientResources');
    expect(mockEvaluation.status?.podName).toBe('test-lm-evaluation-pod-failed-67890');
    expect(mockEvaluation.status?.results).toBeUndefined();
    expect(mockEvaluation.status?.completeTime).toBeUndefined();
  });

  it('should create evaluation with running state', () => {
    const mockEvaluation = mockLMEvaluation({
      state: 'Running',
      message: 'Evaluation is currently running',
      reason: 'EvaluationInProgress',
      podName: 'test-lm-evaluation-pod-running-54321',
      results: undefined,
      completeTime: undefined,
      lastScheduleTime: '2024-01-15T12:00:00Z',
    });

    expect(mockEvaluation.status?.state).toBe('Running');
    expect(mockEvaluation.status?.message).toBe('Evaluation is currently running');
    expect(mockEvaluation.status?.reason).toBe('EvaluationInProgress');
    expect(mockEvaluation.status?.podName).toBe('test-lm-evaluation-pod-running-54321');
    expect(mockEvaluation.status?.lastScheduleTime).toBe('2024-01-15T12:00:00Z');
    expect(mockEvaluation.status?.results).toBeUndefined();
    expect(mockEvaluation.status?.completeTime).toBeUndefined();
  });

  it('should allow overriding individual status fields', () => {
    const customResults = '{"arc_easy": {"accuracy": 0.95}}';
    const customPodName = 'custom-evaluation-pod-99999';

    const mockEvaluation = mockLMEvaluation({
      results: customResults,
      podName: customPodName,
    });

    expect(mockEvaluation.status?.results).toBe(customResults);
    expect(mockEvaluation.status?.podName).toBe(customPodName);
    expect(mockEvaluation.status?.completeTime).toBe('2024-01-15T10:30:00Z');
    expect(mockEvaluation.status?.lastScheduleTime).toBe('2024-01-15T10:00:00Z');
  });

  it('should handle undefined status fields correctly', () => {
    const mockEvaluation = mockLMEvaluation({
      results: undefined,
      podName: undefined,
      completeTime: undefined,
      lastScheduleTime: undefined,
    });

    expect(mockEvaluation.status?.results).toBeUndefined();
    expect(mockEvaluation.status?.podName).toBeUndefined();
    expect(mockEvaluation.status?.completeTime).toBeUndefined();
    expect(mockEvaluation.status?.lastScheduleTime).toBeUndefined();
    expect(mockEvaluation.status?.state).toBe('Pending');
    expect(mockEvaluation.status?.message).toBe('Evaluation is pending');
  });
});
