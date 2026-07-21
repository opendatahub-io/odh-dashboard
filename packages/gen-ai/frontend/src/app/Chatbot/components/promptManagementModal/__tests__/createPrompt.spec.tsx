/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreatePrompt from '~/app/Chatbot/components/promptManagementModal/createPrompt';
import * as chatbotStore from '~/app/Chatbot/store';
import * as usePlaygroundStoreModule from '~/app/Chatbot/store/usePlaygroundStore';
import { MLflowPromptVersion } from '~/app/types';

jest.mock('~/app/utilities/const', () => ({
  URL_PREFIX: '/gen-ai',
  DEPLOYMENT_MODE: 'federated',
  MCP_SERVERS_SESSION_STORAGE_KEY: 'gen-ai-playground-servers',
}));

jest.mock('~/app/Chatbot/store', () => ({
  useChatbotConfigStore: jest.fn(),
  selectDirtyPrompt: jest.fn(),
  DEFAULT_CONFIG_ID: 'default',
}));

jest.mock('~/app/Chatbot/store/usePlaygroundStore', () => ({
  usePlaygroundStore: jest.fn(),
}));

jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: jest.fn(() => ({
    success: jest.fn(),
    error: jest.fn(),
  })),
}));

const mockRegisterMLflowPrompt = jest.fn();

jest.mock('~/app/hooks/useGenAiAPI', () => ({
  useGenAiAPI: jest.fn(() => ({
    api: {
      registerMLflowPrompt: mockRegisterMLflowPrompt,
      listMLflowPromptVersions: jest.fn(),
    },
    apiAvailable: true,
  })),
}));

jest.mock('~/app/context/GenAiContext', () => {
  const ActualReact = jest.requireActual('react');
  return {
    GenAiContext: ActualReact.createContext({ namespace: { name: 'my-project' } }),
  };
});

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

const mockGlobalDirtyPrompt: MLflowPromptVersion = {
  name: 'Copy of global-template',
  version: 0,
  template: 'You are a helpful assistant with global knowledge.',
  commit_message: '',
  tags: {},
  created_at: '2024-01-20T12:00:00Z',
  updated_at: '2024-01-20T12:00:00Z',
  scope: { type: 'global', namespace: 'rhoai-templates' },
};

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('CreatePrompt - Save As mode', () => {
  const mockCloseModal = jest.fn();
  const mockUpdateDirtyPrompt = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    const usePlaygroundStoreMock = jest.mocked(usePlaygroundStoreModule.usePlaygroundStore);
    usePlaygroundStoreMock.mockReturnValue({
      modalMode: 'save-as',
      closeModal: mockCloseModal,
    });

    const useChatbotConfigStoreMock = jest.mocked(chatbotStore.useChatbotConfigStore);
    const selectDirtyPromptMock = jest.mocked(chatbotStore.selectDirtyPrompt);
    selectDirtyPromptMock.mockReturnValue(() => mockGlobalDirtyPrompt);

    useChatbotConfigStoreMock.mockImplementation((selector) => {
      if (typeof selector === 'function') {
        const mockState = {
          updateActivePrompt: jest.fn(),
          updateDirtyPrompt: mockUpdateDirtyPrompt,
          updateSystemInstruction: jest.fn(),
        };
        return selector(mockState as never);
      }
      return undefined;
    });
  });

  it('should show "Save As" button text in save-as mode', () => {
    renderWithQueryClient(
      <CreatePrompt
        configId="default"
        displayText={{ title: 'Save prompt as', description: 'Save as new prompt' }}
        onClose={jest.fn()}
      />,
    );

    const saveButton = screen.getByTestId('prompt-save-button');
    expect(saveButton).toHaveTextContent('Save As');
  });

  it('should have editable name field in save-as mode', () => {
    renderWithQueryClient(
      <CreatePrompt
        configId="default"
        displayText={{ title: 'Save prompt as', description: 'Save as new prompt' }}
        onClose={jest.fn()}
      />,
    );

    const nameInput = screen.getByTestId('prompt-name-input');
    expect(nameInput).not.toHaveAttribute('readonly');
  });

  it('should not show version field in save-as mode', () => {
    renderWithQueryClient(
      <CreatePrompt
        configId="default"
        displayText={{ title: 'Save prompt as', description: 'Save as new prompt' }}
        onClose={jest.fn()}
      />,
    );

    expect(screen.queryByTestId('prompt-version-field')).not.toBeInTheDocument();
  });

  it('should submit with create_only=true in save-as mode', async () => {
    mockRegisterMLflowPrompt.mockResolvedValueOnce(mockGlobalDirtyPrompt);

    renderWithQueryClient(
      <CreatePrompt
        configId="default"
        displayText={{ title: 'Save prompt as', description: 'Save as new prompt' }}
        onClose={jest.fn()}
      />,
    );

    await act(async () => {
      screen.getByTestId('prompt-save-button').click();
    });

    expect(mockRegisterMLflowPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        create_only: true,
        name: 'Copy of global-template',
      }),
    );
  });
});
