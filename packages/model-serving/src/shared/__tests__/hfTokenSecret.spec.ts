import { createSecret, getSecret, replaceSecret } from '@odh-dashboard/k8s-core/api/secrets';
import {
  createServiceAccount,
  getServiceAccount,
  replaceServiceAccount,
} from '@odh-dashboard/k8s-core/api/serviceAccounts';
import { K8sStatusError } from '@odh-dashboard/k8s-core';
import {
  HF_TOKEN_DASHBOARD_LABEL,
  HF_TOKEN_ENV_NAME,
  getHfTokenServiceAccountName,
} from '@odh-dashboard/model-serving/shared/hfTokenConstants';
import {
  assembleHfTokenSecret,
  assembleHfTokenServiceAccount,
  resolveHfTokenSecretName,
  resolveHfTokenServiceAccountName,
} from '../hfTokenSecret';

jest.mock('@odh-dashboard/k8s-core/api/secrets', () => ({
  createSecret: jest.fn(),
  getSecret: jest.fn(),
  replaceSecret: jest.fn(),
}));

jest.mock('@odh-dashboard/k8s-core/api/serviceAccounts', () => ({
  createServiceAccount: jest.fn(),
  getServiceAccount: jest.fn(),
  replaceServiceAccount: jest.fn(),
}));

const mockCreateSecret = jest.mocked(createSecret);
const mockGetSecret = jest.mocked(getSecret);
const mockReplaceSecret = jest.mocked(replaceSecret);
const mockCreateServiceAccount = jest.mocked(createServiceAccount);
const mockGetServiceAccount = jest.mocked(getServiceAccount);
const mockReplaceServiceAccount = jest.mocked(replaceServiceAccount);

const make404 = () =>
  new K8sStatusError({
    apiVersion: 'v1',
    kind: 'Status',
    status: 'Failure',
    message: 'not found',
    reason: 'NotFound',
    code: 404,
  });

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

  it('should assemble a ServiceAccount that references the HF secret', () => {
    const sa = assembleHfTokenServiceAccount('model-hf-sa', 'test-project', 'hf-secret');

    expect(sa.metadata.name).toBe('model-hf-sa');
    expect(sa.secrets).toEqual([{ name: 'hf-secret' }]);
    expect(sa.metadata.labels?.[HF_TOKEN_DASHBOARD_LABEL]).toBe('true');
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

  it('should create a ServiceAccount that references the HF secret', async () => {
    mockGetServiceAccount.mockRejectedValue(make404());
    mockCreateServiceAccount.mockResolvedValue({
      apiVersion: 'v1',
      kind: 'ServiceAccount',
      metadata: { name: 'my-model-hf-sa', namespace: 'test-project' },
    });

    const saName = await resolveHfTokenServiceAccountName('test-project', 'hf-secret', 'my-model');

    expect(saName).toBe('my-model-hf-sa');
    expect(saName).toBe(getHfTokenServiceAccountName('my-model'));
    expect(mockCreateServiceAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ name: 'my-model-hf-sa' }),
        secrets: [{ name: 'hf-secret' }],
      }),
      undefined,
    );
  });

  it('should update an existing ServiceAccount when the secret ref is missing', async () => {
    mockGetServiceAccount.mockResolvedValue({
      apiVersion: 'v1',
      kind: 'ServiceAccount',
      metadata: {
        name: 'my-model-hf-sa',
        namespace: 'test-project',
        resourceVersion: '9',
      },
      secrets: [{ name: 'other-secret' }],
    });
    mockReplaceServiceAccount.mockResolvedValue({
      apiVersion: 'v1',
      kind: 'ServiceAccount',
      metadata: { name: 'my-model-hf-sa', namespace: 'test-project' },
    });

    const saName = await resolveHfTokenServiceAccountName('test-project', 'hf-secret', 'my-model');

    expect(saName).toBe('my-model-hf-sa');
    expect(mockReplaceServiceAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        secrets: [{ name: 'other-secret' }, { name: 'hf-secret' }],
      }),
      undefined,
    );
    expect(mockCreateServiceAccount).not.toHaveBeenCalled();
  });

  it('should reuse an existing ServiceAccount that already references the HF secret', async () => {
    mockGetServiceAccount.mockResolvedValue({
      apiVersion: 'v1',
      kind: 'ServiceAccount',
      metadata: { name: 'my-model-hf-sa', namespace: 'test-project' },
      secrets: [{ name: 'hf-secret' }],
    });

    const saName = await resolveHfTokenServiceAccountName('test-project', 'hf-secret', 'my-model');

    expect(saName).toBe('my-model-hf-sa');
    expect(mockCreateServiceAccount).not.toHaveBeenCalled();
    expect(mockReplaceServiceAccount).not.toHaveBeenCalled();
  });
});
