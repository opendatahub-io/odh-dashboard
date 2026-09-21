import { restGET } from 'mod-arch-core';
import type { APIOptions } from 'mod-arch-core';
import { mockMcpDeploySpec, mockMcpToolList } from '~/__mocks__/mockMcpCatalog';
import { getMcpServerConverter, getMcpServerToolsList } from '~/app/api/mcpServerCatalog';

jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  restGET: jest.fn(),
}));

const restGETMock = jest.mocked(restGET);

const OPTS: APIOptions = {};

describe('getMcpServerToolsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should GET catalog tools through the MLflow proxy and unwrap the envelope', async () => {
    const toolList = mockMcpToolList({ pageSize: 100 });
    restGETMock.mockResolvedValue({ data: toolList });

    const result = await getMcpServerToolsList({
      namespace: 'odh-model-registries',
      pageSize: 100,
    })(OPTS, 'server-1');

    expect(restGETMock).toHaveBeenCalledWith(
      '',
      '/_bff/mlflow/api/v1/mcp-catalog/servers/server-1/tools',
      { namespace: 'odh-model-registries', pageSize: 100 },
      OPTS,
    );
    expect(result).toEqual(toolList);
  });

  it('should encode the server id in the tools path', async () => {
    restGETMock.mockResolvedValue({ data: mockMcpToolList() });

    await getMcpServerToolsList({ namespace: 'ns' })(OPTS, 'io.github/acme');

    expect(restGETMock).toHaveBeenCalledWith(
      '',
      '/_bff/mlflow/api/v1/mcp-catalog/servers/io.github%2Facme/tools',
      { namespace: 'ns' },
      OPTS,
    );
  });

  it('should throw when the response is not a valid ModArch envelope', async () => {
    restGETMock.mockResolvedValue({ notData: true });

    await expect(getMcpServerToolsList({ namespace: 'ns' })(OPTS, 'server-1')).rejects.toThrow(
      'Invalid response format',
    );
  });

  it('should reject when the request fails', async () => {
    restGETMock.mockRejectedValue(new Error('Server error'));

    await expect(getMcpServerToolsList({ namespace: 'ns' })(OPTS, 'server-1')).rejects.toThrow(
      'Error communicating with server',
    );
  });
});

describe('getMcpServerConverter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should GET the converter CR through the MLflow proxy and unwrap the envelope', async () => {
    const crData = { spec: mockMcpDeploySpec() };
    restGETMock.mockResolvedValue({ data: crData });

    const result = await getMcpServerConverter({ namespace: 'odh-model-registries' })(
      OPTS,
      'server-1',
    );

    expect(restGETMock).toHaveBeenCalledWith(
      '',
      '/_bff/mlflow/api/v1/mcp-catalog/servers/server-1/mcpserver',
      { namespace: 'odh-model-registries' },
      OPTS,
    );
    expect(result).toEqual(crData);
  });

  it('should throw when the response is not a valid ModArch envelope', async () => {
    restGETMock.mockResolvedValue({ notData: true });

    await expect(getMcpServerConverter({ namespace: 'ns' })(OPTS, 'server-1')).rejects.toThrow(
      'Invalid response format',
    );
  });

  it('should reject when the request fails', async () => {
    restGETMock.mockRejectedValue(new Error('Server error'));

    await expect(getMcpServerConverter({ namespace: 'ns' })(OPTS, 'server-1')).rejects.toThrow(
      'Error communicating with server',
    );
  });
});
