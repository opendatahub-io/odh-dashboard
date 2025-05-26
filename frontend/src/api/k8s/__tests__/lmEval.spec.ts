import {
  k8sCreateResource,
  k8sGetResource,
  k8sListResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { mockLMEvaluation } from '~/__mocks__/mockLMEvaluation';
import { mockInferenceServiceK8sResource } from '~/__mocks__/mockInferenceServiceK8sResource';
import { LMEvalModel, InferenceServiceModel } from '~/api/models';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import {
  listDeployedModels,
  getDeployedModel,
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

const mockListResource = jest.mocked(k8sListResource);
const mockGetResource = jest.mocked(k8sGetResource);
const mockCreateResource = jest.mocked(k8sCreateResource<LMEvaluationKind>);

describe('listDeployedModels', () => {
  it('should fetch and return list of deployed models', async () => {
    const namespace = 'test-project';
    const mockInferenceService = mockInferenceServiceK8sResource({ name: 'test-model' });
    mockListResource.mockResolvedValue(mockK8sResourceList([mockInferenceService]));

    const result = await listDeployedModels(namespace);
    expect(mockListResource).toHaveBeenCalledWith({
      model: InferenceServiceModel,
      queryOptions: {
        ns: namespace,
      },
    });
    expect(mockListResource).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual([mockInferenceService]);
  });

  it('should handle errors when fetching list of deployed models', async () => {
    const namespace = 'test-project';
    mockListResource.mockRejectedValue(new Error('error1'));

    await expect(listDeployedModels(namespace)).rejects.toThrow('error1');
    expect(mockListResource).toHaveBeenCalledTimes(1);
    expect(mockListResource).toHaveBeenCalledWith({
      model: InferenceServiceModel,
      queryOptions: {
        ns: namespace,
      },
    });
  });
});

describe('getDeployedModel', () => {
  it('should fetch and return specific deployed model', async () => {
    const namespace = 'test-project';
    const modelName = 'test-model';
    const mockInferenceService = mockInferenceServiceK8sResource({ name: modelName });
    mockGetResource.mockResolvedValue(mockInferenceService);

    const result = await getDeployedModel(modelName, namespace);
    expect(mockGetResource).toHaveBeenCalledWith({
      model: InferenceServiceModel,
      queryOptions: {
        name: modelName,
        ns: namespace,
      },
    });
    expect(mockGetResource).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(mockInferenceService);
  });

  it('should handle errors when fetching a specific deployed model', async () => {
    const namespace = 'test-project';
    const modelName = 'test-model';
    mockGetResource.mockRejectedValue(new Error('error1'));

    await expect(getDeployedModel(modelName, namespace)).rejects.toThrow('error1');
    expect(mockGetResource).toHaveBeenCalledTimes(1);
    expect(mockGetResource).toHaveBeenCalledWith({
      model: InferenceServiceModel,
      queryOptions: {
        name: modelName,
        ns: namespace,
      },
    });
  });
});

describe('listModelEvaluations', () => {
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
});

const mockedLMEvaluation = mockLMEvaluation({});

const assembleModelEvaluationResult: LMEvaluationKind = {
  apiVersion: mockedLMEvaluation.apiVersion,
  kind: mockedLMEvaluation.kind,
  metadata: {
    name: `eval-${mockedLMEvaluation.spec.modelName}`,
    namespace: mockedLMEvaluation.metadata.namespace,
    annotations: {
      'opendatahub.io/modified-date': expect.anything(),
    },
  },
  spec: mockedLMEvaluation.spec,
};

describe('createModelEvaluation', () => {
  it('should create a model evaluation', async () => {
    mockCreateResource.mockResolvedValue(mockedLMEvaluation);
    const result = await createModelEvaluation(
      mockedLMEvaluation.spec.modelName,
      {
        evalDataset: mockedLMEvaluation.spec.evalDataset,
        evalMetrics: mockedLMEvaluation.spec.evalMetrics,
        batchSize: mockedLMEvaluation.spec.batchSize,
        timeout: mockedLMEvaluation.spec.timeout,
      },
      mockedLMEvaluation.metadata.namespace,
    );
    expect(mockCreateResource).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: LMEvalModel,
      queryOptions: { queryParams: {} },
      resource: assembleModelEvaluationResult,
    });
    expect(mockCreateResource).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(mockedLMEvaluation);
  });

  it('should handle errors and rethrow', async () => {
    mockCreateResource.mockRejectedValue(new Error('error1'));
    await expect(
      createModelEvaluation(
        mockedLMEvaluation.spec.modelName,
        {
          evalDataset: mockedLMEvaluation.spec.evalDataset,
          evalMetrics: mockedLMEvaluation.spec.evalMetrics,
          batchSize: mockedLMEvaluation.spec.batchSize,
          timeout: mockedLMEvaluation.spec.timeout,
        },
        mockedLMEvaluation.metadata.namespace,
      ),
    ).rejects.toThrow('error1');
    expect(mockCreateResource).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: LMEvalModel,
      queryOptions: { queryParams: {} },
      resource: assembleModelEvaluationResult,
    });
    expect(mockCreateResource).toHaveBeenCalledTimes(1);
  });
});
