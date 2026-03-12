/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AIModel, LlamaModel } from '~/app/types';
import type { MaaSModel } from '~/app/types';
import ChatbotConfigurationModal from '~/app/Chatbot/components/chatbotConfiguration/ChatbotConfigurationModal';
import useGuardrailsEnabled from '~/app/Chatbot/hooks/useGuardrailsEnabled';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import { GenAiContext } from '~/app/context/GenAiContext';
import { mockGenAiContextValue } from '~/__mocks__/mockGenAiContext';

// Mock the guardrails hooks
jest.mock('~/app/Chatbot/hooks/useGuardrailsEnabled');
jest.mock('~/app/hooks/useGenAiAPI');

const mockInstallLSD = jest.fn();
const mockUseGenAiAPI = useGenAiAPI as jest.Mock;

// Set default mock return values for guardrails hooks
beforeEach(() => {
  jest.clearAllMocks();

  (useGuardrailsEnabled as jest.Mock).mockReturnValue(false);

  mockUseGenAiAPI.mockReturnValue({
    apiAvailable: true,
    api: {
      installLSD: mockInstallLSD,
    },
  });

  mockInstallLSD.mockResolvedValue({ data: null });
});

// Mock the table to surface the selectedModels and maxTokensMap props for easy assertions
jest.mock('~/app/Chatbot/components/chatbotConfiguration/ChatbotConfigurationTable', () => ({
  __esModule: true,
  default: ({
    selectedModels,
    maxTokensMap,
  }: {
    selectedModels: AIModel[];
    maxTokensMap: Map<string, number | undefined>;
  }) => (
    <div data-testid="selected-models">
      {JSON.stringify({
        models: selectedModels.map((m) => m.model_name),
        maxTokens: Array.from(maxTokensMap.entries()),
      })}
    </div>
  ),
}));

// Mock DashboardModalFooter to expose the submit button
jest.mock('mod-arch-shared', () => ({
  DashboardModalFooter: ({
    submitLabel,
    onSubmit,
    onCancel,
  }: {
    submitLabel: string;
    onSubmit: () => void;
    onCancel: () => void;
  }) => (
    <div data-testid="modal-footer">
      <button onClick={onSubmit}>{submitLabel}</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

const createAIModel = (overrides: Partial<AIModel>): AIModel => ({
  model_name: 'model-name',
  model_id: overrides.model_name || 'model-name',
  display_name: 'Display Name',
  description: 'desc',
  endpoints: [],
  serving_runtime: 'kserve',
  api_protocol: 'v2',
  version: 'v1',
  usecase: 'llm',
  status: 'Running',
  sa_token: {
    name: '',
    token_name: '',
    token: '',
  },
  isMaaSModel: false,
  maasModelId: undefined,
  ...overrides,
});
const createMaaSModel = (overrides: Partial<MaaSModel>): MaaSModel => ({
  id: 'maas-model',
  object: 'model',
  created: Date.now(),
  owned_by: 'maas',
  ready: true,
  url: 'https://maas.example.com/v1',
  ...overrides,
});

const renderModal = (props: {
  allModels: AIModel[];
  maasModels?: MaaSModel[];
  existingModels?: LlamaModel[];
  extraSelectedModels?: AIModel[];
}) =>
  render(
    <MemoryRouter>
      <ChatbotConfigurationModal
        onClose={() => undefined}
        lsdStatus={null}
        aiModels={props.allModels}
        maasModels={props.maasModels}
        existingModels={props.existingModels}
        extraSelectedModels={props.extraSelectedModels}
      />
    </MemoryRouter>,
  );

const getSelectedModelNames = (): string[] => {
  const json = screen.getByTestId('selected-models').textContent || '{}';
  const parsed = JSON.parse(json) as {
    models: string[];
    maxTokens: [string, number | undefined][];
  };
  return parsed.models;
};

describe('ChatbotConfigurationModal preSelectedModels', () => {
  const aiA = createAIModel({ model_name: 'mA', display_name: 'A' });
  const aiB = createAIModel({ model_name: 'mB', display_name: 'B' });
  const aiC = createAIModel({ model_name: 'mC', display_name: 'C' });
  const aiD = createAIModel({ model_name: 'mD', display_name: 'D', status: 'Stop' });
  const allModels = [aiA, aiB, aiC, aiD];

  test('uses existing models only when provided (mapped by id ↔ model_name)', () => {
    const existing: LlamaModel[] = [
      { id: 'pA/mA', object: 'model', created: Date.now(), owned_by: 'x', modelId: 'mA' },
      { id: 'pA/mC', object: 'model', created: Date.now(), owned_by: 'x', modelId: 'mC' },
    ];

    renderModal({ allModels, existingModels: existing });

    expect(getSelectedModelNames()).toEqual(['mA', 'mC']);
  });

  test('uses only available existing models (Running status)', () => {
    const existing: LlamaModel[] = [
      { id: 'pA/mA', object: 'model', created: Date.now(), owned_by: 'x', modelId: 'mA' },
      { id: 'pA/mC', object: 'model', created: Date.now(), owned_by: 'x', modelId: 'mC' },
      { id: 'pA/mD', object: 'model', created: Date.now(), owned_by: 'x', modelId: 'mD' },
    ];

    renderModal({ allModels, existingModels: existing });

    expect(getSelectedModelNames()).toEqual(['mA', 'mC']);
  });

  test('merges extraSelectedModels and existingModels with duplicates by model_name', () => {
    const existing: LlamaModel[] = [
      { id: 'pA/mA', object: 'model', created: Date.now(), owned_by: 'x', modelId: 'mA' },
      { id: 'pA/mC', object: 'model', created: Date.now(), owned_by: 'x', modelId: 'mC' },
    ];
    const extra = [aiB];

    renderModal({ allModels, existingModels: existing, extraSelectedModels: extra });

    expect(getSelectedModelNames()).toEqual(['mB', 'mA', 'mC']);
  });

  test('merges extraSelectedModels and existingModels with duplicates by model_name', () => {
    const existing: LlamaModel[] = [
      { id: 'pA/mA', object: 'model', created: Date.now(), owned_by: 'x', modelId: 'mA' },
      { id: 'pA/mC', object: 'model', created: Date.now(), owned_by: 'x', modelId: 'mC' },
    ];
    const extra = [aiB, aiA]; // includes mA to validate dedupe preference for extra

    renderModal({ allModels, existingModels: existing, extraSelectedModels: extra });

    // Expected: extra first (mB, mA), then remaining existing (mC) not present in extra
    expect(getSelectedModelNames()).toEqual(['mB', 'mA', 'mC']);
  });

  test('uses only extraSelectedModels when existingModels is not provided', () => {
    const extra = [aiB];
    renderModal({ allModels, extraSelectedModels: extra });
    expect(getSelectedModelNames()).toEqual(['mB']);
  });

  test('falls back to allModels when neither existing nor extra are provided', () => {
    renderModal({ allModels });
    expect(getSelectedModelNames()).toEqual(['mA', 'mB', 'mC']);
  });
});

describe('ChatbotConfigurationModal MaaS model support', () => {
  test('createAIModel helper creates regular model by default', () => {
    const model = createAIModel({ model_name: 'test-model' });
    expect(model.isMaaSModel).toBe(false);
    expect(model.maasModelId).toBeUndefined();
  });

  test('createAIModel helper can create MaaS model', () => {
    const model = createAIModel({
      model_name: 'granite-7b-lab',
      isMaaSModel: true,
      maasModelId: 'granite-7b-lab',
    });
    expect(model.isMaaSModel).toBe(true);
    expect(model.maasModelId).toBe('granite-7b-lab');
  });

  test('includes MaaS models in selection', () => {
    const regularModel = createAIModel({ model_name: 'regular-model', display_name: 'Regular' });
    const maasModel = createAIModel({
      model_name: 'granite-7b-lab',
      display_name: 'Granite MaaS',
      isMaaSModel: true,
      maasModelId: 'granite-7b-lab',
    });
    const allModels = [regularModel, maasModel];

    renderModal({ allModels });

    expect(getSelectedModelNames()).toEqual(['regular-model', 'granite-7b-lab']);
  });

  test('MaaS models are properly serialized in selected models', () => {
    const maasModel = createAIModel({
      model_name: 'llama-2-7b-chat',
      display_name: 'Llama 2 Chat',
      isMaaSModel: true,
      maasModelId: 'llama-2-7b-chat',
    });

    renderModal({ allModels: [maasModel] });

    const json = screen.getByTestId('selected-models').textContent || '{}';
    const parsed = JSON.parse(json) as {
      models: string[];
      maxTokens: [string, number | undefined][];
    };

    // Verify the MaaS model is in the selected models list
    expect(parsed.models).toContain('llama-2-7b-chat');
    expect(parsed.models).toHaveLength(1);
  });
});

describe('ChatbotConfigurationModal max_tokens support', () => {
  test('max_tokens Map is initialized and passed to table', () => {
    const allModels = [createAIModel({ model_name: 'test-model' })];
    renderModal({ allModels });

    const json = screen.getByTestId('selected-models').textContent || '{}';
    const parsed = JSON.parse(json) as {
      models: string[];
      maxTokens: [string, number | undefined][];
    };

    expect(parsed.maxTokens).toEqual([]);
    expect(parsed.models).toContain('test-model');
  });

  test('max_tokens Map structure is correct', () => {
    const allModels = [
      createAIModel({ model_name: 'model-a' }),
      createAIModel({ model_name: 'model-b' }),
    ];
    renderModal({ allModels });

    const json = screen.getByTestId('selected-models').textContent || '{}';
    const parsed = JSON.parse(json) as {
      models: string[];
      maxTokens: [string, number | undefined][];
    };

    // Verify maxTokens is an array (Map entries)
    expect(Array.isArray(parsed.maxTokens)).toBe(true);
    expect(parsed.maxTokens.length).toBe(0); // Initially empty
  });
});

describe('ChatbotConfigurationModal guardrails configuration', () => {
  const allModels = [createAIModel({ model_name: 'test-model' })];

  const renderModalWithContext = (props: { allModels: AIModel[]; existingModels?: LlamaModel[] }) =>
    render(
      <GenAiContext.Provider value={mockGenAiContextValue}>
        <MemoryRouter>
          <ChatbotConfigurationModal
            onClose={() => undefined}
            lsdStatus={null}
            aiModels={props.allModels}
            existingModels={props.existingModels}
          />
        </MemoryRouter>
      </GenAiContext.Provider>,
    );

  test('includes enable_guardrails: false when feature flag is disabled', async () => {
    const user = userEvent.setup();
    (useGuardrailsEnabled as jest.Mock).mockReturnValue(false);

    renderModalWithContext({ allModels });

    const createButton = screen.getByRole('button', { name: /create/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(mockInstallLSD).toHaveBeenCalledWith({
        models: [
          {
            model_name: 'test-model',
            is_maas_model: false,
          },
        ],
        enable_guardrails: false,
      });
    });
  });

  test('includes enable_guardrails: true when feature flag is enabled', async () => {
    const user = userEvent.setup();
    (useGuardrailsEnabled as jest.Mock).mockReturnValue(true);

    renderModalWithContext({ allModels });

    const createButton = screen.getByRole('button', { name: /create/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(mockInstallLSD).toHaveBeenCalledWith({
        models: [
          {
            model_name: 'test-model',
            is_maas_model: false,
          },
        ],
        enable_guardrails: true,
      });
    });
  });
});

describe('ChatbotConfigurationModal duplicate model (namespace + MaaS)', () => {
  test('should include both namespace and MaaS versions of the same model', () => {
    const namespaceModel = createAIModel({
      model_name: 'granite-7b-lab',
      display_name: 'Granite 7B Lab',
    });
    const maasModel = createMaaSModel({
      id: 'granite-7b-lab',
      display_name: 'Granite 7B Lab MaaS',
    });

    renderModal({ allModels: [namespaceModel], maasModels: [maasModel] });

    const names = getSelectedModelNames();
    expect(names).toHaveLength(2);
    expect(names).toContain('granite-7b-lab');
  });

  test('should include MaaS models alongside different namespace models', () => {
    const namespaceModel = createAIModel({
      model_name: 'mistral-7b',
      display_name: 'Mistral 7B',
    });
    const maasModel = createMaaSModel({
      id: 'llama-2-7b-chat',
      display_name: 'Llama 2 Chat',
    });

    renderModal({ allModels: [namespaceModel], maasModels: [maasModel] });

    const names = getSelectedModelNames();
    expect(names).toEqual(['mistral-7b', 'Llama 2 Chat']);
  });

  test('should show all models when multiple overlap between namespace and MaaS', () => {
    const aiModels = [
      createAIModel({ model_name: 'model-a', display_name: 'Model A' }),
      createAIModel({ model_name: 'model-b', display_name: 'Model B' }),
    ];
    const maasModels = [
      createMaaSModel({ id: 'model-a', display_name: 'Model A MaaS' }),
      createMaaSModel({ id: 'model-c', display_name: 'Model C MaaS' }),
    ];

    renderModal({ allModels: aiModels, maasModels });

    const names = getSelectedModelNames();
    expect(names).toHaveLength(4);
    expect(names).toEqual(['model-a', 'model-b', 'Model A MaaS', 'Model C MaaS']);
  });
});
