// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as React from 'react';
import { useFetchState } from 'mod-arch-core';
import { mockAgentRuntimeDetail } from '~/__mocks__/mockAgentRuntimeDetail';
import { getAgentRuntimeDetail } from '~/app/api/agentRuntimes';
import { useAgentRuntimeDetail } from '~/app/hooks/useAgentRuntimeDetail';
import type { AgentRuntimeDetail } from '~/app/types/agentRuntimes';
import { testHook } from '~/__tests__/unit/testUtils/hooks';

jest.mock('mod-arch-core', () => ({
  useFetchState: jest.fn(),
}));

jest.mock('~/app/const', () => ({
  AGENT_RUNTIMES_REFRESH_INTERVAL: 10_000,
  NO_REFRESH_INTERVAL: 0,
}));

jest.mock('~/app/api/agentRuntimes', () => ({
  getAgentRuntimeDetail: jest.fn(),
}));

const mockUseFetchState = jest.mocked(useFetchState);
const mockGetAgentRuntimeDetail = jest.mocked(getAgentRuntimeDetail);

describe('useAgentRuntimeDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAgentRuntimeDetail.mockReturnValue(jest.fn().mockResolvedValue(mockAgentRuntimeDetail()));
    mockUseFetchState.mockReturnValue([null, false, undefined, jest.fn()]);
  });

  it('should use AGENT_RUNTIMES_REFRESH_INTERVAL when namespace and name are provided', () => {
    testHook(useAgentRuntimeDetail)('agent-ops-demo', 'sample-support-agent');

    expect(mockUseFetchState).toHaveBeenCalledWith(
      expect.any(Function),
      null,
      expect.objectContaining({ refreshRate: 10_000 }),
    );
  });

  it('should use NO_REFRESH_INTERVAL when params are missing', () => {
    testHook(useAgentRuntimeDetail)(undefined, undefined);

    expect(mockUseFetchState).toHaveBeenCalledWith(
      expect.any(Function),
      null,
      expect.objectContaining({ refreshRate: 0 }),
    );
  });

  it('should call getAgentRuntimeDetail through the fetch callback', async () => {
    const mockFetcher = jest.fn().mockResolvedValue(mockAgentRuntimeDetail());
    mockGetAgentRuntimeDetail.mockReturnValue(mockFetcher);

    testHook(useAgentRuntimeDetail)('agent-ops-demo', 'sample-support-agent');

    const [fetchCallback] = mockUseFetchState.mock.calls[0] as unknown as [
      (opts: unknown) => Promise<AgentRuntimeDetail | null>,
    ];
    const mockOpts = {};
    await fetchCallback(mockOpts);

    expect(mockGetAgentRuntimeDetail).toHaveBeenCalledWith('');
    expect(mockFetcher).toHaveBeenCalledWith(mockOpts, 'agent-ops-demo', 'sample-support-agent');
  });

  it('should return null when namespace or name is missing', async () => {
    testHook(useAgentRuntimeDetail)('', 'sample-support-agent');

    const [fetchCallback] = mockUseFetchState.mock.calls[0] as unknown as [
      (opts: unknown) => Promise<AgentRuntimeDetail | null>,
    ];

    await expect(fetchCallback({})).resolves.toBeNull();
  });
});
