/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TranscriptionModelSection from '~/app/Chatbot/components/settingsPanelTabs/TranscriptionModelSection';
import { useChatbotConfigStore, DEFAULT_CONFIG_ID } from '~/app/Chatbot/store';
import { DEFAULT_CONFIGURATION } from '~/app/Chatbot/store/types';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import { AIModel } from '~/app/types';

jest.mock('@odh-dashboard/internal/components/FieldGroupHelpLabelIcon', () => ({
  __esModule: true,
  default: ({ content }: { content: string }) => <span>{content}</span>,
}));

const mockAsrModel = {
  model_id: 'whisper-large-v3',
  model_name: 'whisper-large-v3',
  display_name: 'Whisper Large V3',
  model_source_type: 'namespace',
  capabilities: ['audio-transcription'],
  serving_runtime: 'vllm',
  api_protocol: 'REST',
  version: '1',
  usecase: 'asr',
  description: '',
  endpoints: ['http://whisper:80'],
  status: 'Running',
  sa_token: { name: '', token_name: '', token: '' },
} as AIModel;

const mockAsrModel2 = {
  model_id: 'whisper-small',
  model_name: 'whisper-small',
  display_name: 'Whisper Small',
  model_source_type: 'namespace',
  capabilities: ['audio-transcription'],
  serving_runtime: 'vllm',
  api_protocol: 'REST',
  version: '1',
  usecase: 'asr',
  description: '',
  endpoints: ['http://whisper-small:80'],
  status: 'Running',
  sa_token: { name: '', token_name: '', token: '' },
} as AIModel;

const mockChatModel = {
  model_id: 'llama-3-8b',
  model_name: 'llama-3-8b',
  display_name: 'Llama 3 8B',
  model_source_type: 'namespace',
  capabilities: [],
  serving_runtime: 'vllm',
  api_protocol: 'REST',
  version: '1',
  usecase: 'llm',
  description: '',
  endpoints: ['http://llama:8080'],
  status: 'Running',
  sa_token: { name: '', token_name: '', token: '' },
} as AIModel;

const baseContextValue = {
  lsdStatus: null,
  modelsLoaded: true,
  lsdStatusLoaded: true,
  aiModels: [mockChatModel, mockAsrModel, mockAsrModel2],
  aiModelsLoaded: true,
  aiModelsError: undefined,
  maasModels: [],
  maasModelsLoaded: true,
  maasModelsError: undefined,
  models: [],
  modelsError: undefined,
  lsdStatusError: undefined,
  nemoGuardrailsStatus: null,
  nemoGuardrailsStatusLoaded: true,
  nemoGuardrailsStatusError: undefined,
  refresh: jest.fn(),
  lastInput: '',
  setLastInput: jest.fn(),
};

const renderWithContext = (
  contextOverrides: Partial<React.ContextType<typeof ChatbotContext>> = {},
  configId = DEFAULT_CONFIG_ID,
) =>
  render(
    <ChatbotContext.Provider
      value={
        { ...baseContextValue, ...contextOverrides } as React.ContextType<typeof ChatbotContext>
      }
    >
      <TranscriptionModelSection configId={configId} />
    </ChatbotContext.Provider>,
  );

describe('TranscriptionModelSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
      useChatbotConfigStore.setState({
        configurations: { [DEFAULT_CONFIG_ID]: { ...DEFAULT_CONFIGURATION } },
        configIds: [DEFAULT_CONFIG_ID],
      });
    });
  });

  describe('State 1: Add button (not enabled)', () => {
    it('renders add button when ASR is not enabled', () => {
      renderWithContext();
      expect(screen.getByTestId('add-transcription-model-btn')).toBeInTheDocument();
      expect(screen.queryByTestId('asr-model-selector-toggle')).not.toBeInTheDocument();
    });

    it('enables ASR section when add button is clicked', async () => {
      const user = userEvent.setup();
      renderWithContext();

      await user.click(screen.getByTestId('add-transcription-model-btn'));

      const state = useChatbotConfigStore.getState();
      expect(state.configurations[DEFAULT_CONFIG_ID]?.isAsrModelEnabled).toBe(true);
    });

    it('disables the add button with aria-disabled when no ASR models exist', () => {
      renderWithContext({ aiModels: [mockChatModel] });
      const btn = screen.getByTestId('add-transcription-model-btn');
      expect(btn).toHaveAttribute('aria-disabled', 'true');
    });

    it('does not enable section when clicking disabled add button (N=0)', async () => {
      const user = userEvent.setup();
      renderWithContext({ aiModels: [mockChatModel] });

      await user.click(screen.getByTestId('add-transcription-model-btn'));

      const state = useChatbotConfigStore.getState();
      expect(state.configurations[DEFAULT_CONFIG_ID]?.isAsrModelEnabled).toBe(false);
    });
  });

  describe('State 2: Enabled with models available', () => {
    beforeEach(() => {
      act(() => {
        useChatbotConfigStore.getState().updateAsrModelEnabled(DEFAULT_CONFIG_ID, true);
      });
    });

    it('renders the dropdown when enabled', () => {
      renderWithContext();
      expect(screen.getByTestId('asr-model-selector-toggle')).toBeInTheDocument();
    });

    it('renders the remove button when enabled', () => {
      renderWithContext();
      expect(screen.getByTestId('remove-transcription-model-btn')).toBeInTheDocument();
    });

    it('shows model options in dropdown', async () => {
      const user = userEvent.setup();
      renderWithContext();

      await user.click(screen.getByTestId('asr-model-selector-toggle'));
      expect(screen.getByTestId('asr-model-option-whisper-large-v3')).toBeInTheDocument();
      expect(screen.getByTestId('asr-model-option-whisper-small')).toBeInTheDocument();
    });

    it('selects a model and updates store', async () => {
      const user = userEvent.setup();
      renderWithContext();

      await user.click(screen.getByTestId('asr-model-selector-toggle'));
      await user.click(screen.getByText('Whisper Large V3'));

      const state = useChatbotConfigStore.getState();
      expect(state.configurations[DEFAULT_CONFIG_ID]?.selectedAsrModel).toBe('whisper-large-v3');
    });

    it('shows helper text with chat model name after selection', () => {
      act(() => {
        useChatbotConfigStore.getState().updateSelectedModel(DEFAULT_CONFIG_ID, 'llama-3-8b');
        useChatbotConfigStore
          .getState()
          .updateSelectedAsrModel(DEFAULT_CONFIG_ID, 'whisper-large-v3');
      });

      renderWithContext();
      expect(screen.getByText(/Audio is transcribed to text/)).toBeInTheDocument();
    });

    it('removes the section and clears selection', async () => {
      const user = userEvent.setup();
      act(() => {
        useChatbotConfigStore
          .getState()
          .updateSelectedAsrModel(DEFAULT_CONFIG_ID, 'whisper-large-v3');
      });
      renderWithContext();

      await user.click(screen.getByTestId('remove-transcription-model-btn'));

      const state = useChatbotConfigStore.getState();
      expect(state.configurations[DEFAULT_CONFIG_ID]?.isAsrModelEnabled).toBe(false);
      expect(state.configurations[DEFAULT_CONFIG_ID]?.selectedAsrModel).toBe('');
    });
  });

  describe('State 2b: Enabled with no models available', () => {
    beforeEach(() => {
      act(() => {
        useChatbotConfigStore.getState().updateAsrModelEnabled(DEFAULT_CONFIG_ID, true);
      });
    });

    it('shows empty state message when no ASR models', () => {
      renderWithContext({ aiModels: [mockChatModel] });
      expect(screen.getByText(/No ASR models available/)).toBeInTheDocument();
    });

    it('disables the dropdown when no ASR models', () => {
      renderWithContext({ aiModels: [mockChatModel] });
      const toggle = screen.getByTestId('asr-model-selector-toggle');
      expect(toggle).toBeDisabled();
    });
  });

  describe('auto-select and stale detection', () => {
    it('auto-selects when only one ASR model is available', () => {
      act(() => {
        useChatbotConfigStore.getState().updateAsrModelEnabled(DEFAULT_CONFIG_ID, true);
      });

      renderWithContext({ aiModels: [mockChatModel, mockAsrModel] });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations[DEFAULT_CONFIG_ID]?.selectedAsrModel).toBe('whisper-large-v3');
    });

    it('shows stale warning when selected model is no longer available', () => {
      act(() => {
        useChatbotConfigStore.getState().updateAsrModelEnabled(DEFAULT_CONFIG_ID, true);
        useChatbotConfigStore.getState().updateSelectedAsrModel(DEFAULT_CONFIG_ID, 'removed-model');
      });

      renderWithContext();

      expect(
        screen.getByText(/Previously selected model is no longer available/),
      ).toBeInTheDocument();
    });

    it('clears stale model from store when detected', () => {
      act(() => {
        useChatbotConfigStore.getState().updateAsrModelEnabled(DEFAULT_CONFIG_ID, true);
        useChatbotConfigStore.getState().updateSelectedAsrModel(DEFAULT_CONFIG_ID, 'removed-model');
      });

      renderWithContext();

      const state = useChatbotConfigStore.getState();
      expect(state.configurations[DEFAULT_CONFIG_ID]?.selectedAsrModel).toBe('');
    });

    it('clears stale model when ALL ASR models are removed', () => {
      act(() => {
        useChatbotConfigStore.getState().updateAsrModelEnabled(DEFAULT_CONFIG_ID, true);
        useChatbotConfigStore
          .getState()
          .updateSelectedAsrModel(DEFAULT_CONFIG_ID, 'whisper-large-v3');
      });

      renderWithContext({ aiModels: [mockChatModel] });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations[DEFAULT_CONFIG_ID]?.selectedAsrModel).toBe('');
      expect(
        screen.getByText(/Previously selected model is no longer available/),
      ).toBeInTheDocument();
    });

    it('clears stale warning when auto-selecting after stale detection', () => {
      act(() => {
        useChatbotConfigStore.getState().updateAsrModelEnabled(DEFAULT_CONFIG_ID, true);
        useChatbotConfigStore.getState().updateSelectedAsrModel(DEFAULT_CONFIG_ID, 'removed-model');
      });

      renderWithContext({ aiModels: [mockChatModel, mockAsrModel] });

      expect(
        screen.queryByText(/Previously selected model is no longer available/),
      ).not.toBeInTheDocument();
      const state = useChatbotConfigStore.getState();
      expect(state.configurations[DEFAULT_CONFIG_ID]?.selectedAsrModel).toBe('whisper-large-v3');
    });
  });

  describe('loading state', () => {
    it('shows spinner when models are loading', () => {
      renderWithContext({ aiModelsLoaded: false });
      expect(screen.getByTestId('transcription-model-loading')).toBeInTheDocument();
    });
  });

  describe('preview mode', () => {
    it('should disable the add button when isPreview is true', () => {
      useChatbotConfigStore.getState().updatePreviewMode(DEFAULT_CONFIG_ID, true);
      renderWithContext({ aiModels: [mockChatModel, mockAsrModel] });

      expect(screen.getByTestId('add-transcription-model-btn')).toHaveAttribute(
        'aria-disabled',
        'true',
      );

      useChatbotConfigStore.getState().updatePreviewMode(DEFAULT_CONFIG_ID, false);
    });

    it('should disable the selector and remove button when enabled and isPreview is true', () => {
      act(() => {
        useChatbotConfigStore.getState().updateAsrModelEnabled(DEFAULT_CONFIG_ID, true);
        useChatbotConfigStore
          .getState()
          .updateSelectedAsrModel(DEFAULT_CONFIG_ID, 'whisper-large-v3');
        useChatbotConfigStore.getState().updatePreviewMode(DEFAULT_CONFIG_ID, true);
      });

      renderWithContext({ aiModels: [mockChatModel, mockAsrModel] });

      expect(screen.getByTestId('asr-model-selector-toggle')).toBeDisabled();
      expect(screen.getByTestId('remove-transcription-model-btn')).toBeDisabled();

      useChatbotConfigStore.getState().updatePreviewMode(DEFAULT_CONFIG_ID, false);
    });
  });
});
