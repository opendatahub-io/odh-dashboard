import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PromptTabContent from '~/app/Chatbot/components/settingsPanelTabs/PromptTabContent';

let mockPromptManagementEnabled = false;
const mockSetIsPromptManagementModalOpen = jest.fn();

jest.mock('@openshift/dynamic-plugin-sdk', () => ({
  useFeatureFlag: jest.fn(() => [mockPromptManagementEnabled]),
}));

jest.mock('~/app/Chatbot/store/usePlaygroundStore', () => ({
  usePlaygroundStore: jest.fn(() => ({
    setIsPromptManagementModalOpen: mockSetIsPromptManagementModalOpen,
  })),
}));

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
    mockPromptManagementEnabled = false;
  });

  it('renders the Prompt title', () => {
    render(<PromptTabContent {...defaultProps} />);

    expect(screen.getByRole('heading', { name: 'Prompt' })).toBeInTheDocument();
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

  it('renders system instructions section with correct test id', () => {
    render(<PromptTabContent {...defaultProps} />);

    expect(screen.getByTestId('system-instructions-section')).toBeInTheDocument();
  });

  describe('promptManagement feature flag', () => {
    it('does not render Load Prompt button when feature flag is disabled', () => {
      mockPromptManagementEnabled = false;
      render(<PromptTabContent {...defaultProps} />);

      expect(screen.queryByRole('button', { name: /load prompt/i })).not.toBeInTheDocument();
    });

    it('renders Load Prompt button when feature flag is enabled', () => {
      mockPromptManagementEnabled = true;
      render(<PromptTabContent {...defaultProps} />);

      expect(screen.getByRole('button', { name: /load prompt/i })).toBeInTheDocument();
    });

    it('calls setIsPromptManagementModalOpen when Load Prompt button is clicked', async () => {
      mockPromptManagementEnabled = true;
      const user = userEvent.setup();
      render(<PromptTabContent {...defaultProps} />);

      const loadPromptButton = screen.getByRole('button', { name: /load prompt/i });
      await user.click(loadPromptButton);

      expect(mockSetIsPromptManagementModalOpen).toHaveBeenCalledWith(true);
    });
  });
});
