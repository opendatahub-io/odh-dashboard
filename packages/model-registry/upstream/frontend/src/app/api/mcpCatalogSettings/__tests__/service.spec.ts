import { restCREATE, handleRestFailures } from 'mod-arch-core';
import { previewMcpCatalogSource } from '~/app/api/mcpCatalogSettings/service';
import { McpCatalogSourceType } from '~/app/mcpServerCatalogTypes';
import { PreviewCatalogSourceQueryParams } from '~/app/modelCatalogTypes';

const mockRestPromise = Promise.resolve({ data: {} });

jest.mock('mod-arch-core', () => ({
  restCREATE: jest.fn(() => mockRestPromise),
  assembleModArchBody: jest.fn((data) => data),
  isModArchResponse: jest.fn(() => true),
  handleRestFailures: jest.fn(() => mockRestPromise),
}));

const handleRestFailuresMock = jest.mocked(handleRestFailures);
const restCREATEMock = jest.mocked(restCREATE);

const APIOptionsMock = {};

describe('previewMcpCatalogSource', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should include assetType mcp_servers in query params', async () => {
    const mockData = {
      type: McpCatalogSourceType.YAML,
      includedServers: ['*'],
      excludedServers: [],
      properties: { yaml: 'servers:\n  - name: test' },
    };

    await previewMcpCatalogSource('/api/v1/settings/mcp_catalog', { namespace: 'kubeflow' })(
      APIOptionsMock,
      mockData,
    );

    expect(restCREATEMock).toHaveBeenCalledTimes(1);
    expect(restCREATEMock).toHaveBeenCalledWith(
      '/api/v1/settings/mcp_catalog',
      '/source_preview',
      mockData,
      { namespace: 'kubeflow', assetType: 'mcp_servers' },
      APIOptionsMock,
    );
    expect(handleRestFailuresMock).toHaveBeenCalledTimes(1);
  });

  it('should merge additional query params with assetType', async () => {
    const mockData = {
      type: McpCatalogSourceType.YAML,
      includedServers: ['*'],
      excludedServers: [],
      properties: { yaml: 'servers:\n  - name: test' },
    };

    await previewMcpCatalogSource('/api/v1/settings/mcp_catalog', { namespace: 'kubeflow' })(
      APIOptionsMock,
      mockData,
      { filterStatus: 'included', pageSize: 20 },
    );

    expect(restCREATEMock).toHaveBeenCalledTimes(1);
    expect(restCREATEMock).toHaveBeenCalledWith(
      '/api/v1/settings/mcp_catalog',
      '/source_preview',
      mockData,
      { namespace: 'kubeflow', filterStatus: 'included', pageSize: 20, assetType: 'mcp_servers' },
      APIOptionsMock,
    );
  });

  it('should include nextPageToken in query params when provided', async () => {
    const mockData = {
      type: McpCatalogSourceType.YAML,
      includedServers: ['*'],
      excludedServers: [],
      properties: { yaml: 'servers:\n  - name: test' },
    };

    await previewMcpCatalogSource('/api/v1/settings/mcp_catalog', { namespace: 'kubeflow' })(
      APIOptionsMock,
      mockData,
      { filterStatus: 'excluded', pageSize: 10, nextPageToken: 'abc123' },
    );

    expect(restCREATEMock).toHaveBeenCalledWith(
      '/api/v1/settings/mcp_catalog',
      '/source_preview',
      mockData,
      {
        namespace: 'kubeflow',
        filterStatus: 'excluded',
        pageSize: 10,
        nextPageToken: 'abc123',
        assetType: 'mcp_servers',
      },
      APIOptionsMock,
    );
  });

  it('should ensure assetType cannot be overridden by additional params', async () => {
    const mockData = {
      type: McpCatalogSourceType.YAML,
      includedServers: [],
      excludedServers: [],
      properties: {},
    };

    await previewMcpCatalogSource('/api/v1/settings/mcp_catalog', { someKey: 'base' })(
      APIOptionsMock,
      mockData,
      { filterStatus: 'all', assetType: 'models' } as PreviewCatalogSourceQueryParams & {
        assetType: string;
      },
    );

    expect(restCREATEMock).toHaveBeenCalledWith(
      '/api/v1/settings/mcp_catalog',
      '/source_preview',
      mockData,
      { someKey: 'base', filterStatus: 'all', assetType: 'mcp_servers' },
      APIOptionsMock,
    );
  });
});
