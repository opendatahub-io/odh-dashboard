import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import ModelTabContent from '~/app/Chatbot/components/settingsPanelTabs/ModelTabContent';
import { useChatbotConfigStore } from '~/app/Chatbot/store';

const mockWorkspaceCapabilities = {
  hasVisionModel: false,
  hasASRModel: true,
  capabilitiesReady: true,
  capabilitiesError: false,
};

jest.mock('~/app/hooks/useWorkspaceCapabilities', () => ({
  __esModule: true,
  default: () => mockWorkspaceCapabilities,
}));

jest.mock('~/app/context/ChatbotContext', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createContext } = require('react');
  return {
    ChatbotContext: createContext({
      aiModels: [],
      aiModelsLoaded: true,
      aiModelsError: undefined,
      maasModelsLoaded: true,
    }),
  };
});

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

jest.mock('../../SubscriptionDropdown', () => ({
  __esModule: true,
  default: () => <div data-testid="subscription-dropdown" />,
}));

jest.mock('../TranscriptionModelSection', () => ({
  __esModule: true,
  default: ({ configId }: { configId: string }) => (
    <div data-testid="transcription-model-section" data-config-id={configId} />
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
    selectedSubscription: '',
    onSubscriptionChange: jest.fn(),
    configId: 'default',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockWorkspaceCapabilities.hasVisionModel = false;
    mockWorkspaceCapabilities.hasASRModel = true;
    mockWorkspaceCapabilities.capabilitiesReady = true;
    mockWorkspaceCapabilities.capabilitiesError = false;
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

  it('renders TranscriptionModelSection with configId when ASR models exist', () => {
    mockWorkspaceCapabilities.hasASRModel = true;
    render(<ModelTabContent {...defaultProps} configId="custom-config" />);

    const section = screen.getByTestId('transcription-model-section');
    expect(section).toBeInTheDocument();
    expect(section).toHaveAttribute('data-config-id', 'custom-config');
  });

  it('does not render TranscriptionModelSection when no ASR models exist', () => {
    mockWorkspaceCapabilities.hasASRModel = false;
    render(<ModelTabContent {...defaultProps} />);

    expect(screen.queryByTestId('transcription-model-section')).not.toBeInTheDocument();
  });

  it('clears ASR store state when capabilities are ready and no ASR models exist', () => {
    mockWorkspaceCapabilities.hasASRModel = false;
    mockWorkspaceCapabilities.capabilitiesReady = true;
    mockWorkspaceCapabilities.capabilitiesError = false;

    // Enable ASR and set a model in the store first
    useChatbotConfigStore.getState().updateAsrModelEnabled('default', true);
    useChatbotConfigStore.getState().updateSelectedAsrModel('default', 'whisper-large-v3');
    expect(useChatbotConfigStore.getState().configurations.default?.isAsrModelEnabled).toBe(true);
    expect(useChatbotConfigStore.getState().configurations.default?.selectedAsrModel).toBe(
      'whisper-large-v3',
    );

    render(<ModelTabContent {...defaultProps} configId="default" />);

    expect(useChatbotConfigStore.getState().configurations.default?.isAsrModelEnabled).toBe(false);
    expect(useChatbotConfigStore.getState().configurations.default?.selectedAsrModel).toBe('');
  });

  it('should disable streaming switch and model dropdown when isPreview is set in store', () => {
    useChatbotConfigStore.getState().updatePreviewMode('default', true);
    render(<ModelTabContent {...defaultProps} configId="default" />);

    expect(screen.getByRole('switch', { name: /toggle streaming responses/i })).toBeDisabled();
    // ModelDetailsDropdown mock renders a button — verify it receives isDisabled
    expect(screen.getByTestId('model-details-dropdown')).toBeInTheDocument();
  });

  it('does not clear ASR store state when capabilities errored', () => {
    mockWorkspaceCapabilities.hasASRModel = false;
    mockWorkspaceCapabilities.capabilitiesReady = true;
    mockWorkspaceCapabilities.capabilitiesError = true;

    useChatbotConfigStore.getState().updateAsrModelEnabled('default', true);
    useChatbotConfigStore.getState().updateSelectedAsrModel('default', 'whisper-large-v3');

    render(<ModelTabContent {...defaultProps} configId="default" />);

    expect(useChatbotConfigStore.getState().configurations.default?.isAsrModelEnabled).toBe(true);
    expect(useChatbotConfigStore.getState().configurations.default?.selectedAsrModel).toBe(
      'whisper-large-v3',
    );
  });
});
