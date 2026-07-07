/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import PromptAssistantFormGroup from '~/app/Chatbot/components/PromptAssistantFormGroup';
import { MLflowPromptVersion } from '~/app/types';

jest.mock('~/app/utilities/const', () => ({
  URL_PREFIX: '/gen-ai',
  DEPLOYMENT_MODE: 'federated',
  MCP_SERVERS_SESSION_STORAGE_KEY: 'gen-ai-playground-servers',
}));

jest.mock('~/app/Chatbot/store', () => ({
  useChatbotConfigStore: jest.fn(),
  selectActivePrompt: jest.fn(),
  selectDirtyPrompt: jest.fn(),
  selectVariableValues: jest.fn(),
  selectIsPreview: jest.fn(),
  DEFAULT_CONFIG_ID: 'default',
}));

jest.mock('~/app/Chatbot/store/usePlaygroundStore', () => ({
  usePlaygroundStore: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

jest.mock('~/app/Chatbot/hooks/useConfirmation', () => ({
  useConfirmation: jest.fn(() => ({
    confirm: jest.fn(),
    modal: null,
  })),
}));

jest.mock('~/app/Chatbot/hooks/usePromptEdited', () => ({
  usePromptEdited: jest.fn(() => false),
}));

jest.mock('~/app/hooks/useSafeBrowserUnloadBlocker', () => ({
  useSafeBrowserUnloadBlocker: jest.fn(),
}));

const mockProjectPrompt: MLflowPromptVersion = {
  name: 'project-prompt',
  version: 1,
  template: 'You are a helpful assistant.',
  commit_message: 'Initial version',
  tags: {},
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  scope: { type: 'project', namespace: 'my-project' },
};

const mockGlobalPrompt: MLflowPromptVersion = {
  name: 'global-prompt',
  version: 2,
  template: 'You are a starter template.',
  commit_message: 'Template created',
  tags: {},
  created_at: '2024-01-20T12:00:00Z',
  updated_at: '2024-01-20T12:00:00Z',
  scope: { type: 'global', namespace: 'rhoai-templates' },
};

const mockPromptWithoutScope: MLflowPromptVersion = {
  name: 'legacy-prompt',
  version: 1,
  template: 'Legacy prompt',
  commit_message: 'Legacy',
  tags: {},
  created_at: '2024-01-01T08:00:00Z',
  updated_at: '2024-01-01T08:00:00Z',
};

describe('PromptAssistantFormGroup - Scope Label', () => {
  const mockStore = configureStore({
    reducer: {
      root: () => ({}),
    },
  });

  const defaultProps = {
    systemInstruction: 'You are a helpful assistant.',
    onSystemInstructionChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    const {
      useChatbotConfigStore,
      selectActivePrompt,
      selectDirtyPrompt,
      selectVariableValues,
      selectIsPreview,
    } = jest.requireMock<typeof import('~/app/Chatbot/store')>('~/app/Chatbot/store');

    useChatbotConfigStore.mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector({
          updateDirtyPrompt: jest.fn(),
          resetDirtyPrompt: jest.fn(),
          clearPromptState: jest.fn(),
          updateVariableValues: jest.fn(),
        });
      }
      return undefined;
    });

    selectActivePrompt.mockReturnValue(() => undefined);
    selectDirtyPrompt.mockReturnValue(() => undefined);
    selectVariableValues.mockReturnValue(() => ({}));
    selectIsPreview.mockReturnValue(() => false);

    const { usePlaygroundStore } = jest.requireMock<
      typeof import('~/app/Chatbot/store/usePlaygroundStore')
    >('~/app/Chatbot/store/usePlaygroundStore');

    usePlaygroundStore.mockReturnValue({
      openModal: jest.fn(),
    });
  });

  describe('Project prompt label', () => {
    it('should show Project label for project prompts', () => {
      const { selectActivePrompt } =
        jest.requireMock<typeof import('~/app/Chatbot/store')>('~/app/Chatbot/store');
      selectActivePrompt.mockReturnValue(() => mockProjectPrompt);

      render(
        <Provider store={mockStore}>
          <PromptAssistantFormGroup {...defaultProps} />
        </Provider>,
      );

      const scopeLabel = screen.getByTestId('prompt-scope-label');
      expect(scopeLabel).toHaveTextContent('Project');
    });

    it('should use blue color for Project label', () => {
      const { selectActivePrompt } =
        jest.requireMock<typeof import('~/app/Chatbot/store')>('~/app/Chatbot/store');
      selectActivePrompt.mockReturnValue(() => mockProjectPrompt);

      render(
        <Provider store={mockStore}>
          <PromptAssistantFormGroup {...defaultProps} />
        </Provider>,
      );

      const scopeLabel = screen.getByTestId('prompt-scope-label');
      expect(scopeLabel).toHaveClass('pf-m-blue');
    });
  });

  describe('Global prompt label', () => {
    it('should show Global label for global prompts', () => {
      const { selectActivePrompt } =
        jest.requireMock<typeof import('~/app/Chatbot/store')>('~/app/Chatbot/store');
      selectActivePrompt.mockReturnValue(() => mockGlobalPrompt);

      render(
        <Provider store={mockStore}>
          <PromptAssistantFormGroup {...defaultProps} />
        </Provider>,
      );

      const scopeLabel = screen.getByTestId('prompt-scope-label');
      expect(scopeLabel).toHaveTextContent('Global');
    });

    it('should use grey color for Global label', () => {
      const { selectActivePrompt } =
        jest.requireMock<typeof import('~/app/Chatbot/store')>('~/app/Chatbot/store');
      selectActivePrompt.mockReturnValue(() => mockGlobalPrompt);

      render(
        <Provider store={mockStore}>
          <PromptAssistantFormGroup {...defaultProps} />
        </Provider>,
      );

      const scopeLabel = screen.getByTestId('prompt-scope-label');
      expect(scopeLabel).toHaveClass('pf-m-grey');
    });
  });

  describe('No scope label', () => {
    it('should not show label when no active prompt', () => {
      const { selectActivePrompt } =
        jest.requireMock<typeof import('~/app/Chatbot/store')>('~/app/Chatbot/store');
      selectActivePrompt.mockReturnValue(() => undefined);

      render(
        <Provider store={mockStore}>
          <PromptAssistantFormGroup {...defaultProps} />
        </Provider>,
      );

      expect(screen.queryByTestId('prompt-scope-label')).not.toBeInTheDocument();
    });

    it('should not show label when prompt has no scope', () => {
      const { selectActivePrompt } =
        jest.requireMock<typeof import('~/app/Chatbot/store')>('~/app/Chatbot/store');
      selectActivePrompt.mockReturnValue(() => mockPromptWithoutScope);

      render(
        <Provider store={mockStore}>
          <PromptAssistantFormGroup {...defaultProps} />
        </Provider>,
      );

      expect(screen.queryByTestId('prompt-scope-label')).not.toBeInTheDocument();
    });
  });

  describe('Label positioning', () => {
    it('should appear between prompt name and version label', () => {
      const { selectActivePrompt, selectDirtyPrompt } =
        jest.requireMock<typeof import('~/app/Chatbot/store')>('~/app/Chatbot/store');
      selectActivePrompt.mockReturnValue(() => mockProjectPrompt);
      selectDirtyPrompt.mockReturnValue(() => mockProjectPrompt);

      render(
        <Provider store={mockStore}>
          <PromptAssistantFormGroup {...defaultProps} />
        </Provider>,
      );

      const promptName = screen.getByTestId('prompt-name-title');
      const scopeLabel = screen.getByTestId('prompt-scope-label');
      const versionLabel = screen.getByTestId('prompt-version-label');

      const flexContainer = promptName.parentElement;
      const children = Array.from(flexContainer?.children || []);

      const nameIndex = children.indexOf(promptName);
      const scopeIndex = children.indexOf(scopeLabel);
      const versionIndex = children.indexOf(versionLabel);

      expect(scopeIndex).toBeGreaterThan(nameIndex);
      expect(scopeIndex).toBeLessThan(versionIndex);
    });

    it('should be compact', () => {
      const { selectActivePrompt } =
        jest.requireMock<typeof import('~/app/Chatbot/store')>('~/app/Chatbot/store');
      selectActivePrompt.mockReturnValue(() => mockProjectPrompt);

      render(
        <Provider store={mockStore}>
          <PromptAssistantFormGroup {...defaultProps} />
        </Provider>,
      );

      const scopeLabel = screen.getByTestId('prompt-scope-label');
      expect(scopeLabel).toHaveClass('pf-m-compact');
    });
  });
});
