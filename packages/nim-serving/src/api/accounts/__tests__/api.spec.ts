import { mockNimAccount } from '@odh-dashboard/internal/__mocks__/mockNimAccount';
import { mock409Error } from '@odh-dashboard/internal/__mocks__/mockK8sStatus';
import { K8sStatusError } from '@odh-dashboard/internal/api/errorUtils';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import {
  createNIMSecret,
  createNIMAccount,
  getNIMAccount,
  deleteNIMAccount,
  deleteSecret,
  fetchExistingSecret,
  replaceNIMSecret,
} from '../k8s';
import { createNIMResources, deleteNIMResources } from '../api';
import { NIM_SECRET_NAME } from '../constants';

jest.mock('../k8s', () => ({
  ...jest.requireActual('../k8s'),
  createNIMSecret: jest.fn(),
  createNIMAccount: jest.fn(),
  getNIMAccount: jest.fn(),
  deleteNIMAccount: jest.fn(),
  deleteSecret: jest.fn(),
  fetchExistingSecret: jest.fn(),
  replaceNIMSecret: jest.fn(),
}));

const mockCreateNIMSecret = jest.mocked(createNIMSecret);
const mockCreateNIMAccount = jest.mocked(createNIMAccount);
const mockGetNIMAccount = jest.mocked(getNIMAccount);
const mockDeleteNIMAccount = jest.mocked(deleteNIMAccount);
const mockDeleteSecret = jest.mocked(deleteSecret);
const mockFetchExistingSecret = jest.mocked(fetchExistingSecret);
const mockReplaceNIMSecret = jest.mocked(replaceNIMSecret);

describe('createNIMResources', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should dry-run both creates, then create secret and account', async () => {
    const createdSecret: SecretKind = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: { name: NIM_SECRET_NAME, namespace: 'test-ns' },
      type: 'Opaque',
    };
    const createdAccount = mockNimAccount({
      namespace: 'test-ns',
      uid: 'account-uid-123',
      apiKeySecretName: NIM_SECRET_NAME,
    });

    mockCreateNIMSecret.mockResolvedValue(createdSecret);
    mockCreateNIMAccount.mockResolvedValue(createdAccount);

    const result = await createNIMResources('test-ns', 'nvapi-key');

    expect(mockCreateNIMSecret).toHaveBeenCalledTimes(2);
    expect(mockCreateNIMSecret).toHaveBeenNthCalledWith(1, expect.any(Object), true);
    expect(mockCreateNIMSecret).toHaveBeenNthCalledWith(2, expect.any(Object), undefined);

    expect(mockCreateNIMAccount).toHaveBeenCalledTimes(2);
    expect(mockCreateNIMAccount).toHaveBeenNthCalledWith(1, expect.any(Object), true);
    expect(mockCreateNIMAccount).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        spec: { apiKeySecret: { name: NIM_SECRET_NAME } },
      }),
      undefined,
    );

    expect(result).toBe(createdAccount);
  });

  it('should not create any resources if dry-run fails', async () => {
    mockCreateNIMSecret.mockRejectedValueOnce(new Error('dry-run validation failed'));

    await expect(createNIMResources('test-ns', 'nvapi-key')).rejects.toThrow(
      'dry-run validation failed',
    );
    expect(mockCreateNIMSecret).toHaveBeenCalledTimes(1);
    expect(mockCreateNIMAccount).toHaveBeenCalledTimes(1);
    expect(mockDeleteSecret).not.toHaveBeenCalled();
  });

  it('should replace existing secret if create returns 409', async () => {
    const existingSecret: SecretKind = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: { name: NIM_SECRET_NAME, namespace: 'test-ns', resourceVersion: '999' },
      type: 'Opaque',
      data: { [NIM_SECRET_NAME]: btoa('old-key') },
    };
    const createdAccount = mockNimAccount({
      namespace: 'test-ns',
      apiKeySecretName: NIM_SECRET_NAME,
    });

    mockCreateNIMSecret.mockRejectedValue(new K8sStatusError(mock409Error({}))); // both dry-run and actual create: 409
    mockCreateNIMAccount.mockResolvedValue(createdAccount);
    mockFetchExistingSecret.mockResolvedValue(existingSecret);
    mockReplaceNIMSecret.mockResolvedValue({} as SecretKind);

    const result = await createNIMResources('test-ns', 'nvapi-key');

    expect(mockFetchExistingSecret).toHaveBeenCalledWith('test-ns', NIM_SECRET_NAME);
    expect(mockReplaceNIMSecret).toHaveBeenCalledTimes(2);
    expect(mockReplaceNIMSecret).toHaveBeenNthCalledWith(1, expect.any(Object), true);
    expect(mockReplaceNIMSecret).toHaveBeenNthCalledWith(2, expect.any(Object));
    expect(result).toBe(createdAccount);
  });

  it('should return existing account if create returns 409', async () => {
    const existingAccount = mockNimAccount({
      namespace: 'test-ns',
      apiKeySecretName: NIM_SECRET_NAME,
    });

    mockCreateNIMSecret.mockResolvedValue({} as SecretKind);
    mockCreateNIMAccount
      .mockResolvedValueOnce(mockNimAccount({})) // dry-run succeeds
      .mockRejectedValueOnce(new K8sStatusError(mock409Error({}))); // actual create: 409
    mockGetNIMAccount.mockResolvedValue(existingAccount);

    const result = await createNIMResources('test-ns', 'nvapi-key');

    expect(mockGetNIMAccount).toHaveBeenCalledWith('test-ns');
    expect(mockDeleteSecret).not.toHaveBeenCalled();
    expect(result).toBe(existingAccount);
  });

  it('should clean up secret if account creation fails', async () => {
    const createdSecret: SecretKind = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: { name: NIM_SECRET_NAME, namespace: 'test-ns' },
      type: 'Opaque',
    };
    mockCreateNIMSecret.mockResolvedValue(createdSecret);
    mockCreateNIMAccount
      .mockResolvedValueOnce(mockNimAccount({}))
      .mockRejectedValueOnce(new Error('account creation failed'));

    await expect(createNIMResources('test-ns', 'nvapi-key')).rejects.toThrow(
      'account creation failed',
    );
    expect(mockDeleteSecret).toHaveBeenCalledWith('test-ns', NIM_SECRET_NAME);
  });
});

describe('deleteNIMResources', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete both the NIM account and the secret', async () => {
    mockDeleteNIMAccount.mockResolvedValue(undefined);
    mockDeleteSecret.mockResolvedValue(undefined);

    await deleteNIMResources('test-ns');

    expect(mockDeleteNIMAccount).toHaveBeenCalledWith('test-ns');
    expect(mockDeleteSecret).toHaveBeenCalledWith('test-ns', NIM_SECRET_NAME);
  });
});
