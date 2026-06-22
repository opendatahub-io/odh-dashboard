import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PromptVariableInputPanel from '~/app/Chatbot/components/PromptVariableInputPanel';

describe('PromptVariableInputPanel', () => {
  const defaultProps = {
    systemInstruction: 'You are a {{role}} assistant for {{topic}}.',
    variableValues: {},
    onVariableValuesChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render one input per unique variable', () => {
    render(<PromptVariableInputPanel {...defaultProps} />);

    expect(screen.getByTestId('prompt-variable-input-role')).toBeInTheDocument();
    expect(screen.getByTestId('prompt-variable-input-topic')).toBeInTheDocument();
  });

  it('should display the variable count badge', () => {
    render(<PromptVariableInputPanel {...defaultProps} />);

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should render nothing when no variables are present', () => {
    render(
      <PromptVariableInputPanel
        {...defaultProps}
        systemInstruction="You are a helpful assistant."
      />,
    );

    expect(screen.queryByTestId('prompt-variable-input-panel')).not.toBeInTheDocument();
  });

  it('should render nothing for empty system instruction', () => {
    render(<PromptVariableInputPanel {...defaultProps} systemInstruction="" />);

    expect(screen.queryByTestId('prompt-variable-input-panel')).not.toBeInTheDocument();
  });

  it('should display existing variable values', () => {
    render(
      <PromptVariableInputPanel
        {...defaultProps}
        variableValues={{ role: 'coding', topic: 'TypeScript' }}
      />,
    );

    expect(screen.getByTestId('prompt-variable-input-role')).toHaveValue('coding');
    expect(screen.getByTestId('prompt-variable-input-topic')).toHaveValue('TypeScript');
  });

  it('should call onVariableValuesChange when a value is entered', async () => {
    const onVariableValuesChange = jest.fn();
    const user = userEvent.setup();

    render(
      <PromptVariableInputPanel
        {...defaultProps}
        onVariableValuesChange={onVariableValuesChange}
      />,
    );

    await user.type(screen.getByTestId('prompt-variable-input-role'), 'c');

    expect(onVariableValuesChange).toHaveBeenCalledWith({ role: 'c' });
  });

  it('should preserve other variable values when one changes', async () => {
    const onVariableValuesChange = jest.fn();
    const user = userEvent.setup();

    render(
      <PromptVariableInputPanel
        {...defaultProps}
        variableValues={{ role: 'coding', topic: 'TS' }}
        onVariableValuesChange={onVariableValuesChange}
      />,
    );

    await user.clear(screen.getByTestId('prompt-variable-input-role'));
    await user.type(screen.getByTestId('prompt-variable-input-role'), 'x');

    expect(onVariableValuesChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ topic: 'TS' }),
    );
  });

  it('should deduplicate variables in the panel', () => {
    render(
      <PromptVariableInputPanel
        {...defaultProps}
        systemInstruction="{{topic}} is great. I love {{topic}}."
      />,
    );

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByTestId('prompt-variable-input-topic')).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
  });

  it('should have accessible labels on each input', () => {
    render(<PromptVariableInputPanel {...defaultProps} />);

    expect(screen.getByLabelText('Value for variable role')).toBeInTheDocument();
    expect(screen.getByLabelText('Value for variable topic')).toBeInTheDocument();
  });

  it('should show placeholder text with variable name', () => {
    render(<PromptVariableInputPanel {...defaultProps} />);

    expect(screen.getByPlaceholderText('Enter value for role')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter value for topic')).toBeInTheDocument();
  });

  it('should disable all variable inputs when isDisabled is true', () => {
    render(<PromptVariableInputPanel {...defaultProps} isDisabled />);

    const inputs = screen.getAllByRole('textbox');
    inputs.forEach((input) => {
      expect(input).toBeDisabled();
    });
  });
});
