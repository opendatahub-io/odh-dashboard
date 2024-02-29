import { PipelineRunKFv2, PipelineSpecVariable } from '~/concepts/pipelines/kfTypes';
import { createNode } from '~/concepts/topology';
import { PipelineNodeModelExpanded } from '~/concepts/topology/types';
import {
  composeArtifactType,
  parseComponentsForArtifactRelationship,
  parseInputOutput,
  parseRuntimeInfo,
  parseTasksForArtifactRelationship,
  translateStatusForNode,
} from './parseUtils';
import { KubeFlowTaskTopology } from './pipelineTaskTypes';

const EMPTY_STATE: KubeFlowTaskTopology = { taskMap: {}, nodes: [] };

export const usePipelineTaskTopology = (
  spec?: PipelineSpecVariable,
  run?: PipelineRunKFv2,
): KubeFlowTaskTopology => {
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
  const { run_details: runDetails } = run || {};

  const componentArtifactMap = parseComponentsForArtifactRelationship(components);
  const taskArtifactMap = parseTasksForArtifactRelationship(tasks);

  return Object.entries(tasks).reduce<KubeFlowTaskTopology>((acc, [taskId, taskValue]) => {
    const taskName = taskValue.taskInfo.name;

    const componentRef = taskValue.componentRef.name;
    const component = components[componentRef];
    const artifactsInComponent = componentArtifactMap[componentRef];
    const isGroupNode = !!component?.dag;

    const executorLabel = component?.executorLabel;
    const executor = executorLabel ? executors[executorLabel] : undefined;

    const status = parseRuntimeInfo(taskId, runDetails);

    const newTaskMapEntries: KubeFlowTaskTopology['taskMap'] = {};
    const nodes: PipelineNodeModelExpanded[] = [];
    const runAfter: string[] = taskValue.dependentTasks ?? [];

    if (artifactsInComponent) {
      const artifactNodeData = taskArtifactMap[taskId];

      Object.entries(artifactsInComponent).forEach(([artifactKey, data]) => {
        const label = artifactKey;
        const { artifactId } =
          artifactNodeData?.find((a) => artifactKey === a.outputArtifactKey) ?? {};

        // if no node needs it as an input, we don't really need a well known id
        const id = artifactId ?? artifactKey;

        nodes.push(
          createNode({
            id,
            label,
            runAfter: [taskId],
          }),
        );

        newTaskMapEntries[id] = {
          type: 'artifact',
          name: label,
          inputs: {
            artifacts: [{ label: id, type: composeArtifactType(data) }],
          },
        };
      });
    }

    // This task
    newTaskMapEntries[taskId] = {
      type: isGroupNode ? 'groupTask' : 'task',
      name: taskName,
      steps: executor ? [executor.container] : undefined,
      inputs: parseInputOutput(component?.inputDefinitions),
      outputs: parseInputOutput(component?.outputDefinitions),
      status,
    };
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

    // This task's rendering information
    if (isGroupNode) {
      // TODO: handle group nodes
      nodes.push(
        createNode({
          id: taskId,
          label: taskName,
          runAfter,
          status: translateStatusForNode(status?.state),
        }),
      );
    } else {
      nodes.push(
        createNode({
          id: taskId,
          label: taskName,
          runAfter,
          status: translateStatusForNode(status?.state),
        }),
      );
    }

    return {
      taskMap: {
        ...acc.taskMap,
        ...newTaskMapEntries,
      },
      nodes: [...acc.nodes, ...nodes],
    };
  }, EMPTY_STATE);
};
