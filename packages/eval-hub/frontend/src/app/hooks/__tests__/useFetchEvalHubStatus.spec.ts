// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as React from 'react';
import { useFetchState } from 'mod-arch-core';
import useFetchEvalHubStatus from '~/app/hooks/useFetchEvalHubStatus';
import { getEvalHubCRStatus } from '~/app/api/k8s';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import type { EvalHubCRStatus } from '~/app/types';

jest.mock('mod-arch-core', () => ({
  useFetchState: jest.fn(),
}));

jest.mock('~/app/utilities/const', () => ({
  STATUS_REFRESH_INTERVAL: 3000,
  NO_REFRESH_INTERVAL: 0,
}));

jest.mock('~/app/api/k8s', () => ({
  getEvalHubCRStatus: jest.fn(),
}));

const mockUseFetchState = jest.mocked(useFetchState);
const mockGetEvalHubCRStatus = jest.mocked(getEvalHubCRStatus);

describe('useFetchEvalHubStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEvalHubCRStatus.mockReturnValue(jest.fn());
    mockUseFetchState.mockReturnValue([null, false, undefined, jest.fn()]);
  });

  it('should return loading state with null data initially', () => {
    const renderResult = testHook(useFetchEvalHubStatus)('test-namespace');

    expect(renderResult).hookToStrictEqual({
      data: null,
      loaded: false,
      error: undefined,
      refresh: expect.any(Function),
    });
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should return the CR status when loaded', () => {
    const status: EvalHubCRStatus = {
      name: 'evalhub-instance',
      namespace: 'test-ns',
      phase: 'Ready',
      ready: 'True',
      readyReplicas: 1,
      replicas: 1,
    };
    mockUseFetchState.mockReturnValue([status, true, undefined, jest.fn()]);

    const renderResult = testHook(useFetchEvalHubStatus)('test-ns');

    expect(renderResult).hookToStrictEqual({
      data: status,
      loaded: true,
      error: undefined,
      refresh: expect.any(Function),
    });
  });

  it('should return null when no CR is found', () => {
    mockUseFetchState.mockReturnValue([null, true, undefined, jest.fn()]);

    const renderResult = testHook(useFetchEvalHubStatus)('test-ns');

    expect(renderResult).hookToStrictEqual({
      data: null,
      loaded: true,
      error: undefined,
      refresh: expect.any(Function),
    });
  });

  it('should return error when fetch fails', () => {
    const fetchError = new Error('Failed to fetch status');
    mockUseFetchState.mockReturnValue([null, false, fetchError, jest.fn()]);

    const renderResult = testHook(useFetchEvalHubStatus)('test-ns');

    expect(renderResult).hookToStrictEqual({
      data: null,
      loaded: false,
      error: fetchError,
      refresh: expect.any(Function),
    });
  });

  it('should pass initialPromisePurity option to useFetchState', () => {
    testHook(useFetchEvalHubStatus)('test-ns');

    expect(mockUseFetchState).toHaveBeenCalledWith(expect.any(Function), null, {
      initialPromisePurity: true,
      refreshRate: expect.any(Number),
    });
  });

  it('should use STATUS_REFRESH_INTERVAL when activelyRefresh is true', () => {
    testHook(useFetchEvalHubStatus)('test-ns', true);

    expect(mockUseFetchState).toHaveBeenCalledWith(
      expect.any(Function),
      null,
      expect.objectContaining({ refreshRate: 3000 }),
    );
  });

  it('should use NO_REFRESH_INTERVAL when activelyRefresh is false', () => {
    testHook(useFetchEvalHubStatus)('test-ns', false);

    expect(mockUseFetchState).toHaveBeenCalledWith(
      expect.any(Function),
      null,
      expect.objectContaining({ refreshRate: 0 }),
    );
  });

  it('should reject when namespace is undefined', async () => {
    const mockFetcher = jest.fn();
    mockGetEvalHubCRStatus.mockReturnValue(mockFetcher);

    testHook(useFetchEvalHubStatus)(undefined);

    const [fetchCallback] = mockUseFetchState.mock.calls[0] as unknown as [
      (opts: unknown) => Promise<EvalHubCRStatus | null>,
    ];

    await expect(fetchCallback({})).rejects.toThrow('No namespace provided');
    expect(mockGetEvalHubCRStatus).not.toHaveBeenCalled();
  });

  it('should call getEvalHubCRStatus with the provided namespace', () => {
    const mockFetcher = jest.fn().mockResolvedValue(null);
    mockGetEvalHubCRStatus.mockReturnValue(mockFetcher);

    testHook(useFetchEvalHubStatus)('my-namespace');

    const [fetchCallback] = mockUseFetchState.mock.calls[0] as unknown as [
      (opts: unknown) => Promise<EvalHubCRStatus | null>,
    ];
    const mockOpts = {};
    fetchCallback(mockOpts);

    expect(mockGetEvalHubCRStatus).toHaveBeenCalledWith('', 'my-namespace');
    expect(mockFetcher).toHaveBeenCalledWith(mockOpts);
  });
});
