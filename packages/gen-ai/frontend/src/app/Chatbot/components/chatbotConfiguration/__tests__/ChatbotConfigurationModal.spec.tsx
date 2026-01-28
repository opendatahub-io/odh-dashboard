/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AIModel, LlamaModel } from '~/app/types';
import ChatbotConfigurationModal from '~/app/Chatbot/components/chatbotConfiguration/ChatbotConfigurationModal';
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
const renderModal = (props: {
  allModels: AIModel[];
  existingModels?: LlamaModel[];
  extraSelectedModels?: AIModel[];
}) =>
  render(
    <MemoryRouter>
      <ChatbotConfigurationModal
        onClose={() => undefined}
        lsdStatus={null}
        aiModels={props.allModels}
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
