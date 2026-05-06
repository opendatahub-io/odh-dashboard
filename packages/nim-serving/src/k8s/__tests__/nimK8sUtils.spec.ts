import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sPatchResource,
  K8sStatusError,
} from '@openshift/dynamic-plugin-sdk-utils';
import { createSecret, getSecret, replaceSecret } from '@odh-dashboard/internal/api/k8s/secrets';
import { SecretKind } from '@odh-dashboard/internal/k8sTypes';
import { mockNimAccount } from '@odh-dashboard/internal/__mocks__/mockNimAccount';
import { listNIMAccounts } from '../nimAccounts';
import {
  assembleNIMSecret,
  assembleNIMAccount,
  createNIMResources,
  updateNIMSecretAndRevalidate,
  deleteNIMResources,
  getNIMAccount,
  isAccountReady,
  isApiKeyValidationFailed,
  getAccountErrors,
} from '../nimK8sUtils';
import {
  NIM_ACCOUNT_NAME,
  NIM_API_KEY_DATA_KEY,
  NGC_API_KEY_DATA_KEY,
  NIM_SECRET_GENERATE_NAME,
} from '../../nimConstants';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  ...jest.requireActual('@openshift/dynamic-plugin-sdk-utils'),
  k8sCreateResource: jest.fn(),
  k8sDeleteResource: jest.fn(),
  k8sPatchResource: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/api/k8s/secrets', () => ({
  createSecret: jest.fn(),
  getSecret: jest.fn(),
  replaceSecret: jest.fn(),
}));

jest.mock('../nimAccounts', () => ({
  NIMAccountModel: {
    apiVersion: 'v1',
    apiGroup: 'nim.opendatahub.io',
    kind: 'Account',
    plural: 'accounts',
  },
  listNIMAccounts: jest.fn(),
}));

const mockCreateSecret = jest.mocked(createSecret);
const mockGetSecret = jest.mocked(getSecret);
const mockReplaceSecret = jest.mocked(replaceSecret);
const mockK8sCreateResource = jest.mocked(k8sCreateResource);
const mockK8sDeleteResource = jest.mocked(k8sDeleteResource);
const mockK8sPatchResource = jest.mocked(k8sPatchResource);
const mockListNIMAccounts = jest.mocked(listNIMAccounts);

describe('assembleNIMSecret', () => {
  it('should build a secret with generateName and the API key', () => {
    const secret = assembleNIMSecret('test-ns', 'nvapi-test-key');

    expect(secret.metadata.generateName).toBe(NIM_SECRET_GENERATE_NAME);
    expect(secret.metadata.namespace).toBe('test-ns');
    expect(secret.type).toBe('Opaque');
    expect(secret.stringData?.[NIM_API_KEY_DATA_KEY]).toBe('nvapi-test-key');
    expect(secret.stringData?.[NGC_API_KEY_DATA_KEY]).toBe('nvapi-test-key');
    expect(secret.metadata.labels).toEqual({ 'opendatahub.io/managed': 'true' });
  });
});

describe('assembleNIMAccount', () => {
  it('should build an account referencing the given secret name', () => {
    const account = assembleNIMAccount('test-ns', 'nvidia-nim-secrets-abc12');

    expect(account.metadata.name).toBe(NIM_ACCOUNT_NAME);
    expect(account.metadata.namespace).toBe('test-ns');
    expect(account.spec.apiKeySecret.name).toBe('nvidia-nim-secrets-abc12');
    expect(account.metadata.labels).toEqual({ 'opendatahub.io/managed': 'true' });
  });
});

describe('createNIMResources', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should dry-run both creates, then create secret, account, and patch ownerReference', async () => {
    const createdSecret: SecretKind = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: { name: 'nvidia-nim-secrets-xyz99', namespace: 'test-ns' },
      type: 'Opaque',
    };
    const createdAccount = mockNimAccount({
      namespace: 'test-ns',
      uid: 'account-uid-123',
      apiKeySecretName: 'nvidia-nim-secrets-xyz99',
    });

    mockCreateSecret.mockResolvedValue(createdSecret);
    mockK8sCreateResource.mockResolvedValue(createdAccount);
    mockK8sPatchResource.mockResolvedValue(createdSecret);

    const result = await createNIMResources('test-ns', 'nvapi-key');

    expect(mockCreateSecret).toHaveBeenCalledTimes(2);
    expect(mockCreateSecret).toHaveBeenNthCalledWith(1, expect.any(Object), { dryRun: true });
    expect(mockCreateSecret).toHaveBeenNthCalledWith(2, expect.any(Object));

    expect(mockK8sCreateResource).toHaveBeenCalledTimes(2);
    expect(mockK8sCreateResource).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        queryOptions: { queryParams: { dryRun: 'All' } },
      }),
    );
    expect(mockK8sCreateResource).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        resource: expect.objectContaining({
          spec: { apiKeySecret: { name: 'nvidia-nim-secrets-xyz99' } },
        }),
      }),
    );

    expect(mockK8sPatchResource).toHaveBeenCalledWith(
      expect.objectContaining({
        patches: [
          expect.objectContaining({
            op: 'add',
            path: '/metadata/ownerReferences',
            value: [
              expect.objectContaining({
                uid: 'account-uid-123',
                blockOwnerDeletion: true,
              }),
            ],
          }),
        ],
      }),
    );
    expect(result).toBe(createdAccount);
  });

  it('should not create any resources if dry-run fails', async () => {
    mockCreateSecret.mockRejectedValueOnce(new Error('dry-run validation failed'));

    await expect(createNIMResources('test-ns', 'nvapi-key')).rejects.toThrow(
      'dry-run validation failed',
    );
    expect(mockCreateSecret).toHaveBeenCalledTimes(1);
    expect(mockK8sCreateResource).toHaveBeenCalledTimes(1);
    expect(mockK8sDeleteResource).not.toHaveBeenCalled();
  });

  it('should clean up secret if account creation fails', async () => {
    const createdSecret: SecretKind = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: { name: 'nvidia-nim-secrets-abc', namespace: 'test-ns' },
      type: 'Opaque',
    };
    mockCreateSecret.mockResolvedValue(createdSecret);
    mockK8sCreateResource
      .mockResolvedValueOnce(mockNimAccount({}))
      .mockRejectedValueOnce(new Error('account creation failed'));

    await expect(createNIMResources('test-ns', 'nvapi-key')).rejects.toThrow(
      'account creation failed',
    );
    expect(mockK8sDeleteResource).toHaveBeenCalledWith(
      expect.objectContaining({
        queryOptions: { name: 'nvidia-nim-secrets-abc', ns: 'test-ns' },
      }),
    );
  });

  it('should clean up both account and secret if ownerReference patch fails', async () => {
    const createdSecret: SecretKind = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: { name: 'nvidia-nim-secrets-def', namespace: 'test-ns' },
      type: 'Opaque',
    };
    const createdAccount = mockNimAccount({
      namespace: 'test-ns',
      uid: 'account-uid-456',
      apiKeySecretName: 'nvidia-nim-secrets-def',
    });

    mockCreateSecret.mockResolvedValue(createdSecret);
    mockK8sCreateResource.mockResolvedValue(createdAccount);
    mockK8sPatchResource.mockRejectedValue(new Error('patch failed'));

    await expect(createNIMResources('test-ns', 'nvapi-key')).rejects.toThrow('patch failed');
    expect(mockK8sDeleteResource).toHaveBeenCalledTimes(2);
    expect(mockK8sDeleteResource).toHaveBeenCalledWith(
      expect.objectContaining({
        queryOptions: { name: NIM_ACCOUNT_NAME, ns: 'test-ns' },
      }),
    );
    expect(mockK8sDeleteResource).toHaveBeenCalledWith(
      expect.objectContaining({
        queryOptions: { name: 'nvidia-nim-secrets-def', ns: 'test-ns' },
      }),
    );
  });
});

describe('updateNIMSecretAndRevalidate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should dry-run replace before committing', async () => {
    const existingSecret: SecretKind = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: 'nvidia-nim-access-abc',
        namespace: 'test-ns',
        resourceVersion: '12345',
      },
      type: 'Opaque',
      data: { [NIM_API_KEY_DATA_KEY]: btoa('old-key'), [NGC_API_KEY_DATA_KEY]: btoa('old-key') },
    };
    mockGetSecret.mockResolvedValue(existingSecret);
    mockReplaceSecret.mockResolvedValue({} as SecretKind);

    await updateNIMSecretAndRevalidate('test-ns', 'nvidia-nim-access-abc', 'nvapi-new-key');

    expect(mockGetSecret).toHaveBeenCalledWith('test-ns', 'nvidia-nim-access-abc');
    expect(mockReplaceSecret).toHaveBeenCalledTimes(2);

    const expectedSecret = expect.objectContaining({
      metadata: expect.objectContaining({
        resourceVersion: '12345',
        annotations: expect.objectContaining({
          'runtimes.opendatahub.io/nim-force-validation': expect.any(String),
        }),
      }),
      stringData: {
        [NIM_API_KEY_DATA_KEY]: 'nvapi-new-key',
        [NGC_API_KEY_DATA_KEY]: 'nvapi-new-key',
      },
    });
    expect(mockReplaceSecret).toHaveBeenNthCalledWith(1, expectedSecret, { dryRun: true });
    expect(mockReplaceSecret).toHaveBeenNthCalledWith(2, expectedSecret);
  });

  it('should not replace if dry-run fails', async () => {
    const existingSecret: SecretKind = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: { name: 'nvidia-nim-access-abc', namespace: 'test-ns' },
      type: 'Opaque',
    };
    mockGetSecret.mockResolvedValue(existingSecret);
    mockReplaceSecret.mockRejectedValueOnce(new Error('dry-run failed'));

    await expect(
      updateNIMSecretAndRevalidate('test-ns', 'nvidia-nim-access-abc', 'bad-key'),
    ).rejects.toThrow('dry-run failed');
    expect(mockReplaceSecret).toHaveBeenCalledTimes(1);
  });
});

describe('deleteNIMResources', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete the NIMAccount', async () => {
    mockK8sDeleteResource.mockResolvedValue({} as never);

    await deleteNIMResources('test-ns');

    expect(mockK8sDeleteResource).toHaveBeenCalledWith(
      expect.objectContaining({
        queryOptions: { name: NIM_ACCOUNT_NAME, ns: 'test-ns' },
      }),
    );
  });

  it('should treat 404 as success (already deleted)', async () => {
    mockK8sDeleteResource.mockRejectedValue(
      new K8sStatusError({
        kind: 'Status',
        apiVersion: 'v1',
        status: 'Failure',
        code: 404,
        message: 'not found',
        reason: 'NotFound',
      }),
    );

    await expect(deleteNIMResources('test-ns')).resolves.toBeUndefined();
  });

  it('should rethrow non-404 errors', async () => {
    mockK8sDeleteResource.mockRejectedValue(new Error('server error'));

    await expect(deleteNIMResources('test-ns')).rejects.toThrow('server error');
  });
});

describe('getNIMAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the account matching NIM_ACCOUNT_NAME', async () => {
    const account = mockNimAccount({ namespace: 'test-ns' });
    mockListNIMAccounts.mockResolvedValue([account]);

    const result = await getNIMAccount('test-ns');
    expect(result).toBe(account);
  });

  it('should return undefined when no accounts exist', async () => {
    mockListNIMAccounts.mockResolvedValue([]);

    const result = await getNIMAccount('test-ns');
    expect(result).toBeUndefined();
  });
});

describe('isAccountReady', () => {
  it('should return true when AccountStatus condition is True', () => {
    const account = mockNimAccount({
      conditions: [{ type: 'AccountStatus', status: 'True', reason: 'AccountSuccessful' }],
    });
    expect(isAccountReady(account)).toBe(true);
  });

  it('should return false when AccountStatus condition is False', () => {
    const account = mockNimAccount({
      conditions: [
        { type: 'AccountStatus', status: 'False', reason: 'Failed', message: 'bad key' },
      ],
    });
    expect(isAccountReady(account)).toBe(false);
  });

  it('should return false when no conditions exist', () => {
    const account = mockNimAccount({ conditions: [] });
    expect(isAccountReady(account)).toBe(false);
  });
});

describe('getAccountErrors', () => {
  it('should collect messages from conditions with status False', () => {
    const account = mockNimAccount({
      conditions: [
        { type: 'AccountStatus', status: 'False', reason: 'Failed', message: 'invalid key' },
        {
          type: 'APIKeyValidation',
          status: 'False',
          reason: 'ValidationFailed',
          message: 'key expired',
        },
      ],
    });
    expect(getAccountErrors(account)).toEqual(['invalid key', 'key expired']);
  });

  it('should return empty array when all conditions are True', () => {
    const account = mockNimAccount({
      conditions: [{ type: 'AccountStatus', status: 'True', reason: 'OK' }],
    });
    expect(getAccountErrors(account)).toEqual([]);
  });

  it('should filter out undefined messages', () => {
    const account = mockNimAccount({
      conditions: [{ type: 'AccountStatus', status: 'False', reason: 'Failed' }],
    });
    expect(getAccountErrors(account)).toEqual([]);
  });
});

describe('isApiKeyValidationFailed', () => {
  it('should return true when APIKeyValidation condition is False', () => {
    const account = mockNimAccount({
      conditions: [{ type: 'APIKeyValidation', status: 'False', reason: 'ValidationFailed' }],
    });
    expect(isApiKeyValidationFailed(account)).toBe(true);
  });

  it('should return false when APIKeyValidation condition is True', () => {
    const account = mockNimAccount({
      conditions: [{ type: 'APIKeyValidation', status: 'True', reason: 'Valid' }],
    });
    expect(isApiKeyValidationFailed(account)).toBe(false);
  });

  it('should return false when no APIKeyValidation condition exists', () => {
    const account = mockNimAccount({
      conditions: [{ type: 'AccountStatus', status: 'True', reason: 'OK' }],
    });
    expect(isApiKeyValidationFailed(account)).toBe(false);
  });
});
