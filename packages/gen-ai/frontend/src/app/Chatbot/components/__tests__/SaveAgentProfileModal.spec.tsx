/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GenAiContext } from '~/app/context/GenAiContext';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import SaveAgentProfileModal from '~/app/Chatbot/components/SaveAgentProfileModal';
import { mockGenAiContextValue } from '~/__mocks__/mockGenAiContext';
import { useChatbotConfigStore, DEFAULT_CONFIG_ID } from '~/app/Chatbot/store';
import { DEFAULT_CONFIGURATION } from '~/app/Chatbot/store/types';
import { usePromptEdited } from '~/app/Chatbot/hooks/usePromptEdited';

jest.mock('@openshift/dynamic-plugin-sdk', () => ({
  useFeatureFlag: jest.fn(() => [false]),
}));

jest.mock('~/app/hooks/useGenAiAPI', () => ({
  useGenAiAPI: jest.fn(() => ({
    api: mockGenAiContextValue.apiState.api,
    apiAvailable: true,
  })),
}));

jest.mock('~/app/hooks/useFetchAAEVectorStores', () => ({
  __esModule: true,
  default: jest.fn(() => ({ data: [] })),
}));

jest.mock('~/app/Chatbot/hooks/usePromptEdited', () => ({
  usePromptEdited: jest.fn(() => false),
}));

const mockOnClose = jest.fn();
const mockOnSaved = jest.fn();

const genAiContextValue = {
  namespace: { name: 'test-namespace', displayName: 'Test' },
  apiState: mockGenAiContextValue.apiState,
  refreshAPIState: jest.fn(),
};

const chatbotContextValue = {
  models: [],
  modelsLoaded: true,
  modelsError: undefined,
  aiModels: [],
  aiModelsLoaded: true,
  aiModelsError: undefined,
  maasModels: [],
  maasModelsLoaded: true,
  maasModelsError: undefined,
  lsdStatus: null,
  lsdStatusLoaded: true,
  lsdStatusError: undefined,
  refresh: jest.fn(),
  lastInput: '',
  setLastInput: jest.fn(),
};

const renderModal = (mode: 'save-as' | 'save' = 'save-as') =>
  render(
    <GenAiContext.Provider value={genAiContextValue as never}>
      <ChatbotContext.Provider value={chatbotContextValue as never}>
        <SaveAgentProfileModal
          mode={mode}
          mcpServers={[]}
          mcpConfigMapName={null}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
        />
      </ChatbotContext.Provider>
    </GenAiContext.Provider>,
  );

describe('SaveAgentProfileModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useChatbotConfigStore.setState({
      configurations: { [DEFAULT_CONFIG_ID]: { ...DEFAULT_CONFIGURATION } },
      configIds: [DEFAULT_CONFIG_ID],
      profileApplied: false,
      loadedProfileId: null,
      loadedProfileDisplayName: null,
      loadedProfileDescription: null,
      loadedResourceVersion: null,
    });
    jest.mocked(mockGenAiContextValue.apiState.api.createAgentProfile).mockResolvedValue({
      profileId: 'new-uuid',
      name: 'agent-profile-new-uuid',
      displayName: 'Test Agent',
      namespace: 'test-namespace',
      resourceVersion: 'rv-1',
    } as never);
    jest.mocked(mockGenAiContextValue.apiState.api.updateAgentProfile).mockResolvedValue({
      profileId: 'existing-uuid',
      name: 'agent-profile-existing-uuid',
      displayName: 'My Agent',
      namespace: 'test-namespace',
      resourceVersion: 'rv-2',
    } as never);
    jest.mocked(mockGenAiContextValue.apiState.api.getAgentProfile).mockResolvedValue({
      apiVersion: 'genai.redhat.com/v1alpha1',
      kind: 'AgentProfile',
      metadata: { name: 'agent-profile-existing-uuid', resourceVersion: 'rv-1' },
      spec: {
        displayName: 'Test Agent',
        model: { id: 'llama-3b', uri: 'http://llama/v1', sourceType: 'namespace' },
        temperature: 0.7,
        stream: true,
      },
    } as never);
  });

  describe('Save As mode', () => {
    it('should render with empty name field', () => {
      renderModal('save-as');
      expect(screen.getByText('Save as agent configuration')).toBeInTheDocument();
      expect(screen.getByTestId('save-agent-profile-name-input')).toHaveValue('');
    });

    it('should show name required error only after blur', async () => {
      const user = userEvent.setup();
      renderModal('save-as');
      const nameInput = screen.getByTestId('save-agent-profile-name-input');

      expect(screen.queryByText('Name is required.')).not.toBeInTheDocument();
      await user.click(nameInput);
      await user.tab();
      expect(screen.getByText('Name is required.')).toBeInTheDocument();
    });

    it('should call createAgentProfile and onSaved on successful save', async () => {
      const user = userEvent.setup();
      renderModal('save-as');

      await user.type(screen.getByTestId('save-agent-profile-name-input'), 'Test Agent');
      await user.click(screen.getByTestId('save-agent-profile-submit-button'));

      await waitFor(() => {
        expect(mockGenAiContextValue.apiState.api.createAgentProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            spec: expect.objectContaining({ displayName: 'Test Agent' }),
          }),
        );
        expect(mockOnSaved).toHaveBeenCalledWith('new-uuid', 'Test Agent', '');
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it('should show error message when save fails', async () => {
      jest
        .mocked(mockGenAiContextValue.apiState.api.createAgentProfile)
        .mockRejectedValue(new Error('Server error'));
      const user = userEvent.setup();
      renderModal('save-as');

      await user.type(screen.getByTestId('save-agent-profile-name-input'), 'Test Agent');
      await user.click(screen.getByTestId('save-agent-profile-submit-button'));

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should call onClose when Cancel is clicked', async () => {
      const user = userEvent.setup();
      renderModal('save-as');
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Save mode', () => {
    it('should pre-fill the name from loadedProfileDisplayName', () => {
      useChatbotConfigStore.setState({
        configurations: { [DEFAULT_CONFIG_ID]: { ...DEFAULT_CONFIGURATION } },
        configIds: [DEFAULT_CONFIG_ID],
        profileApplied: true,
        loadedProfileId: 'existing-uuid',
        loadedProfileDisplayName: 'My Agent',
        loadedProfileDescription: null,
      });
      renderModal('save');
      expect(screen.getByText('Save agent configuration')).toBeInTheDocument();
      expect(screen.getByTestId('save-agent-profile-name-input')).toHaveValue('My Agent');
    });

    it('should pre-fill the description from loadedProfileDescription', () => {
      useChatbotConfigStore.setState({
        configurations: { [DEFAULT_CONFIG_ID]: { ...DEFAULT_CONFIGURATION } },
        configIds: [DEFAULT_CONFIG_ID],
        profileApplied: true,
        loadedProfileId: 'existing-uuid',
        loadedProfileDisplayName: 'My Agent',
        loadedProfileDescription: 'Helpful code reviewer',
      });
      renderModal('save');
      expect(screen.getByTestId('save-agent-profile-description-input')).toHaveValue(
        'Helpful code reviewer',
      );
    });

    it('should call updateAgentProfile with stored resourceVersion on submit', async () => {
      useChatbotConfigStore.setState({
        configurations: { [DEFAULT_CONFIG_ID]: { ...DEFAULT_CONFIGURATION } },
        configIds: [DEFAULT_CONFIG_ID],
        profileApplied: true,
        loadedProfileId: 'existing-uuid',
        loadedProfileDisplayName: 'My Agent',
        loadedProfileDescription: null,
        loadedResourceVersion: 'rv-stored',
      });
      const user = userEvent.setup();
      renderModal('save');

      await user.click(screen.getByTestId('save-agent-profile-submit-button'));

      await waitFor(() => {
        expect(mockGenAiContextValue.apiState.api.getAgentProfile).not.toHaveBeenCalled();
        expect(mockGenAiContextValue.apiState.api.updateAgentProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'existing-uuid',
            resourceVersion: 'rv-stored',
          }),
        );
        expect(mockOnSaved).toHaveBeenCalledWith('existing-uuid', 'My Agent', '');
      });
    });

    it('should show conflict alert when updateAgentProfile returns 409', async () => {
      const conflictError = Object.assign(new Error('object has been modified'), {
        code: 'conflict',
      });
      jest
        .mocked(mockGenAiContextValue.apiState.api.updateAgentProfile)
        .mockRejectedValue(conflictError);
      useChatbotConfigStore.setState({
        configurations: { [DEFAULT_CONFIG_ID]: { ...DEFAULT_CONFIGURATION } },
        configIds: [DEFAULT_CONFIG_ID],
        profileApplied: true,
        loadedProfileId: 'existing-uuid',
        loadedProfileDisplayName: 'My Agent',
        loadedProfileDescription: null,
        loadedResourceVersion: 'rv-stale',
      });
      const user = userEvent.setup();
      renderModal('save');

      await user.click(screen.getByTestId('save-agent-profile-submit-button'));

      await waitFor(() => {
        expect(screen.getByTestId('save-conflict-alert')).toBeInTheDocument();
      });
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should show conflict alert when updateAgentProfile returns 404', async () => {
      const notFoundError = Object.assign(new Error('the requested resource could not be found'), {
        code: '404',
      });
      jest
        .mocked(mockGenAiContextValue.apiState.api.updateAgentProfile)
        .mockRejectedValue(notFoundError);
      useChatbotConfigStore.setState({
        configurations: { [DEFAULT_CONFIG_ID]: { ...DEFAULT_CONFIGURATION } },
        configIds: [DEFAULT_CONFIG_ID],
        profileApplied: true,
        loadedProfileId: 'existing-uuid',
        loadedProfileDisplayName: 'My Agent',
        loadedProfileDescription: null,
        loadedResourceVersion: 'rv-stored',
      });
      const user = userEvent.setup();
      renderModal('save');

      await user.click(screen.getByTestId('save-agent-profile-submit-button'));

      await waitFor(() => {
        expect(screen.getByTestId('save-conflict-alert')).toBeInTheDocument();
      });
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('isPromptDirty path', () => {
    it('should register prompt before saving when prompt has unsaved edits', async () => {
      jest.mocked(usePromptEdited).mockReturnValue(true);
      jest
        .mocked(mockGenAiContextValue.apiState.api.listMLflowPromptVersions)
        .mockResolvedValue({ versions: [{ version: 2 }] } as never);
      jest.mocked(mockGenAiContextValue.apiState.api.registerMLflowPrompt).mockResolvedValue({
        name: 'my-prompt',
        version: 3,
        template: 'You are a helpful assistant.',
        created_at: '',
        updated_at: '',
      } as never);

      useChatbotConfigStore.setState({
        configurations: {
          [DEFAULT_CONFIG_ID]: {
            ...DEFAULT_CONFIGURATION,
            activePrompt: {
              name: 'my-prompt',
              version: 2,
              template: 'Old text',
              created_at: '',
              updated_at: '',
            },
            systemInstruction: 'You are a helpful assistant.',
          },
        },
        configIds: [DEFAULT_CONFIG_ID],
        profileApplied: false,
        loadedProfileId: null,
        loadedProfileDisplayName: null,
        loadedProfileDescription: null,
      });

      const user = userEvent.setup();
      renderModal('save-as');

      await user.type(screen.getByTestId('save-agent-profile-name-input'), 'Test Agent');
      await user.click(screen.getByTestId('save-agent-profile-submit-button'));

      await waitFor(() => {
        expect(mockGenAiContextValue.apiState.api.registerMLflowPrompt).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'my-prompt',
            template: 'You are a helpful assistant.',
          }),
        );
        expect(mockGenAiContextValue.apiState.api.createAgentProfile).toHaveBeenCalled();
      });
    });
  });
});
