import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import GuardrailsPanel from '~/app/Chatbot/components/guardrails/GuardrailsPanel';
import { useChatbotConfigStore } from '~/app/Chatbot/store';

// Mock tracking
jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

jest.mock('~/app/Chatbot/hooks/useDarkMode', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

describe('GuardrailsPanel - Event Tracking', () => {
  const defaultProps = {
    configId: 'default',
    availableModels: ['model-1', 'model-2', 'model-3'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useChatbotConfigStore.getState().resetConfiguration();
  });

  describe('Guardrail Model Selection Tracking', () => {
    it('should fire tracking event when a guardrail model is selected', async () => {
      const user = userEvent.setup();
      render(<GuardrailsPanel {...defaultProps} />);

      // Open the model dropdown
      const modelToggle = screen.getByTestId('guardrail-model-toggle');
      await user.click(modelToggle);

      // Select a model
      const modelOption = screen.getByText('model-2');
      await user.click(modelOption);

      await waitFor(() => {
        expect(fireMiscTrackingEvent).toHaveBeenCalledWith(
          'Guardrails Model Dropdown Option Selected',
          {
            selectedModel: 'model-2',
          },
        );
      });
    });

    it('should fire tracking event with correct model name when selecting different models', async () => {
      const user = userEvent.setup();
      render(<GuardrailsPanel {...defaultProps} />);

      // Select first model
      const modelToggle = screen.getByTestId('guardrail-model-toggle');
      await user.click(modelToggle);
      const firstModel = screen.getByText('model-1');
      await user.click(firstModel);

      await waitFor(() => {
        expect(fireMiscTrackingEvent).toHaveBeenCalledWith(
          'Guardrails Model Dropdown Option Selected',
          {
            selectedModel: 'model-1',
          },
        );
      });

      // Select different model
      await user.click(modelToggle);
      const secondModel = screen.getByText('model-3');
      await user.click(secondModel);

      await waitFor(() => {
        expect(fireMiscTrackingEvent).toHaveBeenCalledWith(
          'Guardrails Model Dropdown Option Selected',
          {
            selectedModel: 'model-3',
          },
        );
      });

      expect(fireMiscTrackingEvent).toHaveBeenCalledTimes(2);
    });
  });

  describe('User Input Guardrails Toggle Tracking', () => {
    it('should fire tracking event when user input guardrails toggle is enabled', async () => {
      const user = userEvent.setup();
      render(<GuardrailsPanel {...defaultProps} />);

      const userInputSwitch = screen.getByTestId('user-input-guardrails-switch');
      await user.click(userInputSwitch);

      await waitFor(() => {
        expect(fireMiscTrackingEvent).toHaveBeenCalledWith('Guardrails Enabled', {
          inputEnabled: true,
          outputEnabled: false,
        });
      });
    });

    it('should fire tracking event with correct boolean values when toggling', async () => {
      const user = userEvent.setup();
      render(<GuardrailsPanel {...defaultProps} />);

      const userInputSwitch = screen.getByTestId('user-input-guardrails-switch');

      // Verify initial state is unchecked
      expect(userInputSwitch).not.toBeChecked();

      // Click to enable
      await user.click(userInputSwitch);

      await waitFor(() => {
        expect(fireMiscTrackingEvent).toHaveBeenCalledWith('Guardrails Enabled', {
          inputEnabled: true,
          outputEnabled: false,
        });
      });
    });

    it('should track correct state values for both input and output properties', async () => {
      const user = userEvent.setup();
      render(<GuardrailsPanel {...defaultProps} />);

      const outputSwitch = screen.getByTestId('model-output-guardrails-switch');
      const inputSwitch = screen.getByTestId('user-input-guardrails-switch');

      // Enable output guardrails
      await user.click(outputSwitch);

      await waitFor(() => {
        expect(fireMiscTrackingEvent).toHaveBeenCalledWith('Guardrails Enabled', {
          inputEnabled: false,
          outputEnabled: true,
        });
      });

      // Enable input guardrails
      await user.click(inputSwitch);

      await waitFor(() => {
        expect(fireMiscTrackingEvent).toHaveBeenCalledWith('Guardrails Enabled', {
          inputEnabled: true,
          outputEnabled: true,
        });
      });
    });
  });

  describe('Model Output Guardrails Toggle Tracking', () => {
    it('should fire tracking event when model output guardrails toggle is enabled', async () => {
      const user = userEvent.setup();
      render(<GuardrailsPanel {...defaultProps} />);

      const outputSwitch = screen.getByTestId('model-output-guardrails-switch');
      await user.click(outputSwitch);

      await waitFor(() => {
        expect(fireMiscTrackingEvent).toHaveBeenCalledWith('Guardrails Enabled', {
          inputEnabled: false,
          outputEnabled: true,
        });
      });
    });

    it('should fire tracking event with OutputEnabled set correctly', async () => {
      const user = userEvent.setup();
      render(<GuardrailsPanel {...defaultProps} />);

      const outputSwitch = screen.getByTestId('model-output-guardrails-switch');

      // Verify initial state is unchecked
      expect(outputSwitch).not.toBeChecked();

      // Click to enable
      await user.click(outputSwitch);

      await waitFor(() => {
        expect(fireMiscTrackingEvent).toHaveBeenCalledWith('Guardrails Enabled', {
          inputEnabled: false,
          outputEnabled: true,
        });
      });
    });

    it('should track OutputEnabled true when input is already enabled', async () => {
      const user = userEvent.setup();
      render(<GuardrailsPanel {...defaultProps} />);

      const inputSwitch = screen.getByTestId('user-input-guardrails-switch');
      const outputSwitch = screen.getByTestId('model-output-guardrails-switch');

      // Enable input guardrails first
      await user.click(inputSwitch);

      await waitFor(() => {
        expect(fireMiscTrackingEvent).toHaveBeenCalledWith('Guardrails Enabled', {
          inputEnabled: true,
          outputEnabled: false,
        });
      });

      // Enable output guardrails
      await user.click(outputSwitch);

      await waitFor(() => {
        expect(fireMiscTrackingEvent).toHaveBeenCalledWith('Guardrails Enabled', {
          inputEnabled: true,
          outputEnabled: true,
        });
      });
    });
  });

  describe('Info Icon Click Tracking', () => {
    it('should fire tracking event when info icon is clicked', async () => {
      const user = userEvent.setup();
      render(<GuardrailsPanel {...defaultProps} />);

      const infoButton = screen.getByLabelText('More info');
      await user.click(infoButton);

      await waitFor(() => {
        expect(fireMiscTrackingEvent).toHaveBeenCalledWith('Guardrail Model Info Icon Selected', {
          infoClicked: true,
        });
      });
    });

    it('should track multiple info icon clicks', async () => {
      const user = userEvent.setup();
      render(<GuardrailsPanel {...defaultProps} />);

      const infoButton = screen.getByLabelText('More info');

      // Click once
      await user.click(infoButton);

      await waitFor(() => {
        expect(fireMiscTrackingEvent).toHaveBeenCalledWith('Guardrail Model Info Icon Selected', {
          infoClicked: true,
        });
      });

      // Click again
      await user.click(infoButton);

      expect(fireMiscTrackingEvent).toHaveBeenCalledTimes(2);
    });
  });

  describe('Combined Tracking Scenarios', () => {
    it('should track model selection and toggle changes independently', async () => {
      const user = userEvent.setup();
      render(<GuardrailsPanel {...defaultProps} />);

      // Select a model
      const modelToggle = screen.getByTestId('guardrail-model-toggle');
      await user.click(modelToggle);
      const modelOption = screen.getByText('model-1');
      await user.click(modelOption);

      await waitFor(() => {
        expect(fireMiscTrackingEvent).toHaveBeenCalledWith(
          'Guardrails Model Dropdown Option Selected',
          { selectedModel: 'model-1' },
        );
      });

      // Enable input guardrails
      const inputSwitch = screen.getByTestId('user-input-guardrails-switch');
      await user.click(inputSwitch);

      await waitFor(() => {
        expect(fireMiscTrackingEvent).toHaveBeenCalledWith('Guardrails Enabled', {
          inputEnabled: true,
          outputEnabled: false,
        });
        expect(fireMiscTrackingEvent).toHaveBeenCalledTimes(2);
      });

      // Enable output guardrails
      const outputSwitch = screen.getByTestId('model-output-guardrails-switch');
      await user.click(outputSwitch);

      await waitFor(() => {
        expect(fireMiscTrackingEvent).toHaveBeenCalledWith('Guardrails Enabled', {
          inputEnabled: true,
          outputEnabled: true,
        });
        expect(fireMiscTrackingEvent).toHaveBeenCalledTimes(3);
      });
    });

    it('should track user workflow: info icon, model selection, enable guardrails', async () => {
      const user = userEvent.setup();
      render(<GuardrailsPanel {...defaultProps} />);

      // 1. Click info icon
      const infoButton = screen.getByLabelText('More info');
      await user.click(infoButton);

      // 2. Select a model
      const modelToggle = screen.getByTestId('guardrail-model-toggle');
      await user.click(modelToggle);
      const modelOption = screen.getByText('model-2');
      await user.click(modelOption);

      // 3. Enable input guardrails
      const inputSwitch = screen.getByTestId('user-input-guardrails-switch');
      await user.click(inputSwitch);

      await waitFor(() => {
        expect(fireMiscTrackingEvent).toHaveBeenCalledTimes(3);
      });

      // Verify the sequence of events
      expect(fireMiscTrackingEvent).toHaveBeenNthCalledWith(
        1,
        'Guardrail Model Info Icon Selected',
        { infoClicked: true },
      );
      expect(fireMiscTrackingEvent).toHaveBeenNthCalledWith(
        2,
        'Guardrails Model Dropdown Option Selected',
        { selectedModel: 'model-2' },
      );
      expect(fireMiscTrackingEvent).toHaveBeenNthCalledWith(3, 'Guardrails Enabled', {
        inputEnabled: true,
        outputEnabled: false,
      });
    });
  });

  describe('No Tracking on Initial Render', () => {
    it('should not fire tracking events when component is rendered', () => {
      render(<GuardrailsPanel {...defaultProps} />);
      expect(fireMiscTrackingEvent).not.toHaveBeenCalled();
    });

    it('should not fire tracking events when models prop changes', () => {
      const { rerender } = render(<GuardrailsPanel {...defaultProps} />);

      rerender(
        <GuardrailsPanel {...defaultProps} availableModels={['model-4', 'model-5', 'model-6']} />,
      );

      expect(fireMiscTrackingEvent).not.toHaveBeenCalled();
    });
  });
});
