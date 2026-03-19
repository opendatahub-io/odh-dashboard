import '@testing-library/jest-dom';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { McpDeployment, McpDeploymentPhase } from '~/app/mcpDeploymentTypes';
import McpDeploymentsTable from '../McpDeploymentsTable';

const mockDeployments: McpDeployment[] = [
  {
    name: 'kubernetes-mcp',
    namespace: 'mcp-servers',
    creationTimestamp: '2026-03-10T14:30:00Z',
    image: 'quay.io/mcp-servers/kubernetes:1.0.0',
    port: 8080,
    phase: McpDeploymentPhase.RUNNING,
  },
  {
    name: 'slack-mcp',
    namespace: 'mcp-servers',
    creationTimestamp: '2026-03-14T11:00:00Z',
    image: 'quay.io/mcp-servers/slack:0.5.0',
    port: 9090,
    phase: McpDeploymentPhase.PENDING,
  },
  {
    name: 'jira-mcp',
    namespace: 'mcp-servers',
    creationTimestamp: '2026-03-08T16:45:00Z',
    image: 'quay.io/mcp-servers/jira:1.2.0',
    port: 8080,
    phase: McpDeploymentPhase.FAILED,
  },
];

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

describe('McpDeploymentsTable', () => {
  const onDeleteClick = jest.fn();
  const onClearFilters = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all deployment rows', () => {
    render(
      <McpDeploymentsTable
        deployments={mockDeployments}
        toolbarContent={<div>toolbar</div>}
        onClearFilters={onClearFilters}
        onDeleteClick={onDeleteClick}
      />,
      { wrapper },
    );

    expect(screen.getByTestId('mcp-deployment-row-kubernetes-mcp')).toBeInTheDocument();
    expect(screen.getByTestId('mcp-deployment-row-slack-mcp')).toBeInTheDocument();
    expect(screen.getByTestId('mcp-deployment-row-jira-mcp')).toBeInTheDocument();
  });

  it('should render the table element', () => {
    render(
      <McpDeploymentsTable
        deployments={mockDeployments}
        toolbarContent={<div>toolbar</div>}
        onClearFilters={onClearFilters}
        onDeleteClick={onDeleteClick}
      />,
      { wrapper },
    );

    expect(screen.getByTestId('mcp-deployments-table')).toBeInTheDocument();
  });

  it('should show empty table view when no deployments match filter', () => {
    render(
      <McpDeploymentsTable
        deployments={[]}
        toolbarContent={<div>toolbar</div>}
        onClearFilters={onClearFilters}
        onDeleteClick={onDeleteClick}
      />,
      { wrapper },
    );

    expect(screen.queryByTestId('mcp-deployment-row-kubernetes-mcp')).not.toBeInTheDocument();
  });

  it('should render column headers', () => {
    render(
      <McpDeploymentsTable
        deployments={mockDeployments}
        toolbarContent={<div>toolbar</div>}
        onClearFilters={onClearFilters}
        onDeleteClick={onDeleteClick}
      />,
      { wrapper },
    );

    expect(screen.getByText('Server')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Service')).toBeInTheDocument();
  });
});
