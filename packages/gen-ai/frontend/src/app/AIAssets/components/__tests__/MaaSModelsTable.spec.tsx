/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { GenAiContext } from '~/app/context/GenAiContext';
import type { AIModel, LlamaModel, MaaSModel } from '~/app/types';
import MaaSModelsTable from '~/app/AIAssets/components/MaaSModelsTable';
import useMaaSModelsFilter from '~/app/AIAssets/hooks/useMaaSModelsFilter';
import { mockGenAiContextValue } from '~/__mocks__/mockGenAiContext';

jest.mock('~/app/AIAssets/hooks/useMaaSModelsFilter');

const mockUseMaaSModelsFilter = jest.mocked(useMaaSModelsFilter);

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MemoryRouter>
    <GenAiContext.Provider value={mockGenAiContextValue}>{children}</GenAiContext.Provider>
  </MemoryRouter>
);

const createMockMaaSModel = (overrides?: Partial<MaaSModel>): MaaSModel => ({
  id: 'test-maas-model',
  object: 'model',
  created: Date.now(),
  owned_by: 'test-org',
  ready: true,
  url: 'https://example.com/model',
  ...overrides,
});

describe('MaaSModelsTable', () => {
  const defaultProps = {
    maasModels: [],
    playgroundModels: [] as LlamaModel[],
    lsdStatus: null,
    aiModels: [] as AIModel[],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMaaSModelsFilter.mockReturnValue({
      filterData: {},
      onFilterUpdate: jest.fn(),
      onClearFilters: jest.fn(),
      filteredModels: [],
    });
  });

  it('should render empty table when no models', () => {
    render(
      <TestWrapper>
        <MaaSModelsTable {...defaultProps} />
      </TestWrapper>,
    );

    expect(screen.queryByText('model-1')).not.toBeInTheDocument();
    expect(screen.queryByText('model-2')).not.toBeInTheDocument();
  });

  it('should render all models when no filters applied', () => {
    const models = [createMockMaaSModel({ id: 'model-1' }), createMockMaaSModel({ id: 'model-2' })];

    mockUseMaaSModelsFilter.mockReturnValue({
      filterData: {},
      onFilterUpdate: jest.fn(),
      onClearFilters: jest.fn(),
      filteredModels: models, // All models returned
    });

    render(
      <TestWrapper>
        <MaaSModelsTable {...defaultProps} maasModels={models} />
      </TestWrapper>,
    );

    expect(screen.getByText('model-1')).toBeInTheDocument();
    expect(screen.getByText('model-2')).toBeInTheDocument();
    expect(mockUseMaaSModelsFilter).toHaveBeenCalledWith(models);
  });

  it('should render only filtered models from hook', () => {
    const models = [createMockMaaSModel({ id: 'model-1' }), createMockMaaSModel({ id: 'model-2' })];

    mockUseMaaSModelsFilter.mockReturnValue({
      filterData: { name: 'model-1' },
      onFilterUpdate: jest.fn(),
      onClearFilters: jest.fn(),
      filteredModels: [models[0]], // Only first model filtered
    });

    render(
      <TestWrapper>
        <MaaSModelsTable {...defaultProps} maasModels={models} />
      </TestWrapper>,
    );

    expect(screen.getByText('model-1')).toBeInTheDocument();
    expect(screen.queryByText('model-2')).not.toBeInTheDocument();
  });
});
