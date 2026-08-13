import '@testing-library/jest-dom';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import McpDeploymentServerCell from '~/odh/pages/mcpDeployments/McpDeploymentServerCell';
import useMcpDeploymentCatalogServer from '~/odh/pages/mcpDeployments/useMcpDeploymentCatalogServer';
import { McpServer } from '~/app/mcpServerCatalogTypes';
import { createMockDeployment } from './mcpDeploymentTestUtils';

jest.mock('~/odh/pages/mcpDeployments/useMcpDeploymentCatalogServer');

const mockUseMcpDeploymentCatalogServer = jest.mocked(useMcpDeploymentCatalogServer);

const mockCatalogServer = (overrides?: Partial<McpServer>): McpServer => ({
  id: 'catalog-id-1',
  name: 'kubernetes-mcp-server',
  displayName: 'Kubernetes MCP',
  version: '2.0.0',
  toolCount: 3,
  ...overrides,
});

const renderCell = (deployment = createMockDeployment()) =>
  render(
    <MemoryRouter>
      <McpDeploymentServerCell deployment={deployment} />
    </MemoryRouter>,
  );

describe('McpDeploymentServerCell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMcpDeploymentCatalogServer.mockReturnValue([null, false, undefined, jest.fn()]);
  });

  it("should render '-' when neither a registry nor catalog server is set", () => {
    renderCell(createMockDeployment());
    expect(screen.getByTestId('mcp-deployment-server-none')).toHaveTextContent('-');
    expect(mockUseMcpDeploymentCatalogServer).toHaveBeenCalledWith(undefined, expect.any(String));
  });

  it("should render '-' when registryServer and serverName are empty strings rather than unset", () => {
    renderCell(createMockDeployment({ registryServer: '', serverName: '' }));
    expect(screen.getByTestId('mcp-deployment-server-none')).toHaveTextContent('-');
  });

  it('should render the resolved registry display name', () => {
    renderCell(
      createMockDeployment({
        registryServer: 'io.github.example/kubernetes-mcp',
        registryServerDisplayName: 'Kubernetes MCP',
      }),
    );

    expect(screen.getByTestId('mcp-deployment-server-registry')).toHaveTextContent(
      'Kubernetes MCP',
    );
  });

  it('should render the raw registry server name when no display name was resolved', () => {
    renderCell(
      createMockDeployment({
        registryServer: 'io.github.example/kubernetes-mcp',
      }),
    );

    expect(screen.getByTestId('mcp-deployment-server-registry')).toHaveTextContent(
      'io.github.example/kubernetes-mcp',
    );
  });

  it('should prefer the registry server over the catalog server when both are set', () => {
    renderCell(
      createMockDeployment({
        registryServer: 'io.github.example/kubernetes-mcp',
        registryServerDisplayName: 'Kubernetes MCP',
        serverName: 'catalog-server-should-be-ignored',
      }),
    );

    expect(screen.getByTestId('mcp-deployment-server-registry')).toBeInTheDocument();
    expect(mockUseMcpDeploymentCatalogServer).toHaveBeenCalledWith(undefined, expect.any(String));
  });

  it('should render the resolved catalog display name', () => {
    mockUseMcpDeploymentCatalogServer.mockReturnValue([
      mockCatalogServer(),
      true,
      undefined,
      jest.fn(),
    ]);

    renderCell(createMockDeployment({ serverName: 'kubernetes-mcp-server' }));

    expect(screen.getByTestId('mcp-deployment-server-catalog')).toHaveTextContent('Kubernetes MCP');
    expect(mockUseMcpDeploymentCatalogServer).toHaveBeenCalledWith(
      'kubernetes-mcp-server',
      expect.any(String),
    );
  });

  it('should render the raw catalog server name while resolution is pending', () => {
    mockUseMcpDeploymentCatalogServer.mockReturnValue([null, false, undefined, jest.fn()]);

    renderCell(createMockDeployment({ serverName: 'kubernetes-mcp-server' }));

    expect(screen.getByTestId('mcp-deployment-server-catalog')).toHaveTextContent(
      'kubernetes-mcp-server',
    );
  });

  it('should render the raw catalog server name when the catalog server can no longer be found', () => {
    mockUseMcpDeploymentCatalogServer.mockReturnValue([null, true, undefined, jest.fn()]);

    renderCell(createMockDeployment({ serverName: 'deleted-from-catalog' }));

    expect(screen.getByTestId('mcp-deployment-server-catalog')).toHaveTextContent(
      'deleted-from-catalog',
    );
  });
});
