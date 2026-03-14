import * as React from 'react';
import { RunStatus } from '@patternfly/react-topology';
import { PipelineSpecVariable, RunDetailsKF, TaskKF } from '~/app/types/pipeline';
import { PipelineNodeModelExpanded } from '~/app/types/topology';
import type { AutoRAGPattern } from '~/app/types/autoragPattern';
import { createNode } from './utils';
import { parseRuntimeInfoFromRunDetails, translateStatusForNode } from './parseUtils';

export const MODEL_NODE_PREFIX = 'model-';

const TASK_DISPLAY_NAMES: Record<string, string> = {
  'test-data-loader': 'Test Data Loader',
  'documents-sampling': 'Documents Sampling',
  'text-extraction': 'Text Extraction',
  'search-space-preparation': 'Search Space Preparation',
  'rag-templates-optimization': 'RAG Templates Optimization',
  'leaderboard-evaluation': 'Leaderboard Evaluation',
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

const groupPatternsByModel = (patterns: AutoRAGPattern[]): { modelId: string; count: number }[] => {
  const counts = new Map<string, number>();
  for (const p of patterns) {
    const modelId = p.settings.generation.model_id;
    counts.set(modelId, (counts.get(modelId) ?? 0) + 1);
  }
  return Array.from(counts, ([modelId, count]) => ({ modelId, count }));
};

/**
 * Build topology nodes from pipeline_spec as a straight linear chain,
 * with optional model nodes (no edges) derived from pattern data.
 * Model nodes use runAfterTasks for Dagre positioning but edges
 * are filtered out in PipelineVisualizationSurface.
 */
export const useAutoRAGTaskTopology = (
  spec?: PipelineSpecVariable,
  runDetails?: RunDetailsKF,
  patterns?: AutoRAGPattern[],
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

    const taskNodes: PipelineNodeModelExpanded[] = ordered.map((taskId, idx) => {
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

    if (!patterns || patterns.length === 0) {
      return taskNodes;
    }

    const lastTaskId = ordered[ordered.length - 1];
    const modelGroups = groupPatternsByModel(patterns);

    const modelNodes: PipelineNodeModelExpanded[] = modelGroups.map(({ modelId, count }) => ({
      ...createNode(
        `${MODEL_NODE_PREFIX}${modelId}`,
        modelId,
        {
          type: 'task',
          name: modelId,
        },
        [lastTaskId],
        RunStatus.Succeeded,
      ),
      data: {
        pipelineTask: { type: 'task' as const, name: modelId },
        runStatus: RunStatus.Succeeded,
        badge: `${count} ${count === 1 ? 'pattern' : 'patterns'}`,
      },
    }));

    return [...taskNodes, ...modelNodes];
  }, [spec, runDetails, patterns]);
