import React from 'react';
import { K8sCondition, TaskRunKind } from '~/k8sTypes';
import { listK8sPipelineRunsByLabel, listTaskRuns } from '~/api';
import useFetchState from '~/utilities/useFetchState';
import { EDGE_UNIQUE_LABEL } from '~/concepts/edge/const';
import { POLL_INTERVAL } from '~/utilities/const';
import { ChildReference } from './useK8sPipelineRunTaskTopology';

export const useTaskRunStatus = (namespace: string) => {
  const fetchTaskRunStatus = React.useCallback<() => Promise<{ [key: string]: K8sCondition }>>(
    () =>
      listTaskRuns(namespace).then((taskRuns) => {
        const taskRunMap = taskRuns.reduce<{ [key: string]: TaskRunKind }>((acc, taskRun) => {
          acc[taskRun.metadata.name] = taskRun;
          return acc;
        }, {});

        const taskRunStatus: { [key: string]: K8sCondition } = {};

        listK8sPipelineRunsByLabel(namespace, EDGE_UNIQUE_LABEL).then((pipelineRuns) => {
          pipelineRuns.forEach((run) => {
            try {
              const latestTask =
                run?.status && run.status?.childReferences?.length > 0
                  ? (run?.status?.childReferences as ChildReference[])[
                      run?.status?.childReferences.length - 1
                    ]?.name
                  : undefined;

              if (latestTask) {
                const latestTaskRun = taskRunMap[latestTask];
                if (latestTaskRun) {
                  taskRunStatus[run.metadata.name] = latestTaskRun.status?.conditions[0];
                }
              }
            } catch (e) {
              // some error is thrown here, but it doesn't seem to affect anything
            }
          });
        });
        return taskRunStatus;
      }),
    [namespace],
  );
  return useFetchState<{ [key: string]: K8sCondition }>(
    fetchTaskRunStatus,
    {},
    {
      refreshRate: POLL_INTERVAL,
    },
  );
};
