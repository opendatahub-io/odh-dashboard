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
} from '#~/concepts/pipelines/kfTypes';
import { createNode } from '#~/concepts/topology';
import { PipelineNodeModelExpanded } from '#~/concepts/topology/types';
import { createArtifactNode, createGroupNode } from '#~/concepts/topology/utils';
import { Artifact, Execution, Event } from '#~/third_party/mlmd';
import { LinkedArtifact } from '#~/concepts/pipelines/apiHooks/mlmd/types';
import { parseEventsByType } from '#~/pages/pipelines/global/experiments/executions/utils';
import {
  ComponentArtifactMap,
  composeArtifactType,
  filterEventWithInputArtifact,
  filterEventWithOutputArtifact,
  findIterationExecution,
  findParallelForDagExecution,
  getExecutionLinkedArtifactMap,
  getIterationCount,
  idForTaskArtifact,
  parseComponentsForArtifactRelationship,
  parseInputOutput,
  parseRuntimeInfoFromExecutions,
  parseRuntimeInfoFromRunDetails,
  parseTasksForArtifactRelationship,
  parseVolumeMounts,
  ResourceType,
  getResourceStateText,
  TaskArtifactMap,
  translateStatusForNode,
} from './parseUtils';
import { PipelineTask, PipelineTopologyLayer } from './pipelineTaskTypes';

export const ROOT_LAYER: PipelineTopologyLayer = { label: 'Pipeline', type: 'root' };

const getArtifactPipelineTask = (
  name: string,
  artifactType: InputOutputArtifactType,
  artifactData?: Artifact,
): PipelineTask => ({
  type: 'artifact',
  name,
  metadata: artifactData,
  inputs: {
    artifacts: [{ label: name, type: composeArtifactType(artifactType) }],
  },
});

/**
 * Get the artifact nodes without the inputs from a task node
 */
const getInputArtifacts = (
  groupId: string | undefined,
  inputArtifacts: InputOutputDefinitionArtifacts | undefined,
) => {
  if (!inputArtifacts) {
    return [];
  }

  return Object.entries(inputArtifacts).map(([artifactKey, { artifactType }]) =>
    createArtifactNode(
      idForTaskArtifact(groupId, '', artifactKey),
      artifactKey,
      getArtifactPipelineTask(artifactKey, artifactType),
      artifactType.schemaTitle,
      undefined,
    ),
  );
};

const getTaskArtifacts = (
  groupId: string | undefined,
  taskId: string,
  componentRef: string,
  componentArtifactMap: ComponentArtifactMap,
  artifacts?: Artifact[],
  events?: Event[] | null,
  executions?: Execution[] | null,
): PipelineNodeModelExpanded[] => {
  const artifactsInComponent = componentArtifactMap[componentRef];

  if (!artifactsInComponent) {
    return [];
  }

  const execution = executions?.find(
    (e) => e.getCustomPropertiesMap().get('task_name')?.getStringValue() === taskId,
  );

  const executionEvents = events?.filter((event) => event.getExecutionId() === execution?.getId());

  return Object.entries(artifactsInComponent).map(([artifactKey, data]) => {
    const artifactData = artifacts?.find((artifact) => {
      const artifactEvent = executionEvents?.find(
        (event) => event.getArtifactId() === artifact.getId(),
      );

      return artifactEvent && artifact.getType() === data.schemaTitle;
    });

    return createArtifactNode(
      idForTaskArtifact(groupId, taskId, artifactKey),
      artifactKey,
      getArtifactPipelineTask(artifactKey, data, artifactData),
      data.schemaTitle,
      [taskId],
    );
  });
};

const getNodesForTasks = (
  groupId: string | undefined,
  spec: PipelineSpecVariable,
  items: Record<string, TaskKF>,
  components: PipelineComponentsKF,
  executors: PipelineExecutorsKF,
  componentArtifactMap: ComponentArtifactMap,
  taskArtifactMap: TaskArtifactMap,
  executionLinkedArtifactMap: Record<number, LinkedArtifact[]>,
  runDetails?: RunDetailsKF,
  executions?: Execution[] | null,
  inputArtifacts?: InputOutputDefinitionArtifacts,
  events?: Event[] | null,
  artifacts?: Artifact[],
): [nestedNodes: PipelineNodeModelExpanded[], children: string[]] => {
  const nodes: PipelineNodeModelExpanded[] = [];
  const children: string[] = [];

  Object.entries(items).forEach(([taskId, details]) => {
    const componentRef = details.componentRef.name;
    const component = components[componentRef];
    const taskName = details.taskInfo.name;

    const status =
      parseRuntimeInfoFromExecutions(taskId, taskName, executions) ||
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

    let linkedArtifacts: LinkedArtifact[] = [];
    if (executions) {
      const execution = executions.find(
        (e) =>
          e.getCustomPropertiesMap().get('task_name')?.getStringValue() === (taskName || taskId),
      );
      if (execution) {
        linkedArtifacts = executionLinkedArtifactMap[execution.getId()] ?? [];
      }
    }

    const pipelineTask: PipelineTask = {
      type: 'groupTask',
      name: taskName,
      steps: executor?.container ? [executor.container] : undefined,
      inputs: component?.inputDefinitions
        ? parseInputOutput(
            component.inputDefinitions,
            filterEventWithInputArtifact(linkedArtifacts),
          )
        : undefined,
      outputs: component?.outputDefinitions
        ? parseInputOutput(
            component.outputDefinitions,
            filterEventWithOutputArtifact(linkedArtifacts),
          )
        : undefined,
      status,
      volumeMounts: parseVolumeMounts(spec.platform_spec, executorLabel),
    };

    // Build artifact nodes with inputs from task nodes
    const artifactNodes = getTaskArtifacts(
      groupId,
      taskId,
      componentRef,
      componentArtifactMap,
      artifacts,
      events,
      executions,
    );
    if (artifactNodes.length) {
      nodes.push(...artifactNodes);
      children.push(...artifactNodes.map((n) => n.id));
    }

    // Build artifact nodes without inputs
    const inputArtifactNodes = getInputArtifacts(groupId, inputArtifacts);
    if (inputArtifactNodes.length) {
      nodes.push(...inputArtifactNodes);
      children.push(...inputArtifactNodes.map((n) => n.id));
    }

    // Read the artifact-task map we built before
    // Add edge from artifact to task
    const artifactToTaskEdges = taskArtifactMap[taskId]?.map((v) => v.artifactNodeId) ?? [];
    runAfter.push(...artifactToTaskEdges);

    if (hasSubTask && subTasks) {
      const dagExecution = findParallelForDagExecution(taskName, taskId, executions);
      const iterCount = dagExecution ? getIterationCount(dagExecution) : undefined;
      pipelineTask.isSubDag = true;
      if (iterCount != null && iterCount > 0) {
        pipelineTask.iterationCount = iterCount;
      }

      const subTasksArtifactMap = parseTasksForArtifactRelationship(taskId, subTasks);

      const [nestedNodes, taskChildren] = getNodesForTasks(
        taskId,
        spec,
        subTasks,
        components,
        executors,
        componentArtifactMap,
        subTasksArtifactMap,
        executionLinkedArtifactMap,
        runDetails,
        executions,
        component?.inputDefinitions?.artifacts,
        events,
        artifacts,
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

/**
 * Build synthetic iteration nodes for a ParallelFor layer.
 * Each node represents one iteration and can be drilled into further.
 */
const getIterationNodes = (
  iterationCount: number,
  componentRef: string,
  taskLabel: string,
  executions?: Execution[] | null,
  parentDagId?: number,
): PipelineNodeModelExpanded[] => {
  const nodes: PipelineNodeModelExpanded[] = [];

  for (let i = 0; i < iterationCount; i++) {
    const iterExecution =
      parentDagId != null && executions
        ? findIterationExecution(parentDagId, i, executions)
        : undefined;

    let status: PipelineTask['status'];
    let runStatus;
    if (iterExecution) {
      const lastUpdatedTime = iterExecution.getLastUpdateTimeSinceEpoch();
      const lastKnownState = iterExecution.getLastKnownState();
      let completeTime;
      if (
        lastUpdatedTime &&
        (lastKnownState === Execution.State.COMPLETE ||
          lastKnownState === Execution.State.FAILED ||
          lastKnownState === Execution.State.CACHED ||
          lastKnownState === Execution.State.CANCELED)
      ) {
        completeTime = new Date(lastUpdatedTime).toISOString();
      }
      const stateText = getResourceStateText({
        resourceType: ResourceType.EXECUTION,
        resource: iterExecution,
      });
      status = {
        startTime: new Date(iterExecution.getCreateTimeSinceEpoch()).toISOString(),
        completeTime,
        state: stateText,
        taskId: `iteration.${i}`,
      };
      runStatus = translateStatusForNode(stateText);
    }

    const iterLabel = `${taskLabel} (Iteration ${i + 1})`;
    const pipelineTask: PipelineTask = {
      type: 'groupTask',
      name: iterLabel,
      status,
      isSubDag: true,
    };

    const nodeId = `iteration-${componentRef}-${i}`;
    const runAfter = i > 0 ? [`iteration-${componentRef}-${i - 1}`] : undefined;
    const iterNode = createNode(nodeId, iterLabel, pipelineTask, runAfter, runStatus);
    nodes.push(iterNode);
  }

  return nodes;
};

export const usePipelineTaskTopology = (
  spec?: PipelineSpecVariable,
  runDetails?: RunDetailsKF,
  executions?: Execution[] | null,
  events?: Event[] | null,
  artifacts?: Artifact[],
  layers?: PipelineTopologyLayer[],
): PipelineNodeModelExpanded[] =>
  React.useMemo(() => {
    if (!spec) {
      return [];
    }
    const pipelineSpec = spec.pipeline_spec ?? spec;
    let components: PipelineComponentsKF;
    let executors: PipelineExecutorsKF;
    let tasks: Record<string, TaskKF>;
    let inputDefinitions: { artifacts?: InputOutputDefinitionArtifacts } | undefined;

    try {
      ({
        components,
        deploymentSpec: { executors },
        root: {
          dag: { tasks },
          inputDefinitions,
        },
      } = pipelineSpec);
    } catch (e) {
      return [];
    }

    const currentLayer = layers?.[layers.length - 1];

    if (currentLayer?.type === 'parallelForIterations') {
      const { componentRef, iterationCount = 0, parentDagId } = currentLayer;
      return getIterationNodes(
        iterationCount,
        componentRef ?? '',
        currentLayer.label,
        executions,
        parentDagId,
      );
    }

    if (
      currentLayer &&
      (currentLayer.type === 'subDag' || currentLayer.type === 'iteration') &&
      currentLayer.componentRef
    ) {
      const component = components[currentLayer.componentRef];
      const subTasks = component?.dag?.tasks;
      if (!subTasks) {
        return [];
      }

      // For iteration layers, scope executions to only those whose parent_dag_id
      // matches this iteration's execution ID so inner tasks resolve correctly.
      const scopedExecutions =
        currentLayer.type === 'iteration' && currentLayer.parentDagId != null && executions
          ? executions.filter((e) => {
              const parentId = e.getCustomPropertiesMap().get('parent_dag_id')?.getIntValue();
              return parentId === currentLayer.parentDagId;
            })
          : executions;

      const outputEvents = parseEventsByType(events ?? [])[Event.Type.OUTPUT];
      const componentArtifactMap = parseComponentsForArtifactRelationship(components);
      const taskArtifactMap = parseTasksForArtifactRelationship(
        currentLayer.componentRef,
        subTasks,
      );
      const executionLinkedArtifactMap = getExecutionLinkedArtifactMap(artifacts, events);

      return _.uniqBy(
        getNodesForTasks(
          currentLayer.componentRef,
          spec,
          subTasks,
          components,
          executors,
          componentArtifactMap,
          taskArtifactMap,
          executionLinkedArtifactMap,
          runDetails,
          scopedExecutions,
          component.inputDefinitions?.artifacts,
          outputEvents,
          artifacts,
        )[0],
        (node) => node.id,
      );
    }

    const outputEvents = parseEventsByType(events ?? [])[Event.Type.OUTPUT];

    const componentArtifactMap = parseComponentsForArtifactRelationship(components);
    const taskArtifactMap = parseTasksForArtifactRelationship('root', tasks);
    const executionLinkedArtifactMap = getExecutionLinkedArtifactMap(artifacts, events);

    return _.uniqBy(
      getNodesForTasks(
        'root',
        spec,
        tasks,
        components,
        executors,
        componentArtifactMap,
        taskArtifactMap,
        executionLinkedArtifactMap,
        runDetails,
        executions,
        inputDefinitions?.artifacts,
        outputEvents,
        artifacts,
      )[0],
      (node) => node.id,
    );
  }, [artifacts, events, executions, layers, runDetails, spec]);
