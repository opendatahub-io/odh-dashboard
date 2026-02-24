/**
 * Simplified usePipelineTaskTopology for AutoRAG.
 * Builds topology nodes from a pipeline_spec + run_details, skipping all artifact nodes.
 * Task nodes and group nodes (for sub-DAGs like for-loops) are created.
 */
import * as React from 'react';
import {
  PipelineSpecVariable,
  PipelineComponentsKF,
  PipelineExecutorsKF,
  RunDetailsKF,
  TaskKF,
} from '~/app/types/pipeline';
import { PipelineNodeModelExpanded, PipelineTask } from '~/app/types/topology';
import { createNode, createGroupNode } from './utils';
import { parseRuntimeInfoFromRunDetails, translateStatusForNode } from './parseUtils';

const getNodesForTasks = (
  groupId: string | undefined,
  items: Record<string, TaskKF>,
  components: PipelineComponentsKF,
  executors: PipelineExecutorsKF,
  runDetails?: RunDetailsKF,
): [nestedNodes: PipelineNodeModelExpanded[], children: string[]] => {
  const nodes: PipelineNodeModelExpanded[] = [];
  const children: string[] = [];

  Object.entries(items).forEach(([taskId, details]) => {
    const componentRef = details.componentRef.name;
    const component = components[componentRef];
    const taskName = details.taskInfo.name;

    const status = parseRuntimeInfoFromRunDetails(taskId, runDetails);
    const runStatus = translateStatusForNode(status?.state);

    const runAfter: string[] =
      details.dependentTasks?.filter((t) => Object.keys(items).includes(t)) ?? [];

    const hasSubTask =
      Object.keys(components).find((task) => task === componentRef) &&
      components[componentRef]?.dag;
    const subTasks = components[componentRef]?.dag?.tasks;
    const executorLabel = component?.executorLabel;
    const executor = executorLabel ? executors[executorLabel] : undefined;

    const pipelineTask: PipelineTask = {
      type: hasSubTask ? 'groupTask' : 'task',
      name: taskName,
      steps: executor?.container ? [executor.container] : undefined,
      status,
    };

    if (hasSubTask && subTasks) {
      const [nestedNodes, taskChildren] = getNodesForTasks(
        taskId,
        subTasks,
        components,
        executors,
        runDetails,
      );

      const itemNode = createGroupNode(
        taskId,
        taskName,
        pipelineTask,
        runAfter,
        runStatus,
        taskChildren,
      );
      nodes.push(itemNode, ...nestedNodes);
    } else {
      nodes.push(createNode(taskId, taskName, pipelineTask, runAfter, runStatus));
    }
    children.push(taskId);
  });

  return [nodes, children];
};

export const usePipelineTaskTopology = (
  spec?: PipelineSpecVariable,
  runDetails?: RunDetailsKF,
): PipelineNodeModelExpanded[] =>
  React.useMemo(() => {
    if (!spec) {
      return [];
    }
    const pipelineSpec = spec.pipeline_spec ?? spec;

    const { components } = pipelineSpec;
    const executors = pipelineSpec.deploymentSpec?.executors;
    const tasks = pipelineSpec.root?.dag.tasks;

    if (!components || !executors || !tasks) {
      return [];
    }

    const uniqueMap = new Map<string, PipelineNodeModelExpanded>();
    const [allNodes] = getNodesForTasks('root', tasks, components, executors, runDetails);
    allNodes.forEach((node) => {
      if (!uniqueMap.has(node.id)) {
        uniqueMap.set(node.id, node);
      }
    });

    return Array.from(uniqueMap.values());
  }, [runDetails, spec]);
