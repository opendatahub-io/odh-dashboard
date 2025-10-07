import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModelParameterFormGroup from '~/app/Chatbot/components/ModelParameterFormGroup';

describe('ModelParameterFormGroup', () => {
  const defaultProps = {
    fieldId: 'temperature',
    label: 'Temperature',
    helpText: 'This controls the randomness of the model output.',
    value: 0.5,
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all components correctly', () => {
    render(<ModelParameterFormGroup {...defaultProps} />);

    // Check that all main components are present
    expect(screen.getByText('Temperature')).toBeInTheDocument();
    expect(screen.getByRole('slider')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /more info for temperature field/i }),
    ).toBeInTheDocument();

    // Check initial values
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0.5');
    expect(screen.getByRole('spinbutton')).toHaveValue(0.5);
  });

  it('shows help text when help button is clicked', async () => {
    const user = userEvent.setup();
    render(<ModelParameterFormGroup {...defaultProps} />);

    const helpButton = screen.getByRole('button', { name: /more info for temperature field/i });
    await user.click(helpButton);

    expect(
      screen.getByText('This controls the randomness of the model output.'),
    ).toBeInTheDocument();
  });

  it('calls onChange when slider is interacted with', () => {
    const mockOnChange = jest.fn();
    render(<ModelParameterFormGroup {...defaultProps} onChange={mockOnChange} />);

    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('calls onChange when text input value changes', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    render(<ModelParameterFormGroup {...defaultProps} onChange={mockOnChange} />);

    const textInput = screen.getByRole('spinbutton');
    await user.clear(textInput);
    await user.type(textInput, '1');

    expect(mockOnChange).toHaveBeenCalled();
  });
});
