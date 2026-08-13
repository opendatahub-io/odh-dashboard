import { getMcpServerList } from '~/app/api/mcpServerCatalog/service';
import { McpServer, McpServerList } from '~/app/mcpServerCatalogTypes';
import { testHook, standardUseFetchState } from '~/__tests__/unit/testUtils/hooks';
import useMcpDeploymentCatalogServer from '~/odh/pages/mcpDeployments/useMcpDeploymentCatalogServer';

jest.mock('~/app/api/mcpServerCatalog/service', () => ({
  getMcpServerList: jest.fn(),
}));

const mockGetMcpServerList = jest.mocked(getMcpServerList);

const mockCatalogServer = (overrides?: Partial<McpServer>): McpServer => ({
  id: 'catalog-id-1',
  name: 'kubernetes-mcp-server',
  displayName: 'Kubernetes MCP',
  version: '1.0.0',
  toolCount: 3,
  ...overrides,
});

describe('useMcpDeploymentCatalogServer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return default state without fetching when serverName is not set', () => {
    const renderResult = testHook(useMcpDeploymentCatalogServer)(undefined, 'test-project');
    expect(renderResult).hookToStrictEqual(standardUseFetchState(null));
    expect(mockGetMcpServerList).not.toHaveBeenCalled();
  });

  it('should return default state without fetching when namespace is not set', () => {
    const renderResult = testHook(useMcpDeploymentCatalogServer)(
      'kubernetes-mcp-server',
      undefined,
    );
    expect(renderResult).hookToStrictEqual(standardUseFetchState(null));
    expect(mockGetMcpServerList).not.toHaveBeenCalled();
  });

  it('should resolve the exact-name match from the catalog list', async () => {
    const list: McpServerList = {
      items: [
        mockCatalogServer({ id: 'other', name: 'kubernetes-mcp-server-preview' }),
        mockCatalogServer(),
      ],
      size: 2,
      pageSize: 5,
      nextPageToken: '',
    };
    const apiFn = jest.fn().mockResolvedValue(list);
    mockGetMcpServerList.mockReturnValue(apiFn);

    const renderResult = testHook(useMcpDeploymentCatalogServer)(
      'kubernetes-mcp-server',
      'test-project',
    );
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(standardUseFetchState(mockCatalogServer(), true));
    expect(mockGetMcpServerList).toHaveBeenCalledWith(
      '/model-registry/api/v1/mcp_catalog',
      expect.objectContaining({ namespace: 'test-project' }),
    );
    expect(apiFn).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ name: 'kubernetes-mcp-server' }),
    );
  });

  it('should resolve to null when no exact name match is found', async () => {
    const list: McpServerList = {
      items: [mockCatalogServer({ name: 'kubernetes-mcp-server-preview' })],
      size: 1,
      pageSize: 5,
      nextPageToken: '',
    };
    mockGetMcpServerList.mockReturnValue(jest.fn().mockResolvedValue(list));

    const renderResult = testHook(useMcpDeploymentCatalogServer)(
      'kubernetes-mcp-server',
      'test-project',
    );
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(standardUseFetchState(null, true));
  });

  it('should follow nextPageToken to a later page to find the exact-name match', async () => {
    const firstPage: McpServerList = {
      items: [mockCatalogServer({ id: 'other', name: 'kubernetes-mcp-server-preview' })],
      size: 2,
      pageSize: 20,
      nextPageToken: 'page-2-token',
    };
    const secondPage: McpServerList = {
      items: [mockCatalogServer()],
      size: 2,
      pageSize: 20,
      nextPageToken: '',
    };
    const apiFn = jest.fn().mockResolvedValueOnce(firstPage).mockResolvedValueOnce(secondPage);
    mockGetMcpServerList.mockReturnValue(apiFn);

    const renderResult = testHook(useMcpDeploymentCatalogServer)(
      'kubernetes-mcp-server',
      'test-project',
    );
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(standardUseFetchState(mockCatalogServer(), true));
    expect(apiFn).toHaveBeenCalledTimes(2);
    expect(apiFn).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({ name: 'kubernetes-mcp-server', nextPageToken: undefined }),
    );
    expect(apiFn).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({ name: 'kubernetes-mcp-server', nextPageToken: 'page-2-token' }),
    );
  });

  it('should resolve to null once the catalog is exhausted with no exact-name match', async () => {
    const page: McpServerList = {
      items: [mockCatalogServer({ name: 'kubernetes-mcp-server-preview' })],
      size: 1,
      pageSize: 20,
      nextPageToken: '',
    };
    const apiFn = jest.fn().mockResolvedValue(page);
    mockGetMcpServerList.mockReturnValue(apiFn);

    const renderResult = testHook(useMcpDeploymentCatalogServer)(
      'kubernetes-mcp-server',
      'test-project',
    );
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(standardUseFetchState(null, true));
    // No nextPageToken on the first page, so the loop stops without a second call.
    expect(apiFn).toHaveBeenCalledTimes(1);
  });

  it('should resolve to null when the catalog list is empty', async () => {
    mockGetMcpServerList.mockReturnValue(
      jest.fn().mockResolvedValue({ items: [], size: 0, pageSize: 5, nextPageToken: '' }),
    );

    const renderResult = testHook(useMcpDeploymentCatalogServer)(
      'kubernetes-mcp-server',
      'test-project',
    );
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(standardUseFetchState(null, true));
  });

  it('should surface fetch errors', async () => {
    const error = new Error('network error');
    mockGetMcpServerList.mockReturnValue(jest.fn().mockRejectedValue(error));

    const renderResult = testHook(useMcpDeploymentCatalogServer)(
      'kubernetes-mcp-server',
      'test-project',
    );
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(standardUseFetchState(null, false, error));
  });
});
