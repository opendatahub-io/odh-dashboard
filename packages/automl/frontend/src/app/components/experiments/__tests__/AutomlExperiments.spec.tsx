/* eslint-disable camelcase -- PipelineRun type uses snake_case */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useParams } from 'react-router';
import AutomlExperiments from '~/app/components/experiments/AutomlExperiments';
import { usePipelineDefinitions } from '~/app/hooks/usePipelineDefinitions';
import { usePipelineRuns } from '~/app/hooks/usePipelineRuns';
import type { PipelineDefinition, PipelineRun } from '~/app/types';

const mockGetGenericErrorCode = jest.fn();
jest.mock('@odh-dashboard/internal/api/errorUtils', () => ({
  getGenericErrorCode: (error: unknown) => mockGetGenericErrorCode(error),
}));

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
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

jest.mock('~/app/components/AutomlRunsTable', () => {
  const MockAutomlRunsTable = ({ runs }: { runs: { run_id: string; display_name: string }[] }) => (
    <div data-testid="automl-runs-table">
      {runs.map((r) => (
        <div key={r.run_id} data-testid={`run-${r.run_id}`}>
          {r.display_name}
        </div>
      ))}
    </div>
  );
  return {
    __esModule: true,
    AutomlRunsTable: MockAutomlRunsTable,
  };
});

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

function renderAutoml(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('AutomlExperiments', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockGetGenericErrorCode.mockReturnValue(undefined);
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

    renderAutoml(<AutomlExperiments />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should show EmptyExperimentsState when no experiments', () => {
    mockUsePipelineRuns.mockReturnValue({
      ...defaultRunsState,
      runs: [],
      totalSize: 0,
    });

    renderAutoml(<AutomlExperiments />);

    expect(screen.getByTestId('empty-experiments-state')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Create an AutoML optimization run' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('create-run-button')).toHaveTextContent('Create run');
    expect(screen.queryByTestId('automl-runs-table')).not.toBeInTheDocument();
  });

  it('should show AutomlRunsTable when there are experiments', () => {
    renderAutoml(<AutomlExperiments />);

    expect(screen.getByTestId('automl-runs-table')).toBeInTheDocument();
    expect(screen.getByTestId('run-r1')).toHaveTextContent('Run 1');
    expect(screen.queryByTestId('empty-experiments-state')).not.toBeInTheDocument();
  });

  it('re-notifies onExperimentsListStatus when namespace changes even if loaded and hasExperiments stay true', async () => {
    const onStatus = jest.fn();
    mockUseParams.mockReturnValue({ namespace: 'ns-one' });
    const { rerender } = renderAutoml(<AutomlExperiments onExperimentsListStatus={onStatus} />);

    await waitFor(() => {
      expect(onStatus).toHaveBeenCalledWith({ loaded: true, hasExperiments: true });
    });
    const callsAfterFirstNs = onStatus.mock.calls.length;

    mockUseParams.mockReturnValue({ namespace: 'ns-two' });
    rerender(
      <MemoryRouter>
        <AutomlExperiments onExperimentsListStatus={onStatus} />
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

    renderAutoml(<AutomlExperiments />);

    expect(screen.getByText('Failed to load experiments')).toBeInTheDocument();
    expect(screen.getByText('Fetch failed')).toBeInTheDocument();
  });

  it('should show NoPipelineServer for 404 error (no DSPA)', () => {
    mockGetGenericErrorCode.mockReturnValue(404);
    mockUsePipelineRuns.mockReturnValue({
      ...defaultRunsState,
      error: new Error('Not found'),
    });

    renderAutoml(<AutomlExperiments />);

    expect(
      screen.getByRole('heading', { name: 'Configure a compatible pipeline server' }),
    ).toBeInTheDocument();
  });

  it('should show error alert when BFF reports no managed AutoML pipelines (auto-creation handles this at submit time)', () => {
    mockGetGenericErrorCode.mockReturnValue(500);
    mockUsePipelineRuns.mockReturnValue({
      ...defaultRunsState,
      error: new Error(
        'no AutoML pipelines found in namespace - ensure managed AutoML pipelines are deployed',
      ),
    });

    renderAutoml(<AutomlExperiments />);

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

    renderAutoml(<AutomlExperiments />);

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

    renderAutoml(<AutomlExperiments />);

    expect(screen.getByTestId('unauthorized-error')).toBeInTheDocument();
  });

  it('should show PipelineServerNotReady for 503 error (DSPA not ready)', () => {
    mockGetGenericErrorCode.mockReturnValue(503);
    mockUsePipelineRuns.mockReturnValue({
      ...defaultRunsState,
      error: new Error('Service Unavailable'),
    });

    renderAutoml(<AutomlExperiments />);

    expect(screen.getByText('There is a problem with the pipeline server')).toBeInTheDocument();
  });
});
