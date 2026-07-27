import * as React from 'react';
import { PipelineSpecVariable, RunDetailsKF, TaskKF } from '~/app/types/pipeline';
import { PipelineNodeModelExpanded } from '~/app/types/topology';
import { createNode } from './utils';
import { buildTaskRuntimeById, resolveTaskTopologyRunStatuses } from './parseUtils';

const TASK_DISPLAY_NAMES: Record<string, string> = {
  'publish-component-stage-map': 'Pipeline preparation',
  'test-data-loader': 'Test Data Loader',
  'documents-sampling': 'Documents Sampling', // may have been replaced by documents-discovery node, need to verify post 3.4
  'documents-discovery': 'Documents Discovery',
  'text-extraction': 'Text Extraction',
  'search-space-preparation': 'Search Space Preparation',
  'rag-templates-optimization': 'RAG Templates Optimization',
  'leaderboard-evaluation': 'Leaderboard Evaluation',
  'prepare-responses-api-requests': 'Prepare Responses API Requests',
};

const humanizeTaskName = (name: string): string =>
  TASK_DISPLAY_NAMES[name] ?? name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const isTaskRecord = (value: unknown): value is TaskKF => {
  if (typeof value !== 'object' || value === null || !('taskInfo' in value)) {
    return false;
  }
  const { taskInfo } = value;
  if (typeof taskInfo !== 'object' || taskInfo === null || !('name' in taskInfo)) {
    return false;
  }
  return typeof taskInfo.name === 'string';
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
export const useAutoragTaskTopology = (
  spec?: PipelineSpecVariable,
  runDetails?: RunDetailsKF,
  runState?: string,
): PipelineNodeModelExpanded[] =>
  React.useMemo(() => {
    if (!spec) {
      return [];
    }

    const pipelineSpec = spec.pipeline_spec ?? spec;
    // Runtime pipeline_spec may omit intermediate dag even though PipelineSpec types it as required.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive for incomplete specs
    const tasks = pipelineSpec.root?.dag?.tasks;
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
      const label = humanizeTaskName(task.taskInfo.name || taskId);
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
