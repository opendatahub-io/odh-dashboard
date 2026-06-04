import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ChooseCompareBenchmarksPage from '~/app/pages/ChooseCompareBenchmarksPage';
import { mockEvaluationJob } from '~/__tests__/unit/testUtils/mockEvaluationData';

const mockUseEvaluationJobs = jest.fn();
const mockUseCollectionNameMap = jest.fn();
const mockNavigate = jest.fn();

jest.mock('~/app/hooks/useEvaluationJobs', () => ({
  useEvaluationJobs: () => mockUseEvaluationJobs(),
}));

jest.mock('~/app/hooks/useCollectionNameMap', () => ({
  useCollectionNameMap: () => mockUseCollectionNameMap(),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('@odh-dashboard/internal/pages/ApplicationsPage', () =>
  require('~/__tests__/unit/testUtils/mocks').mockApplicationsPageModule(),
);

const renderPage = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/:namespace/compare-runs/benchmarks"
          element={<ChooseCompareBenchmarksPage />}
        />
      </Routes>
    </MemoryRouter>,
  );

const getCheckbox = (id: string): HTMLInputElement => {
  const checkbox = document.getElementById(id);
  if (!checkbox) {
    throw new Error(`Checkbox not found: ${id}`);
  }
  return checkbox as HTMLInputElement;
};

describe('ChooseCompareBenchmarksPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCollectionNameMap.mockReturnValue({
      collectionNameMap: { 'col-1': 'Safety and fairness' },
      loaded: true,
    });
  });

  it('should render collection and benchmark runs in a table with sub-benchmark rows', () => {
    /* eslint-disable camelcase */
    const collectionJob = mockEvaluationJob({
      id: 'job-collection',
      name: 'Suite One',
      collectionId: 'col-1',
      createdAt: '2026-02-20T10:00:00Z',
    });
    collectionJob.resource.mlflow_experiment_id = 'exp-1';
    collectionJob.collection = {
      id: 'col-1',
      benchmarks: [
        { id: 'truthfulqa_mc1', provider_id: 'lm', benchmark_index: 0 },
        { id: 'toxicity_detection', provider_id: 'lm', benchmark_index: 1 },
      ],
    };
    collectionJob.results.benchmarks = [
      { id: 'truthfulqa_mc1', benchmark_index: 0, mlflow_run_id: 'run-1' },
      { id: 'toxicity_detection', benchmark_index: 1, mlflow_run_id: 'run-2' },
    ];

    const benchmarkJob = mockEvaluationJob({
      id: 'job-benchmark',
      name: 'Toxicity Detection',
      benchmarkId: 'toxicity_detection',
    });
    benchmarkJob.resource.mlflow_experiment_id = 'exp-2';
    benchmarkJob.results.benchmarks = [
      { id: 'toxicity_detection', benchmark_index: 0, mlflow_run_id: 'run-3' },
    ];
    /* eslint-enable camelcase */

    mockUseEvaluationJobs.mockReturnValue([
      [collectionJob, benchmarkJob],
      true,
      undefined,
      jest.fn(),
    ]);

    renderPage('/test-project/compare-runs/benchmarks?jobIds=job-collection,job-benchmark');

    expect(screen.getByTestId('page-title')).toHaveTextContent('Compare runs');
    expect(screen.getByTestId('choose-compare-benchmarks-search')).toBeInTheDocument();
    expect(screen.getByTestId('compare-selected-benchmarks-button')).toBeInTheDocument();
    expect(screen.getByTestId('choose-compare-benchmarks-table')).toBeInTheDocument();
    expect(screen.getByTestId('compare-select-all-checkbox')).toBeInTheDocument();
    expect(screen.getByTestId('compare-run-row-job-collection')).toHaveTextContent(
      'Benchmark suite',
    );
    expect(screen.getByTestId('compare-run-row-job-collection')).toHaveTextContent(
      'Safety and fairness',
    );
    expect(screen.getByTestId('compare-run-row-job-benchmark')).toHaveTextContent(
      'Single benchmark',
    );
    expect(screen.getByTestId('compare-run-row-job-benchmark')).toHaveTextContent(
      'Toxicity Detection',
    );
    expect(
      screen.getByTestId('compare-benchmark-row-job-collection|truthfulqa_mc1|0'),
    ).toHaveTextContent('Benchmark run');
    expect(
      screen.getByTestId('compare-benchmark-row-job-collection|toxicity_detection|1'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('compare-benchmark-row-job-benchmark|toxicity_detection|0'),
    ).toBeInTheDocument();

    fireEvent.click(getCheckbox('compare-run-checkbox-job-benchmark'));
    expect(getCheckbox('compare-run-checkbox-job-benchmark')).toBeChecked();

    fireEvent.click(getCheckbox('compare-run-checkbox-job-collection'));
    expect(getCheckbox('compare-benchmark-checkbox-job-collection|truthfulqa_mc1|0')).toBeChecked();
    expect(
      getCheckbox('compare-benchmark-checkbox-job-collection|toxicity_detection|1'),
    ).toBeChecked();
  });

  it('should filter jobs by evaluation run', () => {
    /* eslint-disable camelcase */
    const collectionJob = mockEvaluationJob({
      id: 'job-collection',
      name: 'Suite One',
      collectionId: 'col-1',
      createdAt: '2026-02-20T10:00:00Z',
    });
    collectionJob.resource.mlflow_experiment_id = 'exp-1';
    collectionJob.collection = {
      id: 'col-1',
      benchmarks: [
        { id: 'truthfulqa_mc1', provider_id: 'lm', benchmark_index: 0 },
        { id: 'toxicity_detection', provider_id: 'lm', benchmark_index: 1 },
      ],
    };
    collectionJob.results.benchmarks = [
      { id: 'truthfulqa_mc1', benchmark_index: 0, mlflow_run_id: 'run-1' },
      { id: 'toxicity_detection', benchmark_index: 1, mlflow_run_id: 'run-2' },
    ];

    const benchmarkJob = mockEvaluationJob({
      id: 'job-benchmark',
      name: 'Toxicity Detection',
      benchmarkId: 'toxicity_detection',
    });
    benchmarkJob.resource.mlflow_experiment_id = 'exp-2';
    benchmarkJob.results.benchmarks = [
      { id: 'toxicity_detection', benchmark_index: 0, mlflow_run_id: 'run-3' },
    ];
    /* eslint-enable camelcase */

    mockUseEvaluationJobs.mockReturnValue([
      [collectionJob, benchmarkJob],
      true,
      undefined,
      jest.fn(),
    ]);

    renderPage('/test-project/compare-runs/benchmarks?jobIds=job-collection,job-benchmark');

    fireEvent.change(screen.getByPlaceholderText('Search name'), {
      target: { value: 'Suite One' },
    });

    expect(screen.getByTestId('compare-run-row-job-collection')).toBeInTheDocument();
    expect(screen.queryByTestId('compare-run-row-job-benchmark')).not.toBeInTheDocument();
    expect(
      screen.getByTestId('compare-benchmark-row-job-collection|truthfulqa_mc1|0'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('compare-benchmark-row-job-collection|toxicity_detection|1'),
    ).toBeInTheDocument();
  });

  it('should filter expandable child rows by evaluation run label', () => {
    /* eslint-disable camelcase */
    const collectionJob = mockEvaluationJob({
      id: 'job-collection',
      name: 'Suite One',
      collectionId: 'col-1',
      createdAt: '2026-02-20T10:00:00Z',
    });
    collectionJob.resource.mlflow_experiment_id = 'exp-1';
    collectionJob.collection = {
      id: 'col-1',
      benchmarks: [
        { id: 'truthfulqa_mc1', provider_id: 'lm', benchmark_index: 0 },
        { id: 'toxicity_detection', provider_id: 'lm', benchmark_index: 1 },
      ],
    };
    collectionJob.results.benchmarks = [
      { id: 'truthfulqa_mc1', benchmark_index: 0, mlflow_run_id: 'run-1' },
      { id: 'toxicity_detection', benchmark_index: 1, mlflow_run_id: 'run-2' },
    ];

    const benchmarkJob = mockEvaluationJob({
      id: 'job-benchmark',
      name: 'Other Run',
      benchmarkId: 'gpqa',
    });
    benchmarkJob.resource.mlflow_experiment_id = 'exp-2';
    benchmarkJob.results.benchmarks = [{ id: 'gpqa', benchmark_index: 0, mlflow_run_id: 'run-3' }];
    /* eslint-enable camelcase */

    mockUseEvaluationJobs.mockReturnValue([
      [collectionJob, benchmarkJob],
      true,
      undefined,
      jest.fn(),
    ]);

    renderPage('/test-project/compare-runs/benchmarks?jobIds=job-collection,job-benchmark');

    fireEvent.change(screen.getByPlaceholderText('Search name'), {
      target: { value: 'Toxicity' },
    });

    expect(screen.getByTestId('compare-run-row-job-collection')).toBeInTheDocument();
    expect(screen.queryByTestId('compare-run-row-job-benchmark')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('compare-benchmark-row-job-collection|truthfulqa_mc1|0'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('compare-benchmark-row-job-collection|toxicity_detection|1'),
    ).toBeInTheDocument();
  });

  it('should require at least two benchmark selections to compare', () => {
    /* eslint-disable camelcase */
    const jobOne = mockEvaluationJob({ id: 'job-1', name: 'Suite One', benchmarkId: 'ifeval' });
    jobOne.resource.mlflow_experiment_id = 'exp-1';
    jobOne.benchmarks = [
      { id: 'ifeval', provider_id: 'lm', benchmark_index: 0 },
      { id: 'bbh', provider_id: 'lm', benchmark_index: 1 },
    ];
    jobOne.results.benchmarks = [
      { id: 'ifeval', benchmark_index: 0, mlflow_run_id: 'run-1' },
      { id: 'bbh', benchmark_index: 1, mlflow_run_id: 'run-2' },
    ];

    const jobTwo = mockEvaluationJob({ id: 'job-2', name: 'Suite Two', benchmarkId: 'gpqa' });
    jobTwo.resource.mlflow_experiment_id = 'exp-2';
    jobTwo.benchmarks = [
      { id: 'gpqa', provider_id: 'lm', benchmark_index: 0 },
      { id: 'mmlu', provider_id: 'lm', benchmark_index: 1 },
    ];
    jobTwo.results.benchmarks = [
      { id: 'gpqa', benchmark_index: 0, mlflow_run_id: 'run-3' },
      { id: 'mmlu', benchmark_index: 1, mlflow_run_id: 'run-4' },
    ];
    /* eslint-enable camelcase */

    mockUseEvaluationJobs.mockReturnValue([[jobOne, jobTwo], true, undefined, jest.fn()]);

    renderPage('/test-project/compare-runs/benchmarks?jobIds=job-1,job-2');

    const compareButton = screen.getByTestId('compare-selected-benchmarks-button');
    expect(compareButton).toBeDisabled();

    fireEvent.click(getCheckbox('compare-benchmark-checkbox-job-1|ifeval|0'));
    expect(compareButton).toBeDisabled();

    fireEvent.click(getCheckbox('compare-benchmark-checkbox-job-2|gpqa|0'));
    expect(compareButton).toBeEnabled();

    fireEvent.click(compareButton);
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/evaluation/test-project/compare-runs',
      }),
    );
  });

  it('should enable compare when two benchmarks from the same collection run are selected', () => {
    /* eslint-disable camelcase */
    const collectionJob = mockEvaluationJob({
      id: 'job-collection',
      name: 'Suite One',
      collectionId: 'col-1',
      createdAt: '2026-02-20T10:00:00Z',
    });
    collectionJob.resource.mlflow_experiment_id = 'exp-1';
    collectionJob.collection = {
      id: 'col-1',
      benchmarks: [
        { id: 'ifeval', provider_id: 'lm', benchmark_index: 0 },
        { id: 'bbh', provider_id: 'lm', benchmark_index: 1 },
      ],
    };
    collectionJob.results.benchmarks = [
      { id: 'ifeval', benchmark_index: 0, mlflow_run_id: 'run-1' },
      { id: 'bbh', benchmark_index: 1, mlflow_run_id: 'run-2' },
    ];

    const otherJob = mockEvaluationJob({ id: 'job-other', name: 'Other', benchmarkId: 'gpqa' });
    otherJob.resource.mlflow_experiment_id = 'exp-2';
    otherJob.results.benchmarks = [{ id: 'gpqa', benchmark_index: 0, mlflow_run_id: 'run-3' }];
    /* eslint-enable camelcase */

    mockUseEvaluationJobs.mockReturnValue([[collectionJob, otherJob], true, undefined, jest.fn()]);

    renderPage('/test-project/compare-runs/benchmarks?jobIds=job-collection,job-other');

    const compareButton = screen.getByTestId('compare-selected-benchmarks-button');
    fireEvent.click(getCheckbox('compare-benchmark-checkbox-job-collection|ifeval|0'));
    fireEvent.click(getCheckbox('compare-benchmark-checkbox-job-collection|bbh|1'));
    expect(compareButton).toBeEnabled();
  });
});
