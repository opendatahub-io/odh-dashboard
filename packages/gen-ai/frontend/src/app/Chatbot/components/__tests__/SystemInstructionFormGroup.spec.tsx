import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createTrackingWrapper } from '~/__tests__/unit/testUtils/TrackingProvider';
import SystemInstructionFormGroup from '~/app/Chatbot/components/SystemInstructionFormGroup';

const trackEvent = jest.fn();

const mockFireSimpleTrackingEvent = jest.mocked(trackEvent);

describe('SystemInstructionFormGroup', () => {
  const defaultProps = {
    systemInstruction: 'You are a helpful assistant.',
    onSystemInstructionChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders textarea with correct value', () => {
    render(<SystemInstructionFormGroup {...defaultProps} />, {
      wrapper: createTrackingWrapper(trackEvent),
    });

    const textarea = screen.getByRole('textbox', { name: /system instructions input/i });
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue('You are a helpful assistant.');
  });

  it('calls onChange when text is typed', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();

    render(
      <SystemInstructionFormGroup {...defaultProps} onSystemInstructionChange={mockOnChange} />,
      { wrapper: createTrackingWrapper(trackEvent) },
    );

    const textarea = screen.getByRole('textbox', { name: /system instructions input/i });
    await user.clear(textarea);
    await user.type(textarea, 'New instructions');

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('fires tracking event when textarea is focused', async () => {
    const user = userEvent.setup();
    render(<SystemInstructionFormGroup {...defaultProps} />, {
      wrapper: createTrackingWrapper(trackEvent),
    });

    const textarea = screen.getByRole('textbox', { name: /system instructions input/i });
    await user.click(textarea);

    expect(mockFireSimpleTrackingEvent).toHaveBeenCalledWith('Playground Prompt Area Selected', {});
  });

  it('renders with empty value', () => {
    render(<SystemInstructionFormGroup {...defaultProps} systemInstruction="" />, {
      wrapper: createTrackingWrapper(trackEvent),
    });

    const textarea = screen.getByRole('textbox', { name: /system instructions input/i });
    expect(textarea).toHaveValue('');
  });

  it('should disable the textarea when isDisabled is true', () => {
    render(<SystemInstructionFormGroup {...defaultProps} isDisabled />, {
      wrapper: createTrackingWrapper(trackEvent),
    });

    expect(screen.getByRole('textbox', { name: /system instructions input/i })).toBeDisabled();
  });
});
