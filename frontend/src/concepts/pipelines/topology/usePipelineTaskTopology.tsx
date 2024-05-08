import * as React from 'react';
import {
  PipelineComponentsKF,
  PipelineExecutorsKF,
  PipelineSpecVariable,
  RunDetailsKF,
  TaskKF,
} from '~/concepts/pipelines/kfTypes';
import { createNode } from '~/concepts/topology';
import { PipelineNodeModelExpanded } from '~/concepts/topology/types';
import { createArtifactNode, createGroupNode } from '~/concepts/topology/utils';
import { Execution } from '~/third_party/mlmd';
import {
  ComponentArtifactMap,
  composeArtifactType,
  parseComponentsForArtifactRelationship,
  parseInputOutput,
  parseRuntimeInfoFromExecutions,
  parseRuntimeInfoFromRunDetails,
  parseTasksForArtifactRelationship,
  parseVolumeMounts,
  TaskArtifactMap,
  translateStatusForNode,
} from './parseUtils';
import { PipelineTask, PipelineTaskRunStatus } from './pipelineTaskTypes';

const idForTaskArtifact = (groupId: string | undefined, artifactId: string) =>
  groupId ? `${groupId}-ARTIFACT-${artifactId}` : artifactId;

const getTaskArtifacts = (
  groupId: string | undefined,
  taskId: string,
  status: PipelineTaskRunStatus | undefined,
  componentRef: string,
  componentArtifactMap: ComponentArtifactMap,
  taskArtifactMap: TaskArtifactMap,
): PipelineNodeModelExpanded[] => {
  const artifactsInComponent = componentArtifactMap[componentRef];
  const artifactNodes: PipelineNodeModelExpanded[] = [];
  if (artifactsInComponent) {
    const artifactNodeData = taskArtifactMap[taskId];

    Object.entries(artifactsInComponent).forEach(([artifactKey, data]) => {
      const label = artifactKey;
      const { artifactId } =
        artifactNodeData?.find((a) => artifactKey === a.outputArtifactKey) ?? {};

      // if no node needs it as an input, we don't really need a well known id, prepend taskId to ensure uniqueness
      const id = idForTaskArtifact(groupId, artifactId ?? artifactKey);

      const artifactPipelineTask: PipelineTask = {
        type: 'artifact',
        name: label,
        inputs: {
          artifacts: [{ label, type: composeArtifactType(data) }],
        },
      };

      artifactNodes.push(
        createArtifactNode(
          id,
          label,
          artifactPipelineTask,
          [taskId],
          translateStatusForNode(status?.state),
          data.schemaTitle,
        ),
      );
    });
  }
  return artifactNodes;
};

const getNodesForTasks = (
  groupId: string | undefined,
  spec: PipelineSpecVariable,
  items: Record<string, TaskKF>,
  components: PipelineComponentsKF,
  executors: PipelineExecutorsKF,
  componentArtifactMap: ComponentArtifactMap,
  taskArtifactMap: TaskArtifactMap,
  runDetails?: RunDetailsKF,
  executions?: Execution[] | null,
): [nestedNodes: PipelineNodeModelExpanded[], children: string[]] => {
  const nodes: PipelineNodeModelExpanded[] = [];
  const children: string[] = [];

  Object.entries(items).forEach(([taskId, details]) => {
    const componentRef = details.componentRef.name;
    const component = components[componentRef];
    const taskName = details.taskInfo.name;

    const status =
      parseRuntimeInfoFromExecutions(taskId, executions) ||
      parseRuntimeInfoFromRunDetails(taskId, runDetails);
    const runStatus = translateStatusForNode(status?.state);

    const runAfter: string[] = details.dependentTasks ?? [];
    const hasSubTask =
      Object.keys(components).find((task) => task === componentRef) &&
      components[componentRef]?.dag;
    const subTasks = components[componentRef]?.dag?.tasks;
    const executorLabel = component?.executorLabel;
    const executor = executorLabel ? executors[executorLabel] : undefined;

    const pipelineTask: PipelineTask = {
      type: 'groupTask',
      name: taskName,
      steps: executor ? [executor.container] : undefined,
      inputs: parseInputOutput(component?.inputDefinitions),
      outputs: parseInputOutput(component?.outputDefinitions),
      status,
      volumeMounts: parseVolumeMounts(spec.platform_spec, executorLabel),
    };

    const artifactNodes = getTaskArtifacts(
      groupId,
      taskId,
      status,
      componentRef,
      componentArtifactMap,
      taskArtifactMap,
    );
    if (artifactNodes.length) {
      nodes.push(...artifactNodes);
      children.push(...artifactNodes.map((n) => n.id));
    }

    if (details.dependentTasks) {
      // This task's runAfters may need artifact relationships -- find those artifactIds
      runAfter.push(
        ...details.dependentTasks
          .map((dependantTaskId) => {
            const art = taskArtifactMap[dependantTaskId];
            return art ? art.map((v) => idForTaskArtifact(groupId, v.artifactId)) : null;
          })
          .filter((v): v is string[] => !!v)
          .flat(),
      );
    }

    if (hasSubTask && subTasks) {
      const subTasksArtifactMap = parseTasksForArtifactRelationship(subTasks);

      const [nestedNodes, taskChildren] = getNodesForTasks(
        taskId,
        spec,
        subTasks,
        components,
        executors,
        componentArtifactMap,
        subTasksArtifactMap,
        runDetails,
        executions,
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
  executions?: Execution[] | null,
): PipelineNodeModelExpanded[] =>
  React.useMemo(() => {
    if (!spec) {
      return [];
    }
    const pipelineSpec = spec.pipeline_spec ?? spec;

    const {
      components,
      deploymentSpec: { executors },
      root: {
        dag: { tasks },
      },
    } = pipelineSpec;

    const componentArtifactMap = parseComponentsForArtifactRelationship(components);
    const taskArtifactMap = parseTasksForArtifactRelationship(tasks);

    const nodes = getNodesForTasks(
      'root',
      spec,
      tasks,
      components,
      executors,
      componentArtifactMap,
      taskArtifactMap,
      runDetails,
      executions,
    )[0];

    // Since we have artifacts that are input only that do not get created, remove any dependencies on them
    return nodes.map((n) => ({
      ...n,
      runAfterTasks: n.runAfterTasks?.filter((t) => nodes.find((nextNode) => nextNode.id === t)),
    }));
  }, [executions, runDetails, spec]);
