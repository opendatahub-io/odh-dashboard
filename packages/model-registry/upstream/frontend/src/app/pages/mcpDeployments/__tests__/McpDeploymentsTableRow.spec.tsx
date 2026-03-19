import '@testing-library/jest-dom';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { Table as PfTable, Tbody } from '@patternfly/react-table';
import { McpDeployment, McpDeploymentPhase } from '~/app/mcpDeploymentTypes';
import McpDeploymentsTableRow from '../McpDeploymentsTableRow';

const createMockDeployment = (overrides: Partial<McpDeployment> = {}): McpDeployment => ({
  name: 'kubernetes-mcp',
  namespace: 'mcp-servers',
  creationTimestamp: '2026-03-10T14:30:00Z',
  image: 'quay.io/mcp-servers/kubernetes:1.0.0',
  port: 8080,
  phase: McpDeploymentPhase.RUNNING,
  ...overrides,
});

const renderRow = (deployment: McpDeployment, onDeleteClick = jest.fn()) =>
  render(
    <PfTable>
      <Tbody>
        <McpDeploymentsTableRow deployment={deployment} onDeleteClick={onDeleteClick} />
      </Tbody>
    </PfTable>,
  );

describe('McpDeploymentsTableRow', () => {
  it('should render server name derived from image', () => {
    renderRow(createMockDeployment());
    expect(screen.getByTestId('mcp-deployment-server')).toHaveTextContent('Kubernetes-1.0.0');
  });

  it('should render deployment name', () => {
    renderRow(createMockDeployment());
    expect(screen.getByTestId('mcp-deployment-name')).toHaveTextContent('kubernetes-mcp');
  });

  it('should render formatted creation date', () => {
    renderRow(createMockDeployment());
    expect(screen.getByTestId('mcp-deployment-created')).toBeInTheDocument();
  });

  it('should render available status for Running phase', () => {
    renderRow(createMockDeployment({ phase: McpDeploymentPhase.RUNNING }));
    expect(screen.getByTestId('mcp-deployment-status-label')).toHaveTextContent('Available');
  });

  it('should render unavailable status for Failed phase', () => {
    renderRow(createMockDeployment({ phase: McpDeploymentPhase.FAILED }));
    expect(screen.getByTestId('mcp-deployment-status-label')).toHaveTextContent('Unavailable');
  });

  it('should render pending status for Pending phase', () => {
    renderRow(createMockDeployment({ phase: McpDeploymentPhase.PENDING }));
    expect(screen.getByTestId('mcp-deployment-status-label')).toHaveTextContent('Pending');
  });

  it('should have a row with the correct test id', () => {
    renderRow(createMockDeployment());
    expect(screen.getByTestId('mcp-deployment-row-kubernetes-mcp')).toBeInTheDocument();
  });

  it('should render View link for Running deployment', () => {
    renderRow(createMockDeployment({ phase: McpDeploymentPhase.RUNNING }));
    expect(screen.getByTestId('mcp-deployment-service-view')).toBeInTheDocument();
  });

  it('should render View link with address URL when provided', () => {
    renderRow(
      createMockDeployment({
        phase: McpDeploymentPhase.RUNNING,
        address: { url: 'kubernetes-test:8080' },
      }),
    );
    expect(screen.getByTestId('mcp-deployment-service-view')).toBeInTheDocument();
  });

  it('should render dash for Failed deployment without address', () => {
    renderRow(createMockDeployment({ phase: McpDeploymentPhase.FAILED }));
    expect(screen.getByTestId('mcp-deployment-service-unavailable')).toBeInTheDocument();
  });

  it('should render dash for Pending deployment without address', () => {
    renderRow(createMockDeployment({ phase: McpDeploymentPhase.PENDING }));
    expect(screen.getByTestId('mcp-deployment-service-unavailable')).toBeInTheDocument();
  });
});
