import { mockEvaluationJob } from '~/__tests__/unit/testUtils/mockEvaluationData';
import {
  getEvaluationName,
  getBenchmarkName,
  getAllBenchmarkNames,
  getBenchmarkResultScore,
  getJobBenchmarks,
  getResultScore,
  formatDate,
} from '~/app/utilities/evaluationUtils';

describe('getEvaluationName', () => {
  it('should return name when available', () => {
    const job = mockEvaluationJob({ name: 'My Evaluation' });
    expect(getEvaluationName(job)).toBe('My Evaluation');
  });

  it('should fall back to tenant when name is not set', () => {
    const job = mockEvaluationJob({ tenant: 'Tenant Name' });
    expect(getEvaluationName(job)).toBe('Tenant Name');
  });

  it('should fall back to resource id when neither name nor tenant is set', () => {
    const job = mockEvaluationJob({ id: 'eval-123' });
    expect(getEvaluationName(job)).toBe('eval-123');
  });
});

describe('getBenchmarkName', () => {
  it('should return the display name of the first benchmark', () => {
    const job = mockEvaluationJob({ benchmarkId: 'MMLU Finance' });
    expect(getBenchmarkName(job)).toBe('MMLU Finance');
  });

  it('should return dash when benchmarks is an empty array', () => {
    const job = mockEvaluationJob();
    job.benchmarks = [];
    expect(getBenchmarkName(job)).toBe('-');
  });

  it('should return dash when benchmarks is null and no collection', () => {
    const job = mockEvaluationJob();
    job.benchmarks = null;
    expect(getBenchmarkName(job)).toBe('-');
  });

  it('should return collection id when benchmarks is null and collection is set', () => {
    const job = mockEvaluationJob({ collectionId: 'my-collection' });
    expect(getBenchmarkName(job)).toBe('my-collection');
  });

  /* eslint-disable camelcase */
  it('should return collection id even when results.benchmarks is populated', () => {
    const job = mockEvaluationJob({ collectionId: 'my-collection' });
    job.results.benchmarks = [{ id: 'arc_easy', provider_id: 'lm_evaluation_harness' }];
    expect(getBenchmarkName(job)).toBe('my-collection');
  });
  /* eslint-enable camelcase */

  it('should return collection name from map when collectionNameMap is provided', () => {
    const job = mockEvaluationJob({ collectionId: 'my-collection' });
    expect(getBenchmarkName(job, { 'my-collection': 'My Collection Name' })).toBe(
      'My Collection Name',
    );
  });

  /* eslint-disable camelcase */
  it('should show +N more when there are multiple benchmarks', () => {
    const job = mockEvaluationJob({ benchmarkId: 'arc_easy' });
    job.benchmarks = [
      { id: 'arc_easy', provider_id: 'lm_evaluation_harness' },
      { id: 'hellaswag_ar', provider_id: 'lm_evaluation_harness' },
    ];
    expect(getBenchmarkName(job)).toBe('Arc Easy +1 more');
  });

  it('should show +N more for three benchmarks', () => {
    const job = mockEvaluationJob();
    job.benchmarks = [
      { id: 'arc_easy', provider_id: 'lm_evaluation_harness' },
      { id: 'hellaswag_ar', provider_id: 'lm_evaluation_harness' },
      { id: 'mmlu', provider_id: 'lighteval' },
    ];
    expect(getBenchmarkName(job)).toBe('Arc Easy +2 more');
  });
  /* eslint-enable camelcase */
});

describe('getAllBenchmarkNames', () => {
  /* eslint-disable camelcase */
  it('should return all benchmark ids', () => {
    const job = mockEvaluationJob();
    job.benchmarks = [
      { id: 'arc_easy', provider_id: 'lm_evaluation_harness' },
      { id: 'hellaswag_ar', provider_id: 'lm_evaluation_harness' },
    ];
    expect(getAllBenchmarkNames(job)).toEqual(['arc_easy', 'hellaswag_ar']);
  });
  /* eslint-enable camelcase */

  it('should return empty array when benchmarks is null', () => {
    const job = mockEvaluationJob();
    job.benchmarks = null;
    expect(getAllBenchmarkNames(job)).toEqual([]);
  });
});

describe('getJobBenchmarks', () => {
  /* eslint-disable camelcase */
  it('should return job.benchmarks when present', () => {
    const job = mockEvaluationJob({ benchmarkId: 'arc_easy' });
    expect(getJobBenchmarks(job)).toEqual([
      { id: 'arc_easy', provider_id: 'lm_evaluation_harness' },
    ]);
  });

  it('should fall back to results.benchmarks for collection-only jobs', () => {
    const job = mockEvaluationJob({ collectionId: 'my-collection' });
    job.results.benchmarks = [
      { id: 'arc_easy', provider_id: 'lm_evaluation_harness', benchmark_index: 0 },
      { id: 'arc_easy', provider_id: 'lm_evaluation_harness', benchmark_index: 1 },
    ];
    const benchmarks = getJobBenchmarks(job);
    expect(benchmarks).toHaveLength(2);
    expect(benchmarks[0]).toEqual({
      id: 'arc_easy',
      provider_id: 'lm_evaluation_harness',
      benchmark_index: 0,
    });
    expect(benchmarks[1]).toEqual({
      id: 'arc_easy',
      provider_id: 'lm_evaluation_harness',
      benchmark_index: 1,
    });
  });

  it('should preserve benchmark_index from results.benchmarks so mlflow run linking works', () => {
    const job = mockEvaluationJob({ collectionId: 'my-collection' });
    job.results.benchmarks = [
      {
        id: 'arc_easy',
        benchmark_index: 0,
        mlflow_run_id: 'run-0',
      },
      {
        id: 'arc_easy',
        benchmark_index: 1,
        mlflow_run_id: 'run-1',
      },
    ];
    const benchmarks = getJobBenchmarks(job);
    expect(benchmarks[0].benchmark_index).toBe(0);
    expect(benchmarks[1].benchmark_index).toBe(1);
  });

  it('should merge collection benchmark configs with results benchmark_index', () => {
    const job = mockEvaluationJob({ collectionId: 'my-collection' });
    job.collection = {
      id: 'my-collection',
      benchmarks: [
        {
          id: 'arc_easy',
          provider_id: 'lm_evaluation_harness',
          primary_score: { metric: 'acc_norm', lower_is_better: false },
          pass_criteria: { threshold: 0.5 },
        },
        {
          id: 'arc_easy',
          provider_id: 'lm_evaluation_harness',
          primary_score: { metric: 'acc_norm', lower_is_better: false },
          pass_criteria: { threshold: 0.5 },
        },
      ],
    };
    job.results.benchmarks = [
      { id: 'arc_easy', provider_id: 'lm_evaluation_harness', benchmark_index: 0 },
      { id: 'arc_easy', provider_id: 'lm_evaluation_harness', benchmark_index: 1 },
    ];
    const benchmarks = getJobBenchmarks(job);
    expect(benchmarks).toHaveLength(2);
    expect(benchmarks[0].benchmark_index).toBe(0);
    expect(benchmarks[1].benchmark_index).toBe(1);
    expect(benchmarks[0].primary_score).toEqual({ metric: 'acc_norm', lower_is_better: false });
    expect(benchmarks[1].pass_criteria).toEqual({ threshold: 0.5 });
  });

  it('should merge collection config when results benchmarks lack benchmark_index', () => {
    const job = mockEvaluationJob({ collectionId: 'my-collection' });
    job.collection = {
      id: 'my-collection',
      benchmarks: [
        {
          id: 'arc_easy',
          provider_id: 'lm_evaluation_harness',
          primary_score: { metric: 'acc_norm', lower_is_better: false },
          pass_criteria: { threshold: 0.7 },
        },
      ],
    };
    job.results.benchmarks = [{ id: 'arc_easy', provider_id: 'lm_evaluation_harness' }];
    const benchmarks = getJobBenchmarks(job);
    expect(benchmarks).toHaveLength(1);
    expect(benchmarks[0].primary_score).toEqual({ metric: 'acc_norm', lower_is_better: false });
    expect(benchmarks[0].pass_criteria).toEqual({ threshold: 0.7 });
  });

  it('should assign benchmark_index from position when collection benchmarks have no results', () => {
    const job = mockEvaluationJob({ collectionId: 'my-collection' });
    job.collection = {
      id: 'my-collection',
      benchmarks: [
        { id: 'arc_easy', provider_id: 'lm_evaluation_harness' },
        { id: 'hellaswag', provider_id: 'lm_evaluation_harness' },
      ],
    };
    job.results.benchmarks = [];
    const benchmarks = getJobBenchmarks(job);
    expect(benchmarks).toHaveLength(2);
    expect(benchmarks[0].benchmark_index).toBe(0);
    expect(benchmarks[1].benchmark_index).toBe(1);
  });
  /* eslint-enable camelcase */

  it('should return empty array when no benchmark source is available', () => {
    const job = mockEvaluationJob({ collectionId: 'my-collection' });
    job.results.benchmarks = [];
    expect(getJobBenchmarks(job)).toEqual([]);
  });
});

describe('getResultScore', () => {
  it('should return percentage from top-level test score', () => {
    const job = mockEvaluationJob({ score: 0.85 });
    expect(getResultScore(job)).toBe('85%');
  });

  it('should round fractional percentages to nearest integer', () => {
    const job = mockEvaluationJob({ score: 0.466 });
    expect(getResultScore(job)).toBe('47%');
  });

  it('should fall back to benchmark test primary_score when top-level test is absent', () => {
    const job = mockEvaluationJob();
    // eslint-disable-next-line camelcase
    job.results = { benchmarks: [{ id: 'b1', test: { primary_score: 0.72 } }] };
    expect(getResultScore(job)).toBe('72%');
  });

  it('should return dash when results has no benchmarks and no test', () => {
    const job = mockEvaluationJob();
    job.results = {};
    expect(getResultScore(job)).toBe('-');
  });

  /* eslint-disable camelcase */
  it('should prefer acc_norm over acc when both are present', () => {
    const job = mockEvaluationJob();
    job.results = { benchmarks: [{ id: 'b1', metrics: { acc: 0.7, acc_norm: 0.85 } }] };
    expect(getResultScore(job)).toBe('85%');
  });

  it('should fall back to acc when acc_norm is absent', () => {
    const job = mockEvaluationJob();
    job.results = { benchmarks: [{ id: 'b1', metrics: { acc: 0.85 } }] };
    expect(getResultScore(job)).toBe('85%');
  });

  it('should return dash when metrics has neither acc_norm nor acc', () => {
    const job = mockEvaluationJob();
    job.results = { benchmarks: [{ id: 'b1', metrics: { f1_score: 0.9 } }] };
    expect(getResultScore(job)).toBe('-');
  });
  /* eslint-enable camelcase */

  it('should return dash when benchmarks have no test and no metrics', () => {
    const job = mockEvaluationJob();
    job.results = { benchmarks: [{ id: 'b1' }] };
    expect(getResultScore(job)).toBe('-');
  });

  it('should handle 0% result', () => {
    const job = mockEvaluationJob({ score: 0 });
    expect(getResultScore(job)).toBe('0%');
  });

  it('should handle 100% result', () => {
    const job = mockEvaluationJob({ score: 1.0 });
    expect(getResultScore(job)).toBe('100%');
  });
});

describe('getBenchmarkResultScore', () => {
  /* eslint-disable camelcase */
  it('should return score for a specific benchmark by id', () => {
    const job = mockEvaluationJob();
    job.results = {
      benchmarks: [
        { id: 'arc_easy', test: { primary_score: 0.7 } },
        { id: 'hellaswag_ar', test: { primary_score: 0.45 } },
      ],
    };
    expect(getBenchmarkResultScore(job, 'arc_easy')).toBe('70%');
    expect(getBenchmarkResultScore(job, 'hellaswag_ar')).toBe('45%');
  });
  /* eslint-enable camelcase */

  it('should fall back to acc when test is absent', () => {
    const job = mockEvaluationJob();
    job.results = {
      benchmarks: [{ id: 'b1', metrics: { acc: 0.9 } }],
    };
    expect(getBenchmarkResultScore(job, 'b1')).toBe('90%');
  });

  /* eslint-disable camelcase */
  it('should prefer acc_norm over acc for benchmark score', () => {
    const job = mockEvaluationJob();
    job.results = {
      benchmarks: [{ id: 'b1', metrics: { acc: 0.7, acc_norm: 0.85 } }],
    };
    expect(getBenchmarkResultScore(job, 'b1')).toBe('85%');
  });
  /* eslint-enable camelcase */

  it('should return dash when benchmark is not found', () => {
    const job = mockEvaluationJob();
    job.results = { benchmarks: [] };
    expect(getBenchmarkResultScore(job, 'missing')).toBe('-');
  });
});

describe('formatDate', () => {
  it('should return dash for undefined input', () => {
    expect(formatDate(undefined)).toBe('-');
  });

  it('should return dash for empty string', () => {
    expect(formatDate('')).toBe('-');
  });

  it('should format a valid ISO date string', () => {
    const result = formatDate('2026-02-20T10:00:00Z');
    expect(result).toBeTruthy();
    expect(result).not.toBe('-');
    expect(result).toContain('2026');
    expect(result).toContain('02');
  });

  it('should return the original string for an invalid date', () => {
    const result = formatDate('not-a-date');
    expect(typeof result).toBe('string');
  });
});
