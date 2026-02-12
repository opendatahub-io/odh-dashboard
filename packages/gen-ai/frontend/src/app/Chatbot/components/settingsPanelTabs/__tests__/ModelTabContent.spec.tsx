import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import ModelTabContent from '~/app/Chatbot/components/settingsPanelTabs/ModelTabContent';

jest.mock('~/app/Chatbot/hooks/useDarkMode', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

jest.mock('../../ModelParameterFormGroup', () => ({
  __esModule: true,
  default: ({
    value,
    onChange,
    label,
  }: {
    value: number;
    onChange: (value: number) => void;
    label: string;
  }) => (
    <div data-testid="model-parameter-form-group">
      <span data-testid="temperature-label">{label}</span>
      <span data-testid="temperature-value">{value}</span>
      <button data-testid="change-temperature-button" onClick={() => onChange(1.5)}>
        Change Temperature
      </button>
    </div>
  ),
}));

jest.mock('../../ModelDetailsDropdown', () => ({
  __esModule: true,
  default: ({
    selectedModel,
    onModelChange,
  }: {
    selectedModel: string;
    onModelChange: (model: string) => void;
  }) => (
    <div data-testid="model-details-dropdown">
      <span data-testid="selected-model">{selectedModel}</span>
      <button data-testid="change-model-button" onClick={() => onModelChange('new-model')}>
        Change Model
      </button>
    </div>
  ),
}));

const mockFireMiscTrackingEvent = jest.mocked(fireMiscTrackingEvent);

describe('ModelTabContent', () => {
  const defaultProps = {
    temperature: 1.0,
    onTemperatureChange: jest.fn(),
    isStreamingEnabled: true,
    onStreamingToggle: jest.fn(),
    selectedModel: 'test-model',
    onModelChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Model title', () => {
    render(<ModelTabContent {...defaultProps} />);

    expect(screen.getByRole('heading', { name: 'Model' })).toBeInTheDocument();
  });

  it('renders ModelParameterFormGroup with correct temperature props', () => {
    render(<ModelTabContent {...defaultProps} />);

    expect(screen.getByTestId('model-parameter-form-group')).toBeInTheDocument();
    expect(screen.getByTestId('temperature-value')).toHaveTextContent('1');
    expect(screen.getByTestId('temperature-label')).toHaveTextContent('Temperature: 0 - 2');
  });

  it('renders streaming toggle switch', () => {
    render(<ModelTabContent {...defaultProps} />);

    const streamingSwitch = screen.getByRole('switch', { name: /toggle streaming responses/i });
    expect(streamingSwitch).toBeInTheDocument();
    expect(streamingSwitch).toBeChecked();
  });

  it('renders streaming switch as unchecked when streaming is disabled', () => {
    render(<ModelTabContent {...defaultProps} isStreamingEnabled={false} />);

    const streamingSwitch = screen.getByRole('switch', { name: /toggle streaming responses/i });
    expect(streamingSwitch).not.toBeChecked();
  });

  it('calls onTemperatureChange and fires tracking event when temperature changes', async () => {
    const user = userEvent.setup();
    const mockOnTemperatureChange = jest.fn();
    render(<ModelTabContent {...defaultProps} onTemperatureChange={mockOnTemperatureChange} />);

    await user.click(screen.getByTestId('change-temperature-button'));

    expect(mockOnTemperatureChange).toHaveBeenCalledWith(1.5);
    expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith('Playground Model Parameter Changed', {
      parameter: 'temperature',
      value: 1.5,
    });
  });

  it('calls onStreamingToggle when switch is toggled', async () => {
    const user = userEvent.setup();
    const mockOnStreamingToggle = jest.fn();
    render(<ModelTabContent {...defaultProps} onStreamingToggle={mockOnStreamingToggle} />);

    const streamingSwitch = screen.getByRole('switch', { name: /toggle streaming responses/i });
    await user.click(streamingSwitch);

    expect(mockOnStreamingToggle).toHaveBeenCalledWith(false);
  });

  it('calls onStreamingToggle with true when enabling streaming', async () => {
    const user = userEvent.setup();
    const mockOnStreamingToggle = jest.fn();
    render(
      <ModelTabContent
        {...defaultProps}
        isStreamingEnabled={false}
        onStreamingToggle={mockOnStreamingToggle}
      />,
    );

    const streamingSwitch = screen.getByRole('switch', { name: /toggle streaming responses/i });
    await user.click(streamingSwitch);

    expect(mockOnStreamingToggle).toHaveBeenCalledWith(true);
  });
});
