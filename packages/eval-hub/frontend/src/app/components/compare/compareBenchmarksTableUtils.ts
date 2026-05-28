import { EvaluationJob } from '~/app/types';
import {
  CompareBenchmarkSearchMatch,
  buildBenchmarkSelectionKey,
  getComparableRunsForJob,
} from '~/app/utilities/compareEvaluationsUtils';

export const getVisibleRunsForJob = (
  job: EvaluationJob,
  visibleRunKeys: Set<string> | null,
): ReturnType<typeof getComparableRunsForJob> =>
  getComparableRunsForJob(job).filter((run) => {
    if (!visibleRunKeys) {
      return true;
    }

    const selectionKey = buildBenchmarkSelectionKey({
      jobId: job.resource.id,
      benchmarkId: run.benchmarkId,
      benchmarkIndex: run.benchmarkIndex,
    });
    return visibleRunKeys.has(selectionKey);
  });

export const getVisibleSelectionKeys = (jobMatches: CompareBenchmarkSearchMatch[]): string[] =>
  jobMatches.flatMap(({ job, visibleRunKeys }) =>
    getVisibleRunsForJob(job, visibleRunKeys).map((run) =>
      buildBenchmarkSelectionKey({
        jobId: job.resource.id,
        benchmarkId: run.benchmarkId,
        benchmarkIndex: run.benchmarkIndex,
      }),
    ),
  );

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
