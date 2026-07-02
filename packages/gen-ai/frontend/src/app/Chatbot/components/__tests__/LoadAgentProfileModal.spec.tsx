import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoadAgentProfileModal from '~/app/Chatbot/components/LoadAgentProfileModal';
import { mockGenAiContextValue } from '~/__mocks__/mockGenAiContext';

jest.mock('~/app/hooks/useGenAiAPI', () => ({
  useGenAiAPI: jest.fn(() => ({
    api: mockGenAiContextValue.apiState.api,
    apiAvailable: true,
  })),
}));

const mockOnClose = jest.fn();
const mockOnSelect = jest.fn();

const renderModal = () =>
  render(<LoadAgentProfileModal onClose={mockOnClose} onSelect={mockOnSelect} />);

describe('LoadAgentProfileModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the modal title and description', async () => {
    jest.mocked(mockGenAiContextValue.apiState.api.listAgentProfiles).mockResolvedValue({
      profiles: [],
      totalCount: 0,
    } as never);

    renderModal();

    expect(screen.getByText('Load agent configuration')).toBeInTheDocument();
    expect(
      screen.getByText('Select a saved agent configuration to load into the playground.'),
    ).toBeInTheDocument();
  });

  it('should show a spinner while loading', () => {
    jest
      .mocked(mockGenAiContextValue.apiState.api.listAgentProfiles)
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      .mockImplementation(() => new Promise(() => {}));

    renderModal();

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should render the profile list with name and last modified columns', async () => {
    jest.mocked(mockGenAiContextValue.apiState.api.listAgentProfiles).mockResolvedValue({
      profiles: [
        {
          profileId: 'uuid-1',
          name: 'agent-profile-uuid-1',
          displayName: 'Coding assistant',
          description: 'Code review',
          namespace: 'test-ns',
          lastModified: '2026-06-15T10:00:00Z',
        },
        {
          profileId: 'uuid-2',
          name: 'agent-profile-uuid-2',
          displayName: 'HR Bot',
          description: 'HR helper',
          namespace: 'test-ns',
          lastModified: '2026-06-10T08:00:00Z',
        },
      ],
      totalCount: 2,
    } as never);

    renderModal();

    await waitFor(() => {
      expect(screen.getByText('Coding assistant')).toBeInTheDocument();
      expect(screen.getByText('HR Bot')).toBeInTheDocument();
    });

    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Last modified' })).toBeInTheDocument();
  });

  it('should call onSelect with profileId and onClose when a row is clicked', async () => {
    const user = userEvent.setup();
    jest.mocked(mockGenAiContextValue.apiState.api.listAgentProfiles).mockResolvedValue({
      profiles: [
        {
          profileId: 'uuid-1',
          name: 'agent-profile-uuid-1',
          displayName: 'Coding assistant',
          description: '',
          namespace: 'test-ns',
          lastModified: '2026-06-15T10:00:00Z',
        },
      ],
      totalCount: 1,
    } as never);

    renderModal();

    await waitFor(() => screen.getByTestId('load-agent-profile-row-uuid-1'));
    await user.click(screen.getByTestId('load-agent-profile-row-uuid-1'));

    expect(mockOnSelect).toHaveBeenCalledWith('uuid-1');
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should filter profiles by name when search input is used', async () => {
    const user = userEvent.setup();
    jest.mocked(mockGenAiContextValue.apiState.api.listAgentProfiles).mockResolvedValue({
      profiles: [
        {
          profileId: 'uuid-1',
          name: 'agent-profile-uuid-1',
          displayName: 'Coding assistant',
          description: '',
          namespace: 'test-ns',
          lastModified: '2026-06-15T10:00:00Z',
        },
        {
          profileId: 'uuid-2',
          name: 'agent-profile-uuid-2',
          displayName: 'HR Bot',
          description: '',
          namespace: 'test-ns',
          lastModified: '2026-06-10T08:00:00Z',
        },
      ],
      totalCount: 2,
    } as never);

    renderModal();

    await waitFor(() => screen.getByText('Coding assistant'));

    await user.type(screen.getByPlaceholderText('Find by name'), 'HR');

    expect(screen.getByText('HR Bot')).toBeInTheDocument();
    expect(screen.queryByText('Coding assistant')).not.toBeInTheDocument();
  });

  it('should show empty state when no profiles exist', async () => {
    jest.mocked(mockGenAiContextValue.apiState.api.listAgentProfiles).mockResolvedValue({
      profiles: [],
      totalCount: 0,
    } as never);

    renderModal();

    await waitFor(() => {
      expect(screen.getByText('No agent configurations found.')).toBeInTheDocument();
    });
  });

  it('should show empty state when filter matches nothing', async () => {
    const user = userEvent.setup();
    jest.mocked(mockGenAiContextValue.apiState.api.listAgentProfiles).mockResolvedValue({
      profiles: [
        {
          profileId: 'uuid-1',
          name: 'agent-profile-uuid-1',
          displayName: 'Coding assistant',
          description: '',
          namespace: 'test-ns',
          lastModified: '2026-06-15T10:00:00Z',
        },
      ],
      totalCount: 1,
    } as never);

    renderModal();

    await waitFor(() => screen.getByText('Coding assistant'));
    await user.type(screen.getByPlaceholderText('Find by name'), 'xyz-no-match');

    expect(screen.getByText('No configurations match your search.')).toBeInTheDocument();
  });

  it('should show error state when API call fails', async () => {
    jest
      .mocked(mockGenAiContextValue.apiState.api.listAgentProfiles)
      .mockRejectedValue(new Error('Network error'));

    renderModal();

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('should call onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    jest.mocked(mockGenAiContextValue.apiState.api.listAgentProfiles).mockResolvedValue({
      profiles: [],
      totalCount: 0,
    } as never);

    renderModal();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
