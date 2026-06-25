import { act } from '@testing-library/react';
import { useFetchState } from 'mod-arch-core';
import { mockAgentRuntime } from '~/__mocks__/mockAgentRuntime';
import { listAgentRuntimes } from '~/app/api/agentRuntimes';
import { useListAgentRuntimes } from '~/app/hooks/useListAgentRuntimes';
import { testHook } from '~/__tests__/unit/testUtils/hooks';

jest.mock('~/app/utilities/const', () => ({
  URL_PREFIX: '/agent-ops',
  BFF_API_VERSION: 'v1',
}));

jest.mock('~/app/const', () => ({
  NO_REFRESH_INTERVAL: 0,
  AGENT_RUNTIMES_REFRESH_INTERVAL: 10_000,
}));

jest.mock('mod-arch-core', () => ({
  useFetchState: jest.fn(),
}));

jest.mock('~/app/api/agentRuntimes', () => ({
  listAgentRuntimes: jest.fn(),
}));

const mockUseFetchState = jest.mocked(useFetchState);
const mockListAgentRuntimes = jest.mocked(listAgentRuntimes);
const mockListAgentRuntimesFetcher = jest.fn();

const getLatestFetchCallback = () => {
  const { calls } = mockUseFetchState.mock;
  const [fetchCallback] = calls[calls.length - 1] as unknown as [
    (opts: Record<string, never>) => Promise<{ runtimes: unknown[]; continueToken?: string }>,
  ];
  return fetchCallback;
};

const mockLoadedState = (
  data: { runtimes: ReturnType<typeof mockAgentRuntime>[]; continueToken?: string },
  refresh = jest.fn(),
) => {
  mockUseFetchState.mockReturnValue([data, true, undefined, refresh]);
};

describe('useListAgentRuntimes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListAgentRuntimes.mockReturnValue(mockListAgentRuntimesFetcher);
    mockListAgentRuntimesFetcher.mockResolvedValue({ runtimes: [], continueToken: undefined });
    mockUseFetchState.mockReturnValue([
      { runtimes: [], continueToken: undefined },
      false,
      undefined,
      jest.fn(),
    ]);
  });

  it('should filter runtimes to the selected namespace', () => {
    mockLoadedState({
      runtimes: [
        mockAgentRuntime({ namespace: 'agent-ops-demo', name: 'agent-a' }),
        mockAgentRuntime({ namespace: 'other-project', name: 'agent-b' }),
      ],
    });

    const { result } = testHook(useListAgentRuntimes)('agent-ops-demo');

    expect(result.current.runtimes).toHaveLength(1);
    expect(result.current.runtimes[0].name).toBe('agent-a');
  });

  it('should return all runtimes when no namespace is selected', () => {
    mockLoadedState({
      runtimes: [
        mockAgentRuntime({ namespace: 'agent-ops-demo', name: 'agent-a' }),
        mockAgentRuntime({ namespace: 'other-project', name: 'agent-b' }),
      ],
    });

    const { result } = testHook(useListAgentRuntimes)();

    expect(result.current.runtimes).toHaveLength(2);
  });

  it('should initialize with page 1 and default page size', () => {
    const { result } = testHook(useListAgentRuntimes)();

    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(10);
  });

  it('should use NO_REFRESH_INTERVAL when no namespace is provided', () => {
    testHook(useListAgentRuntimes)();

    expect(mockUseFetchState).toHaveBeenCalledWith(
      expect.any(Function),
      { runtimes: [] },
      { refreshRate: 0 },
    );
  });

  it('should use AGENT_RUNTIMES_REFRESH_INTERVAL when a namespace is provided', () => {
    testHook(useListAgentRuntimes)('agent-ops-demo');

    expect(mockUseFetchState).toHaveBeenCalledWith(
      expect.any(Function),
      { runtimes: [] },
      { refreshRate: 10_000 },
    );
  });

  it('should use a custom refreshInterval when provided', () => {
    testHook(useListAgentRuntimes)('agent-ops-demo', 5_000);

    expect(mockUseFetchState).toHaveBeenCalledWith(
      expect.any(Function),
      { runtimes: [] },
      { refreshRate: 5_000 },
    );
  });

  it('should request the first page without continueToken', async () => {
    testHook(useListAgentRuntimes)();

    await getLatestFetchCallback()({});

    expect(mockListAgentRuntimes).toHaveBeenCalledWith('');
    expect(mockListAgentRuntimesFetcher).toHaveBeenCalledWith({}, { limit: 10 });
  });

  it('should expose continueToken from fetch state', () => {
    mockLoadedState({
      runtimes: [mockAgentRuntime({ name: 'agent-a' })],
      continueToken: 'next-page-token',
    });

    const { result } = testHook(useListAgentRuntimes)();

    expect(result.current.continueToken).toBe('next-page-token');
  });

  it('should pass continueToken when navigating to the next page', async () => {
    const refresh = jest.fn();
    mockUseFetchState.mockReturnValue([
      { runtimes: [], continueToken: undefined },
      false,
      undefined,
      refresh,
    ]);

    const renderResult = testHook(useListAgentRuntimes)();

    mockUseFetchState.mockReturnValue([
      {
        runtimes: [mockAgentRuntime({ name: 'agent-a' })],
        continueToken: 'page-1-token',
      },
      true,
      undefined,
      refresh,
    ]);

    await act(async () => {
      renderResult.rerender();
    });

    await act(async () => {
      renderResult.result.current.setPage(2);
    });

    await getLatestFetchCallback()({});

    expect(mockListAgentRuntimesFetcher).toHaveBeenCalledWith(
      {},
      { limit: 10, continueToken: 'page-1-token' },
    );
  });

  it('should keep continueToken and allow next page when namespace filter yields an empty page', async () => {
    const refresh = jest.fn();
    mockUseFetchState.mockReturnValue([
      { runtimes: [], continueToken: undefined },
      false,
      undefined,
      refresh,
    ]);

    const renderResult = testHook(useListAgentRuntimes)('agent-ops-demo');

    mockUseFetchState.mockReturnValue([
      {
        runtimes: [mockAgentRuntime({ namespace: 'other-project', name: 'agent-b' })],
        continueToken: 'page-1-token',
      },
      true,
      undefined,
      refresh,
    ]);

    await act(async () => {
      renderResult.rerender('agent-ops-demo');
    });

    expect(renderResult.result.current.runtimes).toHaveLength(0);
    expect(renderResult.result.current.continueToken).toBe('page-1-token');

    await act(async () => {
      renderResult.result.current.setPage(2);
    });

    await getLatestFetchCallback()({});

    expect(mockListAgentRuntimesFetcher).toHaveBeenCalledWith(
      {},
      { limit: 10, continueToken: 'page-1-token' },
    );
  });

  it('should reject fetch when navigating to a page without a stored token', async () => {
    mockLoadedState({ runtimes: [] });

    const renderResult = testHook(useListAgentRuntimes)();

    await act(async () => {
      renderResult.result.current.setPage(2);
    });

    await expect(getLatestFetchCallback()({})).rejects.toThrow('No token available for page 2.');
  });

  it('should use the selected page size when requesting runtimes', async () => {
    mockLoadedState({ runtimes: [] });

    const renderResult = testHook(useListAgentRuntimes)();

    await act(async () => {
      renderResult.result.current.setPageSize(20);
    });

    await getLatestFetchCallback()({});

    expect(mockListAgentRuntimesFetcher).toHaveBeenCalledWith({}, { limit: 20 });
  });

  it('should reset to page 1 when page size changes', async () => {
    mockLoadedState({
      runtimes: [mockAgentRuntime({ name: 'agent-a' })],
      continueToken: 'page-1-token',
    });

    const renderResult = testHook(useListAgentRuntimes)();

    await act(async () => {
      renderResult.result.current.setPage(2);
    });
    expect(renderResult.result.current.page).toBe(2);

    await act(async () => {
      renderResult.result.current.setPageSize(20);
    });

    expect(renderResult.result.current.page).toBe(1);
    expect(renderResult.result.current.pageSize).toBe(20);

    await getLatestFetchCallback()({});

    expect(mockListAgentRuntimesFetcher).toHaveBeenCalledWith({}, { limit: 20 });
  });

  it('should reset to page 1 when namespace changes', async () => {
    mockLoadedState({ runtimes: [] });

    const renderResult = testHook(useListAgentRuntimes)('agent-ops-demo');

    await act(async () => {
      renderResult.result.current.setPage(3);
    });
    expect(renderResult.result.current.page).toBe(3);

    renderResult.rerender('other-project');

    expect(renderResult.result.current.page).toBe(1);
  });

  it('should reset page and tokens on refresh', async () => {
    const mockRefresh = jest.fn().mockResolvedValue(undefined);
    mockLoadedState(
      {
        runtimes: [mockAgentRuntime({ name: 'agent-a' })],
        continueToken: 'page-1-token',
      },
      mockRefresh,
    );

    const renderResult = testHook(useListAgentRuntimes)();

    await act(async () => {
      renderResult.result.current.setPage(2);
    });

    await act(async () => {
      await renderResult.result.current.refresh();
    });

    expect(renderResult.result.current.page).toBe(1);
    expect(mockRefresh).toHaveBeenCalled();

    await getLatestFetchCallback()({});

    expect(mockListAgentRuntimesFetcher).toHaveBeenCalledWith({}, { limit: 10 });
  });
});
