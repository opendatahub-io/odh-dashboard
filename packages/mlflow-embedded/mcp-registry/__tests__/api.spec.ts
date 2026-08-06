// Request/response fixtures use the mlflow BFF's snake_case field names.
/* eslint-disable camelcase */
import * as modArchCore from 'mod-arch-core';
import { createMcpAccessEndpoint } from '../api';
import { MCPTransportType } from '../types';

// mod-arch-core is ESM-only; full mock avoids transformIgnorePatterns
jest.mock('mod-arch-core', () => ({
  handleRestFailures: jest.fn((p: Promise<unknown>) => p),
  restCREATE: jest.fn(),
  isModArchResponse: jest.fn(
    (response: unknown) => typeof response === 'object' && response !== null && 'data' in response,
  ),
}));

const mockRestCREATE = jest.mocked(modArchCore.restCREATE);
const mockHandleRestFailures = jest.mocked(modArchCore.handleRestFailures);

describe('createMcpAccessEndpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleRestFailures.mockImplementation((p: Promise<unknown>) => p);
  });

  it('posts the request body directly, without wrapping it in a mod-arch `{ data }` envelope', async () => {
    mockRestCREATE.mockResolvedValue({
      data: {
        id: 'endpoint-1',
        server_name: 'io.github.example/weather-server',
        endpoint_url: 'http://weather-server.my-project.svc.cluster.local:8080/mcp',
        transport_type: MCPTransportType.STREAMABLE_HTTP,
      },
    });

    const requestBody = {
      endpoint_url: 'http://weather-server.my-project.svc.cluster.local:8080/mcp',
      transport_type: MCPTransportType.STREAMABLE_HTTP,
      server_version: '1.2.0',
    };
    await createMcpAccessEndpoint('io.github.example/weather-server', 'my-project')(
      {},
      requestBody,
    );

    expect(mockRestCREATE).toHaveBeenCalledWith(
      '',
      '/_bff/mlflow/api/v1/mcp-registry/servers/io.github.example/weather-server/endpoints',
      requestBody,
      { workspace: 'my-project' },
      {},
    );
  });

  it('resolves with the created endpoint from the response envelope', async () => {
    const endpoint = {
      id: 'endpoint-1',
      server_name: 'io.github.example/weather-server',
      endpoint_url: 'http://weather-server.my-project.svc.cluster.local:8080/mcp',
      transport_type: MCPTransportType.STREAMABLE_HTTP,
    };
    mockRestCREATE.mockResolvedValue({ data: endpoint });

    const result = await createMcpAccessEndpoint('io.github.example/weather-server', 'my-project')(
      {},
      { endpoint_url: endpoint.endpoint_url },
    );

    expect(result).toEqual(endpoint);
  });

  it('throws when the response is not mod-arch wrapped', async () => {
    mockRestCREATE.mockResolvedValue({
      id: 'endpoint-1',
      server_name: 'io.github.example/weather-server',
      endpoint_url: 'http://weather-server.my-project.svc.cluster.local:8080/mcp',
      transport_type: MCPTransportType.STREAMABLE_HTTP,
    });

    await expect(
      createMcpAccessEndpoint('io.github.example/weather-server', 'my-project')(
        {},
        { endpoint_url: 'http://weather-server.my-project.svc.cluster.local:8080/mcp' },
      ),
    ).rejects.toThrow('Invalid response format');
  });
});
