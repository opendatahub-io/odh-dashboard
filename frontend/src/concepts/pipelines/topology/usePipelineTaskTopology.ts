import * as React from 'react';
import { RunStatus } from '@patternfly/react-topology';
import { createNode } from '~/concepts/pipelines/topology/core/utils';
import { PipelineRunKind, PipelineRunTask } from '~/k8sTypes';
import {
  KubeFlowTaskTopology,
  PipelineRunTaskDetails,
  PipelineRunTaskRunDetails,
} from '~/concepts/pipelines/content/types';
import { paramAsRunAfter, whenAsRunAfter, getRunStatus } from './pipelineUtils';

const EMPTY_STATE: KubeFlowTaskTopology = { taskMap: {}, nodes: [] };

const isTruthyString = (t: unknown): t is string => !!t;
const idFromTask = (t: PipelineRunTask): string => t.name;

export const usePipelineTaskTopology = (
  pipelineRun?: PipelineRunKind | null,
): KubeFlowTaskTopology => {
  const tasks: PipelineRunTask[] | undefined = pipelineRun?.spec.pipelineSpec?.tasks;
  const status = pipelineRun?.status;

  return React.useMemo<KubeFlowTaskTopology>(() => {
    if (!tasks) {
      return EMPTY_STATE;
    }

    const edgeLookupMap = tasks.reduce<Record<string, Set<string>>>((acc, task) => {
      const { name, params, when } = task;

      const targets: string[] = [];
      if (params) {
        const paramNames = params.map(paramAsRunAfter).filter(isTruthyString);
        targets.push(...paramNames);
      }
      if (when) {
        const paramNames = when.map(whenAsRunAfter).filter(isTruthyString);
        targets.push(...paramNames);
      }

      return targets.reduce((acc, target) => {
        let set = acc[name];
        if (!set) {
          set = new Set();
        }
        set.add(target);

        return { ...acc, [name]: set };
      }, acc);
    }, {});

    return tasks.reduce<KubeFlowTaskTopology>(
      (acc, task) => {
        const runAfter: string[] | undefined = edgeLookupMap[task.name]
          ? Array.from(edgeLookupMap[task.name])
          : undefined;

        let relatedStatusData: PipelineRunTaskRunDetails | undefined;
        let runStatus: RunStatus | undefined;
        let skipped = false;
        if (status) {
          const skippedTasks = status.skippedTasks?.map((t) => t.name);
          if (skippedTasks) {
            skipped = skippedTasks.includes(task.name);
            runStatus = skipped ? RunStatus.Skipped : undefined;
          }

          if (!runStatus) {
            const taskRuns = status.taskRuns || {};
            const taskStatusList = Object.keys(taskRuns).map<PipelineRunTaskRunDetails>((key) => ({
              runID: key,
              ...taskRuns[key],
            }));
            if (taskStatusList.length > 0) {
              const thisTaskStatus = taskStatusList.find(
                (status) => status.pipelineTaskName === task.name,
              );
              if (thisTaskStatus) {
                relatedStatusData = thisTaskStatus;
                runStatus = getRunStatus(thisTaskStatus.status);
              }
            }
          }
        }

        const id = idFromTask(task);
        const node = createNode({
          id,
          label: task.name,
          runAfter,
          status: runStatus,
        });

        const taskDetails: PipelineRunTaskDetails = { ...task, skipped };
        if (relatedStatusData) {
          taskDetails.runDetails = relatedStatusData;
        }

        return {
          taskMap: { ...acc.taskMap, [id]: taskDetails },
          nodes: [...acc.nodes, node],
        };
      },
      { taskMap: {}, nodes: [] },
    );
  }, [tasks, status]);
};
