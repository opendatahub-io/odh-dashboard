import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockNimAccount } from '@odh-dashboard/internal/__mocks__/mockNimAccount';
import { listNIMAccounts } from '../k8s';
import useNIMAccountStatus, { NIMAccountStatus } from '../hooks';

jest.mock('../k8s', () => ({
  listNIMAccounts: jest.fn(),
}));

const mockListNIMAccounts = jest.mocked(listNIMAccounts);

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
