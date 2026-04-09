import * as React from 'react';
import { PipelineSpecVariable, RunDetailsKF, TaskKF } from '~/app/types/pipeline';
import { PipelineNodeModelExpanded } from '~/app/types/topology';
import { createNode } from './utils';
import { parseRuntimeInfoFromRunDetails, translateStatusForNode } from './parseUtils';

const TASK_DISPLAY_NAMES: Record<string, string> = {
  'automl-data-loader': 'Input data loader',
  'timeseries-data-loader': 'Input data loader',
  'models-selection': 'Model selection',
  'timeseries-models-selection': 'Model selection',
  'for-loop-1': 'Model generation', // used in timeseries
  'autogluon-models-training': 'Model generation', // used in tabular
  'leaderboard-evaluation': 'Leaderboard evaluation',
};

const humanizeTaskName = (name: string): string =>
  TASK_DISPLAY_NAMES[name] ?? name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const topoSort = (tasks: Record<string, TaskKF>): string[] => {
  const visited = new Set<string>();
  const result: string[] = [];

  const visit = (id: string) => {
    if (visited.has(id)) {
      return;
    }
    visited.add(id);
    const deps = tasks[id].dependentTasks ?? [];
    deps.forEach((dep) => {
      if (dep in tasks) {
        visit(dep);
      }
    });
    result.push(id);
  };

  Object.keys(tasks).forEach(visit);
  return result;
};

/**
 * Build topology nodes from pipeline_spec as a straight linear chain.
 */
export const useAutoMLTaskTopology = (
  spec?: PipelineSpecVariable,
  runDetails?: RunDetailsKF,
): PipelineNodeModelExpanded[] =>
  React.useMemo(() => {
    if (!spec) {
      return [];
    }

    const pipelineSpec = spec.pipeline_spec ?? spec;
    const tasks = pipelineSpec.root?.dag.tasks;
    if (!tasks) {
      return [];
    }

    const ordered = topoSort(tasks);

    return ordered.map((taskId, idx) => {
      const task = tasks[taskId];
      const label = humanizeTaskName(task.taskInfo.name || taskId);

      const status = parseRuntimeInfoFromRunDetails(taskId, runDetails);
      const runStatus = translateStatusForNode(status?.state);
      const runAfter = idx > 0 ? [ordered[idx - 1]] : [];

      return createNode(
        taskId,
        label,
        {
          type: 'task',
          name: label,
          status,
        },
        runAfter,
        runStatus,
      );
    });
  }, [spec, runDetails]);
