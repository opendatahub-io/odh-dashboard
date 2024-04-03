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

const EMPTY_STATE: PipelineNodeModelExpanded[] = [];

const getNodeArtifacts = (
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

      // if no node needs it as an input, we don't really need a well known id
      const id = artifactId ?? artifactKey;

      const artifactPipelineTask: PipelineTask = {
        type: 'artifact',
        name: label,
        inputs: {
          artifacts: [{ label: id, type: composeArtifactType(data) }],
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

const getNestedNodes = (
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

    const artifactNodes = getNodeArtifacts(
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

    if (hasSubTask && subTasks) {
      const [nestedNodes, nestedChildren] = getNestedNodes(
        spec,
        subTasks,
        components,
        executors,
        componentArtifactMap,
        taskArtifactMap,
        runDetails,
        executions,
      );
      const newChildren = nestedChildren.filter((child) => !nodes.find((n) => n.id === child));
      const newNodes = nestedNodes.filter((node) => !nodes.find((n) => n.id === node.id));

      const itemNode = createGroupNode(
        taskId,
        taskName,
        pipelineTask,
        runAfter,
        translateStatusForNode(status?.state),
        newChildren,
      );
      nodes.push(itemNode, ...newNodes);
    } else {
      nodes.push(
        createNode(taskId, taskName, pipelineTask, runAfter, translateStatusForNode(status?.state)),
      );
    }
    children.push(taskId);
  });

  return [nodes, children];
};

export const usePipelineTaskTopology = (
  spec?: PipelineSpecVariable,
  runDetails?: RunDetailsKF,
  executions?: Execution[] | null,
): PipelineNodeModelExpanded[] => {
  if (!spec) {
    return EMPTY_STATE;
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

  return Object.entries(tasks).reduce<PipelineNodeModelExpanded[]>((acc, [taskId, taskValue]) => {
    const taskName = taskValue.taskInfo.name;

    const componentRef = taskValue.componentRef.name;
    const component = components[componentRef];
    const isGroupNode = !!component?.dag;
    const groupTasks = component?.dag?.tasks;

    const executorLabel = component?.executorLabel;
    const executor = executorLabel ? executors[executorLabel] : undefined;

    const status =
      parseRuntimeInfoFromExecutions(taskId, executions) ||
      parseRuntimeInfoFromRunDetails(taskId, runDetails);

    const nodes: PipelineNodeModelExpanded[] = [];
    const runAfter: string[] = taskValue.dependentTasks ?? [];

    const artifactNodes = getNodeArtifacts(
      taskId,
      status,
      componentRef,
      componentArtifactMap,
      taskArtifactMap,
    );
    if (artifactNodes.length) {
      nodes.push(...artifactNodes);
    }

    if (taskValue.dependentTasks) {
      // This task's runAfters may need artifact relationships -- find those artifactIds
      runAfter.push(
        ...taskValue.dependentTasks
          .map((dependantTaskId) => {
            const art = taskArtifactMap[dependantTaskId];
            return art ? art.map((v) => v.artifactId) : null;
          })
          .filter((v): v is string[] => !!v)
          .flat(),
      );
    }

    const pipelineTask: PipelineTask = {
      type: isGroupNode ? 'groupTask' : 'task',
      name: taskName,
      steps: executor ? [executor.container] : undefined,
      inputs: parseInputOutput(component?.inputDefinitions),
      outputs: parseInputOutput(component?.outputDefinitions),
      status,
      volumeMounts: parseVolumeMounts(spec.platform_spec, executorLabel),
    };

    // This task's rendering information
    if (isGroupNode && groupTasks) {
      const [nestedNodes, children] = getNestedNodes(
        spec,
        groupTasks,
        components,
        executors,
        componentArtifactMap,
        taskArtifactMap,
        runDetails,
        executions,
      );
      const newChildren = children.filter((child) => !nodes.find((n) => n.id === child));
      const newNodes = nestedNodes.filter((node) => !nodes.find((n) => n.id === node.id));
      const itemNode = createGroupNode(
        taskId,
        taskName,
        pipelineTask,
        runAfter,
        translateStatusForNode(status?.state),
        newChildren,
      );
      nodes.push(itemNode, ...newNodes);
    } else {
      nodes.push(
        createNode(taskId, taskName, pipelineTask, runAfter, translateStatusForNode(status?.state)),
      );
    }

    return [...acc, ...nodes];
  }, []);
};
