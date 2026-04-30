import { testHook } from '@odh-dashboard/jest-config/hooks';
import { listNIMAccounts } from '@odh-dashboard/internal/api/k8s/nimAccounts';
import { mockNimAccount } from '@odh-dashboard/internal/__mocks__/mockNimAccount';
import useNIMAccountStatus, { deriveStatus, NIMAccountStatus } from '../useNIMAccountStatus';

jest.mock('@odh-dashboard/internal/api/k8s/nimAccounts', () => ({
  listNIMAccounts: jest.fn(),
}));

const mockListNIMAccounts = jest.mocked(listNIMAccounts);

describe('deriveStatus', () => {
  it('should return NOT_FOUND when account is null', () => {
    const result = deriveStatus(null);
    expect(result.status).toBe(NIMAccountStatus.NOT_FOUND);
    expect(result.errorMessages).toEqual([]);
  });

  it('should return READY when AccountStatus condition is True', () => {
    const account = mockNimAccount({
      conditions: [{ type: 'AccountStatus', status: 'True', reason: 'AccountSuccessful' }],
    });
    const result = deriveStatus(account);
    expect(result.status).toBe(NIMAccountStatus.READY);
    expect(result.errorMessages).toEqual([]);
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
        { type: 'AccountStatus', status: 'False', reason: 'Failed', message: 'invalid key' },
      ],
    });
    const result = deriveStatus(account);
    expect(result.status).toBe(NIMAccountStatus.ERROR);
    expect(result.errorMessages).toEqual(['API key failed validation.', 'invalid key']);
  });

  it('should return CONFIGURING when APIKeyValidation is True but AccountStatus is not ready', () => {
    const account = mockNimAccount({
      conditions: [
        { type: 'APIKeyValidation', status: 'True', reason: 'ApiKeyValidated' },
        {
          type: 'AccountStatus',
          status: 'False',
          reason: 'AccountNotSuccessful',
          message: 'nim config reconciliation failed',
        },
      ],
    });
    const result = deriveStatus(account);
    expect(result.status).toBe(NIMAccountStatus.CONFIGURING);
    expect(result.errorMessages).toEqual([]);
  });

  it('should return ERROR when CONFIGURING has timed out based on lastAccountCheck', () => {
    const staleTime = new Date(Date.now() - 360_000).toISOString();
    const account = mockNimAccount({
      conditions: [
        { type: 'APIKeyValidation', status: 'True', reason: 'ApiKeyValidated' },
        {
          type: 'AccountStatus',
          status: 'False',
          reason: 'AccountNotSuccessful',
          message: 'nim config reconciliation failed',
        },
      ],
    });
    account.status = { ...account.status, lastAccountCheck: staleTime };
    const result = deriveStatus(account);
    expect(result.status).toBe(NIMAccountStatus.ERROR);
    expect(result.errorMessages).toEqual(['nim config reconciliation failed']);
  });

  it('should return ERROR when PENDING has timed out based on creationTimestamp', () => {
    const staleTime = new Date(Date.now() - 360_000).toISOString();
    const account = mockNimAccount({ conditions: [] });
    account.metadata.creationTimestamp = staleTime;
    const result = deriveStatus(account);
    expect(result.status).toBe(NIMAccountStatus.ERROR);
    expect(result.errorMessages[0]).toContain('taking longer than expected');
  });

  it('should return PENDING when account exists but has no definitive conditions', () => {
    const account = mockNimAccount({ conditions: [] });
    const result = deriveStatus(account);
    expect(result.status).toBe(NIMAccountStatus.PENDING);
    expect(result.errorMessages).toEqual([]);
  });
});

describe('useNIMAccountStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return NOT_FOUND when no account exists', async () => {
    mockListNIMAccounts.mockResolvedValue([]);

    const renderResult = testHook(useNIMAccountStatus)('test-ns');
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.status).toBe(NIMAccountStatus.NOT_FOUND);
    expect(renderResult.result.current.nimAccount).toBeNull();
    expect(renderResult.result.current.errorMessages).toEqual([]);
    expect(renderResult.result.current.loaded).toBe(true);
  });

  it('should return READY when account has AccountStatus True', async () => {
    const account = mockNimAccount({
      namespace: 'test-ns',
      conditions: [{ type: 'AccountStatus', status: 'True', reason: 'AccountSuccessful' }],
    });
    mockListNIMAccounts.mockResolvedValue([account]);

    const renderResult = testHook(useNIMAccountStatus)('test-ns');
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.status).toBe(NIMAccountStatus.READY);
    expect(renderResult.result.current.nimAccount).toBe(account);
    expect(renderResult.result.current.errorMessages).toEqual([]);
  });

  it('should return ERROR when APIKeyValidation is False', async () => {
    const account = mockNimAccount({
      namespace: 'test-ns',
      conditions: [
        {
          type: 'APIKeyValidation',
          status: 'False',
          reason: 'ValidationFailed',
          message: 'API key failed validation.',
        },
      ],
    });
    mockListNIMAccounts.mockResolvedValue([account]);

    const renderResult = testHook(useNIMAccountStatus)('test-ns');
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.status).toBe(NIMAccountStatus.ERROR);
    expect(renderResult.result.current.errorMessages).toEqual(['API key failed validation.']);
  });

  it('should return PENDING when account exists but has no definitive conditions', async () => {
    const account = mockNimAccount({
      namespace: 'test-ns',
      conditions: [],
    });
    mockListNIMAccounts.mockResolvedValue([account]);

    const renderResult = testHook(useNIMAccountStatus)('test-ns');
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.status).toBe(NIMAccountStatus.PENDING);
    expect(renderResult.result.current.errorMessages).toEqual([]);
  });
});
