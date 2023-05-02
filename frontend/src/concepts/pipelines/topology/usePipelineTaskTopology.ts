import * as React from 'react';
import { RunStatus } from '@patternfly/react-topology';
import { createNode } from '~/concepts/pipelines/topology/core/utils';
import {
  PipelineRunKind,
  PipelineRunTask,
  PipelineRunTaskParam,
  PipelineRunTaskRunStatusProperties,
  PipelineRunTaskWhen,
} from '~/k8sTypes';

const getNameFromTaskRef = (taskRef: string) => {
  const match = taskRef.match(/\$\(tasks\.([a-z0-9-]+)\./);
  if (!match) {
    return null;
  }

  return match[1];
};

type AsRunAfter<T> = (item: T) => string | null;

const paramAsRunAfter: AsRunAfter<PipelineRunTaskParam> = (param) => {
  if (param.value) {
    return getNameFromTaskRef(param.value);
  }
  return null;
};
const whenAsRunAfter: AsRunAfter<PipelineRunTaskWhen> = (when) => {
  if (when.input) {
    return getNameFromTaskRef(when.input);
  }
  return null;
};

const isTruthyString = (t: unknown): t is string => !!t;

const getRunStatus = (status: PipelineRunTaskRunStatusProperties): RunStatus => {
  const successCondition = status.conditions.find((s) => s.type === 'Succeeded');
  // const cancelledCondition = status.conditions.find((s) => s.status === 'Cancelled');

  if (!successCondition || !successCondition.status) {
    return RunStatus.Idle;
  }

  let runStatus: RunStatus | undefined;
  if (successCondition.status === 'True') {
    runStatus = RunStatus.Succeeded;
  } else if (successCondition.status === 'False') {
    runStatus = RunStatus.Failed;
  } else {
    runStatus = RunStatus.Running;
  }

  return runStatus;
};

export type KubeFlowTaskTopology = {
  taskMap: Record<string, PipelineRunTask>;
  nodes: ReturnType<typeof createNode>[];
};

const EMPTY_STATE: KubeFlowTaskTopology = { taskMap: {}, nodes: [] };
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

    const idFromTask = (t: PipelineRunTask): string => t.name;
    return tasks.reduce<KubeFlowTaskTopology>(
      (acc, task) => {
        const runAfter: string[] | undefined = edgeLookupMap[task.name]
          ? Array.from(edgeLookupMap[task.name])
          : undefined;

        let runStatus: RunStatus | undefined;
        if (status) {
          const skippedTasks = status.skippedTasks?.map((t) => t.name);
          if (skippedTasks) {
            runStatus = skippedTasks.includes(task.name) ? RunStatus.Skipped : undefined;
          }

          if (!runStatus) {
            const taskStatusList = Object.values(status.taskRuns || {});
            if (taskStatusList.length > 0) {
              const thisTaskStatus = taskStatusList.find(
                (status) => status.pipelineTaskName === task.name,
              );
              if (thisTaskStatus) {
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

        return {
          taskMap: { ...acc.taskMap, [id]: task },
          nodes: [...acc.nodes, node],
        };
      },
      { taskMap: {}, nodes: [] },
    );
  }, [tasks, status]);
};
