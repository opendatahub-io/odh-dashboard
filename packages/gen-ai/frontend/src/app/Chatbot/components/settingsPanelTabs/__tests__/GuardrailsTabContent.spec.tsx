import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GuardrailsTabContent from '~/app/Chatbot/components/settingsPanelTabs/GuardrailsTabContent';

jest.mock('~/app/Chatbot/hooks/useDarkMode', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

describe('GuardrailsTabContent', () => {
  const defaultProps = {
    guardrailsEnabled: false,
    onGuardrailsToggle: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Guardrails title', () => {
    render(<GuardrailsTabContent {...defaultProps} />);

    expect(screen.getByTestId('guardrails-section-title')).toHaveTextContent('Guardrails');
  });

  it('renders guardrails toggle switch', () => {
    render(<GuardrailsTabContent {...defaultProps} />);

    const guardrailsSwitch = screen.getByTestId('guardrails-toggle-switch');
    expect(guardrailsSwitch).toBeInTheDocument();
  });

  it('renders toggle as unchecked when guardrailsEnabled is false', () => {
    render(<GuardrailsTabContent {...defaultProps} guardrailsEnabled={false} />);

    const guardrailsSwitch = screen.getByTestId('guardrails-toggle-switch');
    expect(guardrailsSwitch).not.toBeChecked();
  });

  it('renders toggle as checked when guardrailsEnabled is true', () => {
    render(<GuardrailsTabContent {...defaultProps} guardrailsEnabled />);

    const guardrailsSwitch = screen.getByTestId('guardrails-toggle-switch');
    expect(guardrailsSwitch).toBeChecked();
  });

  it('calls onGuardrailsToggle with true when enabling guardrails', async () => {
    const user = userEvent.setup();
    const mockOnToggle = jest.fn();
    render(
      <GuardrailsTabContent
        {...defaultProps}
        guardrailsEnabled={false}
        onGuardrailsToggle={mockOnToggle}
      />,
    );

    const guardrailsSwitch = screen.getByTestId('guardrails-toggle-switch');
    await user.click(guardrailsSwitch);

    expect(mockOnToggle).toHaveBeenCalledWith(true);
  });

  it('calls onGuardrailsToggle with false when disabling guardrails', async () => {
    const user = userEvent.setup();
    const mockOnToggle = jest.fn();
    render(
      <GuardrailsTabContent
        {...defaultProps}
        guardrailsEnabled
        onGuardrailsToggle={mockOnToggle}
      />,
    );

    const guardrailsSwitch = screen.getByTestId('guardrails-toggle-switch');
    await user.click(guardrailsSwitch);

    expect(mockOnToggle).toHaveBeenCalledWith(false);
  });

  it('renders placeholder content', () => {
    render(<GuardrailsTabContent {...defaultProps} />);

    expect(screen.getByText('Guardrails content here')).toBeInTheDocument();
  });

  it('switch has correct aria-label', () => {
    render(<GuardrailsTabContent {...defaultProps} />);

    const guardrailsSwitch = screen.getByTestId('guardrails-toggle-switch');
    expect(guardrailsSwitch).toHaveAttribute('aria-label', 'Toggle Guardrails');
  });
});
