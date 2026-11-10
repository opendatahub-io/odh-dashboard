import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { AIModel } from '~/app/types';
import { GenAiContext } from '~/app/context/GenAiContext';
import useMergedModels from '~/app/hooks/useMergedModels';
import useFetchLlamaModels from '~/app/hooks/useFetchLlamaModels';
import useFetchLSDStatus from '~/app/hooks/useFetchLSDStatus';
import useFetchAAEVectorStores from '~/app/hooks/useFetchAAEVectorStores';
import useFetchVectorStores from '~/app/hooks/useFetchVectorStores';
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

jest.mock('~/app/hooks/useFetchAAEVectorStores', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('~/app/hooks/useFetchVectorStores', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('~/app/hooks/useAiAssetCustomEndpointsEnabled', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

jest.mock('~/app/Chatbot/components/chatbotConfiguration/ChatbotConfigurationModal', () => ({
  __esModule: true,
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="configure-playground-modal">
      <button type="button" onClick={onClose}>
        Mock close playground modal
      </button>
    </div>
  ),
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
    showPlaygroundColumn,
  }: {
    models: AIModel[];
    toolbarActions?: React.ReactNode;
    showPlaygroundColumn?: boolean;
  }) => (
    <div data-testid="models-table" data-show-playground-column={showPlaygroundColumn}>
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
const mockUseFetchAAEVectorStores = jest.mocked(useFetchAAEVectorStores);
const mockUseFetchVectorStores = jest.mocked(useFetchVectorStores);
const mockUseAiAssetCustomEndpointsEnabled = jest.mocked(useAiAssetCustomEndpointsEnabled);

const createMockLsdStatus = () => ({
  name: 'test-lsd',
  phase: 'Ready',
  version: 'v1',
  distributionConfig: {
    activeDistribution: 'test-distribution',
    providers: [],
    availableDistributions: {},
  },
});

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
    mockUseFetchAAEVectorStores.mockReturnValue({
      data: [],
      loaded: true,
      refresh: jest.fn(),
    } as ReturnType<typeof useFetchAAEVectorStores>);
    mockUseFetchVectorStores.mockReturnValue([[], true, undefined, jest.fn()] as ReturnType<
      typeof useFetchVectorStores
    >);
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

  it('should hide Playground actions when no project is selected', () => {
    mockUseAiAssetCustomEndpointsEnabled.mockReturnValue(true);
    mockUseMergedModels.mockReturnValue({
      models: [
        {
          model_id: 'maas-model', // eslint-disable-line camelcase
          model_name: 'maas-model', // eslint-disable-line camelcase
          display_name: 'MaaS Model', // eslint-disable-line camelcase
          status: 'Running',
          model_source_type: 'maas', // eslint-disable-line camelcase
        },
      ] as AIModel[],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    } as ReturnType<typeof useMergedModels>);

    render(
      <GenAiContext.Provider value={{ ...mockGenAiContextValue, namespace: undefined }}>
        <MemoryRouter>
          <AIAssetsModelsTab />
        </MemoryRouter>
      </GenAiContext.Provider>,
    );

    expect(screen.getByTestId('models-table')).toHaveAttribute(
      'data-show-playground-column',
      'false',
    );
    expect(screen.queryByTestId('create-endpoint-button')).not.toBeInTheDocument();
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

  describe('Create playground', () => {
    const renderWithModels = (customEndpointsEnabled = true) => {
      mockUseAiAssetCustomEndpointsEnabled.mockReturnValue(customEndpointsEnabled);
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
    };

    it('should show a primary Create playground button when the playground is not created', () => {
      renderWithModels();

      const createPlaygroundButton = screen.getByTestId('create-playground-button');
      expect(createPlaygroundButton).toBeInTheDocument();
      expect(createPlaygroundButton).toHaveTextContent('Create playground');
      expect(createPlaygroundButton.closest('button')).not.toBeDisabled();
    });

    it('should render the Create endpoint button as a tertiary button while Create playground is shown', () => {
      renderWithModels();

      expect(screen.getByTestId('create-playground-button').closest('button')).toHaveClass(
        'pf-m-primary',
      );
      expect(screen.getByTestId('create-endpoint-button').closest('button')).toHaveClass(
        'pf-m-tertiary',
      );
    });

    it('should hide the Create playground button once the playground is created', () => {
      mockUseFetchLSDStatus.mockReturnValue({
        data: createMockLsdStatus(),
        loaded: true,
        refresh: jest.fn(),
      } as ReturnType<typeof useFetchLSDStatus>);
      renderWithModels();

      expect(screen.queryByTestId('create-playground-button')).not.toBeInTheDocument();
      expect(screen.getByTestId('create-endpoint-button')).toBeInTheDocument();
    });

    it('should render the Create endpoint button as a primary button once the playground is created', () => {
      mockUseFetchLSDStatus.mockReturnValue({
        data: createMockLsdStatus(),
        loaded: true,
        refresh: jest.fn(),
      } as ReturnType<typeof useFetchLSDStatus>);
      renderWithModels();

      expect(screen.getByTestId('create-endpoint-button').closest('button')).toHaveClass(
        'pf-m-primary',
      );
      expect(screen.getByTestId('create-endpoint-button').closest('button')).not.toHaveClass(
        'pf-m-tertiary',
      );
    });

    it('should show the Create playground button when custom endpoints are disabled and the playground is not created', () => {
      renderWithModels(false);

      const createPlaygroundButton = screen.getByTestId('create-playground-button');
      expect(createPlaygroundButton).toBeInTheDocument();
      expect(createPlaygroundButton.closest('button')).not.toBeDisabled();
    });

    it('should hide the Create endpoint button when custom endpoints are disabled', () => {
      renderWithModels(false);

      expect(screen.queryByTestId('create-endpoint-button')).not.toBeInTheDocument();
    });

    it('should hide all toolbar actions when custom endpoints are disabled and the playground is created', () => {
      mockUseFetchLSDStatus.mockReturnValue({
        data: createMockLsdStatus(),
        loaded: true,
        refresh: jest.fn(),
      } as ReturnType<typeof useFetchLSDStatus>);
      renderWithModels(false);

      expect(screen.queryByTestId('create-playground-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('create-endpoint-button')).not.toBeInTheDocument();
    });

    it('should open the playground configuration modal when Create playground is clicked', () => {
      renderWithModels();

      fireEvent.click(screen.getByTestId('create-playground-button'));

      expect(screen.getByTestId('configure-playground-modal')).toBeInTheDocument();
    });

    it('should close the playground configuration modal and refresh state on close', () => {
      const refreshLsdStatus = jest.fn();
      const refreshPlaygroundModels = jest.fn();
      mockUseFetchLSDStatus.mockReturnValue({
        data: null,
        loaded: true,
        refresh: refreshLsdStatus,
      } as ReturnType<typeof useFetchLSDStatus>);
      mockUseFetchLlamaModels.mockReturnValue({
        data: [],
        loaded: true,
        refresh: refreshPlaygroundModels,
      } as ReturnType<typeof useFetchLlamaModels>);
      renderWithModels();

      fireEvent.click(screen.getByTestId('create-playground-button'));
      fireEvent.click(screen.getByRole('button', { name: 'Mock close playground modal' }));

      expect(screen.queryByTestId('configure-playground-modal')).not.toBeInTheDocument();
      expect(refreshLsdStatus).toHaveBeenCalledTimes(1);
      expect(refreshPlaygroundModels).toHaveBeenCalledTimes(1);
    });
  });
});
