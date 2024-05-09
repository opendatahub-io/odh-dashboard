import * as React from 'react';
import * as _ from 'lodash-es';
import {
  InputOutputArtifactType,
  InputOutputDefinitionArtifacts,
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
  idForTaskArtifact,
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

const getArtifactPipelineTask = (
  name: string,
  artifactType: InputOutputArtifactType,
): PipelineTask => ({
  type: 'artifact',
  name,
  inputs: {
    artifacts: [{ label: name, type: composeArtifactType(artifactType) }],
  },
});

/**
 * Get the artifact nodes without the inputs from a task node
 */
const getInputArtifacts = (
  groupId: string | undefined,
  status: PipelineTaskRunStatus | undefined,
  inputArtifacts: InputOutputDefinitionArtifacts | undefined,
) => {
  if (!inputArtifacts) {
    return [];
  }

  return Object.entries(inputArtifacts).map(([artifactKey, data]) =>
    createArtifactNode(
      idForTaskArtifact(groupId, '', artifactKey),
      artifactKey,
      getArtifactPipelineTask(artifactKey, data.artifactType),
      undefined,
      translateStatusForNode(status?.state),
      data.artifactType.schemaTitle,
    ),
  );
};

const getTaskArtifacts = (
  groupId: string | undefined,
  taskId: string,
  status: PipelineTaskRunStatus | undefined,
  componentRef: string,
  componentArtifactMap: ComponentArtifactMap,
): PipelineNodeModelExpanded[] => {
  const artifactsInComponent = componentArtifactMap[componentRef];

  if (!artifactsInComponent) {
    return [];
  }
  return Object.entries(artifactsInComponent).map(([artifactKey, data]) =>
    createArtifactNode(
      idForTaskArtifact(groupId, taskId, artifactKey),
      artifactKey,
      getArtifactPipelineTask(artifactKey, data),
      [taskId],
      translateStatusForNode(status?.state),
      data.schemaTitle,
    ),
  );
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
  inputArtifacts?: InputOutputDefinitionArtifacts,
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

    // add edges from one task to its parent tasks
    const runAfter: string[] =
      details.dependentTasks?.filter((t) => Object.keys(items).includes(t)) ?? [];
    const hasSubTask =
      Object.keys(components).find((task) => task === componentRef) &&
      components[componentRef]?.dag;
    const subTasks = components[componentRef]?.dag?.tasks;
    const executorLabel = component?.executorLabel;
    const executor = executorLabel ? executors[executorLabel] : undefined;

    const pipelineTask: PipelineTask = {
      type: 'groupTask',
      name: taskName,
      steps: executor?.container ? [executor.container] : undefined,
      inputs: parseInputOutput(component?.inputDefinitions),
      outputs: parseInputOutput(component?.outputDefinitions),
      status,
      volumeMounts: parseVolumeMounts(spec.platform_spec, executorLabel),
    };

    // Build artifact nodes with inputs from task nodes
    const artifactNodes = getTaskArtifacts(
      groupId,
      taskId,
      status,
      componentRef,
      componentArtifactMap,
    );
    if (artifactNodes.length) {
      nodes.push(...artifactNodes);
      children.push(...artifactNodes.map((n) => n.id));
    }

    // Build artifact nodes without inputs
    const inputArtifactNodes = getInputArtifacts(groupId, status, inputArtifacts);
    if (inputArtifactNodes.length) {
      nodes.push(...inputArtifactNodes);
      children.push(...inputArtifactNodes.map((n) => n.id));
    }

    // Read the artifact-task map we built before
    // Add edge from artifact to task
    const artifactToTaskEdges = taskArtifactMap[taskId]?.map((v) => v.artifactNodeId) ?? [];
    runAfter.push(...artifactToTaskEdges);

    if (hasSubTask && subTasks) {
      const subTasksArtifactMap = parseTasksForArtifactRelationship(taskId, subTasks);

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
        component?.inputDefinitions?.artifacts,
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
        inputDefinitions,
      },
    } = pipelineSpec;

    const componentArtifactMap = parseComponentsForArtifactRelationship(components);
    const taskArtifactMap = parseTasksForArtifactRelationship('root', tasks);

    // There are some duplicated nodes, remove them
    return _.uniqBy(
      getNodesForTasks(
        'root',
        spec,
        tasks,
        components,
        executors,
        componentArtifactMap,
        taskArtifactMap,
        runDetails,
        executions,
        inputDefinitions?.artifacts,
      )[0],
      (node) => node.id,
    );
  }, [executions, runDetails, spec]);
