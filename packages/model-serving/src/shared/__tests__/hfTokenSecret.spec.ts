import { createSecret, getSecret, replaceSecret } from '@odh-dashboard/k8s-core/api/secrets';
import {
  HF_TOKEN_DASHBOARD_LABEL,
  HF_TOKEN_ENV_NAME,
} from '@odh-dashboard/model-serving/shared/hfTokenConstants';
import { assembleHfTokenSecret, resolveHfTokenSecretName } from '../hfTokenSecret';

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
});
