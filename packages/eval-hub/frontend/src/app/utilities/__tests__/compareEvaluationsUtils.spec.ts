import { mockEvaluationJob } from '~/__tests__/unit/testUtils/mockEvaluationData';
import {
  buildMlflowCompareSearchParams,
  filterComparableRunsForCompareBenchmarkSearch,
  filterJobsForCompareBenchmarkSearch,
  getSelectionKeysCheckedState,
  jobMatchesCompareBenchmarkSearch,
  parseBenchmarkSelectionKey,
} from '~/app/utilities/compareEvaluationsUtils';

describe('parseBenchmarkSelectionKey', () => {
  it('should parse a selection key with benchmark index', () => {
    expect(parseBenchmarkSelectionKey('job-1|bench-a|0')).toEqual({
      jobId: 'job-1',
      benchmarkId: 'bench-a',
      benchmarkIndex: 0,
    });
  });

  it('should parse a selection key without benchmark index', () => {
    expect(parseBenchmarkSelectionKey('job-1|bench-a|')).toEqual({
      jobId: 'job-1',
      benchmarkId: 'bench-a',
      benchmarkIndex: undefined,
    });
  });

  it('should return null for invalid keys', () => {
    expect(parseBenchmarkSelectionKey('invalid')).toBeNull();
    expect(parseBenchmarkSelectionKey('|bench-a|0')).toBeNull();
  });
});

describe('getSelectionKeysCheckedState', () => {
  const selected = new Set(['a', 'b']);

  it('should return false when no keys are provided', () => {
    expect(getSelectionKeysCheckedState([], selected)).toBe(false);
  });

  it('should return true when all keys are selected', () => {
    expect(getSelectionKeysCheckedState(['a', 'b'], selected)).toBe(true);
  });

  it('should return null when some keys are selected', () => {
    expect(getSelectionKeysCheckedState(['a', 'c'], selected)).toBeNull();
  });

  it('should return false when no keys are selected', () => {
    expect(getSelectionKeysCheckedState(['c', 'd'], selected)).toBe(false);
  });
});

describe('filterJobsForCompareBenchmarkSearch', () => {
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

  it('should match the evaluation run column for benchmark jobs', () => {
    expect(filterJobsForCompareBenchmarkSearch([benchmarkJob], 'Toxicity')).toHaveLength(1);
    expect(filterJobsForCompareBenchmarkSearch([benchmarkJob], 'Safety')).toHaveLength(0);
  });

  it('should match the evaluation run column for collection jobs', () => {
    expect(filterJobsForCompareBenchmarkSearch([collectionJob], 'Suite One')).toHaveLength(1);
    expect(filterJobsForCompareBenchmarkSearch([collectionJob], 'Safety')).toHaveLength(0);
  });

  it('should match child evaluation run labels in collection rows', () => {
    const matches = filterJobsForCompareBenchmarkSearch([collectionJob, benchmarkJob], 'truthful');
    expect(matches).toHaveLength(1);
    expect(matches[0].resource.id).toBe('job-collection');
  });

  it('should not match model or evaluation column values', () => {
    expect(jobMatchesCompareBenchmarkSearch(benchmarkJob, benchmarkJob.model.name)).toBe(false);
    expect(jobMatchesCompareBenchmarkSearch(collectionJob, 'Safety')).toBe(false);
  });
});

describe('filterComparableRunsForCompareBenchmarkSearch', () => {
  it('should keep all child rows when the parent evaluation run matches', () => {
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
    /* eslint-enable camelcase */

    expect(filterComparableRunsForCompareBenchmarkSearch(collectionJob, 'Suite One')).toHaveLength(
      2,
    );
  });

  it('should filter child rows when only a child evaluation run label matches', () => {
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
    /* eslint-enable camelcase */

    const filteredRuns = filterComparableRunsForCompareBenchmarkSearch(collectionJob, 'toxicity');

    expect(filteredRuns).toHaveLength(1);
    expect(filteredRuns[0].benchmarkId).toBe('toxicity_detection');
  });
});

describe('buildMlflowCompareSearchParams', () => {
  it('should serialize runs, experiments, and unique names', () => {
    const search = buildMlflowCompareSearchParams(
      [
        {
          jobId: 'job-1',
          runUuid: 'run-1',
          experimentId: 'exp-1',
          benchmarkId: 'bench-a',
          benchmarkIndex: 0,
        },
        {
          jobId: 'job-2',
          runUuid: 'run-2',
          experimentId: 'exp-2',
          benchmarkId: 'bench-b',
          benchmarkIndex: 0,
        },
      ],
      (run) => `name-${run.jobId}`,
    );

    const params = new URLSearchParams(search);
    expect(JSON.parse(params.get('runs') ?? '[]')).toEqual(['run-1', 'run-2']);
    expect(JSON.parse(params.get('experiments') ?? '[]')).toEqual(['exp-1', 'exp-2']);
    expect(JSON.parse(params.get('names') ?? '[]')).toEqual(['name-job-1', 'name-job-2']);
  });
});
