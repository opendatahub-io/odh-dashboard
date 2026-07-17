/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import PromptAssistantFormGroup from '~/app/Chatbot/components/PromptAssistantFormGroup';
import { MLflowPromptVersion } from '~/app/types';
import * as chatbotStore from '~/app/Chatbot/store';
import * as usePlaygroundStore from '~/app/Chatbot/store/usePlaygroundStore';

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

jest.mock('~/app/components/SafeNavigationBlocker', () => ({
  __esModule: true,
  default: () => null,
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
  scope: { type: 'global', namespace: 'rhoai-templates', read_only: true },
};

const mockGlobalEditablePrompt: MLflowPromptVersion = {
  name: 'global-editable-prompt',
  version: 1,
  template: 'You are an editable global template.',
  commit_message: 'Editable template',
  tags: {},
  created_at: '2024-01-20T12:00:00Z',
  updated_at: '2024-01-20T12:00:00Z',
  scope: { type: 'global', namespace: 'shared-team-prompts', read_only: false },
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

describe('PromptAssistantFormGroup', () => {
  const defaultProps = {
    systemInstruction: 'You are a helpful assistant.',
    onSystemInstructionChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    const useChatbotConfigStoreMock = jest.mocked(chatbotStore.useChatbotConfigStore);
    const selectActivePromptMock = jest.mocked(chatbotStore.selectActivePrompt);
    const selectDirtyPromptMock = jest.mocked(chatbotStore.selectDirtyPrompt);
    const selectVariableValuesMock = jest.mocked(chatbotStore.selectVariableValues);
    useChatbotConfigStoreMock.mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector({
          configurations: {},
          configIds: [],
          profileApplied: false,
          loadedProfileId: null,
          loadedProfileDisplayName: null,
          loadedProfileDescription: null,
          loadedProfileSpec: null,
          loadedResourceVersion: null,
          loadedProfileWarnings: null,
          loadedProfilePrompt: null,
          removeConfiguration: jest.fn(),
          duplicateConfiguration: jest.fn(),
          updateSystemInstruction: jest.fn(),
          updateTemperature: jest.fn(),
          updateStreamingEnabled: jest.fn(),
          updateSelectedModel: jest.fn(),
          updateSelectedMcpServerIds: jest.fn(),
          getToolSelections: jest.fn(),
          saveToolSelections: jest.fn(),
          updateGuardrail: jest.fn(),
          updateGuardrailUserInputEnabled: jest.fn(),
          updateGuardrailModelOutputEnabled: jest.fn(),
          updateGuardrailSubscription: jest.fn(),
          updateSelectedSubscription: jest.fn(),
          updateSelectedAsrModel: jest.fn(),
          updateSelectedAsrSubscription: jest.fn(),
          updateAsrModelEnabled: jest.fn(),
          updateHasVisionImage: jest.fn(),
          updateRagEnabled: jest.fn(),
          updateKnowledgeMode: jest.fn(),
          updateSelectedVectorStoreId: jest.fn(),
          updateActivePrompt: jest.fn(),
          updateDirtyPrompt: jest.fn(),
          resetDirtyPrompt: jest.fn(),
          clearPromptState: jest.fn(),
          updateVariableValues: jest.fn(),
          setLoadedProfileSpec: jest.fn(),
          setLoadedResourceVersion: jest.fn(),
          setLoadedProfileWarnings: jest.fn(),
          setLoadedProfilePrompt: jest.fn(),
          resetConfiguration: jest.fn(),
          applyAgentProfile: jest.fn(),
          getConfiguration: jest.fn(),
          getPromptSourceType: jest.fn(),
        });
      }
      return undefined;
    });

    selectActivePromptMock.mockReturnValue(() => null);
    selectDirtyPromptMock.mockReturnValue(() => null);
    selectVariableValuesMock.mockReturnValue(() => ({}));
    const usePlaygroundStoreMock = jest.mocked(usePlaygroundStore.usePlaygroundStore);
    usePlaygroundStoreMock.mockReturnValue({
      openModal: jest.fn(),
    });
  });

  describe('Scope label', () => {
    describe('Project prompt label', () => {
      it('should show Project label for project prompts', () => {
        const selectActivePrompt = jest.mocked(chatbotStore.selectActivePrompt);
        selectActivePrompt.mockReturnValue(() => mockProjectPrompt);

        render(<PromptAssistantFormGroup {...defaultProps} />);

        const scopeLabel = screen.getByTestId('prompt-scope-label');
        expect(scopeLabel).toHaveTextContent('Project');
      });

      it('should use blue color for Project label', () => {
        const selectActivePrompt = jest.mocked(chatbotStore.selectActivePrompt);
        selectActivePrompt.mockReturnValue(() => mockProjectPrompt);

        render(<PromptAssistantFormGroup {...defaultProps} />);

        const scopeLabel = screen.getByTestId('prompt-scope-label');
        expect(scopeLabel).toHaveClass('pf-m-blue');
      });
    });

    describe('Global prompt label', () => {
      it('should show Global label for global prompts', () => {
        const selectActivePrompt = jest.mocked(chatbotStore.selectActivePrompt);
        selectActivePrompt.mockReturnValue(() => mockGlobalPrompt);

        render(<PromptAssistantFormGroup {...defaultProps} />);

        const scopeLabel = screen.getByTestId('prompt-scope-label');
        expect(scopeLabel).toHaveTextContent('Global');
      });

      it('should use orange color for Global label', () => {
        const selectActivePrompt = jest.mocked(chatbotStore.selectActivePrompt);
        selectActivePrompt.mockReturnValue(() => mockGlobalPrompt);

        render(<PromptAssistantFormGroup {...defaultProps} />);

        const scopeLabel = screen.getByTestId('prompt-scope-label');
        expect(scopeLabel).toHaveClass('pf-m-orange');
      });
    });

    describe('No scope label', () => {
      it('should not show label when no active prompt', () => {
        const selectActivePrompt = jest.mocked(chatbotStore.selectActivePrompt);
        selectActivePrompt.mockReturnValue(() => null);

        render(<PromptAssistantFormGroup {...defaultProps} />);

        expect(screen.queryByTestId('prompt-scope-label')).not.toBeInTheDocument();
      });

      it('should not show label when prompt has no scope', () => {
        const selectActivePrompt = jest.mocked(chatbotStore.selectActivePrompt);
        selectActivePrompt.mockReturnValue(() => mockPromptWithoutScope);

        render(<PromptAssistantFormGroup {...defaultProps} />);

        expect(screen.queryByTestId('prompt-scope-label')).not.toBeInTheDocument();
      });
    });

    describe('Label positioning', () => {
      it('should appear between prompt name and version label', () => {
        const selectActivePrompt = jest.mocked(chatbotStore.selectActivePrompt);
        const selectDirtyPrompt = jest.mocked(chatbotStore.selectDirtyPrompt);
        selectActivePrompt.mockReturnValue(() => mockProjectPrompt);
        selectDirtyPrompt.mockReturnValue(() => mockProjectPrompt);

        render(<PromptAssistantFormGroup {...defaultProps} />);

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
        const selectActivePrompt = jest.mocked(chatbotStore.selectActivePrompt);
        selectActivePrompt.mockReturnValue(() => mockProjectPrompt);

        render(<PromptAssistantFormGroup {...defaultProps} />);

        const scopeLabel = screen.getByTestId('prompt-scope-label');
        expect(scopeLabel).toHaveClass('pf-m-compact');
      });
    });
  });

  describe('Read-only prompt controls', () => {
    it('should disable Edit button when prompt is read-only', () => {
      const selectActivePrompt = jest.mocked(chatbotStore.selectActivePrompt);
      selectActivePrompt.mockReturnValue(() => mockGlobalPrompt);

      render(<PromptAssistantFormGroup {...defaultProps} />);

      expect(screen.getByTestId('prompt-edit-button')).toBeDisabled();
    });

    it('should enable Edit button when prompt is not read-only', () => {
      const selectActivePrompt = jest.mocked(chatbotStore.selectActivePrompt);
      selectActivePrompt.mockReturnValue(() => mockGlobalEditablePrompt);

      render(<PromptAssistantFormGroup {...defaultProps} />);

      expect(screen.getByTestId('prompt-edit-button')).not.toBeDisabled();
    });

    it('should enable Edit button for project prompts', () => {
      const selectActivePrompt = jest.mocked(chatbotStore.selectActivePrompt);
      selectActivePrompt.mockReturnValue(() => mockProjectPrompt);

      render(<PromptAssistantFormGroup {...defaultProps} />);

      expect(screen.getByTestId('prompt-edit-button')).not.toBeDisabled();
    });
  });
});
