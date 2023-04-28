import * as React from 'react';
import { createNode } from '~/concepts/pipelines/topology/core/utils';
import {
  PipelineRunKind,
  PipelineRunTask,
  PipelineRunTaskParam,
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

export type KubeFlowTaskTopology = {
  taskMap: Record<string, PipelineRunTask>;
  nodes: ReturnType<typeof createNode>[];
};

const EMPTY_STATE: KubeFlowTaskTopology = { taskMap: {}, nodes: [] };
export const usePipelineTaskTopology = (
  pipelineRun?: PipelineRunKind | null,
): KubeFlowTaskTopology => {
  const tasks: PipelineRunTask[] | undefined = pipelineRun?.spec.pipelineSpec?.tasks;

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
    const nodes = tasks.map((task) => {
      const runAfter: string[] | undefined = edgeLookupMap[task.name]
        ? Array.from(edgeLookupMap[task.name])
        : undefined;

      return createNode({
        id: idFromTask(task),
        label: task.name,
        runAfter,
      });
    });

    const taskMap = tasks.reduce<KubeFlowTaskTopology['taskMap']>(
      (acc, t) => ({ ...acc, [idFromTask(t)]: t }),
      {},
    );

    return { taskMap, nodes };
  }, [tasks]);
};
