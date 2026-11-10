import { act } from '@testing-library/react';
import { POLL_INTERVAL } from 'mod-arch-core';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import { getMcpDeployReadiness } from '~/odh/api/mcpCatalogDeployment/service';
import useMcpImageDeployReadiness from '~/odh/hooks/useMcpImageDeployReadiness';
import { McpDeployReadinessReason, McpServerDeployReadiness } from '~/odh/types/mcpDeploymentTypes';

jest.mock('~/odh/api/mcpCatalogDeployment/service', () => ({
  getMcpDeployReadiness: jest.fn(),
}));

const mockGetMcpDeployReadiness = jest.mocked(getMcpDeployReadiness);

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

const IMAGE = 'registry.redhat.io/openshift-mcp/openshift-mcp-server-rhel9:1.0';

const deployable: McpServerDeployReadiness = { gatewayRequired: true, deployable: true };
const blocked: McpServerDeployReadiness = {
  gatewayRequired: true,
  deployable: false,
  reason: McpDeployReadinessReason.NO_GATEWAY_AVAILABLE,
  message: 'No MCP gateway is available on this cluster.',
};

/** Queue responses; each call consumes the next one (the last one repeats). */
const mockResponses = (...responses: McpServerDeployReadiness[]) => {
  const fetchFn = jest.fn(
    (): Promise<McpServerDeployReadiness> =>
      Promise.resolve((responses.length > 1 ? responses.shift() : undefined) ?? responses[0]),
  );
  mockGetMcpDeployReadiness.mockReturnValue(fetchFn);
  return fetchFn;
};

describe('useMcpImageDeployReadiness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should check readiness for the image in the deploy namespace', async () => {
    const fetchFn = mockResponses(deployable);

    const renderResult = testHook(useMcpImageDeployReadiness)('team-ns', IMAGE);
    await flushPromises();

    expect(renderResult.result.current[1]).toBe(true);
    expect(renderResult.result.current[0]).toEqual(deployable);
    expect(mockGetMcpDeployReadiness).toHaveBeenCalledWith('', { namespace: 'team-ns' });
    expect(fetchFn).toHaveBeenCalledWith(expect.anything(), IMAGE);
  });

  it.each([
    ['no namespace', undefined, IMAGE],
    ['no image', 'team-ns', ''],
  ])('should not call the API with %s', async (_label, namespace, image) => {
    const fetchFn = mockResponses(deployable);

    const renderResult = testHook(useMcpImageDeployReadiness)(namespace, image);
    await advance(POLL_INTERVAL);

    expect(fetchFn).not.toHaveBeenCalled();
    expect(renderResult.result.current[1]).toBe(false);
  });

  it('should poll while blocked and stop once the image becomes deployable', async () => {
    // Enabling polling re-runs the request once immediately, so queue enough blocked
    // responses to observe interval-driven re-checks before the image becomes deployable.
    const fetchFn = mockResponses(blocked, blocked, blocked, deployable);

    const renderResult = testHook(useMcpImageDeployReadiness)('team-ns', IMAGE);
    await flushPromises();
    expect(renderResult.result.current[0]).toEqual(blocked);

    await advance(POLL_INTERVAL);
    await advance(POLL_INTERVAL);
    expect(renderResult.result.current[0]).toEqual(deployable);
    const callsWhenDeployable = fetchFn.mock.calls.length;

    await advance(POLL_INTERVAL * 3);
    // Disabling polling re-runs the request at most once; no interval afterwards.
    expect(fetchFn.mock.calls.length).toBeLessThanOrEqual(callsWhenDeployable + 1);
  });

  it('should re-check when the image changes', async () => {
    const fetchFn = mockResponses(deployable);

    const renderResult = testHook(useMcpImageDeployReadiness)('team-ns', 'quay.io/x/other:1');
    await flushPromises();
    renderResult.rerender('team-ns', IMAGE);
    await flushPromises();

    expect(fetchFn).toHaveBeenLastCalledWith(expect.anything(), IMAGE);
  });
});
