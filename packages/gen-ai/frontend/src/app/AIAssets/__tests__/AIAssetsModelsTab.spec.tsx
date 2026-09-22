import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { AIModel } from '~/app/types';
import { GenAiContext } from '~/app/context/GenAiContext';
import useMergedModels from '~/app/hooks/useMergedModels';
import useFetchLlamaModels from '~/app/hooks/useFetchLlamaModels';
import useFetchLSDStatus from '~/app/hooks/useFetchLSDStatus';
import useAiAssetCustomEndpointsEnabled from '~/app/hooks/useAiAssetCustomEndpointsEnabled';
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
  default: ({
    models,
    toolbarActions,
  }: {
    models: AIModel[];
    toolbarActions?: React.ReactNode;
  }) => (
    <div data-testid="models-table">
      {toolbarActions}
      {models.map((model) => (
        <div key={model.model_id} data-testid={`model-${model.model_id}`}>
          {model.display_name}
        </div>
      ))}
    </div>
  ),
}));

jest.mock('~/app/AIAssets/components/CreateExternalEndpointModal', () => ({
  __esModule: true,
  default: ({ isOpen, onSuccess }: { isOpen: boolean; onSuccess: () => void }) =>
    isOpen ? (
      <button type="button" onClick={onSuccess}>
        Mock create endpoint success
      </button>
    ) : null,
}));

const mockUseMergedModels = jest.mocked(useMergedModels);
const mockUseFetchLlamaModels = jest.mocked(useFetchLlamaModels);
const mockUseFetchLSDStatus = jest.mocked(useFetchLSDStatus);
const mockUseAiAssetCustomEndpointsEnabled = jest.mocked(useAiAssetCustomEndpointsEnabled);

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
    mockUseAiAssetCustomEndpointsEnabled.mockReturnValue(false);
  });

  it('should render loading state', () => {
    mockUseMergedModels.mockReturnValue({
      models: [],
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    } as ReturnType<typeof useMergedModels>);

    render(<AIAssetsModelsTab />, { wrapper: TestWrapper });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should render empty state when no models', () => {
    mockUseMergedModels.mockReturnValue({
      models: [],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    } as ReturnType<typeof useMergedModels>);

    render(<AIAssetsModelsTab />, { wrapper: TestWrapper });

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('To begin you must deploy a model')).toBeInTheDocument();
  });

  it('should render error state when fetch fails', () => {
    mockUseMergedModels.mockReturnValue({
      models: [],
      loaded: true,
      error: new Error('Failed to fetch'),
      refresh: jest.fn(),
    } as ReturnType<typeof useMergedModels>);

    render(<AIAssetsModelsTab />, { wrapper: TestWrapper });

    expect(screen.getByText(/unable to load models/i)).toBeInTheDocument();
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
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
      error: undefined,
      refresh: jest.fn(),
    } as ReturnType<typeof useMergedModels>);

    render(<AIAssetsModelsTab />, { wrapper: TestWrapper });

    expect(screen.getByTestId('models-table')).toBeInTheDocument();
    expect(screen.getByTestId('model-model-1')).toBeInTheDocument();
    expect(screen.getByText('Test Model')).toBeInTheDocument();
  });

  it('should refresh merged and playground models after creating an endpoint', () => {
    const refreshMergedModels = jest.fn();
    const refreshPlaygroundModels = jest.fn();
    mockUseAiAssetCustomEndpointsEnabled.mockReturnValue(true);
    mockUseFetchLlamaModels.mockReturnValue({
      data: [],
      loaded: true,
      refresh: refreshPlaygroundModels,
    } as ReturnType<typeof useFetchLlamaModels>);
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
      error: undefined,
      refresh: refreshMergedModels,
    } as ReturnType<typeof useMergedModels>);

    render(<AIAssetsModelsTab />, { wrapper: TestWrapper });

    fireEvent.click(screen.getByTestId('create-endpoint-button'));
    fireEvent.click(screen.getByRole('button', { name: 'Mock create endpoint success' }));

    expect(refreshMergedModels).toHaveBeenCalledTimes(1);
    expect(refreshPlaygroundModels).toHaveBeenCalledTimes(1);
  });
});
