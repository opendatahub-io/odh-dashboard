/* eslint-disable camelcase */
import * as React from 'react';
import { render } from '@testing-library/react';
import SubscriptionDropdown from '~/app/Chatbot/components/SubscriptionDropdown';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import type { AAModelResponse } from '~/app/types';

jest.mock('@odh-dashboard/internal/components/FieldGroupHelpLabelIcon', () => ({
  __esModule: true,
  default: ({ content }: { content: string }) => (
    <span data-testid="help-label-icon">{content}</span>
  ),
}));

const createMaaSModel = (overrides: Partial<AAModelResponse> = {}): AAModelResponse => ({
  model_id: 'test-model',
  model_name: 'test-model',
  display_name: 'Test Model',
  description: '',
  endpoints: ['external:https://maas.example.com/v1'],
  serving_runtime: 'MaaS',
  api_protocol: 'OpenAI',
  version: '',
  usecase: 'LLM',
  status: 'Running',
  sa_token: { name: '', token_name: '', token: '' },
  model_source_type: 'maas',
  ...overrides,
});

const createContextValue = (aiModels: AAModelResponse[] = [], maasModels: AAModelResponse[] = []) =>
  ({
    models: [],
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
    lastInput: '',
    setLastInput: jest.fn(),
  }) as unknown as React.ContextType<typeof ChatbotContext>;

const TestWrapper: React.FC<{
  children: React.ReactNode;
  contextValue: React.ContextType<typeof ChatbotContext>;
}> = ({ children, contextValue }) => (
  <ChatbotContext.Provider value={contextValue}>{children}</ChatbotContext.Provider>
);

describe('SubscriptionDropdown', () => {
  const defaultProps = {
    selectedModel: 'maas-provider/test-model',
    selectedSubscription: '',
    onSubscriptionChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when selectedModel is empty', () => {
    const { container } = render(
      <TestWrapper contextValue={createContextValue([], [])}>
        <SubscriptionDropdown {...defaultProps} selectedModel="" />
      </TestWrapper>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when model has no subscriptions', () => {
    const model = createMaaSModel({ model_id: 'test-model' });
    const { container } = render(
      <TestWrapper contextValue={createContextValue([], [model])}>
        <SubscriptionDropdown {...defaultProps} />
      </TestWrapper>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when model has empty subscriptions array', () => {
    const model = createMaaSModel({ model_id: 'test-model', subscriptions: [] });
    const { container } = render(
      <TestWrapper contextValue={createContextValue([], [model])}>
        <SubscriptionDropdown {...defaultProps} />
      </TestWrapper>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('does not resolve subscriptions or auto-select when selectedModel has a non-MaaS provider prefix', () => {
    const onSubscriptionChange = jest.fn();
    const model = createMaaSModel({
      model_id: 'test-model',
      subscriptions: [{ name: 'only-sub', displayName: 'Only Subscription' }],
    });

    const { container } = render(
      <TestWrapper contextValue={createContextValue([], [model])}>
        <SubscriptionDropdown
          selectedModel="provider/test-model"
          selectedSubscription=""
          onSubscriptionChange={onSubscriptionChange}
        />
      </TestWrapper>,
    );

    expect(container.firstChild).toBeNull();
    expect(onSubscriptionChange).not.toHaveBeenCalled();
  });

  it('auto-selects when model has exactly one subscription', () => {
    const onSubscriptionChange = jest.fn();
    const model = createMaaSModel({
      model_id: 'test-model',
      subscriptions: [{ name: 'only-sub', displayName: 'Only Subscription' }],
    });

    render(
      <TestWrapper contextValue={createContextValue([], [model])}>
        <SubscriptionDropdown {...defaultProps} onSubscriptionChange={onSubscriptionChange} />
      </TestWrapper>,
    );

    expect(onSubscriptionChange).toHaveBeenCalledWith('only-sub');
  });
});
