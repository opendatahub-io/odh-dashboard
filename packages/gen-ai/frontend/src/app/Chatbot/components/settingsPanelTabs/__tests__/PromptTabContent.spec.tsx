import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PromptTabContent from '~/app/Chatbot/components/settingsPanelTabs/PromptTabContent';

jest.mock('~/app/Chatbot/hooks/useDarkMode', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

jest.mock('../../SystemInstructionFormGroup', () => ({
  __esModule: true,
  default: ({
    systemInstruction,
    onSystemInstructionChange,
  }: {
    systemInstruction: string;
    onSystemInstructionChange: (value: string) => void;
  }) => (
    <div data-testid="system-instruction-form-group">
      <textarea
        data-testid="system-instruction-textarea"
        value={systemInstruction}
        onChange={(e) => onSystemInstructionChange(e.target.value)}
        aria-label="system instructions"
      />
    </div>
  ),
}));

describe('PromptTabContent', () => {
  const defaultProps = {
    systemInstruction: 'You are a helpful assistant.',
    onSystemInstructionChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the System instructions title', () => {
    render(<PromptTabContent {...defaultProps} />);

    expect(screen.getByRole('heading', { name: 'System instructions' })).toBeInTheDocument();
  });

  it('renders Load prompt button', () => {
    render(<PromptTabContent {...defaultProps} />);

    const loadPromptButton = screen.getByTestId('load-prompt-button');
    expect(loadPromptButton).toBeInTheDocument();
    expect(loadPromptButton).toHaveTextContent('Load prompt');
  });

  it('renders SystemInstructionFormGroup with correct props', () => {
    render(<PromptTabContent {...defaultProps} />);

    expect(screen.getByTestId('system-instruction-form-group')).toBeInTheDocument();
    expect(screen.getByTestId('system-instruction-textarea')).toHaveValue(
      'You are a helpful assistant.',
    );
  });

  it('calls onSystemInstructionChange when text changes', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    render(<PromptTabContent {...defaultProps} onSystemInstructionChange={mockOnChange} />);

    const textarea = screen.getByTestId('system-instruction-textarea');
    await user.clear(textarea);
    await user.type(textarea, 'New instructions');

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('renders with empty system instruction', () => {
    render(<PromptTabContent {...defaultProps} systemInstruction="" />);

    expect(screen.getByTestId('system-instruction-textarea')).toHaveValue('');
  });

  it('does not error when Load prompt button is clicked', async () => {
    const user = userEvent.setup();

    render(<PromptTabContent {...defaultProps} />);

    await user.click(screen.getByTestId('load-prompt-button'));

    // Button click should not cause any errors (TODO functionality will be implemented later)
    expect(screen.getByTestId('load-prompt-button')).toBeInTheDocument();
  });

  it('renders system instructions section with correct test id', () => {
    render(<PromptTabContent {...defaultProps} />);

    expect(screen.getByTestId('system-instructions-section')).toBeInTheDocument();
  });
});
