// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as React from 'react';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import { useEvaluationJobLogs } from '~/app/hooks/useEvaluationJobLogs';
import { getEvaluationJobLogs, getEvaluationJobBenchmarkLogs } from '~/app/api/k8s';

jest.mock('~/app/api/k8s', () => ({
  getEvaluationJobLogs: jest.fn(),
  getEvaluationJobBenchmarkLogs: jest.fn(),
}));

const mockGetEvaluationJobLogs = jest.mocked(getEvaluationJobLogs);
const mockGetEvaluationJobBenchmarkLogs = jest.mocked(getEvaluationJobBenchmarkLogs);

describe('useEvaluationJobLogs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty state when namespace is undefined', () => {
    const renderResult = testHook(useEvaluationJobLogs)(undefined, 'job-1', undefined);

    expect(renderResult.result.current).toStrictEqual({
      logs: '',
      loaded: false,
      error: undefined,
      refresh: expect.any(Function),
    });
    expect(mockGetEvaluationJobLogs).not.toHaveBeenCalled();
    expect(mockGetEvaluationJobBenchmarkLogs).not.toHaveBeenCalled();
  });

  it('should return empty state when jobId is undefined', () => {
    const renderResult = testHook(useEvaluationJobLogs)('test-ns', undefined, undefined);

    expect(renderResult.result.current).toStrictEqual({
      logs: '',
      loaded: false,
      error: undefined,
      refresh: expect.any(Function),
    });
    expect(mockGetEvaluationJobLogs).not.toHaveBeenCalled();
  });

  it('should fetch job-level logs when benchmarkIndex is undefined', async () => {
    const fetcher = jest.fn().mockResolvedValue('log line 1\nlog line 2');
    mockGetEvaluationJobLogs.mockReturnValue(fetcher);

    const renderResult = testHook(useEvaluationJobLogs)('test-ns', 'job-1', undefined);

    await renderResult.waitForNextUpdate();

    expect(mockGetEvaluationJobLogs).toHaveBeenCalledWith('', 'test-ns', 'job-1', undefined);
    expect(mockGetEvaluationJobBenchmarkLogs).not.toHaveBeenCalled();
    expect(renderResult.result.current).toStrictEqual({
      logs: 'log line 1\nlog line 2',
      loaded: true,
      error: undefined,
      refresh: expect.any(Function),
    });
  });

  it('should fetch benchmark-level logs when benchmarkIndex is provided', async () => {
    const fetcher = jest.fn().mockResolvedValue('benchmark output');
    mockGetEvaluationJobBenchmarkLogs.mockReturnValue(fetcher);

    const renderResult = testHook(useEvaluationJobLogs)('test-ns', 'job-1', 2);

    await renderResult.waitForNextUpdate();

    expect(mockGetEvaluationJobBenchmarkLogs).toHaveBeenCalledWith(
      '',
      'test-ns',
      'job-1',
      2,
      undefined,
    );
    expect(mockGetEvaluationJobLogs).not.toHaveBeenCalled();
    expect(renderResult.result.current.logs).toBe('benchmark output');
    expect(renderResult.result.current.loaded).toBe(true);
  });

  it('should pass tailLines as tail_lines param', async () => {
    const fetcher = jest.fn().mockResolvedValue('');
    mockGetEvaluationJobLogs.mockReturnValue(fetcher);

    const renderResult = testHook(useEvaluationJobLogs)('ns', 'j1', undefined, 500);

    await renderResult.waitForNextUpdate();

    // eslint-disable-next-line camelcase
    expect(mockGetEvaluationJobLogs).toHaveBeenCalledWith('', 'ns', 'j1', { tail_lines: 500 });
  });

  it('should set error state when fetch fails with an Error', async () => {
    const fetchError = new Error('Network failure');
    const fetcher = jest.fn().mockRejectedValue(fetchError);
    mockGetEvaluationJobLogs.mockReturnValue(fetcher);

    const renderResult = testHook(useEvaluationJobLogs)('ns', 'j1', undefined);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.error).toEqual(fetchError);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.logs).toBe('');
  });

  it('should wrap non-Error rejections in an Error', async () => {
    const fetcher = jest.fn().mockRejectedValue('string error');
    mockGetEvaluationJobLogs.mockReturnValue(fetcher);

    const renderResult = testHook(useEvaluationJobLogs)('ns', 'j1', undefined);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.error).toBeInstanceOf(Error);
    expect(renderResult.result.current.error?.message).toBe('string error');
  });

  it('should re-fetch when refresh is called', async () => {
    const fetcher = jest.fn().mockResolvedValue('first');
    mockGetEvaluationJobLogs.mockReturnValue(fetcher);

    const renderResult = testHook(useEvaluationJobLogs)('ns', 'j1', undefined);

    await renderResult.waitForNextUpdate();
    expect(renderResult.result.current.logs).toBe('first');

    fetcher.mockResolvedValue('second');
    React.act(() => {
      renderResult.result.current.refresh();
    });

    await renderResult.waitForNextUpdate();
    expect(renderResult.result.current.logs).toBe('second');
  });
});
