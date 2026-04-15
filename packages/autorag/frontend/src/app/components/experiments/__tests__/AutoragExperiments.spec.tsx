/* eslint-disable camelcase -- PipelineRun type uses snake_case */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useNavigate, useParams } from 'react-router';
import AutoragExperiments from '~/app/components/experiments/AutoragExperiments';
import { usePipelineDefinitions } from '~/app/hooks/usePipelineDefinitions';
import { usePipelineRuns } from '~/app/hooks/usePipelineRuns';
import type { PipelineDefinition, PipelineRun } from '~/app/types';

const mockGetGenericErrorCode = jest.fn();
jest.mock('@odh-dashboard/internal/api/errorUtils', () => ({
  getGenericErrorCode: (error: unknown) => mockGetGenericErrorCode(error),
}));

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: jest.fn(),
  useParams: jest.fn(),
}));

jest.mock('~/app/hooks/usePipelineDefinitions', () => ({
  usePipelineDefinitions: jest.fn(),
}));

jest.mock('~/app/hooks/usePipelineRuns', () => ({
  usePipelineRuns: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/pages/UnauthorizedError', () => ({
  __esModule: true,
  default: () => <div data-testid="unauthorized-error">Unauthorized</div>,
}));

jest.mock('~/app/components/AutoragRunsTable', () => {
  const MockAutoragRunsTable = ({ runs }: { runs: { run_id: string; display_name: string }[] }) => (
    <div data-testid="autorag-runs-table">
      {runs.map((r) => (
        <div key={r.run_id} data-testid={`run-${r.run_id}`}>
          {r.display_name}
        </div>
      ))}
    </div>
  );
  return {
    __esModule: true,
    AutoragRunsTable: MockAutoragRunsTable,
  };
});

const mockUseNavigate = jest.mocked(useNavigate);
const mockUseParams = jest.mocked(useParams);
const mockUsePipelineDefinitions = jest.mocked(usePipelineDefinitions);
const mockUsePipelineRuns = jest.mocked(usePipelineRuns);

const mockPipelineDefinitions: PipelineDefinition[] = [
  {
    pipeline_id: 'p1',
    display_name: 'Pipeline 1',
    created_at: '2025-01-01',
    description: 'Desc 1',
  },
];

const mockRuns: PipelineRun[] = [
  {
    run_id: 'r1',
    display_name: 'Run 1',
    description: 'Run desc',
    state: 'SUCCEEDED',
    created_at: '2025-01-17',
    pipeline_version_reference: { pipeline_id: 'p1', pipeline_version_id: 'v1' },
  },
];

const defaultDefsState = {
  pipelineDefinitions: mockPipelineDefinitions,
  loaded: true,
  error: undefined as Error | undefined,
  refresh: jest.fn().mockResolvedValue(undefined),
};

const defaultRunsState = {
  runs: mockRuns,
  totalSize: mockRuns.length,
  nextPageToken: '',
  page: 1,
  pageSize: 20,
  setPage: jest.fn(),
  setPageSize: jest.fn(),
  loaded: true,
  error: undefined as Error | undefined,
  refresh: jest.fn().mockResolvedValue(undefined),
};

function renderAutorag(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('AutoragExperiments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetGenericErrorCode.mockReturnValue(undefined);
    mockUseNavigate.mockReturnValue(jest.fn());
    mockUseParams.mockReturnValue({ namespace: 'my-namespace' });
    mockUsePipelineDefinitions.mockReturnValue(defaultDefsState);
    mockUsePipelineRuns.mockReturnValue(defaultRunsState);
  });

  it('should show spinner when loading', () => {
    mockUsePipelineDefinitions.mockReturnValue({
      ...defaultDefsState,
      loaded: false,
    });
    mockUsePipelineRuns.mockReturnValue({
      ...defaultRunsState,
      loaded: false,
    });

    renderAutorag(<AutoragExperiments />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should show EmptyExperimentsState when no experiments', () => {
    mockUsePipelineRuns.mockReturnValue({
      ...defaultRunsState,
      runs: [],
      totalSize: 0,
    });

    renderAutorag(<AutoragExperiments />);

    expect(screen.getByTestId('empty-experiments-state')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Create an AutoRAG optimization run' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('create-run-button')).toHaveTextContent('Create run');
    expect(screen.queryByTestId('autorag-runs-table')).not.toBeInTheDocument();
  });

  it('should not show NoProjects when no experiments', () => {
    mockUsePipelineRuns.mockReturnValue({
      ...defaultRunsState,
      runs: [],
      totalSize: 0,
    });

    renderAutorag(<AutoragExperiments />);

    expect(screen.queryByText('No projects')).not.toBeInTheDocument();
    expect(screen.queryByText('Go to Projects page')).not.toBeInTheDocument();
  });

  it('should show AutoragRunsTable when there are experiments', () => {
    renderAutorag(<AutoragExperiments />);

    expect(screen.getByTestId('autorag-runs-table')).toBeInTheDocument();
    expect(screen.getByTestId('run-r1')).toHaveTextContent('Run 1');
    expect(screen.queryByTestId('empty-experiments-state')).not.toBeInTheDocument();
  });

  it('re-notifies onExperimentsListStatus when namespace changes even if loaded and hasExperiments stay true', async () => {
    const onStatus = jest.fn();
    mockUseParams.mockReturnValue({ namespace: 'ns-one' });
    const { rerender } = renderAutorag(<AutoragExperiments onExperimentsListStatus={onStatus} />);

    await waitFor(() => {
      expect(onStatus).toHaveBeenCalledWith({ loaded: true, hasExperiments: true });
    });
    const callsAfterFirstNs = onStatus.mock.calls.length;

    mockUseParams.mockReturnValue({ namespace: 'ns-two' });
    rerender(
      <MemoryRouter>
        <AutoragExperiments onExperimentsListStatus={onStatus} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(onStatus.mock.calls.length).toBeGreaterThan(callsAfterFirstNs);
    });
    expect(onStatus).toHaveBeenLastCalledWith({ loaded: true, hasExperiments: true });
  });

  it('should show error alert on load error', () => {
    mockUsePipelineRuns.mockReturnValue({
      ...defaultRunsState,
      error: new Error('Fetch failed'),
    });

    renderAutorag(<AutoragExperiments />);

    expect(screen.getByText('Failed to load experiments')).toBeInTheDocument();
    expect(screen.getByText('Fetch failed')).toBeInTheDocument();
  });

  it('should show NoPipelineServer for 404 error (no DSPA)', () => {
    mockGetGenericErrorCode.mockReturnValue(404);
    mockUsePipelineRuns.mockReturnValue({
      ...defaultRunsState,
      error: new Error('Not found'),
    });

    renderAutorag(<AutoragExperiments />);

    expect(
      screen.getByRole('heading', { name: 'Configure a compatible pipeline server' }),
    ).toBeInTheDocument();
  });

  it('should show error alert when BFF reports no AutoRAG pipeline (auto-creation handles this at submit time)', () => {
    mockGetGenericErrorCode.mockReturnValue(500);
    mockUsePipelineRuns.mockReturnValue({
      ...defaultRunsState,
      error: new Error(
        'no AutoRAG pipeline found in namespace ai-pipelines - ensure a managed AutoRAG pipeline is deployed',
      ),
    });

    renderAutorag(<AutoragExperiments />);

    // No longer shows NoPipelineServer — the BFF auto-creates pipelines on submit
    expect(
      screen.queryByRole('heading', { name: 'Configure a compatible pipeline server' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Failed to load experiments')).toBeInTheDocument();
  });

  it('should show NoPipelineServer for no Pipeline Server (DSPipelineApplication) message', () => {
    mockGetGenericErrorCode.mockReturnValue(404);
    mockUsePipelineRuns.mockReturnValue({
      ...defaultRunsState,
      error: new Error('no Pipeline Server (DSPipelineApplication) found in namespace'),
    });

    renderAutorag(<AutoragExperiments />);

    expect(
      screen.getByRole('heading', { name: 'Configure a compatible pipeline server' }),
    ).toBeInTheDocument();
  });

  it('should show UnauthorizedError for 403 error', () => {
    mockGetGenericErrorCode.mockReturnValue(403);
    mockUsePipelineRuns.mockReturnValue({
      ...defaultRunsState,
      error: new Error('Forbidden'),
    });

    renderAutorag(<AutoragExperiments />);

    expect(screen.getByTestId('unauthorized-error')).toBeInTheDocument();
  });

  it('should show PipelineServerNotReady for 503 error (DSPA not ready)', () => {
    mockGetGenericErrorCode.mockReturnValue(503);
    mockUsePipelineRuns.mockReturnValue({
      ...defaultRunsState,
      error: new Error('Service Unavailable'),
    });

    renderAutorag(<AutoragExperiments />);

    expect(screen.getByText('There is a problem with the pipeline server')).toBeInTheDocument();
  });
});
