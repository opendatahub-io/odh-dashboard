/* eslint-disable camelcase */
jest.mock('@patternfly/react-topology', () => ({
  DEFAULT_SPACER_NODE_TYPE: 'DEFAULT_SPACER_NODE',
  RunStatus: {
    Succeeded: 'Succeeded',
    Failed: 'Failed',
    InProgress: 'InProgress',
    Pending: 'Pending',
    Cancelled: 'Cancelled',
    Skipped: 'Skipped',
  },
}));

jest.mock('~/app/topology/utils', () => ({
  createNode: ({
    id,
    label,
    pipelineTask,
    runAfterTasks,
    runStatus,
  }: {
    id: string;
    label: string;
    pipelineTask: unknown;
    runAfterTasks?: string[];
    runStatus?: string;
  }) => ({
    id,
    label,
    type: 'DEFAULT_TASK_NODE',
    width: 100,
    height: 30,
    runAfterTasks,
    data: { pipelineTask, runStatus },
  }),
}));

jest.mock('../treeFactories', () => ({
  TREE_NODE_TYPE: 'tree-node',
  TREE_EDGE_TYPE: 'tree-edge',
}));

import { RunStatus } from '@patternfly/react-topology';
import type {
  ComponentStageMap,
  ComponentStageMapComponent,
  ComponentStageMapStage,
} from '~/app/hooks/useComponentStageMap';
import { buildStageMapTopology } from '~/app/topology/buildStageMapTopology';
import {
  parseStageMapTopologyNodes,
  transformStageMapNodesToTree,
} from '~/app/topology/tree-view/transformStageMapNodesToTree';
import { runStatusToTreeStepState } from '~/app/topology/tree-view/treeStepState';

const makeStage = (
  id: string,
  overrides?: Partial<ComponentStageMapStage>,
): ComponentStageMapStage => ({
  id,
  description: `${id} stage`,
  ...overrides,
});

const makeComponent = (
  id: string,
  stages: ComponentStageMapStage[],
): ComponentStageMapComponent => ({
  id,
  description: `${id} component`,
  stages,
});

const makeStageMap = (components: ComponentStageMapComponent[]): ComponentStageMap => ({
  pipeline_id: 'pipeline-1',
  description: 'test',
  components,
  kfp_run_id: 'run-1',
  published_at: '2025-01-01T00:00:00Z',
});

describe('transformStageMapNodesToTree', () => {
  const training = makeComponent('training', [
    makeStage('load_data', { status: 'completed' }),
    makeStage('model_selection', {
      status: 'started',
      selected_models: ['xgboost', 'lightgbm'],
      steps: ['feature_engineering', 'model_training', 'stacking', 'model_evaluation'],
    }),
    makeStage('refit_full'),
    makeStage('evaluate_models'),
    makeStage('build_leaderboard'),
  ]);

  it('does not include data-loader stages that are absent from the stage map topology', () => {
    const topologyNodes = buildStageMapTopology(makeStageMap([training]));
    const { linearPre } = parseStageMapTopologyNodes(topologyNodes);

    expect(linearPre.map((node) => node.id)).toEqual([
      'training__load_data',
      'training__model_selection',
    ]);
    expect(linearPre.some((node) => node.label === 'Validate inputs')).toBe(false);
  });

  it('renders the same node IDs and labels as buildStageMapTopology', () => {
    const topologyNodes = buildStageMapTopology(makeStageMap([training]));
    const { nodes } = transformStageMapNodesToTree(topologyNodes);

    const topologyTaskNodes = topologyNodes.filter((node) => node.type !== 'DEFAULT_SPACER_NODE');
    expect(nodes).toHaveLength(topologyTaskNodes.length);
    expect(nodes.map((node) => node.id)).toEqual(topologyTaskNodes.map((node) => node.id));
    expect(nodes.map((node) => node.label)).toEqual(topologyTaskNodes.map((node) => node.label));
  });

  it('maps run statuses to tree step states', () => {
    const topologyNodes = buildStageMapTopology(makeStageMap([training]));
    const { nodes } = transformStageMapNodesToTree(topologyNodes);

    const modelSelection = nodes.find((node) => node.id === 'training__model_selection');
    expect(modelSelection?.data.stepState).toBe('active');

    const loadData = nodes.find((node) => node.id === 'training__load_data');
    expect(loadData?.data.stepState).toBe('completed');
  });

  it('includes data-loader linear stages when present in the stage map', () => {
    const dataLoader = makeComponent('data_prep', [
      makeStage('validate_inputs'),
      makeStage('read_and_sample'),
    ]);
    const topologyNodes = buildStageMapTopology(makeStageMap([dataLoader, training]));
    const { linearPre } = parseStageMapTopologyNodes(topologyNodes);

    expect(linearPre.map((node) => node.id)).toEqual([
      'data_prep__validate_inputs',
      'data_prep__read_and_sample',
      'training__load_data',
      'training__model_selection',
    ]);
  });

  it('runStatusToTreeStepState maps RunStatus values', () => {
    expect(runStatusToTreeStepState(RunStatus.Succeeded)).toBe('completed');
    expect(runStatusToTreeStepState(RunStatus.InProgress)).toBe('active');
    expect(runStatusToTreeStepState(RunStatus.Failed)).toBe('failed');
    expect(runStatusToTreeStepState(RunStatus.Skipped)).toBe('unreached');
    expect(runStatusToTreeStepState(RunStatus.Pending)).toBe('pending');
  });

  it('groups branch steps by branch index when branch segment precedes __step__', () => {
    const makeMockNode = (id: string, label: string) => ({
      id,
      type: 'DEFAULT_TASK_NODE',
      label,
      data: { pipelineTask: { type: 'task' as const, name: label } },
    });
    const topologyNodes = [
      makeMockNode('training__load_data', 'Load data'),
      makeMockNode('training__model_selection', 'Model selection'),
      makeMockNode('training__branch-0__step__feature_engineering', 'Feature engineering'),
      makeMockNode('training__branch-1__step__feature_engineering', 'Feature engineering'),
      makeMockNode('training__model__branch-0', 'Model 1'),
      makeMockNode('training__model__branch-1', 'Model 2'),
    ];

    const { branches, branchIndices } = parseStageMapTopologyNodes(topologyNodes);

    expect(branchIndices).toEqual([0, 1]);
    expect(branches.get(0)?.map((node) => node.id)).toEqual([
      'training__branch-0__step__feature_engineering',
      'training__model__branch-0',
    ]);
    expect(branches.get(1)?.map((node) => node.id)).toEqual([
      'training__branch-1__step__feature_engineering',
      'training__model__branch-1',
    ]);
  });

  it('keeps canonical suffix branch step ids grouped by branch index', () => {
    const topologyNodes = buildStageMapTopology(makeStageMap([training]));
    const { branches, branchIndices } = parseStageMapTopologyNodes(topologyNodes);

    expect(branchIndices).toEqual([0, 1]);
    expect(
      branches.get(1)?.some((node) => node.id === 'training__step__feature_engineering__branch-1'),
    ).toBe(true);
    expect(branches.get(1)?.some((node) => node.id === 'training__model__branch-1')).toBe(true);
  });

  it('keeps linear stage ids that contain __step__ out of branch grouping', () => {
    const makeMockNode = (id: string, label: string) => ({
      id,
      type: 'DEFAULT_TASK_NODE',
      label,
      data: { pipelineTask: { type: 'task' as const, name: label } },
    });
    const topologyNodes = [
      makeMockNode('training__load_data', 'Load data'),
      makeMockNode('training__step__validation', 'Step validation'),
      makeMockNode('training__model_selection', 'Model selection'),
      makeMockNode('training__step__feature_engineering__branch-0', 'Feature engineering'),
      makeMockNode('training__model__branch-0', 'Model 1'),
      makeMockNode('training__refit_full', 'Refit full'),
    ];

    const { linearPre, branches, postBranch } = parseStageMapTopologyNodes(topologyNodes);

    expect(linearPre.map((node) => node.id)).toEqual([
      'training__load_data',
      'training__step__validation',
      'training__model_selection',
    ]);
    expect(branches.get(0)?.map((node) => node.id)).toEqual([
      'training__step__feature_engineering__branch-0',
      'training__model__branch-0',
    ]);
    expect(postBranch.map((node) => node.id)).toEqual(['training__refit_full']);
  });

  it('rejects a resumed branch phase after post-branch linear nodes', () => {
    const makeMockNode = (id: string, label: string) => ({
      id,
      type: 'DEFAULT_TASK_NODE',
      label,
      data: { pipelineTask: { type: 'task' as const, name: label } },
    });
    const topologyNodes = [
      makeMockNode('training__load_data', 'Load data'),
      makeMockNode('training__model_selection', 'Model selection'),
      makeMockNode('training__step__feature_engineering__branch-0', 'Feature engineering'),
      makeMockNode('training__model__branch-0', 'Model 1'),
      makeMockNode('training__refit_full', 'Refit full'),
      makeMockNode('training2__load_data', 'Load data'),
      makeMockNode('training2__model_selection', 'Model selection'),
      makeMockNode('training2__step__feature_engineering__branch-0', 'Feature engineering'),
      makeMockNode('training2__model__branch-0', 'Model 2'),
      makeMockNode('training2__refit_full', 'Refit full'),
    ];

    expect(() => parseStageMapTopologyNodes(topologyNodes)).toThrow(
      /second branch phase after post-branch linear nodes is not supported/,
    );
    expect(() => transformStageMapNodesToTree(topologyNodes)).toThrow(
      /second branch phase after post-branch linear nodes is not supported/,
    );
  });

  it('treats out-of-bounds branch indices as post-branch linear nodes', () => {
    const makeMockNode = (id: string, label: string) => ({
      id,
      type: 'DEFAULT_TASK_NODE',
      label,
      data: { pipelineTask: { type: 'task' as const, name: label } },
    });
    const invalidBranchId = 'training__step__feature_engineering__branch-999999999999999999999';
    const topologyNodes = [
      makeMockNode('training__load_data', 'Load data'),
      makeMockNode('training__model_selection', 'Model selection'),
      makeMockNode(invalidBranchId, 'Feature engineering'),
      makeMockNode('training__refit_full', 'Refit full'),
    ];

    const { branches, branchIndices, postBranch } = parseStageMapTopologyNodes(topologyNodes);

    expect(branchIndices).toEqual([]);
    expect(postBranch.map((node) => node.id)).toEqual([invalidBranchId, 'training__refit_full']);
    expect(branches.size).toBe(0);

    const { edges } = transformStageMapNodesToTree(topologyNodes);
    expect(edges).toContainEqual(
      expect.objectContaining({
        id: 'e-converge-0',
        source: 'training__model_selection',
        target: invalidBranchId,
      }),
    );
  });
});
