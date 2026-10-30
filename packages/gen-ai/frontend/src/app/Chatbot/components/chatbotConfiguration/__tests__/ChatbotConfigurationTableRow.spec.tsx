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
  model_source_type: 'namespace',
  ...overrides,
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <table>
    <tbody>{children}</tbody>
  </table>
);

describe('ChatbotConfigurationTableRow', () => {
  const defaultProps = {
    model: createMockAIModel({ model_source_type: 'namespace' }),
    isChecked: false,
    onToggleCheck: jest.fn(),
    modelType: 'Inference',
    onModelTypeChange: jest.fn(),
    onEmbeddingDimensionChange: jest.fn(),
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

  it('renders display name for MaaS models without a source badge', () => {
    const maasModel = createMockAIModel({
      model_source_type: 'maas',
      display_name: 'MaaS Test Model',
    });

    render(
      <TestWrapper>
        <ChatbotConfigurationTableRow {...defaultProps} model={maasModel} />
      </TestWrapper>,
    );

    expect(screen.getByText('MaaS Test Model')).toBeInTheDocument();
    expect(screen.queryByTestId('model-source-badge')).not.toBeInTheDocument();
  });

  it('renders display name for custom endpoint models without a source badge', () => {
    const customEndpointModel = createMockAIModel({
      model_source_type: 'custom_endpoint',
      display_name: 'Custom Endpoint Model',
    });

    render(
      <TestWrapper>
        <ChatbotConfigurationTableRow {...defaultProps} model={customEndpointModel} />
      </TestWrapper>,
    );

    expect(screen.getByText('Custom Endpoint Model')).toBeInTheDocument();
    expect(screen.queryByTestId('model-source-badge')).not.toBeInTheDocument();
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

  it('does not render an installation-time max tokens input for a selected model', () => {
    render(
      <TestWrapper>
        <ChatbotConfigurationTableRow {...defaultProps} isChecked />
      </TestWrapper>,
    );

    expect(screen.queryByTestId('test-model-max-tokens-input')).not.toBeInTheDocument();
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
});
