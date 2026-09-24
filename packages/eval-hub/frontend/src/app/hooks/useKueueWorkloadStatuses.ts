import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getKueueWorkloadStatuses } from '~/app/api/k8s';
import type { KueueWorkloadStatus } from '~/app/types';

const KUEUE_WORKLOAD_STATUS_BATCH_SIZE = 100;
const KUEUE_WORKLOAD_STATUS_POLL_INTERVAL_MS = 10_000;

export const hasActiveKueueWorkloadStatus = (
  statuses: KueueWorkloadStatus[] | undefined,
): boolean =>
  statuses?.some((status) => status.state === 'queued' || status.state === 'admitted') ?? false;

type UseKueueWorkloadStatusesResult = {
  statusesByEvaluationId: Map<string, KueueWorkloadStatus>;
  loaded: boolean;
  isLoading: boolean;
  error: Error | undefined;
};

const getUniqueEvaluationIDs = (evaluationIDs: string[]) =>
  Array.from(new Set(evaluationIDs.map((id) => id.trim()).filter(Boolean))).toSorted();

const groupIntoBatches = <T>(items: T[], batchSize: number): T[][] => {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += batchSize) {
    batches.push(items.slice(index, index + batchSize));
  }
  return batches;
};

export const useKueueWorkloadStatuses = (
  namespace: string | undefined,
  evaluationIDs: string[],
  isKueueEnabled: boolean,
  isPollingEnabled: boolean,
): UseKueueWorkloadStatusesResult => {
  const uniqueEvaluationIDs = React.useMemo(
    () => getUniqueEvaluationIDs(evaluationIDs),
    [evaluationIDs],
  );
  const shouldQuery = Boolean(namespace) && isKueueEnabled && uniqueEvaluationIDs.length > 0;
  const evaluationIDsKey = uniqueEvaluationIDs.join(',');
  const kueueWorkloadStatusesQuery = useQuery<KueueWorkloadStatus[], Error>({
    queryKey: ['kueueWorkloadStatuses', namespace, evaluationIDsKey],
    enabled: shouldQuery,
    queryFn: ({ signal }) => {
      if (!namespace) {
        throw new Error('Namespace is required to load Kueue Workload statuses');
      }
      return Promise.all(
        groupIntoBatches(uniqueEvaluationIDs, KUEUE_WORKLOAD_STATUS_BATCH_SIZE).map((batch) =>
          getKueueWorkloadStatuses('', namespace, batch)({ signal }),
        ),
      ).then((batches) => batches.flat());
    },
    // Continue until Kueue reaches a terminal state. EvalHub can mark a run canceled before
    // Kueue has finished releasing its admission, so EvalHub's terminal state alone is not enough.
    refetchInterval: (query) =>
      isPollingEnabled && hasActiveKueueWorkloadStatus(query.state.data)
        ? KUEUE_WORKLOAD_STATUS_POLL_INTERVAL_MS
        : false,
  });
  const statusesByEvaluationId = React.useMemo(
    () =>
      new Map(
        (kueueWorkloadStatusesQuery.data ?? []).map((status) => [status.evaluation_id, status]),
      ),
    [kueueWorkloadStatusesQuery.data],
  );

  return {
    statusesByEvaluationId,
    loaded:
      !shouldQuery || kueueWorkloadStatusesQuery.isSuccess || kueueWorkloadStatusesQuery.isError,
    isLoading: shouldQuery && kueueWorkloadStatusesQuery.isPending,
    error: kueueWorkloadStatusesQuery.error ?? undefined,
  };
};
