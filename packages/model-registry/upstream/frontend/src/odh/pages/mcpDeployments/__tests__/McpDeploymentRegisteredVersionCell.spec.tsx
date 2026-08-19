import '@testing-library/jest-dom';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import McpDeploymentRegisteredVersionCell from '~/odh/pages/mcpDeployments/McpDeploymentRegisteredVersionCell';
import { createMockDeployment } from './mcpDeploymentTestUtils';

const renderCell = (deployment = createMockDeployment()) =>
  render(
    <MemoryRouter>
      <McpDeploymentRegisteredVersionCell deployment={deployment} />
    </MemoryRouter>,
  );

describe('McpDeploymentRegisteredVersionCell', () => {
  it("should render '-' when the deployment has no registry server", () => {
    renderCell(createMockDeployment({ registryServer: undefined }));

    expect(screen.getByTestId('mcp-deployment-registered-version-none')).toHaveTextContent('-');
    expect(screen.queryByTestId('mcp-deployment-registered-version-link')).not.toBeInTheDocument();
  });

  it("should render '-' for a catalog-sourced deployment (serverName set, no registryServer)", () => {
    renderCell(
      createMockDeployment({ registryServer: undefined, serverName: 'kubernetes-mcp-server' }),
    );

    expect(screen.getByTestId('mcp-deployment-registered-version-none')).toHaveTextContent('-');
  });

  it("should render '-' when registryServer is an empty string rather than unset", () => {
    renderCell(createMockDeployment({ registryServer: '' }));
    expect(screen.getByTestId('mcp-deployment-registered-version-none')).toHaveTextContent('-');
  });

  it('should render a link with the registry version and a deep link to that version', () => {
    renderCell(
      createMockDeployment({
        registryServer: 'io.github.example/kubernetes-mcp',
        registryVersion: '1.0.0',
        namespace: 'test-project',
      }),
    );

    const link = screen.getByTestId('mcp-deployment-registered-version-link');
    expect(link).toHaveTextContent('1.0.0');
    expect(link).toHaveAttribute(
      'href',
      '/ai-hub/mcp-servers/registry/io.github.example%2Fkubernetes-mcp?workspace=test-project&version=1.0.0',
    );
  });

  it('should render a link to the server (no version param) when registryVersion is not set', () => {
    renderCell(
      createMockDeployment({
        registryServer: 'io.github.example/kubernetes-mcp',
        registryVersion: undefined,
        namespace: 'test-project',
      }),
    );

    const link = screen.getByTestId('mcp-deployment-registered-version-link');
    expect(link).toHaveTextContent('io.github.example/kubernetes-mcp');
    expect(link).toHaveAttribute(
      'href',
      '/ai-hub/mcp-servers/registry/io.github.example%2Fkubernetes-mcp?workspace=test-project',
    );
  });
});
