import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import GuardrailsPanel from '~/app/Chatbot/components/guardrails/GuardrailsPanel';
import { useChatbotConfigStore } from '~/app/Chatbot/store';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

jest.mock('~/app/Chatbot/hooks/useDarkMode', () => ({
  __esModule: true,
  default: jest.fn(() => false),
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
    selectedModel,
    onModelChange,
    testId,
  }: {
    selectedModel: string;
    onModelChange: (v: string) => void;
    style?: React.CSSProperties;
    testId?: string;
  }) => (
    <button
      data-testid={testId ?? 'guardrail-model-toggle'}
      onClick={() => onModelChange('model-2')}
    >
      {selectedModel || 'Select a model'}
    </button>
  ),
}));

jest.mock('~/app/Chatbot/components/SubscriptionDropdown', () => ({
  __esModule: true,
  default: () => null,
}));

describe('GuardrailsPanel - Event Tracking', () => {
  const defaultProps = {
    configId: 'default',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useChatbotConfigStore.getState().resetConfiguration();
  });

  describe('Guardrail Model Selection Tracking', () => {
    it('should fire tracking event when a guardrail model is selected', async () => {
      const user = userEvent.setup();
      render(<GuardrailsPanel {...defaultProps} />);

      const modelToggle = screen.getByTestId('guardrail-model-toggle');
      await user.click(modelToggle);

      expect(fireMiscTrackingEvent).toHaveBeenCalledWith(
        'Guardrails Model Dropdown Option Selected',
        {
          selectedModel: 'model-2',
        },
      );
    });
  });

  describe('User Input Guardrails Switch Tracking', () => {
    it('should fire tracking event when user input switch is toggled on', async () => {
      const user = userEvent.setup();
      render(<GuardrailsPanel {...defaultProps} />);

      const inputSwitch = screen.getByTestId('user-input-guardrails-switch');
      await user.click(inputSwitch);

      expect(fireMiscTrackingEvent).toHaveBeenCalledWith('Guardrails Enabled', {
        inputEnabled: true,
        outputEnabled: false,
      });
    });

    it('should fire tracking event when user input switch is toggled off', async () => {
      const user = userEvent.setup();
      useChatbotConfigStore.getState().updateGuardrailUserInputEnabled('default', true);
      render(<GuardrailsPanel {...defaultProps} />);

      const inputSwitch = screen.getByTestId('user-input-guardrails-switch');
      await user.click(inputSwitch);

      expect(fireMiscTrackingEvent).toHaveBeenCalledWith('Guardrails Enabled', {
        inputEnabled: false,
        outputEnabled: false,
      });
    });
  });

  describe('Model Output Guardrails Switch Tracking', () => {
    it('should fire tracking event when model output switch is toggled on', async () => {
      const user = userEvent.setup();
      render(<GuardrailsPanel {...defaultProps} />);

      const outputSwitch = screen.getByTestId('model-output-guardrails-switch');
      await user.click(outputSwitch);

      expect(fireMiscTrackingEvent).toHaveBeenCalledWith('Guardrails Enabled', {
        inputEnabled: false,
        outputEnabled: true,
      });
    });
  });

  describe('No Tracking on Initial Render', () => {
    it('should not fire tracking events when component is rendered', () => {
      render(<GuardrailsPanel {...defaultProps} />);
      expect(fireMiscTrackingEvent).not.toHaveBeenCalled();
    });
  });
});
