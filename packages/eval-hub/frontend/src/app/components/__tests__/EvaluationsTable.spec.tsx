import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EvaluationJob } from '~/app/types';
import { mockEvaluationJob } from '~/__tests__/unit/testUtils/mockEvaluationData';
import EvaluationsTable from '~/app/components/EvaluationsTable';

const mockOnRefresh = jest.fn();
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

const renderTable = (props: {
  evaluations: EvaluationJob[];
  loaded: boolean;
  collectionNameMap?: Record<string, string>;
  collectionsLoaded?: boolean;
}) =>
  render(
    <MemoryRouter>
      <EvaluationsTable
        {...props}
        collectionNameMap={props.collectionNameMap ?? {}}
        collectionsLoaded={props.collectionsLoaded ?? true}
        onRefresh={mockOnRefresh}
      />
    </MemoryRouter>,
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

  it('should render the New evaluation button', () => {
    renderTable({ evaluations: mockJobs, loaded: true });
    expect(screen.getByTestId('create-evaluation-button')).toHaveTextContent(
      'Start evaluation run',
    );
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
    expect(compareButton).toBeDisabled();

    fireEvent.click(screen.getByLabelText('Select Alpha Evaluation'));
    expect(compareButton).toBeDisabled();

    fireEvent.click(screen.getByLabelText('Select Gamma Evaluation'));
    expect(compareButton).toBeEnabled();
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
  });
});
