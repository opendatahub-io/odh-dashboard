import * as React from 'react';
import { render, screen } from '@testing-library/react';
import GuardrailsTabContent from '~/app/Chatbot/components/settingsPanelTabs/GuardrailsTabContent';
import { useChatbotConfigStore } from '~/app/Chatbot/store';

jest.mock('~/app/Chatbot/hooks/useDarkMode', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

describe('GuardrailsTabContent', () => {
  const defaultProps = {
    configId: 'default',
    guardrailModels: ['model-1', 'model-2'],
    guardrailModelsLoaded: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useChatbotConfigStore.getState().resetConfiguration();
  });

  it('renders the Guardrails title', () => {
    render(<GuardrailsTabContent {...defaultProps} />);
    expect(screen.getByTestId('guardrails-section-title')).toHaveTextContent('Guardrails');
  });

  it('renders empty state when no guardrail models are available', () => {
    render(<GuardrailsTabContent {...defaultProps} guardrailModels={[]} />);
    expect(screen.getByTestId('guardrails-empty-state')).toBeInTheDocument();
    expect(screen.getByText('No guardrail configuration found')).toBeInTheDocument();
  });

  it('renders GuardrailsPanel when models are available', () => {
    render(<GuardrailsTabContent {...defaultProps} />);
    expect(screen.getByTestId('guardrail-model-toggle')).toBeInTheDocument();
  });

  it('renders loading spinner while guardrail models are loading', () => {
    render(<GuardrailsTabContent {...defaultProps} guardrailModelsLoaded={false} />);
    expect(screen.getByLabelText('Loading guardrail models')).toBeInTheDocument();
  });

  it('renders input and output guardrails switches when models are available', () => {
    render(<GuardrailsTabContent {...defaultProps} />);
    expect(screen.getByTestId('user-input-guardrails-switch')).toBeInTheDocument();
    expect(screen.getByTestId('model-output-guardrails-switch')).toBeInTheDocument();
  });

  it('renders switches as unchecked by default', () => {
    render(<GuardrailsTabContent {...defaultProps} />);
    expect(screen.getByTestId('user-input-guardrails-switch')).not.toBeChecked();
    expect(screen.getByTestId('model-output-guardrails-switch')).not.toBeChecked();
  });
});
