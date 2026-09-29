/* eslint-disable camelcase */
import { renderHook, waitFor } from '@testing-library/react';
import type { MCPServerFromAPI } from '~/app/types';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import useFetchMCPServers from '~/app/hooks/useFetchMCPServers';

jest.mock('~/app/hooks/useGenAiAPI', () => ({
  useGenAiAPI: jest.fn(),
}));

const mockUseGenAiAPI = jest.mocked(useGenAiAPI);

const createServer = (name: string): MCPServerFromAPI =>
  ({
    name,
    url: `https://${name}.example.com/mcp`,
    transport: 'streamable-http',
    description: '',
    logo: null,
    status: 'healthy',
    source: 'configmap',
    version: '1.0.0',
    tools: [],
    tool_count: 0,
  }) satisfies MCPServerFromAPI;

const createApiState = (getMCPServers: jest.Mock) =>
  ({
    apiAvailable: true,
    api: { getMCPServers },
    refreshAllAPI: jest.fn(),
  }) as unknown as ReturnType<typeof useGenAiAPI>;

describe('useFetchMCPServers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('refetches MCP servers after the API changes with the selected namespace', async () => {
    const tenantServer = createServer('tenant-server');
    const projectServer = createServer('project-server');
    let resolveProjectRequest: (response: unknown) => void;
    const tenantAPI = jest.fn().mockResolvedValue({
      servers: [tenantServer],
      registry_available: false,
    });
    const projectAPI = jest.fn(
      () =>
        new Promise((resolve) => {
          resolveProjectRequest = resolve;
        }),
    );

    mockUseGenAiAPI.mockReturnValue(createApiState(tenantAPI));
    const { result, rerender } = renderHook(() => useFetchMCPServers());

    await waitFor(() => expect(result.current.data).toEqual([tenantServer]));

    mockUseGenAiAPI.mockReturnValue(createApiState(projectAPI));
    rerender();

    await waitFor(() => {
      expect(result.current).toMatchObject({
        data: [],
        configMapName: null,
        registryAvailable: false,
        loaded: false,
        error: undefined,
      });
    });

    resolveProjectRequest!({
      servers: [tenantServer, projectServer],
      registry_available: true,
    });

    await waitFor(() => expect(result.current.data).toEqual([tenantServer, projectServer]));
    expect(tenantAPI).toHaveBeenCalledTimes(1);
    expect(projectAPI).toHaveBeenCalledTimes(1);
    expect(result.current.registryAvailable).toBe(true);
  });
});
