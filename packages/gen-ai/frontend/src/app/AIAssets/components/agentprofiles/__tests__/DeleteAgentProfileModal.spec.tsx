import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteAgentProfileModal from '~/app/AIAssets/components/agentprofiles/DeleteAgentProfileModal';
import { AgentProfileSummary } from '~/app/agentProfile/types';

const makeProfile = (overrides: Partial<AgentProfileSummary> = {}): AgentProfileSummary => ({
  name: 'agent-profile-test-uuid',
  profileId: 'test-uuid',
  displayName: 'My Agent',
  description: 'A test profile',
  namespace: 'test-namespace',
  lastModified: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('DeleteAgentProfileModal', () => {
  const onClose = jest.fn();
  const onConfirm = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the modal with the profile name', () => {
    render(
      <DeleteAgentProfileModal profile={makeProfile()} onClose={onClose} onConfirm={onConfirm} />,
    );

    expect(screen.getByTestId('delete-agent-profile-modal')).toBeInTheDocument();
    expect(screen.getByText('Delete agent profile?')).toBeInTheDocument();
    expect(screen.getByText('My Agent')).toBeInTheDocument();
    expect(screen.getByText(/will be permanently/)).toBeInTheDocument();
  });

  it('should call onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(
      <DeleteAgentProfileModal profile={makeProfile()} onClose={onClose} onConfirm={onConfirm} />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('should call onConfirm and then onClose on successful delete', async () => {
    onConfirm.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <DeleteAgentProfileModal profile={makeProfile()} onClose={onClose} onConfirm={onConfirm} />,
    );

    await user.click(screen.getByTestId('delete-agent-profile-confirm-button'));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('should display an error message when delete fails', async () => {
    onConfirm.mockRejectedValue(new Error('Delete failed'));
    const user = userEvent.setup();
    render(
      <DeleteAgentProfileModal profile={makeProfile()} onClose={onClose} onConfirm={onConfirm} />,
    );

    await user.click(screen.getByTestId('delete-agent-profile-confirm-button'));

    await waitFor(() => {
      expect(screen.getByText('Delete failed')).toBeInTheDocument();
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});
