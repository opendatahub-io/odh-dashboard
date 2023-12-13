import * as React from 'react';
import { createNode } from '~/concepts/topology';
import { PipelineKind, PipelineTask } from '~/k8sTypes';
import { PipelineTaskTopology, PipelineTaskDetails } from '~/concepts/edge/types';
import { paramAsRunAfter, whenAsRunAfter } from '~/concepts/pipelines/topology/pipelineUtils';

const EMPTY_STATE: PipelineTaskTopology = { taskMap: {}, nodes: [] };

const isTruthyString = (t: unknown): t is string => !!t;
const idFromTask = (t: PipelineTask): string => t.name;

export const useK8sPipelineTaskTopology = (
  pipeline?: PipelineKind | null,
): PipelineTaskTopology => {
  const tasks: PipelineTask[] | undefined = pipeline?.spec.tasks;

  return React.useMemo<PipelineTaskTopology>(() => {
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

    return tasks.reduce<PipelineTaskTopology>(
      (acc, task) => {
        const runAfter: string[] | undefined = edgeLookupMap[task.name]
          ? Array.from(edgeLookupMap[task.name])
          : undefined;

        const id = idFromTask(task);
        const node = createNode({
          id,
          label: task.name,
          runAfter,
        });

        const taskDetails: PipelineTaskDetails = { ...task };

        return {
          taskMap: { ...acc.taskMap, [id]: taskDetails },
          nodes: [...acc.nodes, node],
        };
      },
      { taskMap: {}, nodes: [] },
    );
  }, [tasks]);
};
