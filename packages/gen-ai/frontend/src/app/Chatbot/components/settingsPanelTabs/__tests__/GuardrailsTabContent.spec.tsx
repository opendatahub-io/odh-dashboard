import * as React from 'react';
import { render, screen } from '@testing-library/react';
import GuardrailsTabContent from '~/app/Chatbot/components/settingsPanelTabs/GuardrailsTabContent';
import { useChatbotConfigStore } from '~/app/Chatbot/store';
import { ChatbotContext } from '~/app/context/ChatbotContext';

jest.mock('~/app/Chatbot/hooks/useDarkMode', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/components/FieldGroupHelpLabelIcon', () => ({
  __esModule: true,
  default: ({ onClick }: { content: string; onClick?: () => void }) => (
    <button aria-label="More info" onClick={onClick}>
      Help
    </button>
  ),
}));

jest.mock('~/app/Chatbot/components/ModelDetailsDropdown', () => ({
  __esModule: true,
  default: ({
    testId,
  }: {
    selectedModel: string;
    onModelChange: (v: string) => void;
    style?: React.CSSProperties;
    testId?: string;
  }) => <button data-testid={testId ?? 'guardrail-model-toggle'}>Select a model</button>,
}));

jest.mock('~/app/Chatbot/components/SubscriptionDropdown', () => ({
  __esModule: true,
  default: () => null,
}));

const baseContextValue = {
  lsdStatus: null,
  modelsLoaded: true,
  lsdStatusLoaded: true,
  aiModels: [],
  aiModelsLoaded: true,
  aiModelsError: undefined,
  maasModels: [],
  maasModelsLoaded: true,
  maasModelsError: undefined,
  models: [],
  modelsError: undefined,
  lsdStatusError: undefined,
  nemoGuardrailsStatus: { name: 'nemoguardrails', phase: 'Ready', isReady: true },
  nemoGuardrailsStatusLoaded: true,
  nemoGuardrailsStatusError: undefined,
  refresh: jest.fn(),
  lastInput: '',
  setLastInput: jest.fn(),
};

const renderWithContext = (
  contextOverrides: Partial<React.ContextType<typeof ChatbotContext>> = {},
  configId = 'default',
) =>
  render(
    <ChatbotContext.Provider value={{ ...baseContextValue, ...contextOverrides }}>
      <GuardrailsTabContent configId={configId} />
    </ChatbotContext.Provider>,
  );

describe('GuardrailsTabContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useChatbotConfigStore.getState().resetConfiguration();
  });

  it('renders the Guardrails title when CR exists', () => {
    renderWithContext();
    expect(screen.getByTestId('guardrails-section-title')).toHaveTextContent('Guardrails');
  });

  it('renders GuardrailsPanel with model dropdown when CR exists', () => {
    renderWithContext();
    expect(screen.getByTestId('guardrail-model-toggle')).toBeInTheDocument();
  });

  it('renders input and output guardrails switches when CR exists', () => {
    renderWithContext();
    expect(screen.getByTestId('user-input-guardrails-switch')).toBeInTheDocument();
    expect(screen.getByTestId('model-output-guardrails-switch')).toBeInTheDocument();
  });

  it('renders switches as unchecked by default', () => {
    renderWithContext();
    expect(screen.getByTestId('user-input-guardrails-switch')).not.toBeChecked();
    expect(screen.getByTestId('model-output-guardrails-switch')).not.toBeChecked();
  });

  it('shows loading spinner while status is loading', () => {
    renderWithContext({ nemoGuardrailsStatus: null, nemoGuardrailsStatusLoaded: false });
    expect(screen.getByLabelText('Loading guardrails status')).toBeInTheDocument();
  });

  it('shows not-found empty state when CR does not exist', () => {
    renderWithContext({
      nemoGuardrailsStatus: null,
      nemoGuardrailsStatusLoaded: true,
      nemoGuardrailsStatusError: new Error('NemoGuardrails not found in namespace test'),
    });
    expect(screen.getByTestId('guardrails-empty-state')).toBeInTheDocument();
    expect(screen.getByText('No guardrail configuration found')).toBeInTheDocument();
  });

  it('shows error empty state on non-404 error', () => {
    renderWithContext({
      nemoGuardrailsStatus: null,
      nemoGuardrailsStatusLoaded: true,
      nemoGuardrailsStatusError: new Error('Internal server error'),
    });
    expect(screen.getByTestId('guardrails-error-state')).toBeInTheDocument();
    expect(screen.getByText('Failed to load guardrails')).toBeInTheDocument();
  });
});
