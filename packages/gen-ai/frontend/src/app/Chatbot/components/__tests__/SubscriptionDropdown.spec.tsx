/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import SubscriptionDropdown from '~/app/Chatbot/components/SubscriptionDropdown';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import { MaaSModel } from '~/app/types';

jest.mock('@odh-dashboard/internal/components/FieldGroupHelpLabelIcon', () => ({
  __esModule: true,
  default: ({ content }: { content: string }) => (
    <span data-testid="help-label-icon">{content}</span>
  ),
}));

const createMaaSModel = (overrides: Partial<MaaSModel> = {}): MaaSModel => ({
  id: 'test-model',
  object: 'model',
  created: 1672531200,
  owned_by: 'test-ns',
  ready: true,
  ...overrides,
});

const createContextValue = (maasModels: MaaSModel[] = []) =>
  ({
    models: [],
    modelsLoaded: true,
    modelsError: undefined,
    aiModels: [],
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
  maasModels?: MaaSModel[];
}> = ({ children, maasModels = [] }) => (
  <ChatbotContext.Provider value={createContextValue(maasModels)}>
    {children}
  </ChatbotContext.Provider>
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
      <TestWrapper>
        <SubscriptionDropdown {...defaultProps} selectedModel="" />
      </TestWrapper>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when model has no subscriptions', () => {
    const model = createMaaSModel({ id: 'test-model' });
    const { container } = render(
      <TestWrapper maasModels={[model]}>
        <SubscriptionDropdown {...defaultProps} />
      </TestWrapper>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when model has empty subscriptions array', () => {
    const model = createMaaSModel({ id: 'test-model', subscriptions: [] });
    const { container } = render(
      <TestWrapper maasModels={[model]}>
        <SubscriptionDropdown {...defaultProps} />
      </TestWrapper>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('does not resolve subscriptions or auto-select when selectedModel has a non-MaaS provider prefix', () => {
    // Regression: before the isMaasLlamaModelId guard, a namespace/non-MaaS model whose
    // base model_id matched a MaaS entry would incorrectly pull up MaaS subscriptions.
    const onSubscriptionChange = jest.fn();
    const model = createMaaSModel({
      id: 'test-model',
      subscriptions: [{ name: 'only-sub', displayName: 'Only Subscription' }],
    });

    const { container } = render(
      <TestWrapper maasModels={[model]}>
        <SubscriptionDropdown
          selectedModel="provider/test-model"
          selectedSubscription=""
          onSubscriptionChange={onSubscriptionChange}
        />
      </TestWrapper>,
    );

    // Component must render nothing — the non-MaaS prefix should block resolution.
    expect(container.firstChild).toBeNull();
    // Auto-select must not fire even though the model has a subscription.
    expect(onSubscriptionChange).not.toHaveBeenCalled();
  });

  it('auto-selects when model has exactly one subscription', () => {
    const onSubscriptionChange = jest.fn();
    const model = createMaaSModel({
      id: 'test-model',
      subscriptions: [{ name: 'only-sub', displayName: 'Only Subscription' }],
    });

    render(
      <TestWrapper maasModels={[model]}>
        <SubscriptionDropdown {...defaultProps} onSubscriptionChange={onSubscriptionChange} />
      </TestWrapper>,
    );

    expect(onSubscriptionChange).toHaveBeenCalledWith('only-sub');
  });

  it('renders dropdown with multiple subscriptions', () => {
    const model = createMaaSModel({
      id: 'test-model',
      subscriptions: [
        { name: 'basic-sub', displayName: 'Basic Tier' },
        { name: 'premium-sub', displayName: 'Premium Tier', description: 'Higher rate limits' },
      ],
    });

    render(
      <TestWrapper maasModels={[model]}>
        <SubscriptionDropdown {...defaultProps} />
      </TestWrapper>,
    );

    expect(screen.getByText('Subscription')).toBeInTheDocument();
    expect(screen.getByTestId('subscription-selector-toggle')).toBeInTheDocument();
  });

  it('auto-selects first subscription when model has multiple subscriptions and no selection', () => {
    const onSubscriptionChange = jest.fn();
    const model = createMaaSModel({
      id: 'test-model',
      subscriptions: [
        { name: 'basic-sub', displayName: 'Basic Tier' },
        { name: 'premium-sub', displayName: 'Premium Tier' },
      ],
    });

    render(
      <TestWrapper maasModels={[model]}>
        <SubscriptionDropdown
          {...defaultProps}
          selectedSubscription=""
          onSubscriptionChange={onSubscriptionChange}
        />
      </TestWrapper>,
    );

    expect(onSubscriptionChange).toHaveBeenCalledWith('basic-sub');
  });

  it('shows display name in toggle when subscription is selected', () => {
    const model = createMaaSModel({
      id: 'test-model',
      subscriptions: [
        { name: 'basic-sub', displayName: 'Basic Tier' },
        { name: 'premium-sub', displayName: 'Premium Tier' },
      ],
    });

    render(
      <TestWrapper maasModels={[model]}>
        <SubscriptionDropdown {...defaultProps} selectedSubscription="premium-sub" />
      </TestWrapper>,
    );

    expect(screen.getByTestId('subscription-selector-toggle')).toHaveTextContent('Premium Tier');
  });

  it('falls back to name when displayName is absent', () => {
    const model = createMaaSModel({
      id: 'test-model',
      subscriptions: [{ name: 'raw-sub-name' }, { name: 'another-sub', displayName: 'Another' }],
    });

    render(
      <TestWrapper maasModels={[model]}>
        <SubscriptionDropdown {...defaultProps} selectedSubscription="raw-sub-name" />
      </TestWrapper>,
    );

    expect(screen.getByTestId('subscription-selector-toggle')).toHaveTextContent('raw-sub-name');
  });

  it('clears invalid subscription when model changes', () => {
    const onSubscriptionChange = jest.fn();
    const model = createMaaSModel({
      id: 'test-model',
      subscriptions: [
        { name: 'basic-sub', displayName: 'Basic Tier' },
        { name: 'premium-sub', displayName: 'Premium Tier' },
      ],
    });
    const otherModel = createMaaSModel({
      id: 'other-model',
      subscriptions: [{ name: 'different-sub', displayName: 'Different' }],
    });

    const { rerender } = render(
      <TestWrapper maasModels={[model, otherModel]}>
        <SubscriptionDropdown
          selectedModel="maas-provider/test-model"
          selectedSubscription="premium-sub"
          onSubscriptionChange={onSubscriptionChange}
        />
      </TestWrapper>,
    );

    onSubscriptionChange.mockClear();

    rerender(
      <TestWrapper maasModels={[model, otherModel]}>
        <SubscriptionDropdown
          selectedModel="maas-provider/other-model"
          selectedSubscription="premium-sub"
          onSubscriptionChange={onSubscriptionChange}
        />
      </TestWrapper>,
    );

    expect(onSubscriptionChange).toHaveBeenCalledWith('different-sub');
  });

  it('resolves MaaS model via splitLlamaModelId from LSD-style model ID', () => {
    const model = createMaaSModel({
      id: 'my-actual-model',
      subscriptions: [{ name: 'sub-1', displayName: 'Subscription One' }],
    });

    const onSubscriptionChange = jest.fn();
    render(
      <TestWrapper maasModels={[model]}>
        <SubscriptionDropdown
          selectedModel="maas-provider/my-actual-model"
          selectedSubscription=""
          onSubscriptionChange={onSubscriptionChange}
        />
      </TestWrapper>,
    );

    expect(onSubscriptionChange).toHaveBeenCalledWith('sub-1');
  });

  it('renders help label icon with appropriate content', () => {
    const model = createMaaSModel({
      id: 'test-model',
      subscriptions: [{ name: 'sub-1', displayName: 'Sub One' }],
    });

    render(
      <TestWrapper maasModels={[model]}>
        <SubscriptionDropdown {...defaultProps} selectedSubscription="sub-1" />
      </TestWrapper>,
    );

    expect(screen.getByTestId('help-label-icon')).toBeInTheDocument();
  });
});
