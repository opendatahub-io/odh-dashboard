import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { AIModel } from '~/app/types';
import { GenAiContext } from '~/app/context/GenAiContext';
import useMergedModels from '~/app/hooks/useMergedModels';
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
jest.mock('~/app/hooks/useMergedModels', () => ({
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

jest.mock('~/app/hooks/useAiAssetCustomEndpointsEnabled', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

// Mock components
jest.mock('~/app/EmptyStates/NoData', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

jest.mock('~/app/AIAssets/components/AIModelsTable', () => ({
  __esModule: true,
  default: ({ models }: { models: AIModel[] }) => (
    <div data-testid="models-table">
      {models.map((model) => (
        <div key={model.model_id} data-testid={`model-${model.model_id}`}>
          {model.display_name}
        </div>
      ))}
    </div>
  ),
}));

const mockUseMergedModels = jest.mocked(useMergedModels);
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
    mockUseMergedModels.mockReturnValue({
      models: [],
      loaded: false,
      aiError: undefined,
      maasError: undefined,
      refresh: jest.fn(),
    } as ReturnType<typeof useMergedModels>);

    render(<AIAssetsModelsTab />, { wrapper: TestWrapper });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should render empty state when no models', () => {
    mockUseMergedModels.mockReturnValue({
      models: [],
      loaded: true,
      aiError: undefined,
      maasError: undefined,
      refresh: jest.fn(),
    } as ReturnType<typeof useMergedModels>);

    render(<AIAssetsModelsTab />, { wrapper: TestWrapper });

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('To begin you must deploy a model')).toBeInTheDocument();
  });

  it('should render error alert when both sources fail', () => {
    mockUseMergedModels.mockReturnValue({
      models: [],
      loaded: true,
      aiError: new Error('Failed to fetch'),
      maasError: new Error('MaaS unavailable'),
      refresh: jest.fn(),
    } as ReturnType<typeof useMergedModels>);

    render(<AIAssetsModelsTab />, { wrapper: TestWrapper });

    expect(screen.getByText(/unable to load models/i)).toBeInTheDocument();
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('should render warning and surviving models when only AI models fail', () => {
    mockUseMergedModels.mockReturnValue({
      models: [
        {
          model_id: 'maas-model-1', // eslint-disable-line camelcase
          model_name: 'maas-model', // eslint-disable-line camelcase
          display_name: 'MaaS Model', // eslint-disable-line camelcase
          status: 'Running',
        },
      ] as AIModel[],
      loaded: true,
      aiError: new Error('AI fetch failed'),
      maasError: undefined,
      refresh: jest.fn(),
    } as ReturnType<typeof useMergedModels>);

    render(<AIAssetsModelsTab />, { wrapper: TestWrapper });

    expect(screen.getByText(/some models may be unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/locally deployed models could not be loaded/i)).toBeInTheDocument();
    expect(screen.getByTestId('models-table')).toBeInTheDocument();
    expect(screen.getByText('MaaS Model')).toBeInTheDocument();
  });

  it('should render warning and surviving models when only MaaS models fail', () => {
    mockUseMergedModels.mockReturnValue({
      models: [
        {
          model_id: 'ai-model-1', // eslint-disable-line camelcase
          model_name: 'ai-model', // eslint-disable-line camelcase
          display_name: 'AI Model', // eslint-disable-line camelcase
          status: 'Running',
        },
      ] as AIModel[],
      loaded: true,
      aiError: undefined,
      maasError: new Error('MaaS fetch failed'),
      refresh: jest.fn(),
    } as ReturnType<typeof useMergedModels>);

    render(<AIAssetsModelsTab />, { wrapper: TestWrapper });

    expect(screen.getByText(/some models may be unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/models as a service could not be loaded/i)).toBeInTheDocument();
    expect(screen.getByTestId('models-table')).toBeInTheDocument();
    expect(screen.getByText('AI Model')).toBeInTheDocument();
  });

  it('should render models table when models exist', () => {
    mockUseMergedModels.mockReturnValue({
      models: [
        {
          model_id: 'model-1', // eslint-disable-line camelcase
          model_name: 'test-model', // eslint-disable-line camelcase
          display_name: 'Test Model', // eslint-disable-line camelcase
          status: 'Running',
        },
      ] as AIModel[],
      loaded: true,
      aiError: undefined,
      maasError: undefined,
      refresh: jest.fn(),
    } as ReturnType<typeof useMergedModels>);

    render(<AIAssetsModelsTab />, { wrapper: TestWrapper });

    expect(screen.getByTestId('models-table')).toBeInTheDocument();
    expect(screen.getByTestId('model-model-1')).toBeInTheDocument();
    expect(screen.getByText('Test Model')).toBeInTheDocument();
  });
});
