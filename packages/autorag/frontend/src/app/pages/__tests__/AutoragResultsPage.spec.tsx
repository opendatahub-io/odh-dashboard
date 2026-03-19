/* eslint-disable camelcase */
import React from 'react';
import { render, screen } from '@testing-library/react';
import AutoragResultsPage from '~/app/pages/AutoragResultsPage';

const mockUseParams = jest.fn();
jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useParams: () => mockUseParams(),
}));

const mockUsePipelineRunQuery = jest.fn();
jest.mock('~/app/hooks/queries', () => ({
  usePipelineRunQuery: (...args: unknown[]) => mockUsePipelineRunQuery(...args),
}));

jest.mock('~/app/components/results/AutoragResults', () => ({
  __esModule: true,
  default: ({ pipelineRun }: { pipelineRun?: { display_name: string } }) => (
    <div data-testid="autorag-results">{pipelineRun?.display_name}</div>
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

describe('AutoragResultsPage', () => {
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

    render(<AutoragResultsPage />);

    expect(mockUsePipelineRunQuery).toHaveBeenCalledWith('run-123', 'test-ns');
  });

  it('should render AutoragResults when data is loaded', () => {
    mockUsePipelineRunQuery.mockReturnValue({
      data: { run_id: 'run-123', display_name: 'Test Run', state: 'SUCCEEDED', created_at: '' },
      isFetched: true,
      isError: false,
      error: null,
    });

    render(<AutoragResultsPage />);

    expect(screen.getByTestId('autorag-results')).toBeInTheDocument();
    expect(screen.getByText('Test Run')).toBeInTheDocument();
  });

  it('should render InvalidPipelineRun when query errors', () => {
    mockUsePipelineRunQuery.mockReturnValue({
      data: undefined,
      isFetched: true,
      isError: true,
      error: new Error('not found'),
    });

    render(<AutoragResultsPage />);

    expect(screen.getByTestId('invalid-run')).toBeInTheDocument();
  });
});
