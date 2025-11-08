/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { GenAiContext } from '~/app/context/GenAiContext';
import type { AIModel, LlamaModel, MaaSModel } from '~/app/types';
import AIModelsTable from '~/app/AIAssets/components/AIModelsTable';
import useAIModelsFilter from '~/app/AIAssets/hooks/useAIModelsFilter';
import { mockGenAiContextValue } from '~/__mocks__/mockGenAiContext';

jest.mock('~/app/AIAssets/hooks/useAIModelsFilter');

const mockUseAIModelsFilter = jest.mocked(useAIModelsFilter);

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MemoryRouter>
    <GenAiContext.Provider value={mockGenAiContextValue}>{children}</GenAiContext.Provider>
  </MemoryRouter>
);

const createMockAIModel = (overrides?: Partial<AIModel>): AIModel => ({
  model_name: 'test-model',
  model_id: 'test-model-id',
  serving_runtime: 'kserve',
  api_protocol: 'v2',
  version: 'v1',
  usecase: 'llm',
  description: 'Test model description',
  endpoints: [],
  status: 'Running',
  display_name: 'Test Model',
  sa_token: {
    name: 'token-name',
    token_name: 'token',
    token: 'test-token',
  },
  ...overrides,
});

describe('AIModelsTable', () => {
  const defaultProps = {
    aiModels: [],
    maasModels: [] as MaaSModel[],
    playgroundModels: [] as LlamaModel[],
    lsdStatus: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAIModelsFilter.mockReturnValue({
      filterData: {},
      onFilterUpdate: jest.fn(),
      onClearFilters: jest.fn(),
      filteredModels: [],
    });
  });

  it('should render empty table when no models', () => {
    render(
      <TestWrapper>
        <AIModelsTable {...defaultProps} />
      </TestWrapper>,
    );

    expect(screen.queryByText('Model 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Model 2')).not.toBeInTheDocument();
  });

  it('should render all models when no filters applied', () => {
    const models = [
      createMockAIModel({ model_id: 'model-1', display_name: 'Model 1' }),
      createMockAIModel({ model_id: 'model-2', display_name: 'Model 2' }),
    ];

    mockUseAIModelsFilter.mockReturnValue({
      filterData: {},
      onFilterUpdate: jest.fn(),
      onClearFilters: jest.fn(),
      filteredModels: models, // All models returned
    });

    render(
      <TestWrapper>
        <AIModelsTable {...defaultProps} aiModels={models} />
      </TestWrapper>,
    );

    expect(screen.getByText('Model 1')).toBeInTheDocument();
    expect(screen.getByText('Model 2')).toBeInTheDocument();
    expect(mockUseAIModelsFilter).toHaveBeenCalledWith(models);
  });

  it('should render only filtered models from hook', () => {
    const models = [
      createMockAIModel({ model_id: 'model-1', display_name: 'Model 1' }),
      createMockAIModel({ model_id: 'model-2', display_name: 'Model 2' }),
    ];

    mockUseAIModelsFilter.mockReturnValue({
      filterData: { name: 'Model 1' },
      onFilterUpdate: jest.fn(),
      onClearFilters: jest.fn(),
      filteredModels: [models[0]], // Only first model filtered
    });

    render(
      <TestWrapper>
        <AIModelsTable {...defaultProps} aiModels={models} />
      </TestWrapper>,
    );

    expect(screen.getByText('Model 1')).toBeInTheDocument();
    expect(screen.queryByText('Model 2')).not.toBeInTheDocument();
  });
});
