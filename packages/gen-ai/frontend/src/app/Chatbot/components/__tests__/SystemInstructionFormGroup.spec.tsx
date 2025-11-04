import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireSimpleTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import SystemInstructionFormGroup from '~/app/Chatbot/components/SystemInstructionFormGroup';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireSimpleTrackingEvent: jest.fn(),
}));

const mockFireSimpleTrackingEvent = jest.mocked(fireSimpleTrackingEvent);

describe('SystemInstructionFormGroup', () => {
  const defaultProps = {
    systemInstruction: 'You are a helpful assistant.',
    onSystemInstructionChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders textarea with correct value', () => {
    render(<SystemInstructionFormGroup {...defaultProps} />);

    const textarea = screen.getByRole('textbox', { name: /system instructions input/i });
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue('You are a helpful assistant.');
  });

  it('calls onChange when text is typed', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();

    render(
      <SystemInstructionFormGroup {...defaultProps} onSystemInstructionChange={mockOnChange} />,
    );

    const textarea = screen.getByRole('textbox', { name: /system instructions input/i });
    await user.clear(textarea);
    await user.type(textarea, 'New instructions');

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('fires tracking event when textarea is focused', async () => {
    const user = userEvent.setup();
    render(<SystemInstructionFormGroup {...defaultProps} />);

    const textarea = screen.getByRole('textbox', { name: /system instructions input/i });
    await user.click(textarea);

    expect(mockFireSimpleTrackingEvent).toHaveBeenCalledWith('Playground Prompt Area Selected');
  });

  it('renders with empty value', () => {
    render(<SystemInstructionFormGroup {...defaultProps} systemInstruction="" />);

    const textarea = screen.getByRole('textbox', { name: /system instructions input/i });
    expect(textarea).toHaveValue('');
  });
});
