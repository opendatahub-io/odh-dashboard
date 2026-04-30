import { testHook } from '@odh-dashboard/jest-config/hooks';
import { listNIMAccounts } from '@odh-dashboard/internal/api/k8s/nimAccounts';
import { mockNimAccount } from '@odh-dashboard/internal/__mocks__/mockNimAccount';
import useNIMAccountStatus, { NIMAccountStatus } from '../useNIMAccountStatus';

jest.mock('@odh-dashboard/internal/api/k8s/nimAccounts', () => ({
  listNIMAccounts: jest.fn(),
}));

const mockListNIMAccounts = jest.mocked(listNIMAccounts);

describe('useNIMAccountStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return NOT_FOUND when no account exists', async () => {
    mockListNIMAccounts.mockResolvedValue([]);

    const renderResult = testHook(useNIMAccountStatus)('test-ns');
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.status).toBe(NIMAccountStatus.NOT_FOUND);
    expect(renderResult.result.current.nimAccount).toBeUndefined();
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

  it('should return NOT_FOUND when listNIMAccounts throws', async () => {
    mockListNIMAccounts.mockRejectedValue(new Error('network error'));

    const renderResult = testHook(useNIMAccountStatus)('test-ns');
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.status).toBe(NIMAccountStatus.NOT_FOUND);
    expect(renderResult.result.current.loaded).toBe(true);
  });
});
