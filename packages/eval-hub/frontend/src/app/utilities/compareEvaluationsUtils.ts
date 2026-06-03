import { EvaluationJob } from '~/app/types';
import { CollectionNameMap } from '~/app/hooks/useCollectionNameMap';
import {
  getBenchmarkDisplayName,
  getBenchmarkName,
  getBenchmarkResultScore,
  getEvaluationName,
  getJobBenchmarks,
  getResultScore,
} from '~/app/utilities/evaluationUtils';

export type BenchmarkSelection = {
  jobId: string;
  benchmarkId: string;
  benchmarkIndex: number | undefined;
};

export type ComparableRun = {
  experimentId: string;
  runUuid: string;
  benchmarkId: string;
  benchmarkIndex: number;
};

export type ComparableRunWithJobId = ComparableRun & { jobId: string };

export const parseCsvParam = (raw: string): string[] =>
  raw
    .split(',')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

export const buildBenchmarkSelectionKey = ({
  jobId,
  benchmarkId,
  benchmarkIndex,
}: BenchmarkSelection): string =>
  `${jobId}|${benchmarkId}|${benchmarkIndex == null ? '' : String(benchmarkIndex)}`;

export const parseBenchmarkSelectionKey = (key: string): BenchmarkSelection | null => {
  const [jobId, benchmarkId, benchmarkIndexRaw] = key.split('|');
  if (!jobId || !benchmarkId) {
    return null;
  }

  if (!benchmarkIndexRaw) {
    return { jobId, benchmarkId, benchmarkIndex: undefined };
  }

  const parsedIndex = Number(benchmarkIndexRaw);
  if (!Number.isFinite(parsedIndex)) {
    return null;
  }

  return {
    jobId,
    benchmarkId,
    benchmarkIndex: parsedIndex,
  };
};

export const serializeMlflowArrayParam = (values: string[]): string => JSON.stringify(values);

export const parseMlflowArrayParam = (raw: string | null): string[] => {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((value) => typeof value === 'string')
      ? parsed
      : [];
  } catch {
    return [];
  }
};

const resolveBenchmarkRunUuid = (
  job: EvaluationJob,
  benchmarkId: string,
  benchmarkIndex: number | undefined,
): string | undefined => {
  const exactMatch = job.results.benchmarks?.find(
    (benchmarkResult) =>
      benchmarkResult.id === benchmarkId &&
      (benchmarkIndex === undefined || benchmarkResult.benchmark_index === benchmarkIndex),
  );

  if (exactMatch?.mlflow_run_id) {
    return exactMatch.mlflow_run_id;
  }

  const idOnlyMatch = job.results.benchmarks?.find(
    (benchmarkResult) => benchmarkResult.id === benchmarkId,
  );
  return idOnlyMatch?.mlflow_run_id;
};

export const getComparableRunsForJob = (job: EvaluationJob): ComparableRun[] => {
  const experimentId = job.resource.mlflow_experiment_id;
  if (!experimentId) {
    return [];
  }

  return getJobBenchmarks(job)
    .map((benchmark, fallbackIndex) => {
      const benchmarkIndex = benchmark.benchmark_index ?? fallbackIndex;
      const runUuid = resolveBenchmarkRunUuid(job, benchmark.id, benchmark.benchmark_index);

      if (!runUuid) {
        return null;
      }

      return {
        experimentId,
        runUuid,
        benchmarkId: benchmark.id,
        benchmarkIndex,
      };
    })
    .filter((run): run is ComparableRun => run !== null);
};

export const isBenchmarkSuiteRun = (job: EvaluationJob): boolean =>
  getJobBenchmarks(job).length > 1;

export type CompareRunType = 'Single benchmark' | 'Benchmark suite';

export const COMPARE_RUNS_PAGE_TITLE = 'Compare runs';

export const COMPARE_CHILD_RUN_TYPE = 'Benchmark run';

export const getCompareRunType = (job: EvaluationJob): CompareRunType =>
  isBenchmarkSuiteRun(job) ? 'Benchmark suite' : 'Single benchmark';

/** Evaluation run column for parent rows. */
export const getCompareParentEvaluationRunLabel = (job: EvaluationJob): string =>
  getEvaluationName(job);

export const getCompareParentResultScore = (job: EvaluationJob): string =>
  isBenchmarkSuiteRun(job) ? '-' : getResultScore(job);

export const getCompareBenchmarkResultScore = (
  job: EvaluationJob,
  benchmarkId: string,
  benchmarkIndex: number,
): string => getBenchmarkResultScore(job, benchmarkId, benchmarkIndex);

export const getCompareRunEvaluationLabel = (
  job: EvaluationJob,
  collectionNameMap?: CollectionNameMap,
): string => {
  if (isBenchmarkSuiteRun(job)) {
    return getBenchmarkName(job, collectionNameMap);
  }

  const benchmarks = getJobBenchmarks(job);
  return benchmarks.length > 0 ? getBenchmarkDisplayName(benchmarks[0].id) : '-';
};

export { formatDate as formatCompareTableDate } from '~/app/utilities/evaluationUtils';

export const getSelectionKeysCheckedState = (
  selectionKeys: string[],
  selectedBenchmarkKeys: Set<string>,
): boolean | null => {
  if (selectionKeys.length === 0) {
    return false;
  }

  const selectedCount = selectionKeys.filter((key) => selectedBenchmarkKeys.has(key)).length;
  if (selectedCount === selectionKeys.length) {
    return true;
  }
  if (selectedCount > 0) {
    return null;
  }
  return false;
};

export const getBenchmarkSelectionsFromKeys = (
  selectedBenchmarkKeys: Set<string>,
): BenchmarkSelection[] =>
  Array.from(selectedBenchmarkKeys)
    .map(parseBenchmarkSelectionKey)
    .filter((selection): selection is BenchmarkSelection => selection !== null);

export const resolveComparableRunsFromSelections = (
  jobs: EvaluationJob[],
  selections: BenchmarkSelection[],
): ComparableRunWithJobId[] => {
  const jobsById = new Map(jobs.map((job) => [job.resource.id, job]));

  return selections
    .map((selection) => {
      const selectedJob = jobsById.get(selection.jobId);
      if (!selectedJob) {
        return null;
      }

      const matchingComparableRun = getComparableRunsForJob(selectedJob).find(
        (run) =>
          run.benchmarkId === selection.benchmarkId &&
          (selection.benchmarkIndex === undefined ||
            run.benchmarkIndex === selection.benchmarkIndex),
      );

      if (!matchingComparableRun) {
        return null;
      }

      return {
        ...matchingComparableRun,
        jobId: selection.jobId,
      };
    })
    .filter((run): run is ComparableRunWithJobId => run !== null);
};

export const buildDefaultComparableRunsFromJobs = (
  jobs: EvaluationJob[],
): ComparableRunWithJobId[] =>
  jobs.flatMap((job) =>
    getComparableRunsForJob(job)
      .slice(0, 1)
      .map((defaultRun) => ({
        ...defaultRun,
        jobId: job.resource.id,
      })),
  );

export const buildMlflowCompareSearchParams = (
  runs: ComparableRunWithJobId[],
  resolveRunName: (run: ComparableRunWithJobId) => string,
): string => {
  const search = new URLSearchParams();
  search.set('runs', serializeMlflowArrayParam(runs.map((run) => run.runUuid)));
  search.set('experiments', serializeMlflowArrayParam(runs.map((run) => run.experimentId)));
  search.set('names', serializeMlflowArrayParam(Array.from(new Set(runs.map(resolveRunName)))));
  return search.toString();
};

const normalizeCompareBenchmarkSearchText = (searchText: string): string =>
  searchText.trim().toLowerCase();

const getCompareBenchmarkEvaluationRunSearchValue = (job: EvaluationJob): string =>
  getCompareParentEvaluationRunLabel(job).toLowerCase();

const getComparableRunEvaluationRunSearchValue = (
  job: EvaluationJob,
  run: ComparableRun,
): string => {
  if (getCompareRunType(job) === 'Single benchmark') {
    return getCompareBenchmarkEvaluationRunSearchValue(job);
  }

  return getBenchmarkDisplayName(run.benchmarkId).toLowerCase();
};

export const jobMatchesCompareBenchmarkSearch = (
  job: EvaluationJob,
  searchText: string,
): boolean => {
  const normalized = normalizeCompareBenchmarkSearchText(searchText);
  if (!normalized) {
    return true;
  }

  if (getCompareBenchmarkEvaluationRunSearchValue(job).includes(normalized)) {
    return true;
  }

  return getComparableRunsForJob(job).some((run) =>
    getComparableRunEvaluationRunSearchValue(job, run).includes(normalized),
  );
};

export const filterComparableRunsForCompareBenchmarkSearch = (
  job: EvaluationJob,
  searchText: string,
): ComparableRun[] => {
  const comparableRuns = getComparableRunsForJob(job);
  const normalized = normalizeCompareBenchmarkSearchText(searchText);
  if (!normalized) {
    return comparableRuns;
  }

  if (getCompareBenchmarkEvaluationRunSearchValue(job).includes(normalized)) {
    return comparableRuns;
  }

  return comparableRuns.filter((run) =>
    getComparableRunEvaluationRunSearchValue(job, run).includes(normalized),
  );
};

export const filterJobsForCompareBenchmarkSearch = (
  jobs: EvaluationJob[],
  searchText: string,
): EvaluationJob[] => {
  const normalized = normalizeCompareBenchmarkSearchText(searchText);
  if (!normalized) {
    return jobs;
  }

  return jobs.filter((job) => jobMatchesCompareBenchmarkSearch(job, normalized));
};
