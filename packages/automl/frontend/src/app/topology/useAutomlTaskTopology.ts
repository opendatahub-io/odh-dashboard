import * as React from 'react';
import { PipelineSpecVariable, RunDetailsKF, TaskKF } from '~/app/types/pipeline';
import { PipelineNodeModelExpanded } from '~/app/types/topology';
import { createNode } from './utils';
import { buildTaskRuntimeById, resolveTaskTopologyRunStatuses } from './parseUtils';

const TASK_DISPLAY_NAMES: Record<string, string> = {
  'publish-component-stage-map': 'Pipeline preparation',
  'automl-data-loader': 'Input data loader',
  'timeseries-data-loader': 'Input data loader',
  'models-selection': 'Model selection',
  'timeseries-models-selection': 'Model selection',
  'autogluon-timeseries-models-selection': 'Model selection',
  'for-loop-1': 'Model generation', // used in timeseries
  'autogluon-models-training': 'Model generation', // used in tabular
  'autogluon-models-training-2': 'Model generation', // speed preset variant
  'timeseries-models-full-refit': 'Model generation',
  'autogluon-timeseries-models-training': 'Model generation',
  'autogluon-timeseries-models-training-2': 'Model generation', // speed preset variant
  'autogluon-timeseries-models-full-refit': 'Model generation',
  'leaderboard-evaluation': 'Leaderboard evaluation',
  'leaderboard-evaluation-2': 'Leaderboard evaluation', // speed preset variant
  'timeseries-leaderboard-evaluation': 'Leaderboard evaluation',
  'condition-branches-1': 'Model training & evaluation',
};

/** Normalize display names / ids to kebab-ish keys used in TASK_DISPLAY_NAMES. */
const normalizeTaskLookupKey = (s: string): string =>
  s.trim().toLowerCase().replace(/\s+/g, '-').replace(/_+/g, '-');

/**
 * Sentence-case fallback when no TASK_DISPLAY_NAMES entry matches
 * (matches entries like "Model selection", "Input data loader").
 */
const fallbackTaskDisplayLabel = (name: string): string => {
  const spaced = name.trim().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ');
  if (!spaced) {
    return name;
  }
  const lower = spaced.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

/** Resolve UI label from API task name and/or DAG task id (id is stable; name may vary). */
const resolveTaskLabel = (taskId: string, task: TaskKF): string => {
  const rawName = task.taskInfo.name || taskId;
  const candidates = [
    rawName,
    taskId,
    normalizeTaskLookupKey(rawName),
    normalizeTaskLookupKey(taskId),
  ];
  for (const key of candidates) {
    if (key && TASK_DISPLAY_NAMES[key]) {
      return TASK_DISPLAY_NAMES[key];
    }
  }
  return fallbackTaskDisplayLabel(rawName);
};

const isTaskRecord = (value: unknown): value is TaskKF => {
  if (typeof value !== 'object' || value === null || !('taskInfo' in value)) {
    return false;
  }
  const { taskInfo } = value;
  return typeof taskInfo === 'object' && taskInfo !== null;
};

/** Keep only own, well-formed task IDs so inherited/malformed keys cannot become DAG deps. */
const getValidatedDependencies = (tasks: Record<string, TaskKF>, taskId: string): string[] => {
  if (!Object.hasOwn(tasks, taskId) || !isTaskRecord(tasks[taskId])) {
    return [];
  }
  const { dependentTasks } = tasks[taskId];
  if (!Array.isArray(dependentTasks)) {
    return [];
  }
  return dependentTasks.filter(
    (dep): dep is string =>
      typeof dep === 'string' && Object.hasOwn(tasks, dep) && isTaskRecord(tasks[dep]),
  );
};

const topoSort = (tasks: Record<string, TaskKF>): string[] => {
  const visited = new Set<string>();
  const result: string[] = [];

  const visit = (id: string) => {
    if (visited.has(id) || !Object.hasOwn(tasks, id) || !isTaskRecord(tasks[id])) {
      return;
    }
    visited.add(id);
    getValidatedDependencies(tasks, id).forEach(visit);
    result.push(id);
  };

  Object.keys(tasks).forEach(visit);
  return result;
};

/**
 * Build topology nodes from pipeline_spec as a straight linear chain.
 */
export const useAutomlTaskTopology = (
  spec?: PipelineSpecVariable,
  runDetails?: RunDetailsKF,
  runState?: string,
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
    const runtimeByTaskId = buildTaskRuntimeById(ordered, runDetails);
    const depsByTaskId = new Map(
      ordered.map((taskId) => [taskId, getValidatedDependencies(tasks, taskId)]),
    );
    const taskStatuses = resolveTaskTopologyRunStatuses(
      ordered,
      runtimeByTaskId,
      runState,
      depsByTaskId,
    );

    return ordered.flatMap((taskId) => {
      const task = tasks[taskId];
      if (!isTaskRecord(task)) {
        return [];
      }
      const label = resolveTaskLabel(taskId, task);
      const runStatus = taskStatuses.get(taskId);
      const runAfterTasks = getValidatedDependencies(tasks, taskId);

      return [
        createNode({
          id: taskId,
          label,
          pipelineTask: {
            type: 'task',
            name: label,
            status: runtimeByTaskId.get(taskId),
          },
          runAfterTasks,
          runStatus,
        }),
      ];
    });
  }, [spec, runDetails, runState]);
