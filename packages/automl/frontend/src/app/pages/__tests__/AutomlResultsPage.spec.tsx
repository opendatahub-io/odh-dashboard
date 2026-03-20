/* eslint-disable camelcase */
import { render, screen } from '@testing-library/react';
import React from 'react';
import AutomlResultsPage from '~/app/pages/AutomlResultsPage';

const mockUseParams = jest.fn();
jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useParams: () => mockUseParams(),
}));

jest.mock('mod-arch-core', () => ({
  useNamespaceSelector: jest.fn().mockReturnValue({
    namespaces: [{ name: 'test-ns' }],
    updatePreferredNamespace: jest.fn(),
    namespacesLoaded: true,
    namespacesLoadError: undefined,
  }),
}));

const mockUsePipelineRunQuery = jest.fn();
jest.mock('~/app/hooks/queries', () => ({
  usePipelineRunQuery: (...args: unknown[]) => mockUsePipelineRunQuery(...args),
}));

jest.mock('~/app/components/results/AutomlResults', () => ({
  __esModule: true,
  default: ({ pipelineRun }: { pipelineRun?: { display_name: string } }) => (
    <div data-testid="automl-results">{pipelineRun?.display_name}</div>
  ),
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

  it('should render AutomlResults when data is loaded', () => {
    mockUsePipelineRunQuery.mockReturnValue({
      data: { run_id: 'run-123', display_name: 'Test Run', state: 'SUCCEEDED', created_at: '' },
      isFetched: true,
      isError: false,
      error: null,
    });

    render(<AutomlResultsPage />);

    expect(screen.getByTestId('automl-results')).toBeInTheDocument();
    expect(screen.getByText('Test Run')).toBeInTheDocument();
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
});
