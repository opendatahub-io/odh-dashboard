import { mockInferenceServiceK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockInferenceServiceK8sResource';
import {
  HF_TOKEN_DASHBOARD_LABEL,
  HF_TOKEN_ENV_NAME,
} from '@odh-dashboard/model-serving/shared/hfTokenConstants';
import { createSecret, getSecret, replaceSecret } from '@odh-dashboard/k8s-core/api/secrets';
import {
  applyHfTokenEnvVar,
  assembleHfTokenSecret,
  extractHuggingFaceApiKeyFromEnv,
  resolveHfTokenSecretName,
} from '../hfTokenSecret';

jest.mock('@odh-dashboard/k8s-core/api/secrets', () => ({
  createSecret: jest.fn(),
  getSecret: jest.fn(),
  replaceSecret: jest.fn(),
}));

const mockCreateSecret = jest.mocked(createSecret);
const mockGetSecret = jest.mocked(getSecret);
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

  it('should replace a dashboard-managed secret when updating a configured token', async () => {
    mockGetSecret.mockResolvedValue({
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: 'existing-secret',
        namespace: 'test-project',
        resourceVersion: '123',
        labels: { [HF_TOKEN_DASHBOARD_LABEL]: 'true' },
      },
      data: { OTHER: 'value' },
    });
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
    expect(mockGetSecret).toHaveBeenCalledWith('test-project', 'existing-secret', undefined);
    expect(mockReplaceSecret).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          name: 'existing-secret',
          resourceVersion: '123',
        }),
        stringData: { [HF_TOKEN_ENV_NAME]: 'hf_new' },
      }),
      undefined,
    );
    expect(mockCreateSecret).not.toHaveBeenCalled();
  });

  it('should create a new secret instead of overwriting a foreign configured secret', async () => {
    mockGetSecret.mockResolvedValue({
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: 'shared-hf-secret',
        namespace: 'test-project',
        resourceVersion: '123',
      },
      data: { [HF_TOKEN_ENV_NAME]: 'existing-token' },
    });
    mockCreateSecret.mockResolvedValue({
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: { name: 'new-hf-secret', namespace: 'test-project' },
    });

    const secretName = await resolveHfTokenSecretName('test-project', {
      token: 'hf_new',
      configuredSecretName: 'shared-hf-secret',
    });

    expect(secretName).toBe('new-hf-secret');
    expect(mockGetSecret).toHaveBeenCalledWith('test-project', 'shared-hf-secret', undefined);
    expect(mockCreateSecret).toHaveBeenCalledTimes(1);
    expect(mockReplaceSecret).not.toHaveBeenCalled();
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
