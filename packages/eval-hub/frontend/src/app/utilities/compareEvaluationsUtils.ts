import { EvaluationJob } from '~/app/types';
import { CollectionNameMap } from '~/app/hooks/useCollectionNameMap';
import {
  getBenchmarkDisplayName,
  getBenchmarkName,
  getEvaluationName,
  getJobBenchmarks,
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

export const getRunDisplayTitle = (job: EvaluationJob): string => getEvaluationName(job);

export const getBenchmarkDisplayTitle = (benchmarkId: string): string =>
  getBenchmarkDisplayName(benchmarkId);

export type CompareRunType = 'Collection' | 'Benchmark';

export const getCompareRunType = (job: EvaluationJob): CompareRunType =>
  isBenchmarkSuiteRun(job) ? 'Collection' : 'Benchmark';

/** Collection: run timestamp in Evaluation run. Benchmark: job name (same as the child benchmark row). */
export const getCompareParentEvaluationRunLabel = (job: EvaluationJob): string => {
  if (isBenchmarkSuiteRun(job)) {
    return formatCompareEvaluationRunLabel(job.resource.created_at);
  }

  return getRunDisplayTitle(job);
};

export const getCompareRunEvaluationLabel = (
  job: EvaluationJob,
  collectionNameMap?: CollectionNameMap,
): string => {
  if (isBenchmarkSuiteRun(job)) {
    return getBenchmarkName(job, collectionNameMap);
  }

  const benchmarks = getJobBenchmarks(job);
  return benchmarks.length > 0 ? getBenchmarkDisplayTitle(benchmarks[0].id) : '-';
};

export const formatCompareEvaluationRunLabel = (dateStr?: string): string => {
  if (!dateStr) {
    return '-';
  }

  try {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

export const formatCompareTableDate = (dateStr?: string): string => {
  if (!dateStr) {
    return '-';
  }

  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

/** Label for the page title: suite/collection runs use the run timestamp; single benchmarks use the evaluation name. */
export const getCompareRunTitleLabel = (job: EvaluationJob): string => {
  if (isBenchmarkSuiteRun(job)) {
    return formatCompareEvaluationRunLabel(job.resource.created_at);
  }

  return getRunDisplayTitle(job);
};

export const buildCompareBenchmarksPageTitle = (jobs: EvaluationJob[]): string => {
  const labels = jobs.map(getCompareRunTitleLabel);

  if (labels.length < 2) {
    return 'Compare runs';
  }

  if (labels.length === 2) {
    return `Comparing ${labels[0]} and ${labels[1]}`;
  }

  return `Comparing ${labels[0]}, ${labels[1]} and ${labels.length - 2} more`;
};

export type CompareBenchmarkSearchMatch = {
  job: EvaluationJob;
  /** When set, only these comparable runs are shown for the job; otherwise all runs are shown. */
  visibleRunKeys: Set<string> | null;
};

export const filterJobsForCompareBenchmarkSearch = (
  jobs: EvaluationJob[],
  collectionNameMap: CollectionNameMap | undefined,
  searchText: string,
): CompareBenchmarkSearchMatch[] => {
  const normalized = searchText.trim().toLowerCase();
  if (!normalized) {
    return jobs.map((job) => ({ job, visibleRunKeys: null }));
  }

  return jobs
    .map((job) => {
      const evaluationRunLabel = getCompareParentEvaluationRunLabel(job).toLowerCase();
      const evaluationLabel = getCompareRunEvaluationLabel(job, collectionNameMap).toLowerCase();
      const evaluatedLabel = job.model.name.toLowerCase();
      const runType = getCompareRunType(job).toLowerCase();
      const runDisplayTitle = getRunDisplayTitle(job).toLowerCase();

      const parentMatches =
        evaluationRunLabel.includes(normalized) ||
        evaluationLabel.includes(normalized) ||
        evaluatedLabel.includes(normalized) ||
        runType.includes(normalized) ||
        runDisplayTitle.includes(normalized);

      if (parentMatches) {
        return { job, visibleRunKeys: null };
      }

      const visibleRunKeys = new Set<string>();
      getComparableRunsForJob(job).forEach((run) => {
        const benchmarkLabel = getBenchmarkDisplayTitle(run.benchmarkId).toLowerCase();
        if (
          benchmarkLabel.includes(normalized) ||
          run.benchmarkId.toLowerCase().includes(normalized)
        ) {
          visibleRunKeys.add(
            buildBenchmarkSelectionKey({
              jobId: job.resource.id,
              benchmarkId: run.benchmarkId,
              benchmarkIndex: run.benchmarkIndex,
            }),
          );
        }
      });

      if (visibleRunKeys.size === 0) {
        return null;
      }

      return { job, visibleRunKeys };
    })
    .filter((match): match is CompareBenchmarkSearchMatch => match !== null);
};
