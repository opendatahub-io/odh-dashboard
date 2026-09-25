import { mockInferenceServiceK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockInferenceServiceK8sResource';
import { HF_TOKEN_ENV_NAME } from '@odh-dashboard/model-serving/shared/hfTokenConstants';
import { getHfTokenSecretNameFromServiceAccount } from '@odh-dashboard/model-serving/shared/hfTokenSecret';
import { applyHfTokenServiceAccount, extractHuggingFaceApiKey } from '../hfTokenSecret';

jest.mock('@odh-dashboard/model-serving/shared/hfTokenSecret', () => {
  const actual = jest.requireActual('@odh-dashboard/model-serving/shared/hfTokenSecret');
  return {
    ...actual,
    getHfTokenSecretNameFromServiceAccount: jest.fn(),
  };
});

const mockGetHfTokenSecretNameFromServiceAccount = jest.mocked(
  getHfTokenSecretNameFromServiceAccount,
);

describe('hfTokenSecret', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should apply serviceAccountName without a secret annotation (Option 1)', () => {
    const inferenceService = mockInferenceServiceK8sResource({});
    const result = applyHfTokenServiceAccount(inferenceService, 'hf-secret', 'test-model-hf-sa');

    expect(result.spec.predictor.serviceAccountName).toBe('test-model-hf-sa');
    expect(result.metadata.annotations?.['opendatahub.io/hf-token-secret']).toBeUndefined();
    expect(result.spec.predictor.model?.env?.find((env) => env.name === HF_TOKEN_ENV_NAME)).toBe(
      undefined,
    );
  });

  it('should strip a leftover HF_TOKEN env var when applying the ServiceAccount', () => {
    const inferenceService = mockInferenceServiceK8sResource({
      env: [
        {
          name: HF_TOKEN_ENV_NAME,
          valueFrom: {
            secretKeyRef: {
              name: 'old-secret',
              key: HF_TOKEN_ENV_NAME,
            },
          },
        },
        { name: 'OTHER', value: 'value' },
      ],
    });

    const result = applyHfTokenServiceAccount(inferenceService, 'new-secret', 'test-model-hf-sa');

    expect(result.spec.predictor.serviceAccountName).toBe('test-model-hf-sa');
    expect(result.spec.predictor.model?.env).toEqual([{ name: 'OTHER', value: 'value' }]);
  });

  it('should extract configured HF token from the ServiceAccount Secret refs', async () => {
    const deployment = mockInferenceServiceK8sResource({});
    deployment.metadata.name = 'test-model';
    deployment.metadata.namespace = 'test-project';
    deployment.spec.predictor.serviceAccountName = 'test-model-hf-sa';
    mockGetHfTokenSecretNameFromServiceAccount.mockResolvedValue('hf-secret');

    await expect(extractHuggingFaceApiKey(deployment)).resolves.toEqual({
      token: '',
      configuredSecretName: 'hf-secret',
    });
    expect(mockGetHfTokenSecretNameFromServiceAccount).toHaveBeenCalledWith(
      'test-model-hf-sa',
      'test-project',
    );
  });

  it('should return null when ServiceAccount name does not match the HF SA pattern', async () => {
    const deployment = mockInferenceServiceK8sResource({});
    deployment.metadata.name = 'test-model';
    deployment.spec.predictor.serviceAccountName = 'some-other-sa';

    await expect(extractHuggingFaceApiKey(deployment)).resolves.toBeNull();
    expect(mockGetHfTokenSecretNameFromServiceAccount).not.toHaveBeenCalled();
  });

  it('should return an empty token config when ServiceAccount has no dashboard-managed HF Secret', async () => {
    const deployment = mockInferenceServiceK8sResource({});
    deployment.metadata.name = 'test-model';
    deployment.metadata.namespace = 'test-project';
    deployment.spec.predictor.serviceAccountName = 'test-model-hf-sa';
    mockGetHfTokenSecretNameFromServiceAccount.mockResolvedValue(undefined);

    await expect(extractHuggingFaceApiKey(deployment)).resolves.toEqual({
      token: '',
      configuredSecretName: undefined,
    });
  });

  it('should return an empty token config when the ServiceAccount is missing (404)', async () => {
    const deployment = mockInferenceServiceK8sResource({});
    deployment.metadata.name = 'test-model';
    deployment.metadata.namespace = 'test-project';
    deployment.spec.predictor.serviceAccountName = 'test-model-hf-sa';
    const { K8sStatusError } = jest.requireActual('@odh-dashboard/k8s-core');
    mockGetHfTokenSecretNameFromServiceAccount.mockRejectedValue(
      new K8sStatusError({
        apiVersion: 'v1',
        kind: 'Status',
        status: 'Failure',
        reason: 'NotFound',
        code: 404,
      }),
    );

    await expect(extractHuggingFaceApiKey(deployment)).resolves.toEqual({ token: '' });
  });

  it('should propagate non-404 API failures from ServiceAccount lookup', async () => {
    const deployment = mockInferenceServiceK8sResource({});
    deployment.metadata.name = 'test-model';
    deployment.metadata.namespace = 'test-project';
    deployment.spec.predictor.serviceAccountName = 'test-model-hf-sa';
    const { K8sStatusError } = jest.requireActual('@odh-dashboard/k8s-core');
    mockGetHfTokenSecretNameFromServiceAccount.mockRejectedValue(
      new K8sStatusError({
        apiVersion: 'v1',
        kind: 'Status',
        status: 'Failure',
        reason: 'Forbidden',
        code: 403,
      }),
    );

    await expect(extractHuggingFaceApiKey(deployment)).rejects.toMatchObject({
      statusObject: expect.objectContaining({ code: 403 }),
    });
  });
});
