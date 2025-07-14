import * as React from 'react';
import { PipelineRecurringRunKF } from '#~/concepts/pipelines/kfTypes';
import { PipelineAPIState } from '#~/concepts/pipelines/context/usePipelineAPIState';

type RecurringRunStatus = {
  loading: boolean;
  data: PipelineRecurringRunKF | null;
};

export type GetRecurringRunInformation = (recurringRunId?: string) => RecurringRunStatus;

const useRecurringRunRelatedInformation = (
  apiState: PipelineAPIState,
): { getRecurringRunInformation: GetRecurringRunInformation } => {
  const [recurringRunStorage, setRecurringRunStorage] = React.useState<
    { [recurringRunId: string]: RecurringRunStatus } | undefined
  >({});
  const loadedIds = React.useRef<string[]>([]);

  return {
    getRecurringRunInformation: React.useCallback<GetRecurringRunInformation>(
      (recurringRunId) => {
        if (!apiState.apiAvailable) {
          return { loading: false, data: null };
        }
        if (!recurringRunId) {
          return { loading: false, data: null };
        }
        if (recurringRunStorage?.[recurringRunId]) {
          return recurringRunStorage[recurringRunId];
        }
        if (loadedIds.current.includes(recurringRunId)) {
          return { loading: true, data: null };
        }
        loadedIds.current.push(recurringRunId);

        apiState.api
          .getPipelineRecurringRun({}, recurringRunId)
          .then((recurringRun) => {
            setRecurringRunStorage((recurringRunState) => ({
              ...recurringRunState,
              [recurringRunId]: { loading: false, data: recurringRun },
            }));
          })
          .catch((e) => {
            // eslint-disable-next-line no-console
            console.error('Could not fetch recurring run reference', e);
            setRecurringRunStorage((recurringRunState) => ({
              ...recurringRunState,
              [recurringRunId]: { loading: false, data: null },
            }));
            loadedIds.current = loadedIds.current.filter((i) => i !== recurringRunId);
            return null;
          });

        return { loading: true, data: null };
      },
      [apiState, recurringRunStorage],
    ),
  };
};

export default useRecurringRunRelatedInformation;
