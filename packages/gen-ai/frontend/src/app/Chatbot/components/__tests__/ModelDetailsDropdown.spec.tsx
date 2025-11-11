/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import ModelDetailsDropdown from '~/app/Chatbot/components/ModelDetailsDropdown';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import { AIModel, LlamaModel, MaaSModel } from '~/app/types';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

const mockFireMiscTrackingEvent = jest.mocked(fireMiscTrackingEvent);

const createMockAIModel = (overrides: Partial<AIModel>): AIModel => ({
  model_name: 'test-model',
  model_id: 'test-model-id',
  display_name: 'Test Model',
  serving_runtime: 'kserve',
  api_protocol: 'v2',
  version: 'v1',
  usecase: 'llm',
  description: 'Test model',
  endpoints: [],
  status: 'Running',
  sa_token: {
    name: 'token',
    token_name: 'token',
    token: 'test-token',
  },
  ...overrides,
});

const createMockLlamaModel = (modelId: string): LlamaModel => ({
  id: `provider/${modelId}`,
  modelId,
  object: 'model',
  created: Date.now(),
  owned_by: 'test-org',
});

const createContextValue = (
  models: LlamaModel[],
  aiModels: AIModel[] = [],
  maasModels: MaaSModel[] = [],
) => ({
  models,
  modelsLoaded: true,
  modelsError: undefined,
  aiModels,
  aiModelsLoaded: true,
  aiModelsError: undefined,
  maasModels,
  maasModelsLoaded: true,
  maasModelsError: undefined,
  lsdStatus: null,
  lsdStatusLoaded: true,
  lsdStatusError: undefined,
  refresh: jest.fn(),
  selectedModel: '',
  setSelectedModel: jest.fn(),
  lastInput: '',
  setLastInput: jest.fn(),
});

const TestWrapper: React.FC<{
  children: React.ReactNode;
  contextValue: ReturnType<typeof createContextValue>;
}> = ({ children, contextValue }) => (
  <ChatbotContext.Provider value={contextValue as React.ContextType<typeof ChatbotContext>}>
    {children}
  </ChatbotContext.Provider>
);

describe('ModelDetailsDropdown', () => {
  const defaultProps = {
    selectedModel: 'provider/test-model-1',
    onModelChange: jest.fn(),
  };

  const aiModel1 = createMockAIModel({
    model_name: 'test-model-1',
    model_id: 'test-model-1',
    display_name: 'Test Model 1',
  });

  const aiModel2 = createMockAIModel({
    model_name: 'test-model-2',
    model_id: 'test-model-2',
    display_name: 'Test Model 2',
  });

  const aiModelDisabled = createMockAIModel({
    model_name: 'test-model-3',
    model_id: 'test-model-3',
    display_name: 'Disabled Model',
    status: 'Stop',
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dropdown with selected model', () => {
    const models = [createMockLlamaModel('test-model-1')];
    const contextValue = createContextValue(models, [aiModel1]);

    render(
      <TestWrapper contextValue={contextValue}>
        <ModelDetailsDropdown {...defaultProps} />
      </TestWrapper>,
    );

    expect(screen.getByRole('button')).toHaveTextContent('provider/Test Model 1');
  });

  it('shows placeholder when no models available', () => {
    const contextValue = createContextValue([]);
    render(
      <TestWrapper contextValue={contextValue}>
        <ModelDetailsDropdown {...defaultProps} selectedModel="" onModelChange={jest.fn()} />
      </TestWrapper>,
    );

    expect(screen.getByRole('button')).toHaveTextContent('No models available');
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('opens dropdown and shows available models', async () => {
    const user = userEvent.setup();
    const models = [createMockLlamaModel('test-model-1'), createMockLlamaModel('test-model-2')];
    const contextValue = createContextValue(models, [aiModel1, aiModel2]);

    render(
      <TestWrapper contextValue={contextValue}>
        <ModelDetailsDropdown {...defaultProps} />
      </TestWrapper>,
    );

    await user.click(screen.getByRole('button'));

    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems).toHaveLength(2);
    expect(menuItems[0]).toHaveTextContent('provider/Test Model 1');
    expect(menuItems[1]).toHaveTextContent('provider/Test Model 2');
  });

  it('calls onModelChange and fires tracking event when model is selected', async () => {
    const user = userEvent.setup();
    const mockOnModelChange = jest.fn();
    const models = [createMockLlamaModel('test-model-1'), createMockLlamaModel('test-model-2')];
    const contextValue = createContextValue(models, [aiModel1, aiModel2]);

    render(
      <TestWrapper contextValue={contextValue}>
        <ModelDetailsDropdown {...defaultProps} onModelChange={mockOnModelChange} />
      </TestWrapper>,
    );

    await user.click(screen.getByRole('button'));
    const options = screen.getAllByRole('menuitem');
    await user.click(options[1]);

    expect(mockOnModelChange).toHaveBeenCalledWith('provider/test-model-2');
    expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
      'Playground Model Dropdown Option Selected',
      {
        selectedModel: 'provider/Test Model 2',
      },
    );
  });

  it('shows disabled model with warning icon and tooltip', async () => {
    const user = userEvent.setup();
    const models = [createMockLlamaModel('test-model-1'), createMockLlamaModel('test-model-3')];
    const contextValue = createContextValue(models, [aiModel1, aiModelDisabled]);

    render(
      <TestWrapper contextValue={contextValue}>
        <ModelDetailsDropdown {...defaultProps} />
      </TestWrapper>,
    );

    await user.click(screen.getByRole('button'));

    const disabledOption = screen.getByText('provider/Disabled Model');
    expect(disabledOption).toBeInTheDocument();
    expect(disabledOption.closest('[role="menuitem"]')).toHaveAttribute('aria-disabled', 'true');
  });

  it('does not call onModelChange when disabled model is clicked', async () => {
    const user = userEvent.setup();
    const mockOnModelChange = jest.fn();
    const models = [createMockLlamaModel('test-model-3')];
    const contextValue = createContextValue(models, [aiModelDisabled]);

    render(
      <TestWrapper contextValue={contextValue}>
        <ModelDetailsDropdown {...defaultProps} onModelChange={mockOnModelChange} />
      </TestWrapper>,
    );

    await user.click(screen.getByRole('button'));
    const disabledOption = screen.getByText('provider/Disabled Model');
    await user.click(disabledOption);

    expect(mockOnModelChange).not.toHaveBeenCalled();
  });
});
