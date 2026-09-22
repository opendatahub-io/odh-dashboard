import { EvaluationJob, EvaluationJobState } from '~/app/types';
import { CollectionNameMap } from '~/app/hooks/useCollectionNameMap';

export const getEvaluationName = (job: EvaluationJob): string =>
  job.name || job.resource.tenant || job.resource.id;

export const getJobBenchmarks = (job: EvaluationJob): NonNullable<EvaluationJob['benchmarks']> => {
  if (job.benchmarks?.length) {
    return job.benchmarks;
  }
  if (job.collection?.benchmarks?.length) {
    const collBenchmarks = job.collection.benchmarks;
    const resultsBenchmarks = job.results.benchmarks;
    if (resultsBenchmarks?.length) {
      /* eslint-disable camelcase */
      return resultsBenchmarks.map((rb, rbIdx) => {
        const config = collBenchmarks.find(
          (cb, cbIdx) =>
            cb.id === rb.id && (cb.benchmark_index ?? cbIdx) === (rb.benchmark_index ?? rbIdx),
        );
        return {
          id: rb.id,
          provider_id: rb.provider_id,
          benchmark_index: rb.benchmark_index,
          primary_score: config?.primary_score,
          pass_criteria: config?.pass_criteria,
        };
      });
      /* eslint-enable camelcase */
    }
    /* eslint-disable camelcase */
    return collBenchmarks.map((b, i) => ({
      ...b,
      benchmark_index: b.benchmark_index ?? i,
    }));
    /* eslint-enable camelcase */
  }
  if (job.results.benchmarks?.length) {
    /* eslint-disable camelcase */
    return job.results.benchmarks.map((b) => ({
      id: b.id,
      provider_id: b.provider_id,
      benchmark_index: b.benchmark_index,
    }));
    /* eslint-enable camelcase */
  }
  return [];
};

export const getBenchmarkName = (
  job: EvaluationJob,
  collectionNameMap?: CollectionNameMap,
): string => {
  if (job.collection?.id) {
    return collectionNameMap?.[job.collection.id] ?? job.collection.id;
  }
  const benchmarks = getJobBenchmarks(job);
  if (benchmarks.length > 0) {
    const first = getBenchmarkDisplayName(benchmarks[0].id);
    if (benchmarks.length === 1) {
      return first;
    }
    return `${first} +${benchmarks.length - 1} more`;
  }
  return '-';
};

export const getAllBenchmarkNames = (job: EvaluationJob): string[] =>
  getJobBenchmarks(job).map((b) => b.id);

export const getBenchmarkDisplayName = (id: string): string =>
  id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const formatAsPercentage = (value: number): string =>
  Number.isFinite(value) ? `${Math.round(value * 100)}%` : '-';

/**
 * Extract a display score from a benchmark result, returned as a formatted percentage.
 *
 * Resolution order:
 *  1. `benchmark.test.primary_score` — populated by the eval service when the `test` object is present.
 *  2. `primaryMetric` lookup in `benchmark.metrics` — the metric name from the benchmark's
 *     config (`primary_score.metric`). This covers providers like garak whose primary metric
 *     (`attack_success_rate`) is not in the well-known fallback list, and whose list-endpoint
 *     response may omit the `test` object entirely.
 *  3. Well-known metric names (`acc_norm`, `acc`, `attack_success_rate`) as a last resort.
 *
 * @param primaryMetric - The configured `primary_score.metric` from the benchmark config
 *   (e.g. `job.benchmarks[].primary_score.metric`). The benchmark result itself does not
 *   carry this field, so callers cross-reference with the config benchmarks.
 */
export const formatBenchmarkScore = (
  benchmark: NonNullable<EvaluationJob['results']['benchmarks']>[number],
  primaryMetric?: string,
): string | null => {
  const primaryScore = benchmark.test?.primary_score;
  if (primaryScore != null && Number.isFinite(primaryScore)) {
    return formatAsPercentage(primaryScore);
  }
  if (benchmark.metrics) {
    if (primaryMetric) {
      const configured = benchmark.metrics[primaryMetric];
      if (typeof configured === 'number' && Number.isFinite(configured)) {
        return formatAsPercentage(configured);
      }
    }
    const candidates = [
      benchmark.metrics.acc_norm,
      benchmark.metrics.acc,
      benchmark.metrics.attack_success_rate,
    ];
    const preferred = candidates.find(
      (v): v is number => typeof v === 'number' && Number.isFinite(v),
    );
    if (preferred !== undefined) {
      return formatAsPercentage(preferred);
    }
  }
  return null;
};

export const getResultScore = (job: EvaluationJob): string => {
  const score = job.results.test?.score;
  if (score != null && Number.isFinite(score)) {
    return formatAsPercentage(score);
  }
  if (job.collection) {
    return '-';
  }
  if (job.results.benchmarks?.length) {
    const resultBenchmark = job.results.benchmarks[0];
    const resolvedIndex = resultBenchmark.benchmark_index ?? 0;
    const configBenchmark = getJobBenchmarks(job).find(
      (b, idx) => b.id === resultBenchmark.id && (b.benchmark_index ?? idx) === resolvedIndex,
    );
    return formatBenchmarkScore(resultBenchmark, configBenchmark?.primary_score?.metric) ?? '-';
  }
  return '-';
};

export const getBenchmarkResultScore = (
  job: EvaluationJob,
  benchmarkId: string,
  benchmarkIndex?: number,
): string => {
  const benchmark = job.results.benchmarks?.find(
    (b, idx) =>
      b.id === benchmarkId &&
      (benchmarkIndex === undefined || (b.benchmark_index ?? idx) === benchmarkIndex),
  );
  if (!benchmark) {
    return '-';
  }
  const configBenchmark = getJobBenchmarks(job).find(
    (b, idx) =>
      b.id === benchmarkId &&
      (benchmarkIndex === undefined || (b.benchmark_index ?? idx) === benchmarkIndex),
  );
  return formatBenchmarkScore(benchmark, configBenchmark?.primary_score?.metric) ?? '-';
};

export const getResultPass = (job: EvaluationJob): boolean | null => {
  if (job.results.test?.pass != null) {
    return job.results.test.pass;
  }
  if (job.results.benchmarks?.length) {
    const first = job.results.benchmarks[0];
    if (first.test?.pass != null) {
      return first.test.pass;
    }
  }
  return null;
};

export const formatDuration = (startStr?: string, endStr?: string): string | null => {
  if (!startStr || !endStr) {
    return null;
  }
  try {
    const ms = new Date(endStr).getTime() - new Date(startStr).getTime();
    if (ms <= 0 || !Number.isFinite(ms)) {
      return null;
    }
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const h = hours === 1 ? 'hour' : 'hours';
    const m = minutes === 1 ? 'minute' : 'minutes';
    if (hours > 0) {
      return minutes > 0 ? `${hours} ${h} ${minutes} ${m}` : `${hours} ${h}`;
    }
    return minutes > 0 ? `${minutes} ${m}` : '< 1 minute';
  } catch {
    return null;
  }
};

export const formatDurationCompact = (startStr?: string, endStr?: string): string | null => {
  if (!startStr || !endStr) {
    return null;
  }
  try {
    const ms = new Date(endStr).getTime() - new Date(startStr).getTime();
    if (ms <= 0 || !Number.isFinite(ms)) {
      return null;
    }
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    if (minutes > 0) {
      return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
    }
    return seconds > 0 ? `${seconds}s` : '< 1s';
  } catch {
    return null;
  }
};

export const formatDate = (dateStr?: string): string => {
  if (!dateStr) {
    return '-';
  }
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

const TERMINAL_STATES: ReadonlySet<EvaluationJobState> = new Set([
  'completed',
  'failed',
  'cancelled',
  'stopped',
  'partially_failed',
]);

export const isTerminalState = (state: EvaluationJobState): boolean => TERMINAL_STATES.has(state);

/** Only completed runs can be selected for compare. */
export const isEvaluationJobComparable = (job: EvaluationJob): boolean =>
  job.status.state === 'completed';

export const getFailedBenchmarkCount = (benchmarks: Array<{ status: string }>): number =>
  benchmarks.filter((bm) => bm.status === 'failed').length;

// Different benchmark providers use different scoring scales — most use 0–1 decimal fractions,
// but some (e.g. Open LLM Leaderboard v2) use a 0–100 percentage scale. Thresholds > 1 are
// already in percentage form; thresholds ≤ 1 are multiplied by 100 to match the slider range.
export const normalizeThreshold = (threshold: number): number =>
  threshold <= 1 ? Math.round(threshold * 100) : Math.round(threshold);
