/* eslint-disable camelcase */
import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SubscriptionDropdown from '~/app/Chatbot/components/SubscriptionDropdown';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import type { AAModelResponse } from '~/app/types';

jest.mock('@odh-dashboard/ui-core/components/FieldGroupHelpLabelIcon', () => ({
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
  model_source_type: 'maas' as const,
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

  it('renders subscription dropdown with multiple subscriptions', async () => {
    const user = userEvent.setup();
    const model = createMaaSModel({
      model_id: 'test-model',
      subscriptions: [
        { name: 'premium-sub', displayName: 'Premium Subscription' },
        { name: 'basic-sub', displayName: 'Basic Subscription' },
      ],
    });

    const { getByText, getByTestId, getByRole, queryByRole } = render(
      <TestWrapper contextValue={createContextValue([], [model])}>
        <SubscriptionDropdown {...defaultProps} selectedSubscription="premium-sub" />
      </TestWrapper>,
    );

    expect(getByText('Subscription')).toBeInTheDocument();
    expect(getByTestId('subscription-selector-toggle')).toBeInTheDocument();

    // Toggle label shows selected subscription
    expect(getByTestId('subscription-selector-toggle')).toHaveTextContent('Premium Subscription');

    // Dropdown list items are not yet expanded
    expect(queryByRole('option', { name: 'Premium Subscription' })).not.toBeInTheDocument();
    expect(queryByRole('option', { name: 'Basic Subscription' })).not.toBeInTheDocument();

    // Open the dropdown
    await user.click(getByTestId('subscription-selector-toggle'));

    // Options should now be visible
    await waitFor(() => {
      expect(getByRole('option', { name: 'Premium Subscription' })).toBeVisible();
      expect(getByRole('option', { name: 'Basic Subscription' })).toBeVisible();
    });
  });

  it('auto-selects first subscription when multiple subscriptions exist', () => {
    const onSubscriptionChange = jest.fn();
    const model = createMaaSModel({
      model_id: 'test-model',
      subscriptions: [
        { name: 'premium-sub', displayName: 'Premium Subscription' },
        { name: 'basic-sub', displayName: 'Basic Subscription' },
      ],
    });

    render(
      <TestWrapper contextValue={createContextValue([], [model])}>
        <SubscriptionDropdown {...defaultProps} onSubscriptionChange={onSubscriptionChange} />
      </TestWrapper>,
    );

    expect(onSubscriptionChange).toHaveBeenCalledWith('premium-sub');
  });

  it('displays selected subscription displayName in toggle', () => {
    const model = createMaaSModel({
      model_id: 'test-model',
      subscriptions: [
        { name: 'premium-sub', displayName: 'Premium Subscription' },
        { name: 'basic-sub', displayName: 'Basic Subscription' },
      ],
    });

    const { getByTestId } = render(
      <TestWrapper contextValue={createContextValue([], [model])}>
        <SubscriptionDropdown {...defaultProps} selectedSubscription="basic-sub" />
      </TestWrapper>,
    );

    expect(getByTestId('subscription-selector-toggle')).toHaveTextContent('Basic Subscription');
  });

  it('falls back to subscription name when displayName is absent', () => {
    const model = createMaaSModel({
      model_id: 'test-model',
      subscriptions: [{ name: 'basic-sub' }],
    });

    const { getByTestId } = render(
      <TestWrapper contextValue={createContextValue([], [model])}>
        <SubscriptionDropdown {...defaultProps} selectedSubscription="basic-sub" />
      </TestWrapper>,
    );

    expect(getByTestId('subscription-selector-toggle')).toHaveTextContent('basic-sub');
  });

  it('clears invalid subscription when model changes', () => {
    const onSubscriptionChange = jest.fn();
    const model1 = createMaaSModel({
      model_id: 'model-1',
      subscriptions: [{ name: 'sub-1', displayName: 'Subscription 1' }],
    });
    const model2 = createMaaSModel({
      model_id: 'model-2',
      subscriptions: [{ name: 'sub-2', displayName: 'Subscription 2' }],
    });

    const { rerender } = render(
      <TestWrapper contextValue={createContextValue([], [model1, model2])}>
        <SubscriptionDropdown
          selectedModel="maas-provider/model-1"
          selectedSubscription="sub-1"
          onSubscriptionChange={onSubscriptionChange}
        />
      </TestWrapper>,
    );

    onSubscriptionChange.mockClear();

    rerender(
      <TestWrapper contextValue={createContextValue([], [model1, model2])}>
        <SubscriptionDropdown
          selectedModel="maas-provider/model-2"
          selectedSubscription="sub-1"
          onSubscriptionChange={onSubscriptionChange}
        />
      </TestWrapper>,
    );

    expect(onSubscriptionChange).toHaveBeenCalledWith('sub-2');
  });

  it('renders help label icon with subscription information', () => {
    const model = createMaaSModel({
      model_id: 'test-model',
      subscriptions: [{ name: 'sub-1', displayName: 'Subscription 1' }],
    });

    const { getByTestId } = render(
      <TestWrapper contextValue={createContextValue([], [model])}>
        <SubscriptionDropdown {...defaultProps} selectedSubscription="sub-1" />
      </TestWrapper>,
    );

    expect(getByTestId('help-label-icon')).toBeInTheDocument();
    expect(getByTestId('help-label-icon')).toHaveTextContent(
      'Select the subscription to use for this model',
    );
  });

  it('does not auto-select when component is disabled', () => {
    const onSubscriptionChange = jest.fn();
    const model = createMaaSModel({
      model_id: 'test-model',
      subscriptions: [{ name: 'only-sub', displayName: 'Only Subscription' }],
    });

    render(
      <TestWrapper contextValue={createContextValue([], [model])}>
        <SubscriptionDropdown
          {...defaultProps}
          onSubscriptionChange={onSubscriptionChange}
          isDisabled
        />
      </TestWrapper>,
    );

    expect(onSubscriptionChange).not.toHaveBeenCalled();
  });

  it('handles malformed subscriptions data gracefully', () => {
    const onSubscriptionChange = jest.fn();
    const modelWithInvalidSubs = {
      ...createMaaSModel({ model_id: 'test-model' }),
      subscriptions: null,
    } as unknown as AAModelResponse;

    const { container } = render(
      <TestWrapper contextValue={createContextValue([], [modelWithInvalidSubs])}>
        <SubscriptionDropdown
          selectedModel="maas-provider/test-model"
          selectedSubscription=""
          onSubscriptionChange={onSubscriptionChange}
        />
      </TestWrapper>,
    );

    expect(container).toBeEmptyDOMElement();
    expect(onSubscriptionChange).not.toHaveBeenCalled();
  });

  it('fires onSubscriptionChange when a different subscription is selected', async () => {
    const user = userEvent.setup();
    const onSubscriptionChange = jest.fn();
    const model = createMaaSModel({
      model_id: 'test-model',
      subscriptions: [
        { name: 'premium-sub', displayName: 'Premium Subscription' },
        { name: 'basic-sub', displayName: 'Basic Subscription' },
      ],
    });

    const { getByRole, getByTestId } = render(
      <TestWrapper contextValue={createContextValue([], [model])}>
        <SubscriptionDropdown
          {...defaultProps}
          selectedSubscription="premium-sub"
          onSubscriptionChange={onSubscriptionChange}
        />
      </TestWrapper>,
    );

    // Clear the auto-selection call
    onSubscriptionChange.mockClear();

    // Open dropdown and select different subscription
    await user.click(getByTestId('subscription-selector-toggle'));
    await waitFor(() => {
      expect(getByRole('option', { name: 'Basic Subscription' })).toBeVisible();
    });

    await user.click(getByRole('option', { name: 'Basic Subscription' }));

    expect(onSubscriptionChange).toHaveBeenCalledWith('basic-sub');
    expect(onSubscriptionChange).toHaveBeenCalledTimes(1);
  });
});
