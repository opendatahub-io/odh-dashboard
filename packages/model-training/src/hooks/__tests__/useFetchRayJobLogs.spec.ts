/**
 * @jest-environment jsdom
 */
import { testHook } from '@odh-dashboard/jest-config/hooks';
import useFetch from '@odh-dashboard/internal/utilities/useFetch';
import { getRayJobDriverLogs } from '../../api/rayJobLogs';
import useFetchRayJobLogs from '../useFetchRayJobLogs';

jest.mock('@odh-dashboard/internal/utilities/useFetch', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../api/rayJobLogs', () => ({
  getRayJobDriverLogs: jest.fn(),
}));

const useFetchMock = jest.mocked(useFetch);
const getRayJobDriverLogsMock = jest.mocked(getRayJobDriverLogs);

describe('useFetchRayJobLogs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFetchMock.mockReturnValue({
      data: '',
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    });
  });

  it('should call useFetch with 0 refresh rate when not active', () => {
    testHook(useFetchRayJobLogs)('test-ns', 'head-pod', 'ray-head', 'job-123', false);

    expect(useFetchMock).toHaveBeenCalledWith(expect.any(Function), '', {
      refreshRate: 0,
      initialPromisePurity: false,
    });
  });

  it('should call useFetch with 30s refresh rate when active', () => {
    testHook(useFetchRayJobLogs)('test-ns', 'head-pod', 'ray-head', 'job-123', true);

    expect(useFetchMock).toHaveBeenCalledWith(expect.any(Function), '', {
      refreshRate: 30000,
      initialPromisePurity: false,
    });
  });

  it('should call getRayJobDriverLogs with correct params when all args provided', async () => {
    getRayJobDriverLogsMock.mockResolvedValue('log output');
    testHook(useFetchRayJobLogs)('test-ns', 'head-pod', 'ray-head', 'job-123', true);

    const callback = useFetchMock.mock.calls[0][0];
    await callback({ signal: new AbortController().signal });

    expect(getRayJobDriverLogsMock).toHaveBeenCalledWith(
      'test-ns',
      'head-pod',
      'ray-head',
      'job-123',
    );
  });

  it('should not call getRayJobDriverLogs when podName is missing', () => {
    testHook(useFetchRayJobLogs)('test-ns', undefined, 'ray-head', 'job-123', true);

    expect(getRayJobDriverLogsMock).not.toHaveBeenCalled();
  });
});
