import * as React from 'react';
import { RunStatus } from '@patternfly/react-topology';
import { createNode } from '~/concepts/topology';
import { PipelineRunKind, PipelineRunTask, PipelineRunTaskRunStatusProperties } from '~/k8sTypes';
import {
  KubeFlowTaskTopology,
  PipelineRunTaskDetails,
  PipelineRunTaskRunDetails,
} from '~/concepts/pipelines/content/types';
import {
  getRunStatus,
  paramAsRunAfter,
  whenAsRunAfter,
} from '~/concepts/pipelines/topology/pipelineUtils';
import { getTaskRun } from '~/api';

const EMPTY_STATE: KubeFlowTaskTopology = { taskMap: {}, nodes: [] };

const isTruthyString = (t: unknown): t is string => !!t;
const idFromTask = (t: PipelineRunTask): string => t.name;

type TaskRunObject =
  | { [key: string]: { pipelineTaskName: string; status: PipelineRunTaskRunStatusProperties } }
  | { [key: string]: null };

type ChildReference = { name: string; pipelineTaskName: string };

async function fetchTaskRuns(
  childReferences: unknown[],
  namespace: string,
): Promise<TaskRunObject> {
  const promises = childReferences.map(async (childRef) => {
    const name = (childRef as ChildReference).name;
    try {
      const taskRun = await getTaskRun(name, namespace);
      return {
        [name]: {
          pipelineTaskName: (childRef as ChildReference).pipelineTaskName,
          status: taskRun.status,
        },
      };
    } catch (error) {
      return { [name]: null };
    }
  });

  const results = await Promise.all(promises);

  const taskRunsObject: TaskRunObject = results.reduce(
    (acc, result) => ({ ...acc, ...result } as TaskRunObject),
    {},
  );
  return taskRunsObject;
}

export const useK8sPipelineRunTaskTopology = (
  pipelineRun?: PipelineRunKind | null,
): KubeFlowTaskTopology => {
  const tasks: PipelineRunTask[] | undefined = pipelineRun?.status?.pipelineSpec?.tasks;
  const status = pipelineRun?.status;
  const namespace = pipelineRun?.metadata.namespace;
  const [taskRuns, setTaskRuns] = React.useState<TaskRunObject>({});

  React.useEffect(() => {
    if (status?.childReferences && namespace) {
      fetchTaskRuns(status.childReferences, namespace).then((res) => {
        setTaskRuns(res);
      });
    }
  }, [status, namespace]);

  return React.useMemo<KubeFlowTaskTopology>(() => {
    if (!tasks) {
      return EMPTY_STATE;
    }

    const hasRunAfters = tasks.some((t) => !!t.runAfter);

    const edgeLookupMap = tasks.reduce<Record<string, Set<string>>>((acc, task) => {
      const { name, params, when, runAfter } = task;

      const targets: string[] = [];
      if (hasRunAfters) {
        // Run afters are to be respected, there or not, ignore dependencies
        // They choose to use runAfters or not, don't mix and match it will cause weird graphs
        targets.push(...(runAfter ?? []));
      } else {
        // Don't have runAfters, we'll have to figure out what the lines might be based on dependencies
        if (params) {
          const paramNames = params.map(paramAsRunAfter).filter(isTruthyString);
          targets.push(...paramNames);
        }
        if (when) {
          const paramNames = when.map(whenAsRunAfter).filter(isTruthyString);
          targets.push(...paramNames);
        }
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

          if (!runStatus && taskRuns) {
            const taskStatusList = Object.keys(taskRuns).map<PipelineRunTaskRunDetails>((key) => ({
              runID: key,
              pipelineTaskName: taskRuns[key]?.['pipelineTaskName'] as string,
              status: taskRuns[key]?.['status'] as PipelineRunTaskRunStatusProperties,
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
  }, [tasks, status, taskRuns]);
};
