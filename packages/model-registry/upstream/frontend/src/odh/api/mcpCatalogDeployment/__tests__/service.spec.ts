import { handleRestFailures, isModArchResponse, restGET } from 'mod-arch-core';
import { getMcpServerDeployReadiness } from '~/odh/api/mcpCatalogDeployment/service';
import { McpDeployReadinessReason } from '~/odh/types/mcpDeploymentTypes';

jest.mock('~/app/utilities/const', () => ({
  BFF_API_VERSION: 'v1',
  URL_PREFIX: '/model-registry',
}));

jest.mock('mod-arch-core', () => ({
  restGET: jest.fn(),
  handleRestFailures: jest.fn(),
  isModArchResponse: jest.fn(),
}));

const restGETMock = jest.mocked(restGET);
const handleRestFailuresMock = jest.mocked(handleRestFailures);
const isModArchResponseMock = jest.mocked(isModArchResponse);

describe('getMcpServerDeployReadiness', () => {
  const opts = { signal: new AbortController().signal };
  const queryParams = { namespace: 'catalog-ns' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call the deploy readiness endpoint and return the data', async () => {
    const readiness = {
      gatewayRequired: true,
      deployable: false,
      reason: McpDeployReadinessReason.NO_GATEWAY_AVAILABLE,
      message: 'No MCP gateway is available on this cluster.',
    };
    handleRestFailuresMock.mockResolvedValue({ data: readiness });
    isModArchResponseMock.mockReturnValue(true);

    await expect(getMcpServerDeployReadiness('', queryParams)(opts, '4')).resolves.toEqual(
      readiness,
    );
    expect(restGETMock).toHaveBeenCalledWith(
      '',
      '/model-registry/api/v1/mcp_catalog/mcp_servers/4/deploy_readiness',
      queryParams,
      opts,
    );
  });

  it('should reject when the response is not a mod-arch response', async () => {
    handleRestFailuresMock.mockResolvedValue({ unexpected: true });
    isModArchResponseMock.mockReturnValue(false);

    await expect(getMcpServerDeployReadiness('', queryParams)(opts, '4')).rejects.toThrow(
      'Invalid response format',
    );
  });

  it('should propagate request failures', async () => {
    handleRestFailuresMock.mockRejectedValue(new Error('Not Found'));

    await expect(getMcpServerDeployReadiness('', queryParams)(opts, 'missing')).rejects.toThrow(
      'Not Found',
    );
  });
});
