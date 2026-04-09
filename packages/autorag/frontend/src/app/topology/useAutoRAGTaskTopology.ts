import * as React from 'react';
import { RunStatus } from '@patternfly/react-topology';
import { PipelineSpecVariable, RunDetailsKF, TaskKF } from '~/app/types/pipeline';
import { PipelineNodeModelExpanded } from '~/app/types/topology';
import { TERMINAL_STATES } from '~/app/hooks/queries';
import { createNode } from './utils';
import { parseRuntimeInfoFromRunDetails, translateStatusForNode } from './parseUtils';

const TASK_DISPLAY_NAMES: Record<string, string> = {
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
  if (!runState || !TERMINAL_STATES.has(runState)) {
    return undefined;
  }
  switch (runState) {
    case 'SUCCEEDED':
      return RunStatus.Succeeded;
    case 'FAILED':
      return RunStatus.Failed;
    case 'CANCELED':
      return RunStatus.Cancelled;
    case 'SKIPPED':
      return RunStatus.Skipped;
    default:
      return undefined;
  }
};

/**
 * Build topology nodes from pipeline_spec as a straight linear chain.
 */
export const useAutoRAGTaskTopology = (
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
      const runStatus = translateStatusForNode(status?.state) ?? terminalFallback;
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
