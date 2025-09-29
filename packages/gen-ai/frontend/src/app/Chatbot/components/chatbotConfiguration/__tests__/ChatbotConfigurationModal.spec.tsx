/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AIModel, LlamaModel } from '~/app/types';
import ChatbotConfigurationModal from '~/app/Chatbot/components/chatbotConfiguration/ChatbotConfigurationModal';

// Mock the table to surface the selectedModels prop for easy assertions
jest.mock('~/app/Chatbot/components/chatbotConfiguration/ChatbotConfigurationTable', () => ({
  __esModule: true,
  default: ({ selectedModels }: { selectedModels: AIModel[] }) => (
    <div data-testid="selected-models">{JSON.stringify(selectedModels)}</div>
  ),
}));

const createAIModel = (overrides: Partial<AIModel>): AIModel => ({
  model_name: 'model-name',
  display_name: 'Display Name',
  description: 'desc',
  endpoints: [],
  serving_runtime: 'kserve',
  api_protocol: 'v2',
  version: 'v1',
  usecase: 'llm',
  status: 'Running',
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
        allModels={props.allModels}
        existingModels={props.existingModels}
        extraSelectedModels={props.extraSelectedModels}
      />
    </MemoryRouter>,
  );

const getSelectedModelNames = (): string[] => {
  const json = screen.getByTestId('selected-models').textContent || '[]';
  const parsed = JSON.parse(json) as AIModel[];
  return parsed.map((m) => m.model_name);
};

describe('ChatbotConfigurationModal preSelectedModels', () => {
  const aiA = createAIModel({ model_name: 'mA', display_name: 'A' });
  const aiB = createAIModel({ model_name: 'mB', display_name: 'B' });
  const aiC = createAIModel({ model_name: 'mC', display_name: 'C' });
  const aiD = createAIModel({ model_name: 'mD', display_name: 'D', status: 'Stop' });
  const allModels = [aiA, aiB, aiC, aiD];

  test('uses existing models only when provided (mapped by id ↔ model_name)', () => {
    const existing: LlamaModel[] = [
      { id: 'mA', object: 'model', created: Date.now(), owned_by: 'x' },
      { id: 'mC', object: 'model', created: Date.now(), owned_by: 'x' },
    ];

    renderModal({ allModels, existingModels: existing });

    expect(getSelectedModelNames()).toEqual(['mA', 'mC']);
  });

  test('uses only available existing models (Running status)', () => {
    const existing: LlamaModel[] = [
      { id: 'mA', object: 'model', created: Date.now(), owned_by: 'x' },
      { id: 'mC', object: 'model', created: Date.now(), owned_by: 'x' },
      { id: 'mD', object: 'model', created: Date.now(), owned_by: 'x' },
    ];

    renderModal({ allModels, existingModels: existing });

    expect(getSelectedModelNames()).toEqual(['mA', 'mC']);
  });

  test('merges extraSelectedModels and existingModels with duplicates by model_name', () => {
    const existing: LlamaModel[] = [
      { id: 'mA', object: 'model', created: Date.now(), owned_by: 'x' },
      { id: 'mC', object: 'model', created: Date.now(), owned_by: 'x' },
    ];
    const extra = [aiB];

    renderModal({ allModels, existingModels: existing, extraSelectedModels: extra });

    expect(getSelectedModelNames()).toEqual(['mB', 'mA', 'mC']);
  });

  test('merges extraSelectedModels and existingModels with duplicates by model_name', () => {
    const existing: LlamaModel[] = [
      { id: 'mA', object: 'model', created: Date.now(), owned_by: 'x' },
      { id: 'mC', object: 'model', created: Date.now(), owned_by: 'x' },
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
