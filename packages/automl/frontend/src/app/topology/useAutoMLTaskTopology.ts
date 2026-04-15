import * as React from 'react';
import { RunStatus } from '@patternfly/react-topology';
import { PipelineSpecVariable, RunDetailsKF, TaskKF } from '~/app/types/pipeline';
import { PipelineNodeModelExpanded } from '~/app/types/topology';
import { isTerminalState } from '~/app/hooks/queries';
import { createNode } from './utils';
import { parseRuntimeInfoFromRunDetails, translateStatusForNode } from './parseUtils';

const TASK_DISPLAY_NAMES: Record<string, string> = {
  'automl-data-loader': 'Input data loader',
  'timeseries-data-loader': 'Input data loader',
  'models-selection': 'Model selection',
  'timeseries-models-selection': 'Model selection',
  'autogluon-timeseries-models-selection': 'Model selection',
  'for-loop-1': 'Model generation', // used in timeseries
  'autogluon-models-training': 'Model generation', // used in tabular
  'timeseries-models-full-refit': 'Model generation',
  'autogluon-timeseries-models-full-refit': 'Model generation',
  'leaderboard-evaluation': 'Leaderboard evaluation',
  'timeseries-leaderboard-evaluation': 'Leaderboard evaluation',
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

const getTerminalFallbackStatus = (runState?: string): RunStatus | undefined => {
  if (!runState || !isTerminalState(runState)) {
    return undefined;
  }
  return translateStatusForNode(runState);
};

/**
 * Build topology nodes from pipeline_spec as a straight linear chain.
 */
export const useAutoMLTaskTopology = (
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
    const terminalFallback = getTerminalFallbackStatus(runState);

    return ordered.map((taskId, idx) => {
      const task = tasks[taskId];
      const label = humanizeTaskName(task.taskInfo.name || taskId);

      const status = parseRuntimeInfoFromRunDetails(taskId, runDetails);
      let runStatus: RunStatus | undefined;
      if (status) {
        // Task entry exists in run details — translate its state directly
        runStatus = translateStatusForNode(status.state);
        if (runStatus === undefined) {
          if (status.state) {
            // eslint-disable-next-line no-console
            console.warn(
              `[AutoML] Unknown task state "${status.state}" for task "${taskId}". ` +
                'This may indicate a schema mismatch with the backend.',
            );
          }
          runStatus = terminalFallback;
        }
      } else {
        // No task entry found — infer from overall run state
        runStatus = terminalFallback;
      }
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
  }, [spec, runDetails, runState]);
