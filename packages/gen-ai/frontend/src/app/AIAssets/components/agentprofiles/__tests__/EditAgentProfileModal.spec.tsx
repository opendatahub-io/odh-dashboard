import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GenAiContext } from '~/app/context/GenAiContext';
import EditAgentProfileModal from '~/app/AIAssets/components/agentprofiles/EditAgentProfileModal';
import { mockGenAiContextValue } from '~/__mocks__/mockGenAiContext';
import { AgentProfileSummary } from '~/app/agentProfile/types';

const makeProfile = (overrides: Partial<AgentProfileSummary> = {}): AgentProfileSummary => ({
  name: 'agent-profile-test-uuid',
  profileId: 'test-uuid',
  displayName: 'My Agent',
  description: 'My description',
  namespace: 'test-namespace',
  lastModified: '2024-01-01T00:00:00Z',
  ...overrides,
});

const FULL_PROFILE = {
  apiVersion: 'genai.redhat.com/v1alpha1',
  kind: 'AgentProfile',
  metadata: { name: 'agent-profile-test-uuid', resourceVersion: 'rv-123' },
  spec: {
    displayName: 'My Agent',
    description: 'My description',
    model: { id: 'llama-3b', uri: 'http://llama.svc/v1', sourceType: 'namespace' },
    temperature: 0.7,
    stream: true,
  },
};

const renderModal = (profile = makeProfile(), onClose = jest.fn(), onSaved = jest.fn()) =>
  render(
    <GenAiContext.Provider value={mockGenAiContextValue}>
      <EditAgentProfileModal profile={profile} onClose={onClose} onSaved={onSaved} />
    </GenAiContext.Provider>,
  );

describe('EditAgentProfileModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(mockGenAiContextValue.apiState.api.getAgentProfile)
      .mockResolvedValue(FULL_PROFILE as never);
    jest
      .mocked(mockGenAiContextValue.apiState.api.updateAgentProfile)
      .mockResolvedValue({} as never);
  });

  it('should render the modal pre-filled with the profile name and description', () => {
    renderModal();

    expect(screen.getByTestId('edit-agent-profile-modal')).toBeInTheDocument();
    expect(screen.getByText('Edit agent profile')).toBeInTheDocument();
    expect(screen.getByTestId('edit-agent-profile-name')).toHaveValue('My Agent');
    expect(screen.getByTestId('edit-agent-profile-description')).toHaveValue('My description');
  });

  it('should call onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    renderModal(makeProfile(), onClose);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should disable Save when the name field is empty', async () => {
    const user = userEvent.setup();
    renderModal();

    const nameInput = screen.getByTestId('edit-agent-profile-name');
    await user.clear(nameInput);

    expect(screen.getByTestId('edit-agent-profile-save-button')).toBeDisabled();
    expect(screen.getByText('Name is required.')).toBeInTheDocument();
  });

  it('should call updateAgentProfile and onSaved on successful save', async () => {
    const user = userEvent.setup();
    const onSaved = jest.fn();
    const onClose = jest.fn();
    renderModal(makeProfile(), onClose, onSaved);

    // Wait for full profile fetch
    await waitFor(() => {
      expect(mockGenAiContextValue.apiState.api.getAgentProfile).toHaveBeenCalledWith(
        { id: 'test-uuid' },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    const nameInput = screen.getByTestId('edit-agent-profile-name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Name');

    await user.click(screen.getByTestId('edit-agent-profile-save-button'));

    await waitFor(() => {
      expect(mockGenAiContextValue.apiState.api.updateAgentProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-uuid',
          resourceVersion: 'rv-123',
          spec: expect.objectContaining({ displayName: 'Updated Name' }),
        }),
      );
      expect(onSaved).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
