import { mockNimAccount } from '@odh-dashboard/internal/__mocks__/mockNimAccount';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import { assembleNIMSecret, assembleNIMAccount, assembleUpdatedSecret } from '../k8s';
import {
  isAccountReady,
  isApiKeyValidationFailed,
  getAccountErrors,
  deriveAccountStatus,
  NIMAccountStatus,
} from '../utils';
import {
  NIM_ACCOUNT_NAME,
  NIM_API_KEY_DATA_KEY,
  NGC_API_KEY_DATA_KEY,
  NIM_SECRET_NAME,
  NIM_FORCE_VALIDATION_ANNOTATION,
} from '../constants';

describe('assembleNIMSecret', () => {
  it('should build a secret with a static name and the API key', () => {
    const secret = assembleNIMSecret('test-ns', 'nvapi-test-key');

    expect(secret.metadata.name).toBe(NIM_SECRET_NAME);
    expect(secret.metadata.namespace).toBe('test-ns');
    expect(secret.type).toBe('Opaque');
    expect(secret.stringData?.[NIM_API_KEY_DATA_KEY]).toBe('nvapi-test-key');
    expect(secret.stringData?.[NGC_API_KEY_DATA_KEY]).toBe('nvapi-test-key');
    expect(secret.metadata.labels).toEqual({ 'opendatahub.io/managed': 'true' });
  });
});

describe('assembleNIMAccount', () => {
  it('should build an account referencing the given secret name', () => {
    const account = assembleNIMAccount('test-ns', NIM_SECRET_NAME);

    expect(account.metadata.name).toBe(NIM_ACCOUNT_NAME);
    expect(account.metadata.namespace).toBe('test-ns');
    expect(account.spec.apiKeySecret.name).toBe(NIM_SECRET_NAME);
    expect(account.metadata.labels).toEqual({ 'opendatahub.io/managed': 'true' });
  });
});

describe('assembleUpdatedSecret', () => {
  it('should build an updated secret with new key and force-validation annotation', () => {
    const existing: SecretKind = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: { name: 'test-secret', namespace: 'test-ns', resourceVersion: '123' },
      type: 'Opaque',
      data: { old: 'data' },
    };
    const updated = assembleUpdatedSecret(existing, 'nvapi-new-key');

    expect(updated.data).toBeUndefined();
    expect(updated.metadata.resourceVersion).toBe('123');
    expect(updated.metadata.annotations?.[NIM_FORCE_VALIDATION_ANNOTATION]).toBeDefined();
    expect(updated.stringData?.[NIM_API_KEY_DATA_KEY]).toBe('nvapi-new-key');
    expect(updated.stringData?.[NGC_API_KEY_DATA_KEY]).toBe('nvapi-new-key');
  });
});

describe('deriveAccountStatus', () => {
  it('should return LOADING when not yet loaded', () => {
    const result = deriveAccountStatus(null, false);
    expect(result.status).toBe(NIMAccountStatus.LOADING);
    expect(result.errorMessages).toEqual([]);
  });

  it('should return NOT_FOUND when account is null', () => {
    const result = deriveAccountStatus(null);
    expect(result.status).toBe(NIMAccountStatus.NOT_FOUND);
    expect(result.errorMessages).toEqual([]);
  });

  it('should return READY when AccountStatus condition is True', () => {
    const account = mockNimAccount({
      conditions: [{ type: 'AccountStatus', status: 'True', reason: 'AccountSuccessful' }],
    });
    const result = deriveAccountStatus(account);
    expect(result.status).toBe(NIMAccountStatus.READY);
  });

  it('should return ERROR when APIKeyValidation condition is False', () => {
    const account = mockNimAccount({
      conditions: [
        {
          type: 'APIKeyValidation',
          status: 'False',
          reason: 'ValidationFailed',
          message: 'API key failed validation.',
        },
      ],
    });
    const result = deriveAccountStatus(account);
    expect(result.status).toBe(NIMAccountStatus.ERROR);
    expect(result.errorMessages).toEqual(['API key failed validation.']);
  });

  it('should return PENDING when account exists but has no definitive conditions', () => {
    const account = mockNimAccount({ conditions: [] });
    const result = deriveAccountStatus(account);
    expect(result.status).toBe(NIMAccountStatus.PENDING);
    expect(result.errorMessages).toEqual([]);
  });

  it('should return ERROR when any condition has status False even if APIKeyValidation is not the failing condition', () => {
    const account = mockNimAccount({
      conditions: [
        {
          type: 'AccountStatus',
          status: 'False',
          reason: 'SecretNotFound',
          message: 'Referenced secret not found.',
        },
      ],
    });
    const result = deriveAccountStatus(account);
    expect(result.status).toBe(NIMAccountStatus.ERROR);
    expect(result.errorMessages).toEqual(['Referenced secret not found.']);
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
