import { act } from '@testing-library/react';
import { POLL_INTERVAL } from 'mod-arch-core';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import { getMcpServerDeployReadiness } from '~/odh/api/mcpCatalogDeployment/service';
import useMcpServerDeployReadiness from '~/odh/hooks/useMcpServerDeployReadiness';
import { McpDeployReadinessReason, McpServerDeployReadiness } from '~/odh/types/mcpDeploymentTypes';

// A stable object, like the real hook returns; a new object per render would refetch forever.
const mockQueryParams = { namespace: 'catalog-ns' };
jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  useQueryParamNamespaces: jest.fn(() => mockQueryParams),
}));

jest.mock('~/odh/api/mcpCatalogDeployment/service', () => ({
  getMcpServerDeployReadiness: jest.fn(),
}));

const mockGetMcpServerDeployReadiness = jest.mocked(getMcpServerDeployReadiness);

/** Let pending fetch promises settle and React apply the resulting state updates. */
const flushPromises = () =>
  act(async () => {
    for (let i = 0; i < 5; i++) {
      // eslint-disable-next-line no-await-in-loop
      await Promise.resolve();
    }
  });

const advance = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
  await flushPromises();
};

const deployable: McpServerDeployReadiness = { gatewayRequired: true, deployable: true };
const notGated: McpServerDeployReadiness = { gatewayRequired: false, deployable: true };
const blocked: McpServerDeployReadiness = {
  gatewayRequired: true,
  deployable: false,
  reason: McpDeployReadinessReason.NO_GATEWAY_AVAILABLE,
  message: 'No MCP gateway is available on this cluster.',
};

/** Queue responses; each call consumes the next one (the last one repeats). */
const mockResponses = (...responses: (McpServerDeployReadiness | Error)[]) => {
  const fetchFn = jest.fn((): Promise<McpServerDeployReadiness> => {
    const next = (responses.length > 1 ? responses.shift() : undefined) ?? responses[0];
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
  });
  mockGetMcpServerDeployReadiness.mockReturnValue(fetchFn);
  return fetchFn;
};

describe('useMcpServerDeployReadiness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should load readiness for the server with the catalog namespace', async () => {
    const fetchFn = mockResponses(deployable);

    const renderResult = testHook(useMcpServerDeployReadiness)('4');
    expect(renderResult.result.current[1]).toBe(false);

    await flushPromises();
    expect(renderResult.result.current[1]).toBe(true);
    expect(renderResult.result.current[0]).toEqual(deployable);
    expect(mockGetMcpServerDeployReadiness).toHaveBeenCalledWith('', { namespace: 'catalog-ns' });
    expect(fetchFn).toHaveBeenCalledWith(expect.anything(), '4');
  });

  it('should not call the API without a server id', async () => {
    const fetchFn = mockResponses(deployable);

    const renderResult = testHook(useMcpServerDeployReadiness)('');
    await advance(POLL_INTERVAL);

    expect(fetchFn).not.toHaveBeenCalled();
    expect(renderResult.result.current[1]).toBe(false);
  });

  it('should not poll for a server that does not require a gateway', async () => {
    const fetchFn = mockResponses(notGated);

    const renderResult = testHook(useMcpServerDeployReadiness)('1');
    await flushPromises();
    expect(renderResult.result.current[1]).toBe(true);
    await advance(POLL_INTERVAL * 3);

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('should poll while blocked and stop once the server becomes deployable', async () => {
    // Enabling polling re-runs the request once immediately, so queue enough blocked
    // responses to observe interval-driven re-checks before the server becomes deployable.
    const fetchFn = mockResponses(blocked, blocked, blocked, deployable);

    const renderResult = testHook(useMcpServerDeployReadiness)('4');
    await flushPromises();
    expect(renderResult.result.current[0]).toEqual(blocked);
    const callsWhileBlocked = fetchFn.mock.calls.length;

    await advance(POLL_INTERVAL);
    expect(fetchFn.mock.calls.length).toBeGreaterThan(callsWhileBlocked);

    await advance(POLL_INTERVAL);
    expect(renderResult.result.current[0]).toEqual(deployable);
    const callsWhenDeployable = fetchFn.mock.calls.length;

    await advance(POLL_INTERVAL * 3);
    // Disabling polling re-runs the request at most once; no interval afterwards.
    expect(fetchFn.mock.calls.length).toBeLessThanOrEqual(callsWhenDeployable + 1);
    expect(renderResult.result.current[0]).toEqual(deployable);
  });

  it('should keep retrying after a failed request and recover', async () => {
    const error = new Error('Service Unavailable');
    const fetchFn = mockResponses(error, error, deployable);

    const renderResult = testHook(useMcpServerDeployReadiness)('4');
    await flushPromises();
    expect(renderResult.result.current[2]).toBe(error);

    await advance(POLL_INTERVAL);
    expect(renderResult.result.current[2]).toBeUndefined();
    expect(renderResult.result.current[0]).toEqual(deployable);
    expect(fetchFn.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('should not let an aborted request change polling for the next server', async () => {
    let resolveStale: (value: McpServerDeployReadiness) => void = () => undefined;
    const fetchFn = jest.fn(
      (_opts: unknown, id: string): Promise<McpServerDeployReadiness> =>
        id === '4'
          ? new Promise<McpServerDeployReadiness>((resolve) => {
              resolveStale = resolve;
            })
          : Promise.resolve(notGated),
    );
    mockGetMcpServerDeployReadiness.mockReturnValue(fetchFn);

    const renderResult = testHook(useMcpServerDeployReadiness)('4');
    renderResult.rerender('1');
    await flushPromises();
    expect(renderResult.result.current[0]).toEqual(notGated);

    // The superseded request for the gated server settles as "blocked" after the switch.
    resolveStale(blocked);
    await flushPromises();
    const callsForOtherServer = fetchFn.mock.calls.filter(([, id]) => id === '1').length;

    await advance(POLL_INTERVAL * 3);
    expect(fetchFn.mock.calls.filter(([, id]) => id === '1')).toHaveLength(callsForOtherServer);
    expect(renderResult.result.current[0]).toEqual(notGated);
  });
});
