/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatbotConfigurationTableRow from '~/app/Chatbot/components/chatbotConfiguration/ChatbotConfigurationTableRow';
import { AIModel } from '~/app/types';

jest.mock('mod-arch-shared', () => ({
  ...jest.requireActual('mod-arch-shared'),
  CheckboxTd: ({
    id,
    isChecked,
    isDisabled,
    onToggle,
  }: {
    id: string;
    isChecked: boolean;
    isDisabled: boolean;
    onToggle: () => void;
  }) => (
    <td>
      <input
        type="checkbox"
        data-testid={`checkbox-${id}`}
        checked={isChecked}
        disabled={isDisabled}
        onChange={onToggle}
      />
    </td>
  ),
  ResourceNameTooltip: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  TableRowTitleDescription: ({
    title,
    description,
  }: {
    title: React.ReactNode;
    description?: string;
  }) => (
    <div>
      <div data-testid="title">{title}</div>
      {description && <div data-testid="description">{description}</div>}
    </div>
  ),
}));

const createMockAIModel = (overrides: Partial<AIModel>): AIModel => ({
  model_name: 'test-model',
  model_id: 'test-model-id',
  display_name: 'Test Model',
  serving_runtime: 'kserve',
  api_protocol: 'v2',
  version: 'v1',
  usecase: 'llm',
  description: 'Test model description',
  endpoints: [],
  status: 'Running',
  sa_token: {
    name: 'token',
    token_name: 'token',
    token: 'test-token',
  },
  ...overrides,
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <table>
    <tbody>{children}</tbody>
  </table>
);

describe('ChatbotConfigurationTableRow', () => {
  const defaultProps = {
    model: createMockAIModel({}),
    isChecked: false,
    onToggleCheck: jest.fn(),
    onMaxTokensChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders model information correctly', () => {
    render(
      <TestWrapper>
        <ChatbotConfigurationTableRow {...defaultProps} />
      </TestWrapper>,
    );

    expect(screen.getByText('Test Model')).toBeInTheDocument();
    expect(screen.getByText('Test model description')).toBeInTheDocument();
    expect(screen.getByText('llm')).toBeInTheDocument();
  });

  it('renders MaaS badge for MaaS models', () => {
    const maasModel = createMockAIModel({
      isMaaSModel: true,
      display_name: 'MaaS Test Model',
    });

    render(
      <TestWrapper>
        <ChatbotConfigurationTableRow {...defaultProps} model={maasModel} />
      </TestWrapper>,
    );

    expect(screen.getByText('MaaS Test Model')).toBeInTheDocument();
    expect(screen.getByLabelText('Model as a Service')).toBeInTheDocument();
  });

  it('does not render MaaS badge for regular models', () => {
    render(
      <TestWrapper>
        <ChatbotConfigurationTableRow {...defaultProps} />
      </TestWrapper>,
    );

    expect(screen.queryByLabelText('Model as a Service')).not.toBeInTheDocument();
  });

  it('enables checkbox for running models', () => {
    const runningModel = createMockAIModel({ status: 'Running' });

    render(
      <TestWrapper>
        <ChatbotConfigurationTableRow {...defaultProps} model={runningModel} />
      </TestWrapper>,
    );

    const checkbox = screen.getByTestId('checkbox-test-model');
    expect(checkbox).not.toBeDisabled();
  });

  it('checkbox is checked when isChecked is true', () => {
    render(
      <TestWrapper>
        <ChatbotConfigurationTableRow {...defaultProps} isChecked />
      </TestWrapper>,
    );

    const checkbox = screen.getByTestId('checkbox-test-model');
    expect(checkbox).toBeChecked();
  });

  it('checkbox is disabled for stopped models', () => {
    const stoppedModel = createMockAIModel({ status: 'Stop' });

    render(
      <TestWrapper>
        <ChatbotConfigurationTableRow {...defaultProps} model={stoppedModel} />
      </TestWrapper>,
    );

    const checkbox = screen.getByTestId('checkbox-test-model');
    expect(checkbox).toBeDisabled();
  });

  it('calls onToggleCheck when checkbox is clicked', async () => {
    const user = userEvent.setup();
    const mockOnToggleCheck = jest.fn();

    render(
      <TestWrapper>
        <ChatbotConfigurationTableRow {...defaultProps} onToggleCheck={mockOnToggleCheck} />
      </TestWrapper>,
    );

    const checkbox = screen.getByTestId('checkbox-test-model');
    await user.click(checkbox);

    expect(mockOnToggleCheck).toHaveBeenCalledTimes(1);
  });

  describe('max_tokens input', () => {
    const mockOnMaxTokensChange = jest.fn();

    beforeEach(() => {
      mockOnMaxTokensChange.mockClear();
    });

    it('does not show max_tokens input when model is not checked', () => {
      render(
        <TestWrapper>
          <ChatbotConfigurationTableRow
            {...defaultProps}
            isChecked={false}
            onMaxTokensChange={mockOnMaxTokensChange}
          />
        </TestWrapper>,
      );

      expect(screen.queryByTestId('test-model-max-tokens-input')).not.toBeInTheDocument();
    });

    it('shows max_tokens input when model is checked', () => {
      render(
        <TestWrapper>
          <ChatbotConfigurationTableRow
            {...defaultProps}
            isChecked
            onMaxTokensChange={mockOnMaxTokensChange}
          />
        </TestWrapper>,
      );

      const input = screen.getByTestId('test-model-max-tokens-input');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('placeholder', '');
    });

    it('displays existing max_tokens value when provided', () => {
      render(
        <TestWrapper>
          <ChatbotConfigurationTableRow
            {...defaultProps}
            isChecked
            maxTokens={8192}
            onMaxTokensChange={mockOnMaxTokensChange}
          />
        </TestWrapper>,
      );

      const input = screen.getByTestId('test-model-max-tokens-input') as HTMLInputElement;
      expect(input.value).toBe('8192');
    });

    it('calls onMaxTokensChange with valid value when user enters valid number', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ChatbotConfigurationTableRow
            {...defaultProps}
            isChecked
            onMaxTokensChange={mockOnMaxTokensChange}
          />
        </TestWrapper>,
      );

      const input = screen.getByTestId('test-model-max-tokens-input');
      await user.type(input, '4096');

      expect(mockOnMaxTokensChange).toHaveBeenCalledWith(4096);
    });

    it('calls onMaxTokensChange with undefined when input is cleared', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ChatbotConfigurationTableRow
            {...defaultProps}
            isChecked
            maxTokens={8192}
            onMaxTokensChange={mockOnMaxTokensChange}
          />
        </TestWrapper>,
      );

      const input = screen.getByTestId('test-model-max-tokens-input');
      await user.clear(input);

      expect(mockOnMaxTokensChange).toHaveBeenCalledWith(undefined);
    });

    it('shows error validation for value below minimum (128)', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ChatbotConfigurationTableRow
            {...defaultProps}
            isChecked
            onMaxTokensChange={mockOnMaxTokensChange}
          />
        </TestWrapper>,
      );

      const input = screen.getByTestId('test-model-max-tokens-input');
      await user.type(input, '127');

      expect(screen.getByText('Minimum: 128')).toBeInTheDocument();
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(mockOnMaxTokensChange).not.toHaveBeenCalled();
    });

    it('shows error validation for value above maximum (128000)', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ChatbotConfigurationTableRow
            {...defaultProps}
            isChecked
            onMaxTokensChange={mockOnMaxTokensChange}
          />
        </TestWrapper>,
      );

      const input = screen.getByTestId('test-model-max-tokens-input');
      await user.type(input, '128001');

      expect(screen.getByText('Maximum: 128,000')).toBeInTheDocument();
      expect(input).toHaveAttribute('aria-invalid', 'true');
      // The callback is called for intermediate valid values (128, 1280, 12800, 128000) as the user types
      expect(mockOnMaxTokensChange).toHaveBeenCalled();
      // But not for the final invalid value 128001
      expect(mockOnMaxTokensChange).not.toHaveBeenCalledWith(128001);
    });

    it('accepts boundary values (128 and 128000)', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ChatbotConfigurationTableRow
            {...defaultProps}
            isChecked
            onMaxTokensChange={mockOnMaxTokensChange}
          />
        </TestWrapper>,
      );

      const input = screen.getByTestId('test-model-max-tokens-input');

      // Test minimum boundary
      await user.clear(input);
      await user.type(input, '128');
      expect(mockOnMaxTokensChange).toHaveBeenCalledWith(128);

      // Test maximum boundary
      mockOnMaxTokensChange.mockClear();
      await user.clear(input);
      await user.type(input, '128000');
      expect(mockOnMaxTokensChange).toHaveBeenCalledWith(128000);
    });

    it('shows error for invalid number input', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ChatbotConfigurationTableRow
            {...defaultProps}
            isChecked
            onMaxTokensChange={mockOnMaxTokensChange}
          />
        </TestWrapper>,
      );

      const input = screen.getByTestId('test-model-max-tokens-input');
      await user.type(input, 'abc');

      expect(screen.getByText('Must be a valid number')).toBeInTheDocument();
      expect(mockOnMaxTokensChange).not.toHaveBeenCalled();
    });
  });
});
