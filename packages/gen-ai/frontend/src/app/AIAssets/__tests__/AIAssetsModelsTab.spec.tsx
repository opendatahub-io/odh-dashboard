import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { AIModel } from '~/app/types';
import { GenAiContext } from '~/app/context/GenAiContext';
import useFetchAIModels from '~/app/hooks/useFetchAIModels';
import useFetchLlamaModels from '~/app/hooks/useFetchLlamaModels';
import useFetchLSDStatus from '~/app/hooks/useFetchLSDStatus';
import AIAssetsModelsTab from '~/app/AIAssets/AIAssetsModelsTab';
import { mockGenAiContextValue } from '~/__mocks__/mockGenAiContext';

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <GenAiContext.Provider value={mockGenAiContextValue}>
    <MemoryRouter>{children}</MemoryRouter>
  </GenAiContext.Provider>
);

// Mock hooks
jest.mock('~/app/hooks/useFetchAIModels', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('~/app/hooks/useFetchLlamaModels', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('~/app/hooks/useFetchLSDStatus', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock components
jest.mock('~/app/EmptyStates/NoData', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

jest.mock('~/app/AIAssets/components/AIModelsTable', () => ({
  __esModule: true,
  default: ({ aiModels }: { aiModels: AIModel[] }) => (
    <div data-testid="models-table">
      {aiModels.map((model) => (
        <div key={model.model_id} data-testid={`model-${model.model_id}`}>
          {model.display_name}
        </div>
      ))}
    </div>
  ),
}));

const mockUseFetchAIModels = jest.mocked(useFetchAIModels);
const mockUseFetchLlamaModels = jest.mocked(useFetchLlamaModels);
const mockUseFetchLSDStatus = jest.mocked(useFetchLSDStatus);

describe('AIAssetsModelsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFetchLlamaModels.mockReturnValue({
      data: [],
      loaded: true,
      refresh: jest.fn(),
    } as ReturnType<typeof useFetchLlamaModels>);
    mockUseFetchLSDStatus.mockReturnValue({
      data: null,
      loaded: true,
      refresh: jest.fn(),
    } as ReturnType<typeof useFetchLSDStatus>);
  });

  it('should render loading state', () => {
    mockUseFetchAIModels.mockReturnValue({
      data: [],
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    } as ReturnType<typeof useFetchAIModels>);

    render(<AIAssetsModelsTab />, { wrapper: TestWrapper });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should render empty state when no models', () => {
    mockUseFetchAIModels.mockReturnValue({
      data: [],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    } as ReturnType<typeof useFetchAIModels>);

    render(<AIAssetsModelsTab />, { wrapper: TestWrapper });

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('To begin you must deploy a model')).toBeInTheDocument();
  });

  it('should render empty state on error', () => {
    mockUseFetchAIModels.mockReturnValue({
      data: [],
      loaded: true,
      error: new Error('Failed to fetch'),
      refresh: jest.fn(),
    } as ReturnType<typeof useFetchAIModels>);

    render(<AIAssetsModelsTab />, { wrapper: TestWrapper });

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('should render models table when models exist', () => {
    mockUseFetchAIModels.mockReturnValue({
      data: [
        {
          model_id: 'model-1', // eslint-disable-line camelcase
          model_name: 'test-model', // eslint-disable-line camelcase
          display_name: 'Test Model', // eslint-disable-line camelcase
          status: 'Running',
        },
      ] as AIModel[],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    } as ReturnType<typeof useFetchAIModels>);

    render(<AIAssetsModelsTab />, { wrapper: TestWrapper });

    expect(screen.getByTestId('models-table')).toBeInTheDocument();
    expect(screen.getByTestId('model-model-1')).toBeInTheDocument();
    expect(screen.getByText('Test Model')).toBeInTheDocument();
  });
});
