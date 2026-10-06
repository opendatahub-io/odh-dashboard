import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { AgentDeploymentSummary, AgentProfileSummary } from '~/app/agentProfile/types';
import useGenAiAgentDeploymentEnabled from '~/app/hooks/useGenAiAgentDeploymentEnabled';
import AgentProfilesTable from '~/app/AIAssets/components/agentprofiles/AgentProfilesTable';

jest.mock('mod-arch-shared', () => ({
  Table: ({
    data,
    rowRenderer,
    toolbarContent,
  }: {
    data: AgentProfileSummary[];
    rowRenderer: (profile: AgentProfileSummary) => React.ReactNode;
    toolbarContent: React.ReactNode;
  }) => (
    <div>
      {toolbarContent}
      {data.map(rowRenderer)}
    </div>
  ),
  DashboardEmptyTableView: () => <div />,
}));

jest.mock('../AgentProfileTableRow', () => ({
  __esModule: true,
  default: ({
    profile,
    deployments,
    deploymentsLoading,
    showEndpointsColumn,
  }: {
    profile: AgentProfileSummary;
    deployments: AgentDeploymentSummary[];
    deploymentsLoading: boolean;
    showEndpointsColumn: boolean;
  }) => (
    <div data-testid={`row-${profile.profileId}`}>
      {profile.displayName}{' '}
      {showEndpointsColumn
        ? deploymentsLoading
          ? 'deployments loading'
          : `deployments:${deployments.length}`
        : 'no endpoints'}
    </div>
  ),
}));

jest.mock('~/app/hooks/useGenAiAgentDeploymentEnabled', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseGenAiAgentDeploymentEnabled = jest.mocked(useGenAiAgentDeploymentEnabled);

const profiles: AgentProfileSummary[] = [
  {
    name: 'deployed-agent',
    profileId: 'deployed-agent-id',
    displayName: 'Deployed agent',
    namespace: 'my-project',
    lastModified: '2026-07-30T06:30:00Z',
  },
  {
    name: 'not-deployed-agent',
    profileId: 'not-deployed-agent-id',
    displayName: 'Not deployed agent',
    namespace: 'my-project',
    lastModified: '2026-07-29T06:30:00Z',
  },
];

const deployments: AgentDeploymentSummary[] = [
  {
    name: 'deployed-agent-1',
    namespace: 'my-project',
    agentProfileId: 'deployed-agent-id',
    createdAt: '2026-07-30T06:30:00Z',
    state: 'ready',
  },
];

describe('AgentProfilesTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should filter profiles by deployment state when deployments are enabled', () => {
    mockUseGenAiAgentDeploymentEnabled.mockReturnValue({ enabled: true, loaded: true });

    render(
      <AgentProfilesTable
        profiles={profiles}
        deployments={deployments}
        deploymentsLoaded
        onDelete={jest.fn()}
        onRefresh={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'All (2)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deployed (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Not deployed (1)' })).toBeInTheDocument();
    expect(screen.getByTestId('row-deployed-agent-id')).toHaveTextContent('deployments:1');
    expect(screen.getByTestId('row-not-deployed-agent-id')).toHaveTextContent('deployments:0');

    fireEvent.click(screen.getByRole('button', { name: 'Deployed (1)' }));
    expect(screen.getByTestId('row-deployed-agent-id')).toBeInTheDocument();
    expect(screen.queryByTestId('row-not-deployed-agent-id')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Not deployed (1)' }));
    expect(screen.queryByTestId('row-deployed-agent-id')).not.toBeInTheDocument();
    expect(screen.getByTestId('row-not-deployed-agent-id')).toBeInTheDocument();
  });

  it('should not render deployment UI when deployments are disabled', () => {
    mockUseGenAiAgentDeploymentEnabled.mockReturnValue({ enabled: false, loaded: true });

    render(
      <AgentProfilesTable
        profiles={profiles}
        deployments={deployments}
        deploymentsLoaded
        onDelete={jest.fn()}
        onRefresh={jest.fn()}
      />,
    );

    expect(screen.queryByTestId('agent-deployment-filters')).not.toBeInTheDocument();
    expect(screen.getByTestId('row-deployed-agent-id')).toHaveTextContent('no endpoints');
  });

  it('should render loading placeholders in endpoint cells while deployments load', () => {
    mockUseGenAiAgentDeploymentEnabled.mockReturnValue({ enabled: true, loaded: true });

    render(
      <AgentProfilesTable
        profiles={profiles}
        deployments={[]}
        deploymentsLoaded={false}
        onDelete={jest.fn()}
        onRefresh={jest.fn()}
      />,
    );

    expect(screen.getByTestId('row-deployed-agent-id')).toHaveTextContent('deployments loading');
    expect(screen.getByTestId('row-not-deployed-agent-id')).toHaveTextContent(
      'deployments loading',
    );
  });
});
