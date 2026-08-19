import '@testing-library/jest-dom';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Table as PfTable, Tbody } from '@patternfly/react-table';
import { McpDeployment } from '~/odh/types/mcpDeploymentTypes';
import McpDeploymentsTableRow from '~/odh/pages/mcpDeployments/McpDeploymentsTableRow';
import {
  createMockDeployment,
  createReadyConditions,
  createInitializingConditions,
  createFailedConditions,
} from './mcpDeploymentTestUtils';

const renderRow = (
  deployment: McpDeployment,
  onDeleteClick = jest.fn(),
  onEditClick = jest.fn(),
  showRegisteredVersion = true,
) =>
  render(
    <MemoryRouter>
      <PfTable>
        <Tbody>
          <McpDeploymentsTableRow
            deployment={deployment}
            showRegisteredVersion={showRegisteredVersion}
            onDeleteClick={onDeleteClick}
            onEditClick={onEditClick}
          />
        </Tbody>
      </PfTable>
    </MemoryRouter>,
  );

describe('McpDeploymentsTableRow', () => {
  it('should render server column with catalog server name when set', () => {
    renderRow(createMockDeployment({ serverName: 'kubernetes-mcp-server' }));
    expect(screen.getByTestId('mcp-deployment-server')).toHaveTextContent('kubernetes-mcp-server');
  });

  it('should render dash in server column when serverName is not set', () => {
    renderRow(createMockDeployment());
    expect(screen.getByTestId('mcp-deployment-server')).toHaveTextContent('-');
  });

  it('should render the registry version as a link in the registered version column', () => {
    renderRow(
      createMockDeployment({
        registryServer: 'io.github.example/kubernetes-mcp',
        registryVersion: '1.0.0',
      }),
    );
    expect(screen.getByTestId('mcp-deployment-registered-version')).toHaveTextContent('1.0.0');
  });

  it('should render dash in registered version column for a catalog-sourced deployment', () => {
    renderRow(createMockDeployment({ serverName: 'kubernetes-mcp-server' }));
    expect(screen.getByTestId('mcp-deployment-registered-version')).toHaveTextContent('-');
  });

  it('should omit the registered version cell entirely when showRegisteredVersion is false', () => {
    renderRow(
      createMockDeployment({
        registryServer: 'io.github.example/kubernetes-mcp',
        registryVersion: '1.0.0',
      }),
      jest.fn(),
      jest.fn(),
      false,
    );
    expect(screen.queryByTestId('mcp-deployment-registered-version')).not.toBeInTheDocument();
  });

  it("should show '-' in both server columns for a bare CR with no catalog or registry annotations (e.g. oc apply)", () => {
    renderRow(
      createMockDeployment({
        serverName: undefined,
        registryServer: undefined,
        registryVersion: undefined,
        registryServerDisplayName: undefined,
      }),
    );
    expect(screen.getByTestId('mcp-deployment-server')).toHaveTextContent('-');
    expect(screen.getByTestId('mcp-deployment-registered-version')).toHaveTextContent('-');
  });

  it('should render displayName in name column when set', () => {
    renderRow(createMockDeployment({ displayName: 'My K8s Server' }));
    expect(screen.getByTestId('mcp-deployment-name')).toHaveTextContent('My K8s Server');
  });

  it('should fall back to name in name column when no displayName', () => {
    renderRow(createMockDeployment());
    expect(screen.getByTestId('mcp-deployment-name')).toHaveTextContent('kubernetes-mcp');
  });

  it('should render a non-empty formatted creation date', () => {
    renderRow(createMockDeployment());
    const dateCell = screen.getByTestId('mcp-deployment-created');
    expect(dateCell.textContent).toMatch(
      /\d{1,2}\/\d{1,2}\/\d{4}|[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}/,
    );
  });

  it('should render Available status label when Ready condition is True', () => {
    renderRow(createMockDeployment({ conditions: createReadyConditions() }));
    expect(screen.getByTestId('mcp-deployment-status-label')).toHaveTextContent('Available');
  });

  it('should render Initializing status label when Ready is False with Initializing reason', () => {
    renderRow(createMockDeployment({ conditions: createInitializingConditions() }));
    expect(screen.getByTestId('mcp-deployment-status-label')).toHaveTextContent('Initializing');
  });

  it('should render Unavailable status label when Ready is False with DeploymentUnavailable reason', () => {
    renderRow(createMockDeployment({ conditions: createFailedConditions() }));
    expect(screen.getByTestId('mcp-deployment-status-label')).toHaveTextContent('Unavailable');
  });

  it('should render View link for Ready deployment and show connection URL in popover', async () => {
    const user = userEvent.setup();
    renderRow(
      createMockDeployment({
        conditions: createReadyConditions(),
        address: { url: 'kubernetes-test:8080' },
      }),
    );
    const viewLink = screen.getByTestId('mcp-deployment-service-view');
    expect(viewLink).toBeInTheDocument();

    await user.click(viewLink);
    const popover = await screen.findByTestId('mcp-deployment-connection-url');
    expect(popover).toBeInTheDocument();
    expect(popover).toHaveTextContent('kubernetes-test:8080');
  });

  it('should render dash when deployment is not ready', () => {
    renderRow(createMockDeployment({ conditions: createFailedConditions() }));
    expect(screen.getByTestId('mcp-deployment-service-unavailable')).toBeInTheDocument();
  });
});
