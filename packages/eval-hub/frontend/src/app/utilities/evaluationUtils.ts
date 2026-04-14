import { EvaluationJob } from '~/app/types';
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

const formatBenchmarkScore = (
  benchmark: NonNullable<EvaluationJob['results']['benchmarks']>[number],
): string | null => {
  if (benchmark.test?.primary_score != null) {
    return `${Math.round(benchmark.test.primary_score * 100)}%`;
  }
  if (benchmark.metrics) {
    const preferred = benchmark.metrics.acc_norm ?? benchmark.metrics.acc;
    if (typeof preferred === 'number') {
      return `${Math.round(preferred * 100)}%`;
    }
  }
  return null;
};

export const getResultScore = (job: EvaluationJob): string => {
  if (job.results.test?.score != null) {
    return `${Math.round(job.results.test.score * 100)}%`;
  }
  if (job.results.benchmarks?.length) {
    return formatBenchmarkScore(job.results.benchmarks[0]) ?? '-';
  }
  return '-';
};

export const getBenchmarkResultScore = (
  job: EvaluationJob,
  benchmarkId: string,
  benchmarkIndex?: number,
): string => {
  const benchmark = job.results.benchmarks?.find(
    (b) =>
      b.id === benchmarkId &&
      (benchmarkIndex === undefined || b.benchmark_index === benchmarkIndex),
  );
  if (!benchmark) {
    return '-';
  }
  return formatBenchmarkScore(benchmark) ?? '-';
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
