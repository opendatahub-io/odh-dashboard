import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('renders guardrails toggle switch', () => {
    render(<GuardrailsTabContent {...defaultProps} />);
    expect(screen.getByTestId('guardrails-toggle-switch')).toBeInTheDocument();
  });

  it('renders toggle as unchecked when guardrailsEnabled is false in store', () => {
    useChatbotConfigStore.getState().updateGuardrailsEnabled('default', false);
    render(<GuardrailsTabContent {...defaultProps} />);
    expect(screen.getByTestId('guardrails-toggle-switch')).not.toBeChecked();
  });

  it('renders toggle as checked when guardrailsEnabled is true in store', () => {
    useChatbotConfigStore.getState().updateGuardrailsEnabled('default', true);
    render(<GuardrailsTabContent {...defaultProps} />);
    expect(screen.getByTestId('guardrails-toggle-switch')).toBeChecked();
  });

  it('updates store when enabling guardrails via toggle', async () => {
    const user = userEvent.setup();
    useChatbotConfigStore.getState().updateGuardrailsEnabled('default', false);
    render(<GuardrailsTabContent {...defaultProps} />);

    await user.click(screen.getByTestId('guardrails-toggle-switch'));
    expect(useChatbotConfigStore.getState().configurations.default?.guardrailsEnabled).toBe(true);
  });

  it('updates store when disabling guardrails via toggle', async () => {
    const user = userEvent.setup();
    useChatbotConfigStore.getState().updateGuardrailsEnabled('default', true);
    render(<GuardrailsTabContent {...defaultProps} />);

    await user.click(screen.getByTestId('guardrails-toggle-switch'));
    expect(useChatbotConfigStore.getState().configurations.default?.guardrailsEnabled).toBe(false);
  });

  it('renders empty state when no guardrail models are available', () => {
    render(<GuardrailsTabContent {...defaultProps} guardrailModels={[]} />);
    expect(screen.getByTestId('guardrails-empty-state')).toBeInTheDocument();
    expect(screen.getByText('No guardrail configuration found')).toBeInTheDocument();
  });

  it('renders disabled state when guardrails are not enabled but models exist', () => {
    useChatbotConfigStore.getState().updateGuardrailsEnabled('default', false);
    render(<GuardrailsTabContent {...defaultProps} />);
    expect(screen.getByTestId('guardrails-disabled-state')).toBeInTheDocument();
    expect(screen.getByText('Guardrails are not enabled')).toBeInTheDocument();
  });

  it('renders GuardrailsPanel when guardrails are enabled and models exist', () => {
    useChatbotConfigStore.getState().updateGuardrailsEnabled('default', true);
    render(<GuardrailsTabContent {...defaultProps} />);
    expect(screen.getByTestId('guardrail-model-toggle')).toBeInTheDocument();
  });

  it('switch has correct aria-label', () => {
    render(<GuardrailsTabContent {...defaultProps} />);
    expect(screen.getByTestId('guardrails-toggle-switch')).toHaveAttribute(
      'aria-label',
      'Toggle Guardrails',
    );
  });

  it('disables toggle when no guardrail models are available', () => {
    render(<GuardrailsTabContent {...defaultProps} guardrailModels={[]} />);
    expect(screen.getByTestId('guardrails-toggle-switch')).toBeDisabled();
  });

  it('renders loading spinner while guardrail models are loading', () => {
    render(<GuardrailsTabContent {...defaultProps} guardrailModelsLoaded={false} />);
    expect(screen.getByLabelText('Loading guardrail models')).toBeInTheDocument();
  });

  it('disables toggle while guardrail models are loading', () => {
    render(<GuardrailsTabContent {...defaultProps} guardrailModelsLoaded={false} />);
    expect(screen.getByTestId('guardrails-toggle-switch')).toBeDisabled();
  });
});
