import * as React from 'react';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '@odh-dashboard/ui-core/hooks/useFetchState';
import { K8sAPIOptions } from '#~/k8sTypes';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { isPipelineRunFinished } from '#~/concepts/pipelines/apiHooks/usePipelineRunById';
import { PipelineAPIs } from '#~/concepts/pipelines/types';
import { PipelineRunKF, PipelineTaskKF } from '#~/concepts/pipelines/kfTypes';
import { FAST_POLL_INTERVAL } from '#~/utilities/const';

const LIST_TASKS_PAGE_SIZE = 100;
/** Stop a missing or repeating page token from walking forever. 100 pages is 10k tasks. */
const MAX_TASK_PAGES = 100;

export const listAllTasks = async (
  api: PipelineAPIs,
  opts: K8sAPIOptions,
  runId: string,
): Promise<PipelineTaskKF[]> => {
  const tasks: PipelineTaskKF[] = [];
  const seenTokens = new Set<string>();
  let pageToken: string | undefined;

  for (let page = 0; page < MAX_TASK_PAGES; page++) {
    const response = await api.listTasks(opts, runId, {
      pageSize: LIST_TASKS_PAGE_SIZE,
      pageToken,
    });
    tasks.push(...(response.tasks ?? []));
    const nextToken = response.next_page_token;
    if (!nextToken) {
      return tasks;
    }
    if (seenTokens.has(nextToken)) {
      throw new Error(`ListTasks page token repeated for run ${runId}`);
    }
    seenTokens.add(nextToken);
    pageToken = nextToken;
  }

  throw new Error(`ListTasks for run ${runId} exceeded ${MAX_TASK_PAGES} pages`);
};

const useTasksForPipelineRun = (run: PipelineRunKF | null): FetchState<PipelineTaskKF[]> => {
  const { api } = usePipelinesAPI();
  const isFinished = isPipelineRunFinished(run);

  const call = React.useCallback<FetchStateCallbackPromise<PipelineTaskKF[]>>(
    (opts) => {
      if (!run?.run_id) {
        return Promise.reject(new NotReadyError('No pipeline run'));
      }
      return listAllTasks(api, opts, run.run_id);
    },
    [api, run?.run_id],
  );

  return useFetchState(call, [], {
    refreshRate: !run || isFinished ? 0 : FAST_POLL_INTERVAL,
    // Drop the previous run's tasks as soon as run_id changes.
    initialPromisePurity: true,
  });
};

export default useTasksForPipelineRun;
