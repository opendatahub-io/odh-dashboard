import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockNimAccount } from '@odh-dashboard/internal/__mocks__/mockNimAccount';
import { useWatchNIMAccounts } from '../watch';
import useNIMAccountStatus, { NIMAccountStatus } from '../hooks';

jest.mock('../watch', () => ({
  useWatchNIMAccounts: jest.fn(),
}));

const mockUseWatchNIMAccounts = jest.mocked(useWatchNIMAccounts);

describe('useNIMAccountStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return LOADING when watch has not loaded', () => {
    mockUseWatchNIMAccounts.mockReturnValue([[], false, undefined]);

    const renderResult = testHook(useNIMAccountStatus)('test-ns');

    expect(renderResult.result.current.status).toBe(NIMAccountStatus.LOADING);
    expect(renderResult.result.current.nimAccount).toBeNull();
    expect(renderResult.result.current.loaded).toBe(false);
  });

  it('should return NOT_FOUND when no account exists', () => {
    mockUseWatchNIMAccounts.mockReturnValue([[], true, undefined]);

    const renderResult = testHook(useNIMAccountStatus)('test-ns');

    expect(renderResult.result.current.status).toBe(NIMAccountStatus.NOT_FOUND);
    expect(renderResult.result.current.nimAccount).toBeNull();
    expect(renderResult.result.current.errorMessages).toEqual([]);
    expect(renderResult.result.current.loaded).toBe(true);
  });

  it('should return READY when account has AccountStatus True', () => {
    const account = mockNimAccount({
      namespace: 'test-ns',
      conditions: [{ type: 'AccountStatus', status: 'True', reason: 'AccountSuccessful' }],
    });
    mockUseWatchNIMAccounts.mockReturnValue([[account], true, undefined]);

    const renderResult = testHook(useNIMAccountStatus)('test-ns');

    expect(renderResult.result.current.status).toBe(NIMAccountStatus.READY);
    expect(renderResult.result.current.nimAccount).toBe(account);
    expect(renderResult.result.current.errorMessages).toEqual([]);
  });

  it('should return ERROR when APIKeyValidation is False', () => {
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
    mockUseWatchNIMAccounts.mockReturnValue([[account], true, undefined]);

    const renderResult = testHook(useNIMAccountStatus)('test-ns');

    expect(renderResult.result.current.status).toBe(NIMAccountStatus.ERROR);
    expect(renderResult.result.current.errorMessages).toEqual(['API key failed validation.']);
  });

  it('should return PENDING when account exists but has no definitive conditions', () => {
    const account = mockNimAccount({
      namespace: 'test-ns',
      conditions: [],
    });
    mockUseWatchNIMAccounts.mockReturnValue([[account], true, undefined]);

    const renderResult = testHook(useNIMAccountStatus)('test-ns');

    expect(renderResult.result.current.status).toBe(NIMAccountStatus.PENDING);
    expect(renderResult.result.current.errorMessages).toEqual([]);
  });

  it('should ignore accounts with non-matching names', () => {
    const account = mockNimAccount({
      name: 'some-other-account',
      namespace: 'test-ns',
      conditions: [{ type: 'AccountStatus', status: 'True', reason: 'AccountSuccessful' }],
    });
    mockUseWatchNIMAccounts.mockReturnValue([[account], true, undefined]);

    const renderResult = testHook(useNIMAccountStatus)('test-ns');

    expect(renderResult.result.current.status).toBe(NIMAccountStatus.NOT_FOUND);
    expect(renderResult.result.current.nimAccount).toBeNull();
  });
});
