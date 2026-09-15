import { mockInferenceServiceK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockInferenceServiceK8sResource';
import { HF_TOKEN_ENV_NAME } from '@odh-dashboard/model-serving/shared/hfTokenConstants';
import { createSecret, replaceSecret } from '@odh-dashboard/k8s-core/api/secrets';
import {
  applyHfTokenEnvVar,
  assembleHfTokenSecret,
  extractHuggingFaceApiKeyFromEnv,
  resolveHfTokenSecretName,
} from '../hfTokenSecret';

jest.mock('@odh-dashboard/k8s-core/api/secrets', () => ({
  createSecret: jest.fn(),
  replaceSecret: jest.fn(),
}));

const mockCreateSecret = jest.mocked(createSecret);
const mockReplaceSecret = jest.mocked(replaceSecret);

describe('hfTokenSecret', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should assemble a secret with HF_TOKEN key', () => {
    const secret = assembleHfTokenSecret('test-project', 'my-token', 'hf-secret');

    expect(secret.metadata.namespace).toBe('test-project');
    expect(secret.metadata.name).toBe('hf-secret');
    expect(secret.stringData).toEqual({ [HF_TOKEN_ENV_NAME]: 'my-token' });
  });

  it('should apply HF_TOKEN secretKeyRef env var', () => {
    const inferenceService = mockInferenceServiceK8sResource({});
    const result = applyHfTokenEnvVar(inferenceService, 'hf-secret');

    expect(result.spec.predictor.model?.env).toEqual([
      {
        name: HF_TOKEN_ENV_NAME,
        valueFrom: {
          secretKeyRef: {
            name: 'hf-secret',
            key: HF_TOKEN_ENV_NAME,
          },
        },
      },
    ]);
  });

  it('should replace an existing HF_TOKEN env var', () => {
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

    const result = applyHfTokenEnvVar(inferenceService, 'new-secret');

    expect(result.spec.predictor.model?.env).toEqual([
      { name: 'OTHER', value: 'value' },
      {
        name: HF_TOKEN_ENV_NAME,
        valueFrom: {
          secretKeyRef: {
            name: 'new-secret',
            key: HF_TOKEN_ENV_NAME,
          },
        },
      },
    ]);
  });

  it('should create a new secret when a token is provided', async () => {
    mockCreateSecret.mockResolvedValue({
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: { name: 'hf-secret', namespace: 'test-project' },
    });

    const secretName = await resolveHfTokenSecretName('test-project', { token: 'hf_123' });

    expect(secretName).toBe('hf-secret');
    expect(mockCreateSecret).toHaveBeenCalledTimes(1);
    expect(mockReplaceSecret).not.toHaveBeenCalled();
  });

  it('should replace an existing secret when updating a configured token', async () => {
    mockReplaceSecret.mockResolvedValue({
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: { name: 'existing-secret', namespace: 'test-project' },
    });

    const secretName = await resolveHfTokenSecretName('test-project', {
      token: 'hf_new',
      configuredSecretName: 'existing-secret',
    });

    expect(secretName).toBe('existing-secret');
    expect(mockReplaceSecret).toHaveBeenCalledTimes(1);
    expect(mockCreateSecret).not.toHaveBeenCalled();
  });

  it('should keep the configured secret name when no new token is provided', async () => {
    const secretName = await resolveHfTokenSecretName('test-project', {
      token: '',
      configuredSecretName: 'existing-secret',
    });

    expect(secretName).toBe('existing-secret');
    expect(mockCreateSecret).not.toHaveBeenCalled();
    expect(mockReplaceSecret).not.toHaveBeenCalled();
  });

  it('should extract configured HF token reference from deployment env', () => {
    const deployment = mockInferenceServiceK8sResource({
      env: [
        {
          name: HF_TOKEN_ENV_NAME,
          valueFrom: {
            secretKeyRef: {
              name: 'hf-secret',
              key: HF_TOKEN_ENV_NAME,
            },
          },
        },
      ],
    });

    expect(extractHuggingFaceApiKeyFromEnv(deployment)).toEqual({
      token: '',
      configuredSecretName: 'hf-secret',
    });
  });

  it('should ignore HF_TOKEN env vars with mismatched secretKeyRef key', () => {
    const deployment = mockInferenceServiceK8sResource({
      env: [
        {
          name: HF_TOKEN_ENV_NAME,
          valueFrom: {
            secretKeyRef: {
              name: 'hf-secret',
              key: 'token',
            },
          },
        },
      ],
    });

    expect(extractHuggingFaceApiKeyFromEnv(deployment)).toBeNull();
  });
});
