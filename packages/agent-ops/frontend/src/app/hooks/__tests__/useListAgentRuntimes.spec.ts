// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as React from 'react';
import { useFetchState } from 'mod-arch-core';
import { mockAgentRuntime } from '~/__mocks__/mockAgentRuntime';
import { listAgentRuntimes } from '~/app/api/agentRuntimes';
import { useListAgentRuntimes } from '~/app/hooks/useListAgentRuntimes';
import type { AgentRuntime } from '~/app/types/agentRuntimes';
import { testHook } from '~/__tests__/unit/testUtils/hooks';

jest.mock('mod-arch-core', () => ({
  useFetchState: jest.fn(),
}));

jest.mock('~/app/const', () => ({
  AGENT_RUNTIMES_REFRESH_INTERVAL: 10_000,
  NO_REFRESH_INTERVAL: 0,
}));

jest.mock('~/app/api/agentRuntimes', () => ({
  listAgentRuntimes: jest.fn(),
}));

const mockUseFetchState = jest.mocked(useFetchState);
const mockListAgentRuntimes = jest.mocked(listAgentRuntimes);

describe('useListAgentRuntimes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListAgentRuntimes.mockReturnValue(jest.fn().mockResolvedValue([]));
    mockUseFetchState.mockReturnValue([[], false, undefined, jest.fn()]);
  });

  it('should use AGENT_RUNTIMES_REFRESH_INTERVAL when a namespace is selected', () => {
    testHook(useListAgentRuntimes)('agent-ops-demo');

    expect(mockUseFetchState).toHaveBeenCalledWith(
      expect.any(Function),
      [],
      expect.objectContaining({ refreshRate: 10_000 }),
    );
  });

  it('should use NO_REFRESH_INTERVAL when no namespace is selected', () => {
    testHook(useListAgentRuntimes)(undefined);

    expect(mockUseFetchState).toHaveBeenCalledWith(
      expect.any(Function),
      [],
      expect.objectContaining({ refreshRate: 0 }),
    );
  });

  it('should use a custom refresh interval when provided', () => {
    testHook(useListAgentRuntimes)('agent-ops-demo', 5_000);

    expect(mockUseFetchState).toHaveBeenCalledWith(
      expect.any(Function),
      [],
      expect.objectContaining({ refreshRate: 5_000 }),
    );
  });

  it('should call listAgentRuntimes through the fetch callback', async () => {
    const mockFetcher = jest.fn().mockResolvedValue([]);
    mockListAgentRuntimes.mockReturnValue(mockFetcher);

    testHook(useListAgentRuntimes)('agent-ops-demo');

    const [fetchCallback] = mockUseFetchState.mock.calls[0] as unknown as [
      (opts: unknown) => Promise<AgentRuntime[]>,
    ];
    const mockOpts = {};
    await fetchCallback(mockOpts);

    expect(mockListAgentRuntimes).toHaveBeenCalledWith('');
    expect(mockFetcher).toHaveBeenCalledWith(mockOpts);
  });

  it('should filter runtimes to the selected namespace', async () => {
    const runtimes = [
      mockAgentRuntime({ name: 'agent-a', namespace: 'agent-ops-demo' }),
      mockAgentRuntime({ name: 'agent-b', namespace: 'other-project' }),
    ];
    mockListAgentRuntimes.mockReturnValue(jest.fn().mockResolvedValue(runtimes));

    testHook(useListAgentRuntimes)('agent-ops-demo');

    const [fetchCallback] = mockUseFetchState.mock.calls[0] as unknown as [
      (opts: unknown) => Promise<AgentRuntime[]>,
    ];

    await expect(fetchCallback({})).resolves.toEqual([runtimes[0]]);
  });

  it('should return all runtimes when no namespace is selected', async () => {
    const runtimes = [
      mockAgentRuntime({ name: 'agent-a', namespace: 'agent-ops-demo' }),
      mockAgentRuntime({ name: 'agent-b', namespace: 'other-project' }),
    ];
    mockListAgentRuntimes.mockReturnValue(jest.fn().mockResolvedValue(runtimes));

    testHook(useListAgentRuntimes)(undefined);

    const [fetchCallback] = mockUseFetchState.mock.calls[0] as unknown as [
      (opts: unknown) => Promise<AgentRuntime[]>,
    ];

    await expect(fetchCallback({})).resolves.toEqual(runtimes);
  });
});
