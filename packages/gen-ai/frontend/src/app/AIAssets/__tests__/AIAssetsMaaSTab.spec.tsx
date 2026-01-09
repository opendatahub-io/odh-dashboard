import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { MaaSModel } from '~/app/types';
import useFetchMaaSModels from '~/app/hooks/useFetchMaaSModels';
import useFetchLlamaModels from '~/app/hooks/useFetchLlamaModels';
import useFetchLSDStatus from '~/app/hooks/useFetchLSDStatus';
import useFetchAIModels from '~/app/hooks/useFetchAIModels';
import AIAssetsMaaSTab from '~/app/AIAssets/AIAssetsMaaSTab';
import { GenAiContext } from '~/app/context/GenAiContext';
import { mockGenAiContextValue } from '~/__mocks__/mockGenAiContext';

jest.mock('~/app/hooks/useFetchMaaSModels', () => ({
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

jest.mock('~/app/hooks/useFetchAIModels', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('~/app/EmptyStates/NoData', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

jest.mock('~/app/AIAssets/components/MaaSModelsTable', () => ({
  __esModule: true,
  default: ({
    maasModels,
    playgroundModels,
  }: {
    maasModels: MaaSModel[];
    playgroundModels: unknown[];
  }) => (
    <div data-testid="maas-models-table">
      {maasModels.map((model) => (
        <div key={model.id} data-testid={`model-${model.id}`}>
          {model.id}
        </div>
      ))}
      <div data-testid="playground-models-count">{playgroundModels.length}</div>
    </div>
  ),
}));

const mockUseFetchMaaSModels = jest.mocked(useFetchMaaSModels);
const mockUseFetchLlamaModels = jest.mocked(useFetchLlamaModels);
const mockUseFetchLSDStatus = jest.mocked(useFetchLSDStatus);
const mockUseFetchAIModels = jest.mocked(useFetchAIModels);

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MemoryRouter>
    <GenAiContext.Provider value={mockGenAiContextValue}>{children}</GenAiContext.Provider>
  </MemoryRouter>
);

describe('AIAssetsMaaSTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the new hooks with default values
    mockUseFetchLlamaModels.mockReturnValue({
      data: [],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    } as ReturnType<typeof useFetchLlamaModels>);

    mockUseFetchLSDStatus.mockReturnValue({
      data: null,
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    } as ReturnType<typeof useFetchLSDStatus>);

    mockUseFetchAIModels.mockReturnValue({
      data: [],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    } as ReturnType<typeof useFetchAIModels>);
  });

  it('should render loading state', () => {
    mockUseFetchMaaSModels.mockReturnValue({
      data: [],
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    } as ReturnType<typeof useFetchMaaSModels>);

    render(
      <TestWrapper>
        <AIAssetsMaaSTab />
      </TestWrapper>,
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should render empty state when no models', () => {
    mockUseFetchMaaSModels.mockReturnValue({
      data: [],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    } as ReturnType<typeof useFetchMaaSModels>);

    render(
      <TestWrapper>
        <AIAssetsMaaSTab />
      </TestWrapper>,
    );

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No models available as a service')).toBeInTheDocument();
  });

  it('should render empty state on error', () => {
    mockUseFetchMaaSModels.mockReturnValue({
      data: [],
      loaded: true,
      error: new Error('Failed to fetch'),
      refresh: jest.fn(),
    } as ReturnType<typeof useFetchMaaSModels>);

    render(
      <TestWrapper>
        <AIAssetsMaaSTab />
      </TestWrapper>,
    );

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('should render MaaS models table when models exist', () => {
    mockUseFetchMaaSModels.mockReturnValue({
      data: [
        {
          id: 'model-1',
          object: 'model',
          created: Date.now(),
          owned_by: 'test-org', // eslint-disable-line camelcase
          ready: true,
          url: 'https://example.com/model',
        },
      ] as MaaSModel[],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    } as ReturnType<typeof useFetchMaaSModels>);

    render(
      <TestWrapper>
        <AIAssetsMaaSTab />
      </TestWrapper>,
    );

    expect(screen.getByTestId('maas-models-table')).toBeInTheDocument();
    expect(screen.getByTestId('model-model-1')).toBeInTheDocument();
    expect(screen.getByText('model-1')).toBeInTheDocument();
  });

  it('should pass playground models to MaaSModelsTable', () => {
    mockUseFetchMaaSModels.mockReturnValue({
      data: [
        {
          id: 'model-1',
          object: 'model',
          created: Date.now(),
          owned_by: 'test-org', // eslint-disable-line camelcase
          ready: true,
          url: 'https://example.com/model',
        },
      ] as MaaSModel[],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    } as ReturnType<typeof useFetchMaaSModels>);

    mockUseFetchLlamaModels.mockReturnValue({
      data: [
        {
          id: 'provider/model-1',
          modelId: 'model-1',
          object: 'model',
          created: Date.now(),
          owned_by: 'test-org', // eslint-disable-line camelcase
        },
      ],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    } as ReturnType<typeof useFetchLlamaModels>);

    render(
      <TestWrapper>
        <AIAssetsMaaSTab />
      </TestWrapper>,
    );

    expect(screen.getByTestId('maas-models-table')).toBeInTheDocument();
    expect(screen.getByTestId('playground-models-count')).toHaveTextContent('1');
  });
});
