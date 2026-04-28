import '@testing-library/jest-dom';
import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { McpDeployment, McpDeploymentPhase } from '~/odh/types/mcpDeploymentTypes';
import McpDeploymentsTable from '~/odh/pages/mcpDeployments/McpDeploymentsTable';

const mockDeployments: McpDeployment[] = [
  {
    name: 'kubernetes-mcp',
    namespace: 'mcp-servers',
    uid: 'uid-1',
    creationTimestamp: '2026-03-10T14:30:00Z',
    image: 'quay.io/mcp-servers/kubernetes:1.0.0',
    phase: McpDeploymentPhase.RUNNING,
  },
  {
    name: 'slack-mcp',
    namespace: 'mcp-servers',
    uid: 'uid-2',
    creationTimestamp: '2026-03-14T11:00:00Z',
    image: 'quay.io/mcp-servers/slack:0.5.0',
    phase: McpDeploymentPhase.PENDING,
  },
  {
    name: 'jira-mcp',
    namespace: 'mcp-servers',
    uid: 'uid-3',
    creationTimestamp: '2026-03-08T16:45:00Z',
    image: 'quay.io/mcp-servers/jira:1.2.0',
    phase: McpDeploymentPhase.FAILED,
  },
];

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

describe('McpDeploymentsTable', () => {
  const onDeleteClick = jest.fn();
  const onEditClick = jest.fn();
  const onClearFilters = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call onDeleteClick when Delete is selected from the kebab menu', async () => {
    const user = userEvent.setup();
    render(
      <McpDeploymentsTable
        deployments={mockDeployments}
        onClearFilters={onClearFilters}
        onDeleteClick={onDeleteClick}
        onEditClick={onEditClick}
      />,
      { wrapper },
    );

    const row = screen.getByTestId('mcp-deployment-row-kubernetes-mcp');
    const actionsButton = within(row).getByRole('button', { name: /kebab toggle/i });
    await user.click(actionsButton);
    await user.click(screen.getByRole('menuitem', { name: /^delete$/i }));

    expect(onDeleteClick).toHaveBeenCalledWith(mockDeployments[0]);
  });

  it('should render all deployment rows', () => {
    render(
      <McpDeploymentsTable
        deployments={mockDeployments}
        onClearFilters={onClearFilters}
        onDeleteClick={onDeleteClick}
        onEditClick={onEditClick}
      />,
      { wrapper },
    );

    expect(screen.getByTestId('mcp-deployment-row-kubernetes-mcp')).toBeInTheDocument();
    expect(screen.getByTestId('mcp-deployment-row-slack-mcp')).toBeInTheDocument();
    expect(screen.getByTestId('mcp-deployment-row-jira-mcp')).toBeInTheDocument();
  });

  it('should show empty table view when deployments list is empty', () => {
    render(
      <McpDeploymentsTable
        deployments={[]}
        onClearFilters={onClearFilters}
        onDeleteClick={onDeleteClick}
        onEditClick={onEditClick}
      />,
      { wrapper },
    );

    expect(screen.queryByTestId('mcp-deployment-row-kubernetes-mcp')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear all filters/i })).toBeInTheDocument();
  });
});
