import { HF_TOKEN_ENV_NAME } from '@odh-dashboard/model-serving/shared/hfTokenConstants';
import { getHfTokenSecretNameFromServiceAccount } from '@odh-dashboard/model-serving/shared/hfTokenSecret';
import { mockLLMInferenceServiceK8sResource } from '../__mocks__/mockLLMInferenceServiceK8sResource';
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

describe('llmd hfTokenSecret', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should apply template.serviceAccountName without a secret annotation', () => {
    const deployment = mockLLMInferenceServiceK8sResource({});

    const result = applyHfTokenServiceAccount(deployment, 'hf-secret', 'test-model-hf-sa');

    expect(result.spec.template?.serviceAccountName).toBe('test-model-hf-sa');
    expect(result.metadata.annotations?.['opendatahub.io/hf-token-secret']).toBeUndefined();
    expect(
      result.spec.template?.containers
        ?.find((container) => container.name === 'main')
        ?.env?.find((env) => env.name === HF_TOKEN_ENV_NAME),
    ).toBeUndefined();
  });

  it('should strip a leftover HF_TOKEN env var when applying the ServiceAccount', () => {
    const deployment = mockLLMInferenceServiceK8sResource({});
    deployment.spec.template = {
      containers: [
        {
          name: 'main',
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
        },
      ],
    };

    const result = applyHfTokenServiceAccount(deployment, 'new-secret', 'test-model-hf-sa');
    const mainEnv = result.spec.template?.containers?.find(
      (container) => container.name === 'main',
    )?.env;

    expect(result.spec.template?.serviceAccountName).toBe('test-model-hf-sa');
    expect(mainEnv).toEqual([{ name: 'OTHER', value: 'value' }]);
  });

  it('should extract configured HF token from the ServiceAccount Secret refs', async () => {
    const deployment = mockLLMInferenceServiceK8sResource({});
    deployment.metadata.name = 'test-model';
    deployment.metadata.namespace = 'test-project';
    deployment.spec.template = {
      ...deployment.spec.template,
      serviceAccountName: 'test-model-hf-sa',
    };
    mockGetHfTokenSecretNameFromServiceAccount.mockResolvedValue('hf-secret');

    await expect(extractHuggingFaceApiKey(deployment)).resolves.toEqual({
      token: '',
      configuredSecretName: 'hf-secret',
    });
  });

  it('should return null when ServiceAccount name does not match the HF SA pattern', async () => {
    const deployment = mockLLMInferenceServiceK8sResource({});
    deployment.metadata.name = 'test-model';
    deployment.spec.template = {
      ...deployment.spec.template,
      serviceAccountName: 'other-sa',
    };

    await expect(extractHuggingFaceApiKey(deployment)).resolves.toBeNull();
    expect(mockGetHfTokenSecretNameFromServiceAccount).not.toHaveBeenCalled();
  });
});
