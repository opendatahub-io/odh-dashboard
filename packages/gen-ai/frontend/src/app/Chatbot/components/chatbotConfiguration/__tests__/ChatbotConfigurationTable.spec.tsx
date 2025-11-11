/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatbotConfigurationTable from '~/app/Chatbot/components/chatbotConfiguration/ChatbotConfigurationTable';
import { AIModel } from '~/app/types';

jest.mock('mod-arch-shared', () => ({
  ...jest.requireActual('mod-arch-shared'),
  useCheckboxTableBase: jest.fn((allData, selectedData, setSelectedData, getKey) => ({
    tableProps: {},
    isSelected: (item: AIModel) =>
      selectedData.some((selected: AIModel) => getKey(selected) === getKey(item)),
    toggleSelection: (item: AIModel) => {
      const key = getKey(item);
      if (selectedData.some((selected: AIModel) => getKey(selected) === key)) {
        setSelectedData(selectedData.filter((selected: AIModel) => getKey(selected) !== key));
      } else {
        setSelectedData([...selectedData, item]);
      }
    },
  })),
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

describe('ChatbotConfigurationTable', () => {
  const model1 = createMockAIModel({
    model_name: 'model-1',
    model_id: 'model-1',
    display_name: 'Alpha Model',
  });

  const model2 = createMockAIModel({
    model_name: 'model-2',
    model_id: 'model-2',
    display_name: 'Beta Model',
  });

  const model3 = createMockAIModel({
    model_name: 'model-3',
    model_id: 'model-3',
    display_name: 'Gamma Model',
    status: 'Stop',
  });

  const allModels = [model1, model2, model3];

  const defaultProps = {
    allModels,
    selectedModels: [],
    setSelectedModels: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders table with all models', () => {
    render(<ChatbotConfigurationTable {...defaultProps} />);

    expect(screen.getByText('Available models')).toBeInTheDocument();
    expect(screen.getByText('Alpha Model')).toBeInTheDocument();
    expect(screen.getByText('Beta Model')).toBeInTheDocument();
    expect(screen.getByText('Gamma Model')).toBeInTheDocument();
  });

  it('displays selection count correctly', () => {
    render(<ChatbotConfigurationTable {...defaultProps} selectedModels={[model1]} />);

    expect(screen.getByText('1 out of 3 selected')).toBeInTheDocument();
  });

  it('filters models by search term', async () => {
    const user = userEvent.setup();
    render(<ChatbotConfigurationTable {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Find by name');
    await user.type(searchInput, 'Alpha');

    expect(screen.getByText('Alpha Model')).toBeInTheDocument();
    expect(screen.queryByText('Beta Model')).not.toBeInTheDocument();
    expect(screen.queryByText('Gamma Model')).not.toBeInTheDocument();
  });

  it('clears search filter', async () => {
    const user = userEvent.setup();
    render(<ChatbotConfigurationTable {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Find by name');
    await user.type(searchInput, 'Alpha');

    expect(screen.queryByText('Beta Model')).not.toBeInTheDocument();

    await user.clear(searchInput);

    expect(screen.getByText('Beta Model')).toBeInTheDocument();
  });

  it('handles select all for running models only', () => {
    const mockSetSelectedModels = jest.fn();
    render(
      <ChatbotConfigurationTable {...defaultProps} setSelectedModels={mockSetSelectedModels} />,
    );

    const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all/i });
    expect(selectAllCheckbox).toBeInTheDocument();
  });

  it('filters search case-insensitively', async () => {
    const user = userEvent.setup();
    render(<ChatbotConfigurationTable {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Find by name');
    await user.type(searchInput, 'alpha');

    expect(screen.getByText('Alpha Model')).toBeInTheDocument();
  });

  it('shows empty state when search returns no results', async () => {
    const user = userEvent.setup();
    render(<ChatbotConfigurationTable {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Find by name');
    await user.type(searchInput, 'NonexistentModel');

    expect(screen.queryByText('Alpha Model')).not.toBeInTheDocument();
    expect(screen.queryByText('Beta Model')).not.toBeInTheDocument();
  });
});
