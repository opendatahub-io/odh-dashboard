import {
  k8sCreateResource,
  k8sGetResource,
  k8sListResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { mockLMEvaluation } from '~/__mocks__/mockLMEvaluation';
import { LMEvalModel } from '~/api/models';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import {
  listModelEvaluations,
  createModelEvaluation,
  getModelEvaluationResult,
} from '~/api/k8s/lmEval';
import { LMEvaluationKind } from '~/k8sTypes';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
  k8sGetResource: jest.fn(),
  k8sCreateResource: jest.fn(),
}));

jest.mock('~/concepts/k8s/utils', () => ({
  kindApiVersion: jest.fn(() => 'lmeval.opendatahub.io/v1alpha1'),
  translateDisplayNameForK8s: jest.fn((name) => name.toLowerCase().replace(/\s+/g, '-')),
}));

const mockListResource = jest.mocked(k8sListResource);
const mockGetResource = jest.mocked(k8sGetResource);
const mockCreateResource = jest.mocked(k8sCreateResource<LMEvaluationKind>);

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

  it('should create a model evaluation with correct structure', async () => {
    const modelName = 'test-model';
    const namespace = 'test-project';
    const evalConfig = {
      batchSize: '8',
      timeout: 3600,
      taskList: {
        taskNames: ['mmlu', 'hellaswag'],
      },
    };

    const expectedResource: LMEvaluationKind = {
      apiVersion: 'lmeval.opendatahub.io/v1alpha1',
      kind: 'LMEvaluation',
      metadata: {
        name: 'eval-test-model',
        namespace,
      },
      spec: {
        model: modelName,
        batchSize: '8',
        timeout: 3600,
        taskList: {
          taskNames: ['mmlu', 'hellaswag'],
        },
      },
    };

    const mockEvaluation = mockLMEvaluation({ name: 'eval-test-model' });
    mockCreateResource.mockResolvedValue(mockEvaluation);

    const result = await createModelEvaluation(modelName, evalConfig, namespace);

    expect(mockCreateResource).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: LMEvalModel,
      queryOptions: { queryParams: {} },
      resource: expectedResource,
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

    const expectedResource: LMEvaluationKind = {
      apiVersion: 'lmeval.opendatahub.io/v1alpha1',
      kind: 'LMEvaluation',
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

    const expectedResource: LMEvaluationKind = {
      apiVersion: 'lmeval.opendatahub.io/v1alpha1',
      kind: 'LMEvaluation',
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

    const result = await createModelEvaluation(modelName, evalConfig, namespace);

    expect(mockCreateResource).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: LMEvalModel,
      queryOptions: { queryParams: {} },
      resource: expectedResource,
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

    const expectedResource: LMEvaluationKind = {
      apiVersion: 'lmeval.opendatahub.io/v1alpha1',
      kind: 'LMEvaluation',
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

    const result = await createModelEvaluation(modelName, evalConfig, namespace);

    expect(mockCreateResource).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: LMEvalModel,
      queryOptions: { queryParams: {} },
      resource: expectedResource,
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

    const expectedResource: LMEvaluationKind = {
      apiVersion: 'lmeval.opendatahub.io/v1alpha1',
      kind: 'LMEvaluation',
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

    const result = await createModelEvaluation(modelName, evalConfig, namespace);

    expect(mockCreateResource).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: LMEvalModel,
      queryOptions: { queryParams: {} },
      resource: expectedResource,
    });
    expect(result).toStrictEqual(mockEvaluation);
  });

  it('should handle errors and rethrow', async () => {
    const modelName = 'test-model';
    const namespace = 'test-project';
    const evalConfig = {
      taskList: {
        taskNames: ['mmlu'],
      },
    };

    mockCreateResource.mockRejectedValue(new Error('Creation failed'));

    await expect(createModelEvaluation(modelName, evalConfig, namespace)).rejects.toThrow(
      'Creation failed',
    );

    expect(mockCreateResource).toHaveBeenCalledTimes(1);
  });

  it('should handle validation errors from the API', async () => {
    const modelName = 'test-model';
    const namespace = 'test-project';
    const evalConfig = {
      taskList: {
        taskNames: ['invalid-task'],
      },
    };

    const validationError = new Error('Invalid task name') as Error & { code: number };
    validationError.code = 422;
    mockCreateResource.mockRejectedValue(validationError);

    await expect(createModelEvaluation(modelName, evalConfig, namespace)).rejects.toThrow(
      'Invalid task name',
    );

    expect(mockCreateResource).toHaveBeenCalledTimes(1);
  });

  it('should pass through K8sAPIOptions correctly', async () => {
    const modelName = 'test-model';
    const namespace = 'test-project';
    const evalConfig = {
      taskList: {
        taskNames: ['mmlu'],
      },
    };
    const opts = {
      dryRun: true,
    };

    const mockEvaluation = mockLMEvaluation({ name: 'eval-test-model' });
    mockCreateResource.mockResolvedValue(mockEvaluation);

    await createModelEvaluation(modelName, evalConfig, namespace, opts);

    expect(mockCreateResource).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: LMEvalModel,
      payload: { dryRun: ['All'] },
      queryOptions: {
        queryParams: {
          dryRun: 'All',
        },
      },
      resource: {
        apiVersion: 'lmeval.opendatahub.io/v1alpha1',
        kind: 'LMEvaluation',
        metadata: {
          name: 'eval-test-model',
          namespace,
        },
        spec: {
          model: modelName,
          taskList: {
            taskNames: ['mmlu'],
          },
        },
      },
    });
  });

  it('should handle empty task list', async () => {
    const modelName = 'test-model';
    const namespace = 'test-project';
    const evalConfig = {
      taskList: {
        taskNames: [],
      },
    };

    const expectedResource: LMEvaluationKind = {
      apiVersion: 'lmeval.opendatahub.io/v1alpha1',
      kind: 'LMEvaluation',
      metadata: {
        name: 'eval-test-model',
        namespace,
      },
      spec: {
        model: modelName,
        taskList: {
          taskNames: [],
        },
      },
    };

    const mockEvaluation = mockLMEvaluation({ name: 'eval-test-model', taskNames: [] });
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
});
