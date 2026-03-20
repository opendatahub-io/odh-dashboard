/* eslint-disable camelcase */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import AutomlResultsPage from '~/app/pages/AutomlResultsPage';

const mockUseParams = jest.fn();
jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useParams: () => mockUseParams(),
}));

jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  useNamespaceSelector: jest.fn().mockReturnValue({
    namespaces: [{ name: 'test-ns' }],
    updatePreferredNamespace: jest.fn(),
    namespacesLoaded: true,
    namespacesLoadError: undefined,
  }),
}));

const mockUsePipelineRunQuery = jest.fn();
const mockUseAutomlResults = jest.fn();

jest.mock('~/app/hooks/queries', () => ({
  usePipelineRunQuery: (...args: unknown[]) => mockUsePipelineRunQuery(...args),
}));

jest.mock('~/app/hooks/useAutomlResults', () => ({
  useAutomlResults: (...args: unknown[]) => mockUseAutomlResults(...args),
}));

const mockAutomlResultsContext = jest.fn();
jest.mock('~/app/context/AutomlResultsContext', () => ({
  AutomlResultsContext: {
    Provider: ({ children, value }: { children: React.ReactNode; value: unknown }) => {
      mockAutomlResultsContext(value);
      return <div>{children}</div>;
    },
  },
  useAutomlResultsContext: jest.fn(),
}));

jest.mock('~/app/components/results/AutomlResults', () => ({
  __esModule: true,
  default: () => <div data-testid="automl-results">AutoML Results Component</div>,
}));

jest.mock('~/app/components/empty-states/InvalidPipelineRun', () => ({
  __esModule: true,
  default: () => <div data-testid="invalid-run">Invalid Run</div>,
}));

jest.mock('mod-arch-shared', () => ({
  ApplicationsPage: ({
    children,
    empty,
    loaded,
    emptyStatePage,
  }: {
    children: React.ReactNode;
    empty: boolean;
    loaded: boolean;
    emptyStatePage: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <div data-testid="applications-page">
      {empty ? emptyStatePage : null}
      {loaded && !empty ? children : null}
    </div>
  ),
  TitleWithIcon: ({ title }: { title: string }) => <span>{title}</span>,
  ProjectObjectType: { pipelineExperiment: 'pipelineExperiment' },
}));

describe('AutomlResultsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({ namespace: 'test-ns', runId: 'run-123' });
    mockUseAutomlResults.mockReturnValue({
      models: {},
      isLoading: false,
      isError: false,
    });
  });

  it('should pass namespace and runId from URL params to usePipelineRunQuery', () => {
    mockUsePipelineRunQuery.mockReturnValue({
      data: undefined,
      isFetched: false,
      isError: false,
      error: null,
    });

    render(<AutomlResultsPage />);

    expect(mockUsePipelineRunQuery).toHaveBeenCalledWith('run-123', 'test-ns');
  });

  it('should render AutomlResults with context when data is loaded', () => {
    const mockPipelineRun = {
      run_id: 'run-123',
      display_name: 'Test Run',
      state: 'SUCCEEDED',
      created_at: '',
    };

    mockUsePipelineRunQuery.mockReturnValue({
      data: mockPipelineRun,
      isFetched: true,
      isError: false,
      error: null,
    });

    render(<AutomlResultsPage />);

    expect(screen.getByTestId('automl-results')).toBeInTheDocument();
    expect(mockAutomlResultsContext).toHaveBeenCalledWith({
      pipelineRun: mockPipelineRun,
      models: {},
      parameters: undefined,
    });
  });

  it('should render InvalidPipelineRun when query errors', () => {
    mockUsePipelineRunQuery.mockReturnValue({
      data: undefined,
      isFetched: true,
      isError: true,
      error: new Error('not found'),
    });

    render(<AutomlResultsPage />);

    expect(screen.getByTestId('invalid-run')).toBeInTheDocument();
  });

  it('should pass parameters from pipelineRun runtime_config to context', () => {
    const mockPipelineRun = {
      run_id: 'run-123',
      display_name: 'Test Run',
      state: 'SUCCEEDED',
      created_at: '',
      runtime_config: {
        parameters: {
          task_type: 'binary',
          label_column: 'target',
          train_data_secret_name: 'my-secret',
          train_data_bucket_name: 'my-bucket',
          train_data_file_key: 'data.csv',
          top_n: 3,
        },
      },
    };

    mockUsePipelineRunQuery.mockReturnValue({
      data: mockPipelineRun,
      isFetched: true,
      isError: false,
      error: null,
    });

    render(<AutomlResultsPage />);

    expect(mockAutomlResultsContext).toHaveBeenCalledWith({
      pipelineRun: mockPipelineRun,
      models: {},
      parameters: mockPipelineRun.runtime_config.parameters,
    });
  });
});
