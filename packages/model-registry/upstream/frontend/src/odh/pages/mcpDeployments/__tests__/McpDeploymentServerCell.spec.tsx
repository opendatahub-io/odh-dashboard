import '@testing-library/jest-dom';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import McpDeploymentServerCell from '~/odh/pages/mcpDeployments/McpDeploymentServerCell';
import { createMockDeployment } from './mcpDeploymentTestUtils';

const renderCell = (deployment = createMockDeployment()) =>
  render(
    <MemoryRouter>
      <McpDeploymentServerCell deployment={deployment} />
    </MemoryRouter>,
  );

describe('McpDeploymentServerCell', () => {
  it("should render '-' when neither a registry nor catalog server is set", () => {
    renderCell(createMockDeployment());
    expect(screen.getByTestId('mcp-deployment-server-none')).toHaveTextContent('-');
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
  });

  it('should render the catalog display name from the annotation', () => {
    renderCell(createMockDeployment({ serverName: 'Kubernetes MCP' }));

    expect(screen.getByTestId('mcp-deployment-server-catalog')).toHaveTextContent('Kubernetes MCP');
  });
});
