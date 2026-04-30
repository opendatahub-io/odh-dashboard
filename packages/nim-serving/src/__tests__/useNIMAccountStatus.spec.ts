import { testHook } from '@odh-dashboard/jest-config/hooks';
import { listNIMAccounts } from '@odh-dashboard/internal/api/k8s/nimAccounts';
import { mockNimAccount } from '@odh-dashboard/internal/__mocks__/mockNimAccount';
import useNIMAccountStatus, { deriveStatus, NIMAccountStatus } from '../useNIMAccountStatus';

jest.mock('@odh-dashboard/internal/api/k8s/nimAccounts', () => ({
  listNIMAccounts: jest.fn(),
}));

const mockListNIMAccounts = jest.mocked(listNIMAccounts);

describe('deriveStatus', () => {
  it('should return NOT_FOUND when account is undefined', () => {
    const result = deriveStatus(undefined);
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

  it('should return ERROR when conditions have status False', () => {
    const account = mockNimAccount({
      conditions: [
        { type: 'AccountStatus', status: 'False', reason: 'Failed', message: 'invalid key' },
      ],
    });
    const result = deriveStatus(account);
    expect(result.status).toBe(NIMAccountStatus.ERROR);
    expect(result.errorMessages).toEqual(['invalid key']);
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

  it('should return ERROR when account has conditions with status False', async () => {
    const account = mockNimAccount({
      namespace: 'test-ns',
      conditions: [
        { type: 'AccountStatus', status: 'False', reason: 'Failed', message: 'invalid key' },
      ],
    });
    mockListNIMAccounts.mockResolvedValue([account]);

    const renderResult = testHook(useNIMAccountStatus)('test-ns');
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.status).toBe(NIMAccountStatus.ERROR);
    expect(renderResult.result.current.errorMessages).toEqual(['invalid key']);
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
