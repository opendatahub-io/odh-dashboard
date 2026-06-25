import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { GenAiContext } from '~/app/context/GenAiContext';
import useFetchAgentProfiles from '~/app/hooks/useFetchAgentProfiles';
import AIAssetsAgentProfilesTab from '~/app/AIAssets/AIAssetsAgentProfilesTab';
import { mockGenAiContextValue } from '~/__mocks__/mockGenAiContext';
import { AgentProfileSummary } from '~/app/agentProfile/types';

jest.mock('~/app/hooks/useFetchAgentProfiles', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('~/app/AIAssets/components/agentprofiles/AgentProfilesTable', () => ({
  __esModule: true,
  default: ({ profiles }: { profiles: AgentProfileSummary[] }) => (
    <div data-testid="agent-profiles-table">
      {profiles.map((p) => (
        <div key={p.profileId} data-testid={`profile-${p.profileId}`}>
          {p.displayName}
        </div>
      ))}
    </div>
  ),
}));

const mockUseFetchAgentProfiles = jest.mocked(useFetchAgentProfiles);

const makeProfile = (overrides: Partial<AgentProfileSummary> = {}): AgentProfileSummary => ({
  name: 'agent-profile-test-uuid',
  profileId: 'test-uuid',
  displayName: 'Test Agent',
  description: 'A test agent profile',
  namespace: 'test-namespace',
  lastModified: '2024-01-01T00:00:00Z',
  ...overrides,
});

const renderTab = () =>
  render(
    <GenAiContext.Provider value={mockGenAiContextValue}>
      <AIAssetsAgentProfilesTab />
    </GenAiContext.Provider>,
  );

describe('AIAssetsAgentProfilesTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state', () => {
    mockUseFetchAgentProfiles.mockReturnValue({
      data: [],
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    });

    const { container } = renderTab();
    expect(container.querySelector('.pf-v6-c-spinner')).toBeInTheDocument();
  });

  it('should render error state when fetch fails', () => {
    mockUseFetchAgentProfiles.mockReturnValue({
      data: [],
      loaded: true,
      error: new Error('Failed to load'),
      refresh: jest.fn(),
    });

    renderTab();
    expect(screen.getByText('Unable to load agent configurations')).toBeInTheDocument();
  });

  it('should render empty state when no profiles exist', () => {
    mockUseFetchAgentProfiles.mockReturnValue({
      data: [],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    renderTab();
    expect(screen.getByText('No agent configurations')).toBeInTheDocument();
  });

  it('should render the profiles table when profiles exist', () => {
    mockUseFetchAgentProfiles.mockReturnValue({
      data: [makeProfile(), makeProfile({ profileId: 'uuid-2', displayName: 'Second Agent' })],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    renderTab();
    expect(screen.getByTestId('agent-profiles-table')).toBeInTheDocument();
    expect(screen.getByTestId('profile-test-uuid')).toBeInTheDocument();
    expect(screen.getByTestId('profile-uuid-2')).toBeInTheDocument();
    expect(screen.getByText('Test Agent')).toBeInTheDocument();
    expect(screen.getByText('Second Agent')).toBeInTheDocument();
  });
});
