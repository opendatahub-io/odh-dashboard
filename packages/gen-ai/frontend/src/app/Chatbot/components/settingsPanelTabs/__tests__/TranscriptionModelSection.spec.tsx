/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import TranscriptionModelSection from '~/app/Chatbot/components/settingsPanelTabs/TranscriptionModelSection';
import { useChatbotConfigStore, DEFAULT_CONFIG_ID } from '~/app/Chatbot/store';
import { DEFAULT_CONFIGURATION } from '~/app/Chatbot/store/types';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import { PLAYGROUND_MULTIMODAL_EVENTS } from '~/app/tracking/playgroundMultimodalTrackingConstants';
import { type AAModelResponse, AIModel } from '~/app/types';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

const mockFireMisc = jest.mocked(fireMiscTrackingEvent);

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
  description: 'Transcribes spoken audio',
  endpoints: ['http://whisper:80'],
  status: 'Running',
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
  description: 'General-purpose chat model',
  endpoints: ['http://llama:8080'],
  status: 'Running',
} as AIModel;

const mockMaaSAsrModel: AAModelResponse = {
  model_id: 'whisper-maas',
  model_name: 'whisper-maas',
  display_name: 'Whisper MaaS',
  description: '',
  endpoints: ['external:https://maas.example.com/avik-gpu-test/whisper-maas'],
  serving_runtime: 'MaaS',
  api_protocol: 'OpenAI',
  version: '',
  usecase: 'asr',
  status: 'Running',
  model_source_type: 'maas',
  capabilities: ['audio-transcription'],
  subscriptions: [
    { name: 'whisper-sub-1', displayName: 'Whisper Subscription 1' },
    { name: 'whisper-sub-2', displayName: 'Whisper Subscription 2' },
  ],
};

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
    <MemoryRouter>
      <ChatbotContext.Provider
        value={
          { ...baseContextValue, ...contextOverrides } as React.ContextType<typeof ChatbotContext>
        }
      >
        <TranscriptionModelSection configId={configId} />
      </ChatbotContext.Provider>
    </MemoryRouter>,
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

  describe('State 1: No model selected', () => {
    it('shows the original bordered add action when tagged models exist', () => {
      renderWithContext();
      expect(screen.getByRole('heading', { name: 'Transcription model' })).toHaveClass('pf-m-lg');
      expect(screen.getByTestId('transcription-model-add-section')).toHaveStyle(
        'text-align: center',
      );
      expect(screen.getByTestId('transcription-model-add-section')).toHaveStyle(
        'border: 1px dashed var(--pf-t--global--border--color--default)',
      );
      expect(screen.getByTestId('transcription-model-add-section')).toHaveStyle(
        'border-radius: var(--pf-t--global--border--radius--small)',
      );
      expect(screen.getByTestId('transcription-model-add-section')).not.toContainElement(
        screen.getByRole('heading', { name: 'Transcription model' }),
      );
      expect(
        screen.getByRole('button', { name: 'Add audio transcription model' }),
      ).toBeInTheDocument();
      expect(screen.queryByTestId('transcription-model-selector')).not.toBeInTheDocument();
    });

    it('shows guidance without opening the picker when no models are available', () => {
      renderWithContext({ aiModels: [] });

      expect(
        screen.getByRole('heading', { name: 'No models available for audio transcription' }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'Deploy a model or ask your administrator to make one available to the Playground.',
        ),
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /View all models/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('enables transcription after selecting a tagged model from the picker', async () => {
      const user = userEvent.setup();
      renderWithContext();

      await user.click(screen.getByTestId('add-transcription-model-btn'));
      await user.click(screen.getByText('Transcribes spoken audio'));

      const state = useChatbotConfigStore.getState();
      expect(state.configurations[DEFAULT_CONFIG_ID]?.isAsrModelEnabled).toBe(true);
      expect(state.configurations[DEFAULT_CONFIG_ID]?.selectedAsrModel).toBe('whisper-large-v3');
    });

    it('shows all models when no models are tagged for audio transcription', async () => {
      const user = userEvent.setup();
      renderWithContext({ aiModels: [mockChatModel] });
      expect(screen.getByRole('heading', { name: 'Transcription model' })).toBeInTheDocument();
      expect(screen.getByTestId('transcription-model-add-section')).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'No models tagged for audio transcription' }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/To enable audio transcription, tag a model with the audio capability in/),
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Model registry' })).toHaveAttribute(
        'href',
        '/ai-hub/models/registry',
      );
      await user.click(
        screen.getByRole('button', { name: 'View all models to select one manually' }),
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      await user.click(screen.getByRole('menuitem', { name: /Llama 3 8B/ }));
      expect(
        useChatbotConfigStore.getState().configurations[DEFAULT_CONFIG_ID]?.selectedAsrModel,
      ).toBe('llama-3-8b');
      expect(screen.getByTestId('transcription-model-selector')).toHaveTextContent('Llama 3 8B');
      expect(screen.getByRole('button', { name: 'View all models' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    });

    it('returns to the no-tagged-models prompt after removing an untagged selection', async () => {
      const user = userEvent.setup();
      renderWithContext({ aiModels: [mockChatModel] });
      await user.click(
        screen.getByRole('button', { name: 'View all models to select one manually' }),
      );
      await user.click(screen.getByRole('menuitem', { name: /Llama 3 8B/ }));
      await user.click(screen.getByRole('button', { name: 'Remove' }));

      expect(
        screen.getByRole('heading', { name: 'No models tagged for audio transcription' }),
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
    });
  });

  describe('State 2: Enabled with models available', () => {
    beforeEach(() => {
      act(() => {
        useChatbotConfigStore.getState().updateAsrModelEnabled(DEFAULT_CONFIG_ID, true);
      });
    });

    it('shows the add action while no model is selected', () => {
      renderWithContext();
      expect(screen.getByRole('heading', { name: 'Transcription model' })).toBeInTheDocument();
      expect(screen.getByTestId('add-transcription-model-btn')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'More info' })).not.toBeInTheDocument();
    });

    it('does not show the remove control before selection', () => {
      renderWithContext();
      expect(screen.queryByTestId('remove-transcription-model-btn')).not.toBeInTheDocument();
    });

    it('recommends tagged models first in the all-models modal', async () => {
      const user = userEvent.setup();
      renderWithContext();
      await user.click(screen.getByTestId('add-transcription-model-btn'));
      const options = screen.getAllByTestId(/all-model-option-/);
      expect(options.map((option) => option.getAttribute('data-testid'))).toEqual([
        'all-model-option-whisper-large-v3',
        'all-model-option-whisper-small',
        'all-model-option-llama-3-8b',
      ]);
      expect(screen.getAllByText('Recommended')).toHaveLength(2);
      expect(screen.getAllByTestId('recommended-model-label')).toHaveLength(2);
      screen.getAllByTestId('recommended-model-label').forEach((label) => {
        expect(label).toHaveClass('pf-m-compact');
      });
    });

    it('shows model descriptions and guidance and closes without selecting on Cancel', async () => {
      const user = userEvent.setup();
      renderWithContext();

      await user.click(screen.getByTestId('add-transcription-model-btn'));
      expect(
        screen.getByRole('heading', { name: 'Select audio transcription model' }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'Models tagged with audio are verified for audio transcription. Select any other model to test it manually.',
        ),
      ).toBeInTheDocument();
      expect(screen.getByTestId('transcription-model-guidance')).toHaveClass('pf-v6-u-mb-md');
      expect(screen.getByText('Transcribes spoken audio')).toHaveClass('pf-v6-u-mt-sm');
      expect(screen.getByText('General-purpose chat model')).toBeInTheDocument();

      expect(screen.getByRole('button', { name: 'Cancel' })).toHaveClass('pf-v6-u-pl-0');
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(
        useChatbotConfigStore.getState().configurations[DEFAULT_CONFIG_ID]?.selectedAsrModel,
      ).toBe('');
    });

    it('selects a model and updates store', async () => {
      const user = userEvent.setup();
      renderWithContext();

      await user.click(screen.getByTestId('add-transcription-model-btn'));
      await user.click(screen.getByRole('menuitem', { name: /Whisper Large V3/ }));

      const state = useChatbotConfigStore.getState();
      expect(state.configurations[DEFAULT_CONFIG_ID]?.selectedAsrModel).toBe('whisper-large-v3');
      expect(screen.getByRole('heading', { name: 'Transcription model' })).toHaveClass(
        'pf-v6-u-mb-md',
      );
      expect(screen.getByTestId('transcription-model-selector')).toHaveTextContent(
        'Whisper Large V3',
      );
      expect(screen.getByTestId('transcription-model-selector')).toHaveAccessibleName(
        'Transcription model',
      );
      const selectionRow = screen
        .getByTestId('transcription-model-selector')
        .closest('.pf-v6-l-flex');
      expect(selectionRow).toContainElement(
        screen.getByRole('button', { name: 'View all models' }),
      );
      expect(screen.getByTestId('transcription-model-selector')).toHaveClass('pf-m-full-width');
      expect(
        screen.getByRole('button', { name: 'Remove' }).querySelector('svg'),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Remove' })).toHaveClass('pf-v6-u-mt-md');
      expect(mockFireMisc).toHaveBeenCalledWith(PLAYGROUND_MULTIMODAL_EVENTS.ASR_MODEL_SELECTED, {
        modelName: 'Whisper Large V3',
        isDefaultModel: false,
      });
    });

    it('shows helper text with chat model name after selection', () => {
      act(() => {
        useChatbotConfigStore.getState().updateSelectedModel(DEFAULT_CONFIG_ID, 'llama-3-8b');
        useChatbotConfigStore
          .getState()
          .updateSelectedAsrModel(DEFAULT_CONFIG_ID, 'whisper-large-v3');
      });

      renderWithContext();
      const explanation = screen.getByText(
        'Audio is transcribed to text, then sent to Llama 3 8B.',
      );
      const remove = screen.getByRole('button', { name: 'Remove' });
      expect(explanation.compareDocumentPosition(remove) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
    });

    it('opens all models while a model is selected', async () => {
      const user = userEvent.setup();
      act(() => {
        useChatbotConfigStore
          .getState()
          .updateSelectedAsrModel(DEFAULT_CONFIG_ID, 'whisper-large-v3');
      });
      renderWithContext();

      await user.click(screen.getByRole('button', { name: 'View all models' }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      await user.click(screen.getByRole('menuitem', { name: /Whisper Small/ }));
      expect(screen.getByTestId('transcription-model-selector')).toHaveTextContent('Whisper Small');
    });

    it('switches a selected model through the tagged-model dropdown', async () => {
      const user = userEvent.setup();
      act(() => {
        useChatbotConfigStore
          .getState()
          .updateSelectedAsrModel(DEFAULT_CONFIG_ID, 'whisper-large-v3');
      });
      renderWithContext();

      await user.click(screen.getByTestId('transcription-model-selector'));
      await user.click(screen.getByRole('menuitem', { name: 'Whisper Small' }));

      expect(screen.getByTestId('transcription-model-selector')).toHaveTextContent('Whisper Small');
      expect(
        useChatbotConfigStore.getState().configurations[DEFAULT_CONFIG_ID]?.selectedAsrModel,
      ).toBe('whisper-small');
      expect(mockFireMisc).toHaveBeenCalledWith(PLAYGROUND_MULTIMODAL_EVENTS.ASR_MODEL_SELECTED, {
        modelName: 'Whisper Small',
        isDefaultModel: false,
      });
    });

    it('selects an untagged model from the modal when tagged models exist', async () => {
      const user = userEvent.setup();
      act(() => {
        useChatbotConfigStore
          .getState()
          .updateSelectedAsrModel(DEFAULT_CONFIG_ID, 'whisper-large-v3');
      });
      renderWithContext();

      await user.click(screen.getByRole('button', { name: 'View all models' }));
      await user.click(screen.getByRole('menuitem', { name: /Llama 3 8B/ }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByTestId('transcription-model-selector')).toHaveTextContent('Llama 3 8B');
      await user.click(screen.getByTestId('transcription-model-selector'));
      expect(screen.getByRole('menuitem', { name: 'Whisper Large V3' })).toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: 'Llama 3 8B' })).not.toBeInTheDocument();
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
      expect(screen.getByTestId('add-transcription-model-btn')).toBeInTheDocument();
      await waitFor(() => expect(screen.getByTestId('add-transcription-model-btn')).toHaveFocus());
    });
  });

  describe('State 2b: Enabled with no models available', () => {
    beforeEach(() => {
      act(() => {
        useChatbotConfigStore.getState().updateAsrModelEnabled(DEFAULT_CONFIG_ID, true);
      });
    });

    it('allows selecting an untagged model when no ASR models exist', async () => {
      const user = userEvent.setup();
      renderWithContext({ aiModels: [mockChatModel] });
      await user.click(
        screen.getByRole('button', { name: 'View all models to select one manually' }),
      );
      await user.click(screen.getByRole('menuitem', { name: /Llama 3 8B/ }));
      expect(screen.getByTestId('transcription-model-selector')).toHaveTextContent('Llama 3 8B');
      expect(screen.getByTestId('transcription-model-selector')).toBeEnabled();
      await user.click(screen.getByTestId('transcription-model-selector'));
      expect(
        screen.getByRole('menuitem', { name: 'No models tagged for audio transcription' }),
      ).toBeDisabled();
      expect(screen.getAllByRole('menuitem')).toHaveLength(1);
      expect(
        useChatbotConfigStore.getState().configurations[DEFAULT_CONFIG_ID]?.selectedAsrModel,
      ).toBe('llama-3-8b');
    });

    it('shows the original missing-model guidance before selection', () => {
      renderWithContext({ aiModels: [mockChatModel] });
      expect(screen.getByTestId('transcription-model-add-section')).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'No models tagged for audio transcription' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'View all models to select one manually' }),
      ).toBeInTheDocument();
    });
  });

  describe('auto-select and stale detection', () => {
    it('does not select a model before the user makes a choice', () => {
      act(() => {
        useChatbotConfigStore.getState().updateAsrModelEnabled(DEFAULT_CONFIG_ID, true);
      });

      renderWithContext({ aiModels: [mockChatModel, mockAsrModel] });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations[DEFAULT_CONFIG_ID]?.selectedAsrModel).toBe('');
      expect(mockFireMisc).not.toHaveBeenCalled();
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

    it('preserves an untagged selected model', () => {
      act(() => {
        useChatbotConfigStore.getState().updateAsrModelEnabled(DEFAULT_CONFIG_ID, true);
        useChatbotConfigStore.getState().updateSelectedAsrModel(DEFAULT_CONFIG_ID, 'llama-3-8b');
      });

      renderWithContext({ aiModels: [mockChatModel] });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations[DEFAULT_CONFIG_ID]?.selectedAsrModel).toBe('llama-3-8b');
    });

    it('shows an untagged selection while keeping the dropdown limited to tagged models', async () => {
      const user = userEvent.setup();
      act(() => {
        useChatbotConfigStore.getState().updateAsrModelEnabled(DEFAULT_CONFIG_ID, true);
        useChatbotConfigStore.getState().updateSelectedAsrModel(DEFAULT_CONFIG_ID, 'llama-3-8b');
      });

      renderWithContext();
      expect(screen.getByTestId('transcription-model-selector')).toHaveTextContent('Llama 3 8B');
      await user.click(screen.getByTestId('transcription-model-selector'));
      expect(screen.getByRole('menuitem', { name: 'Whisper Large V3' })).toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: 'Llama 3 8B' })).not.toBeInTheDocument();
    });

    it('shows stale warning until a new model is selected', () => {
      act(() => {
        useChatbotConfigStore.getState().updateAsrModelEnabled(DEFAULT_CONFIG_ID, true);
        useChatbotConfigStore.getState().updateSelectedAsrModel(DEFAULT_CONFIG_ID, 'removed-model');
      });

      renderWithContext({ aiModels: [mockChatModel, mockAsrModel] });

      expect(
        screen.getByText(/Previously selected model is no longer available/),
      ).toBeInTheDocument();
      const state = useChatbotConfigStore.getState();
      expect(state.configurations[DEFAULT_CONFIG_ID]?.selectedAsrModel).toBe('');
    });
  });

  describe('loading state', () => {
    it('shows spinner when models are loading', () => {
      renderWithContext({ aiModelsLoaded: false });
      expect(screen.getByTestId('transcription-model-loading')).toBeInTheDocument();
    });

    it('shows spinner when maas models are loading', () => {
      renderWithContext({ maasModelsLoaded: false });
      expect(screen.getByTestId('transcription-model-loading')).toBeInTheDocument();
    });
  });

  describe('MaaS ASR models', () => {
    it('shows the add action when only a MaaS ASR model exists (no namespace ASR)', () => {
      renderWithContext({ aiModels: [mockChatModel], maasModels: [mockMaaSAsrModel] });
      expect(screen.getByTestId('add-transcription-model-btn')).toBeEnabled();
    });

    it('shows MaaS ASR model in the picker when enabled', async () => {
      const user = userEvent.setup();
      act(() => {
        useChatbotConfigStore.getState().updateAsrModelEnabled(DEFAULT_CONFIG_ID, true);
      });

      renderWithContext({ aiModels: [mockChatModel], maasModels: [mockMaaSAsrModel] });

      await user.click(screen.getByTestId('add-transcription-model-btn'));
      expect(screen.getByTestId('all-model-option-whisper-maas')).toBeInTheDocument();
    });

    it('does not auto-select the only MaaS ASR model', () => {
      act(() => {
        useChatbotConfigStore.getState().updateAsrModelEnabled(DEFAULT_CONFIG_ID, true);
      });

      renderWithContext({ aiModels: [mockChatModel], maasModels: [mockMaaSAsrModel] });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations[DEFAULT_CONFIG_ID]?.selectedAsrModel).toBe('');
    });

    it('renders subscription dropdown when MaaS ASR model is selected', () => {
      act(() => {
        useChatbotConfigStore.getState().updateAsrModelEnabled(DEFAULT_CONFIG_ID, true);
        useChatbotConfigStore.getState().updateSelectedAsrModel(DEFAULT_CONFIG_ID, 'whisper-maas');
      });

      renderWithContext({ aiModels: [mockChatModel], maasModels: [mockMaaSAsrModel] });

      expect(screen.getByTestId('subscription-selector-toggle')).toBeInTheDocument();
    });

    it('does not render subscription dropdown for namespace ASR models', () => {
      act(() => {
        useChatbotConfigStore.getState().updateAsrModelEnabled(DEFAULT_CONFIG_ID, true);
        useChatbotConfigStore
          .getState()
          .updateSelectedAsrModel(DEFAULT_CONFIG_ID, 'whisper-large-v3');
      });

      renderWithContext();

      expect(screen.queryByTestId('subscription-selector-toggle')).not.toBeInTheDocument();
    });

    it('auto-selects first subscription for MaaS ASR model', () => {
      act(() => {
        useChatbotConfigStore.getState().updateAsrModelEnabled(DEFAULT_CONFIG_ID, true);
        useChatbotConfigStore.getState().updateSelectedAsrModel(DEFAULT_CONFIG_ID, 'whisper-maas');
      });

      renderWithContext({ aiModels: [mockChatModel], maasModels: [mockMaaSAsrModel] });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations[DEFAULT_CONFIG_ID]?.selectedAsrSubscription).toBe(
        'whisper-sub-1',
      );
    });

    it('uses the subscription selected for a MaaS transcription model', async () => {
      const user = userEvent.setup();
      act(() => {
        useChatbotConfigStore.getState().updateAsrModelEnabled(DEFAULT_CONFIG_ID, true);
        useChatbotConfigStore.getState().updateSelectedAsrModel(DEFAULT_CONFIG_ID, 'whisper-maas');
      });
      renderWithContext({ aiModels: [mockChatModel], maasModels: [mockMaaSAsrModel] });

      await user.click(screen.getByTestId('subscription-selector-toggle'));
      await user.click(screen.getByRole('option', { name: 'Whisper Subscription 2' }));

      expect(
        useChatbotConfigStore.getState().configurations[DEFAULT_CONFIG_ID]?.selectedAsrSubscription,
      ).toBe('whisper-sub-2');
      expect(screen.getByTestId('subscription-selector-toggle')).toHaveTextContent(
        'Whisper Subscription 2',
      );
    });

    it('resets subscription when ASR model changes', () => {
      act(() => {
        useChatbotConfigStore.getState().updateAsrModelEnabled(DEFAULT_CONFIG_ID, true);
        useChatbotConfigStore.getState().updateSelectedAsrModel(DEFAULT_CONFIG_ID, 'whisper-maas');
        useChatbotConfigStore
          .getState()
          .updateSelectedAsrSubscription(DEFAULT_CONFIG_ID, 'whisper-sub-2');
      });

      act(() => {
        useChatbotConfigStore
          .getState()
          .updateSelectedAsrModel(DEFAULT_CONFIG_ID, 'whisper-large-v3');
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations[DEFAULT_CONFIG_ID]?.selectedAsrSubscription).toBe('');
    });
  });
});
