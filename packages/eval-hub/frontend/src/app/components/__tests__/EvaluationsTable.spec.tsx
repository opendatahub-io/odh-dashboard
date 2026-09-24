import * as React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { EvaluationJob } from '~/app/types';
import { mockEvaluationJob } from '~/__tests__/unit/testUtils/mockEvaluationData';
import EvaluationsTable from '~/app/components/EvaluationsTable';

const mockUseKueueAvailability = jest.fn();
const mockUseKueueWorkloadStatuses = jest.fn();
const mockOnRefresh = jest.fn();
const mockOnShowStatus = jest.fn();
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('@odh-dashboard/ui-core', () => ({
  DashboardEmptyTableView: ({ onClearFilters }: { onClearFilters: () => void }) => (
    <div data-testid="dashboard-empty-table-state">
      <h2>No results found</h2>
      <button type="button" data-testid="clear-filters-button" onClick={onClearFilters}>
        Clear
      </button>
    </div>
  ),
}));

jest.mock('~/app/hooks/useKueueAvailability', () => ({
  useKueueAvailability: () => mockUseKueueAvailability(),
}));

jest.mock('~/app/hooks/useKueueWorkloadStatuses', () => ({
  useKueueWorkloadStatuses: () => mockUseKueueWorkloadStatuses(),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

beforeEach(() => {
  queryClient.clear();
  mockUseKueueAvailability.mockReturnValue({
    availability: undefined,
    loaded: true,
    error: undefined,
  });
  mockUseKueueWorkloadStatuses.mockReturnValue({
    statusesByEvaluationId: new Map(),
    loaded: true,
    isLoading: false,
    error: undefined,
  });
});

const renderTable = (props: {
  evaluations: EvaluationJob[];
  loaded: boolean;
  collectionNameMap?: Record<string, string>;
  collectionsLoaded?: boolean;
}) =>
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <EvaluationsTable
          {...props}
          collectionNameMap={props.collectionNameMap ?? {}}
          collectionsLoaded={props.collectionsLoaded ?? true}
          onRefresh={mockOnRefresh}
          onShowStatus={mockOnShowStatus}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );

const mockJobs: EvaluationJob[] = [
  mockEvaluationJob({
    id: 'job-1',
    name: 'Alpha Evaluation',
    state: 'completed',
    modelName: 'gpt-4',
    benchmarkId: 'MMLU',
    createdAt: '2026-02-20T10:00:00Z',
    score: 0.85,
  }),
  mockEvaluationJob({
    id: 'job-2',
    name: 'Beta Evaluation',
    state: 'running',
    modelName: 'llama-3',
    benchmarkId: 'HellaSwag',
    createdAt: '2026-02-22T08:00:00Z',
  }),
  mockEvaluationJob({
    id: 'job-3',
    name: 'Gamma Evaluation',
    state: 'failed',
    modelName: 'claude-3',
    benchmarkId: 'TruthfulQA',
    createdAt: '2026-02-18T12:00:00Z',
  }),
];

for (let index = 0; index < mockJobs.length; index += 1) {
  const currentJob = mockJobs[index];
  /* eslint-disable camelcase */
  mockJobs[index] = {
    ...currentJob,
    resource: {
      ...currentJob.resource,
      mlflow_experiment_id: `exp-${index}`,
    },
    results: {
      ...currentJob.results,
      benchmarks: [
        {
          id: currentJob.benchmarks?.[0]?.id ?? `benchmark-${index}`,
          benchmark_index: 0,
          mlflow_run_id: `run-${index}`,
        },
      ],
    },
    benchmarks: [
      {
        id: currentJob.benchmarks?.[0]?.id ?? `benchmark-${index}`,
        provider_id: 'lm_evaluation_harness',
        benchmark_index: 0,
      },
    ],
  };
  /* eslint-enable camelcase */
}

describe('EvaluationsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when not loaded', () => {
    const { container } = renderTable({ evaluations: [], loaded: false });
    expect(container.firstChild).toBeNull();
  });

  it('should render the toolbar', () => {
    renderTable({ evaluations: mockJobs, loaded: true });
    expect(screen.getByTestId('evaluations-table-toolbar')).toBeInTheDocument();
  });

  it('should render the table with rows', () => {
    renderTable({ evaluations: mockJobs, loaded: true });
    expect(screen.getByTestId('evaluations-table')).toBeInTheDocument();
    expect(screen.getByTestId('evaluation-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('evaluation-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('evaluation-row-2')).toBeInTheDocument();
  });

  it('should call onShowStatus when EvaluationStatusLabel is clicked', () => {
    renderTable({ evaluations: mockJobs, loaded: true });
    const statusButtons = screen.getAllByTestId('evaluation-status-button');
    fireEvent.click(statusButtons[0].querySelector('button')!);
    expect(mockOnShowStatus).toHaveBeenCalledTimes(1);
  });

  it('should not render a start evaluation button when runs exist', () => {
    renderTable({ evaluations: mockJobs, loaded: true });

    expect(screen.queryByTestId('create-evaluation-button')).not.toBeInTheDocument();
  });

  it('should disable row checkboxes when evaluation is not completed', () => {
    renderTable({ evaluations: mockJobs, loaded: true });

    expect(screen.getByLabelText('Select Alpha Evaluation')).toBeEnabled();
    expect(screen.getByLabelText('Select Beta Evaluation')).toBeDisabled();
    expect(screen.getByLabelText('Select Gamma Evaluation')).toBeDisabled();
  });

  it('should disable compare button until at least two completed rows are selected', () => {
    const evaluations = [
      mockJobs[0],
      {
        ...mockJobs[2],
        resource: { ...mockJobs[2].resource, id: 'job-completed-2' },
        status: { ...mockJobs[2].status, state: 'completed' as const },
      },
      mockJobs[1],
    ];

    renderTable({ evaluations, loaded: true });

    const compareButton = screen.getByTestId('compare-evaluations-button');
    expect(compareButton).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(screen.getByLabelText('Select Alpha Evaluation'));
    expect(compareButton).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(compareButton);
    expect(mockNavigate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Select Gamma Evaluation'));
    expect(compareButton).not.toHaveAttribute('aria-disabled');
  });

  it('should route directly to compare when selected rows are single benchmarks', () => {
    const evaluations = [
      mockJobs[0],
      {
        ...mockJobs[2],
        resource: { ...mockJobs[2].resource, id: 'job-completed-2' },
        status: { ...mockJobs[2].status, state: 'completed' as const },
      },
    ];

    renderTable({ evaluations, loaded: true });

    fireEvent.click(screen.getByLabelText('Select Alpha Evaluation'));
    fireEvent.click(screen.getByLabelText('Select Gamma Evaluation'));
    fireEvent.click(screen.getByTestId('compare-evaluations-button'));

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: expect.stringContaining('compare-runs'),
        search: expect.any(String),
      }),
    );
  });

  it('should route to choose benchmarks when any selected row is a suite', () => {
    /* eslint-disable camelcase */
    const suiteJob = mockEvaluationJob({
      id: 'suite-job',
      name: 'Suite evaluation',
      benchmarkId: 'ifeval',
      createdAt: '2026-02-21T12:00:00Z',
      score: 0.8,
    });
    suiteJob.benchmarks = [
      { id: 'ifeval', provider_id: 'lm_evaluation_harness', benchmark_index: 0 },
      { id: 'bbh', provider_id: 'lm_evaluation_harness', benchmark_index: 1 },
    ];
    suiteJob.results.benchmarks = [
      { id: 'ifeval', benchmark_index: 0, mlflow_run_id: 'suite-run-0' },
      { id: 'bbh', benchmark_index: 1, mlflow_run_id: 'suite-run-1' },
    ];
    suiteJob.resource.mlflow_experiment_id = 'suite-exp-id';

    const singleJob = {
      ...mockJobs[0],
      resource: {
        ...mockJobs[0].resource,
        mlflow_experiment_id: 'single-exp-id',
      },
      results: {
        ...mockJobs[0].results,
        benchmarks: [{ id: 'MMLU', benchmark_index: 0, mlflow_run_id: 'single-run-id' }],
      },
      benchmarks: [{ id: 'MMLU', provider_id: 'lm_evaluation_harness', benchmark_index: 0 }],
    };
    /* eslint-enable camelcase */

    renderTable({ evaluations: [suiteJob, singleJob], loaded: true });

    fireEvent.click(screen.getByTestId('evaluation-select-checkbox-0'));
    fireEvent.click(screen.getByTestId('evaluation-select-checkbox-1'));
    fireEvent.click(screen.getByTestId('compare-evaluations-button'));

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: expect.stringContaining('compare-runs/benchmarks'),
        search: expect.any(String),
      }),
    );
  });

  describe('filtering', () => {
    it('should offer the Queued status filter when Kueue is enabled without queued jobs', () => {
      mockUseKueueAvailability.mockReturnValue({
        availability: {
          // eslint-disable-next-line camelcase -- Kueue API field name.
          scheduling_ready: true,
        },
        loaded: true,
        error: undefined,
      });
      renderTable({ evaluations: mockJobs, loaded: true });

      fireEvent.click(screen.getByTestId('filter-type-toggle'));
      fireEvent.click(screen.getByRole('option', { name: 'Status' }));
      fireEvent.click(screen.getByTestId('filter-status-toggle'));

      expect(screen.getByTestId('filter-status-option-queued')).toBeInTheDocument();
    });

    it('should filter by evaluation name', () => {
      renderTable({ evaluations: mockJobs, loaded: true });
      const searchInput = screen.getByTestId('filter-toolbar-text-field').querySelector('input')!;
      fireEvent.change(searchInput, { target: { value: 'Alpha' } });

      expect(screen.getByTestId('evaluation-row-0')).toBeInTheDocument();
      expect(screen.queryByTestId('evaluation-row-1')).not.toBeInTheDocument();
    });

    it('should show empty filter state when no matches', () => {
      renderTable({ evaluations: mockJobs, loaded: true });
      const searchInput = screen.getByTestId('filter-toolbar-text-field').querySelector('input')!;
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByTestId('dashboard-empty-table-state')).toBeInTheDocument();
      expect(screen.getByText('No results found')).toBeInTheDocument();
    });

    it('should clear filters and show all rows', () => {
      renderTable({ evaluations: mockJobs, loaded: true });
      const searchInput = screen.getByTestId('filter-toolbar-text-field').querySelector('input')!;
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByTestId('dashboard-empty-table-state')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('clear-filters-button'));
      expect(screen.queryByTestId('dashboard-empty-table-state')).not.toBeInTheDocument();
      expect(screen.getByTestId('evaluations-table')).toBeInTheDocument();
    });

    it('should disable the evaluation filter option while collections are loading', () => {
      renderTable({ evaluations: mockJobs, loaded: true, collectionsLoaded: false });
      fireEvent.click(screen.getByTestId('filter-type-toggle'));

      const evaluationOption = screen.getByTestId('filter-option-evaluation');
      expect(evaluationOption).toHaveTextContent('Evaluation (loading…)');
      expect(evaluationOption.querySelector('button')).toBeDisabled();
    });

    it('should enable the evaluation filter option once collections are loaded', () => {
      renderTable({ evaluations: mockJobs, loaded: true, collectionsLoaded: true });
      fireEvent.click(screen.getByTestId('filter-type-toggle'));

      const evaluationOption = screen.getByTestId('filter-option-evaluation');
      expect(evaluationOption).not.toHaveAttribute('aria-disabled', 'true');
      expect(evaluationOption).toHaveTextContent('Evaluation');
    });

    it('should be case-insensitive', () => {
      renderTable({ evaluations: mockJobs, loaded: true });
      const searchInput = screen.getByTestId('filter-toolbar-text-field').querySelector('input')!;
      fireEvent.change(searchInput, { target: { value: 'alpha' } });

      expect(screen.getByTestId('evaluation-row-0')).toBeInTheDocument();
    });

    it('should filter by status, matching partially_failed jobs when "Failed" is selected', () => {
      const partiallyFailedJob = mockEvaluationJob({
        id: 'job-partially-failed',
        name: 'Delta Evaluation',
        state: 'partially_failed',
        modelName: 'gpt-4',
        createdAt: '2026-02-19T10:00:00Z',
      });

      renderTable({ evaluations: [...mockJobs, partiallyFailedJob], loaded: true });

      fireEvent.click(screen.getByTestId('filter-type-toggle'));
      fireEvent.click(screen.getByRole('option', { name: 'Status' }));

      fireEvent.click(screen.getByTestId('filter-status-toggle'));
      fireEvent.click(screen.getByRole('option', { name: 'Failed' }));

      expect(screen.getByText('Gamma Evaluation')).toBeInTheDocument();
      expect(screen.getByText('Delta Evaluation')).toBeInTheDocument();
      expect(screen.queryByText('Alpha Evaluation')).not.toBeInTheDocument();
      expect(screen.queryByText('Beta Evaluation')).not.toBeInTheDocument();
    });

    it('should not offer a separate "Partially failed" status filter option', () => {
      renderTable({ evaluations: mockJobs, loaded: true });

      fireEvent.click(screen.getByTestId('filter-type-toggle'));
      fireEvent.click(screen.getByRole('option', { name: 'Status' }));
      fireEvent.click(screen.getByTestId('filter-status-toggle'));

      expect(screen.queryByRole('option', { name: 'Partially failed' })).not.toBeInTheDocument();
    });
  });

  describe('pagination', () => {
    it('should render pagination controls', () => {
      renderTable({ evaluations: mockJobs, loaded: true });
      const toolbar = screen.getByTestId('evaluations-table-toolbar');
      expect(toolbar.querySelector('.pf-v6-c-pagination')).toBeInTheDocument();
    });

    it('should show all rows when count is below perPage', () => {
      renderTable({ evaluations: mockJobs, loaded: true });
      expect(screen.getByTestId('evaluation-row-0')).toBeInTheDocument();
      expect(screen.getByTestId('evaluation-row-1')).toBeInTheDocument();
      expect(screen.getByTestId('evaluation-row-2')).toBeInTheDocument();
    });

    it('should paginate when there are more items than perPage', () => {
      const manyJobs = Array.from({ length: 25 }, (_, i) =>
        mockEvaluationJob({
          id: `job-${i}`,
          name: `Evaluation ${i}`,
          createdAt: `2026-02-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
        }),
      );
      renderTable({ evaluations: manyJobs, loaded: true });
      expect(screen.getByTestId('evaluation-row-0')).toBeInTheDocument();
      expect(screen.getByTestId('evaluation-row-19')).toBeInTheDocument();
      expect(screen.queryByTestId('evaluation-row-20')).not.toBeInTheDocument();
    });
  });

  describe('column headers', () => {
    it('should render all expected column headers in the table', () => {
      renderTable({ evaluations: mockJobs, loaded: true });
      const table = screen.getByTestId('evaluations-table');
      expect(table).toHaveTextContent('Name');
      expect(table).toHaveTextContent('Status');
      expect(table).toHaveTextContent('Evaluation');
      expect(table).toHaveTextContent('Evaluated');
      expect(table).toHaveTextContent('Date');
      expect(table).toHaveTextContent('Result');
    });

    it('should show a Kueue resource wait in the Status column without rendering a separate column', () => {
      mockUseKueueAvailability.mockReturnValue({
        availability: {
          // eslint-disable-next-line camelcase -- Kueue API field name.
          scheduling_ready: true,
        },
        loaded: true,
        error: undefined,
      });
      mockUseKueueWorkloadStatuses.mockReturnValue({
        statusesByEvaluationId: new Map([
          [
            'job-2',
            {
              // eslint-disable-next-line camelcase -- API payload uses OpenAPI field names.
              evaluation_id: 'job-2',
              // eslint-disable-next-line camelcase -- API payload uses OpenAPI field names.
              queue_name: 'default',
              state: 'queued',
              message: 'Waiting for quota',
            },
          ],
        ]),
        loaded: true,
        isLoading: false,
        error: undefined,
      });

      renderTable({ evaluations: mockJobs, loaded: true });

      expect(screen.queryByText('Kueue status')).not.toBeInTheDocument();
      expect(screen.queryByTestId('evaluation-kueue-status')).not.toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Queue' })).toBeInTheDocument();
      const betaRow = screen.getByText('Beta Evaluation').closest('tr');
      expect(betaRow).not.toBeNull();
      expect(within(betaRow!).getByTestId('evaluation-status-button')).toHaveTextContent('Queued');
      expect(within(betaRow!).getByTestId('evaluation-queue')).toHaveTextContent('default');
    });

    it('should preserve a terminal EvalHub status when Kueue has not updated yet', () => {
      mockUseKueueAvailability.mockReturnValue({
        availability: {
          // eslint-disable-next-line camelcase -- Kueue API field name.
          scheduling_ready: true,
        },
        loaded: true,
        error: undefined,
      });
      mockUseKueueWorkloadStatuses.mockReturnValue({
        statusesByEvaluationId: new Map([
          [
            'job-1',
            {
              // eslint-disable-next-line camelcase -- API payload uses OpenAPI field names.
              evaluation_id: 'job-1',
              // eslint-disable-next-line camelcase -- API payload uses OpenAPI field names.
              queue_name: 'default',
              state: 'admitted',
            },
          ],
        ]),
        loaded: true,
        isLoading: false,
        error: undefined,
      });

      renderTable({ evaluations: mockJobs, loaded: true });

      const alphaRow = screen.getByText('Alpha Evaluation').closest('tr');
      expect(alphaRow).not.toBeNull();
      expect(within(alphaRow!).getByTestId('evaluation-status-button')).toHaveTextContent(
        'Complete',
      );
    });

    it('should show EvalHub Running in the Status column after Kueue admits the evaluation', () => {
      mockUseKueueAvailability.mockReturnValue({
        availability: {
          // eslint-disable-next-line camelcase -- Kueue API field name.
          scheduling_ready: true,
        },
        loaded: true,
        error: undefined,
      });
      mockUseKueueWorkloadStatuses.mockReturnValue({
        statusesByEvaluationId: new Map([
          [
            'job-2',
            {
              // eslint-disable-next-line camelcase -- API payload uses OpenAPI field names.
              evaluation_id: 'job-2',
              // eslint-disable-next-line camelcase -- API payload uses OpenAPI field names.
              queue_name: 'default',
              state: 'admitted',
            },
          ],
        ]),
        loaded: true,
        isLoading: false,
        error: undefined,
      });

      renderTable({ evaluations: mockJobs, loaded: true });

      const betaRow = screen.getByText('Beta Evaluation').closest('tr');
      expect(betaRow).not.toBeNull();
      expect(within(betaRow!).getByTestId('evaluation-status-button')).toHaveTextContent('Running');
    });

    it('should keep the table usable and show EvalHub status when the Kueue Workload request fails', () => {
      const error = new Error('forbidden');
      mockUseKueueAvailability.mockReturnValue({
        availability: {
          // eslint-disable-next-line camelcase -- Kueue API field name.
          scheduling_ready: true,
        },
        loaded: true,
        error: undefined,
      });
      mockUseKueueWorkloadStatuses.mockReturnValue({
        statusesByEvaluationId: new Map(),
        loaded: true,
        isLoading: false,
        error,
      });

      renderTable({ evaluations: mockJobs, loaded: true });

      expect(screen.getByTestId('kueue-workload-status-warning')).toBeInTheDocument();
      expect(screen.queryByTestId('evaluation-kueue-status')).not.toBeInTheDocument();
      const alphaRow = screen.getByText('Alpha Evaluation').closest('tr');
      expect(alphaRow).not.toBeNull();
      expect(within(alphaRow!).getByTestId('evaluation-status-button')).toHaveTextContent(
        'Complete',
      );
      expect(screen.getByTestId('evaluation-row-0')).toBeInTheDocument();
    });
  });
});
