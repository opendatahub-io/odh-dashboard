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
  const ragOptimization = makeComponent('rag_optimization', [
    makeStage('validate_inputs', { status: 'completed' }),
    makeStage('optimize_templates', {
      status: 'started',
      selected_patterns: ['PatternGraphRAG', 'PatternHyDE'],
      steps: ['chunking', 'embedding', 'retrieval'],
    }),
    makeStage('run_optimization'),
    makeStage('write_patterns'),
    makeStage('build_leaderboard'),
  ]);

  it('does not include data-loader stages that are absent from the stage map topology', () => {
    const topologyNodes = buildStageMapTopology(makeStageMap([ragOptimization]));
    const { linearPre } = parseStageMapTopologyNodes(topologyNodes);

    expect(linearPre.map((node) => node.id)).toEqual([
      'rag_optimization__validate_inputs',
      'rag_optimization__optimize_templates',
    ]);
    expect(linearPre.some((node) => node.label === 'List and sample')).toBe(false);
  });

  it('renders the same node IDs and labels as buildStageMapTopology', () => {
    const topologyNodes = buildStageMapTopology(makeStageMap([ragOptimization]));
    const { nodes } = transformStageMapNodesToTree(topologyNodes);

    const topologyTaskNodes = topologyNodes.filter((node) => node.type !== 'DEFAULT_SPACER_NODE');
    expect(nodes).toHaveLength(topologyTaskNodes.length);
    expect(nodes.map((node) => node.id)).toEqual(topologyTaskNodes.map((node) => node.id));
    expect(nodes.map((node) => node.label)).toEqual(topologyTaskNodes.map((node) => node.label));
  });

  it('maps run statuses to tree step states', () => {
    const topologyNodes = buildStageMapTopology(makeStageMap([ragOptimization]));
    const { nodes } = transformStageMapNodesToTree(topologyNodes);

    const optimizeTemplates = nodes.find(
      (node) => node.id === 'rag_optimization__optimize_templates',
    );
    expect(optimizeTemplates?.data.stepState).toBe('active');

    const validateInputs = nodes.find((node) => node.id === 'rag_optimization__validate_inputs');
    expect(validateInputs?.data.stepState).toBe('completed');
  });

  it('includes data-loader linear stages when present in the stage map', () => {
    const dataLoader = makeComponent('rag_data_loader', [
      makeStage('validate_inputs'),
      makeStage('download_and_sample'),
    ]);
    const topologyNodes = buildStageMapTopology(makeStageMap([dataLoader, ragOptimization]));
    const { linearPre } = parseStageMapTopologyNodes(topologyNodes);

    expect(linearPre.map((node) => node.id)).toEqual([
      'rag_data_loader__validate_inputs',
      'rag_data_loader__download_and_sample',
      'rag_optimization__validate_inputs',
      'rag_optimization__optimize_templates',
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
      makeMockNode('rag_optimization__validate_inputs', 'Validate inputs'),
      makeMockNode('rag_optimization__optimize_templates', 'Optimize templates'),
      makeMockNode('rag_optimization__branch-0__step__chunking', 'Chunking'),
      makeMockNode('rag_optimization__branch-1__step__chunking', 'Chunking'),
      makeMockNode('rag_optimization__pattern__branch-0', 'Pattern 1'),
      makeMockNode('rag_optimization__pattern__branch-1', 'Pattern 2'),
    ];

    const { branches, branchIndices } = parseStageMapTopologyNodes(topologyNodes);

    expect(branchIndices).toEqual([0, 1]);
    expect(branches.get(0)?.map((node) => node.id)).toEqual([
      'rag_optimization__branch-0__step__chunking',
      'rag_optimization__pattern__branch-0',
    ]);
    expect(branches.get(1)?.map((node) => node.id)).toEqual([
      'rag_optimization__branch-1__step__chunking',
      'rag_optimization__pattern__branch-1',
    ]);
  });

  it('keeps canonical suffix branch step ids grouped by branch index', () => {
    const topologyNodes = buildStageMapTopology(makeStageMap([ragOptimization]));
    const { branches, branchIndices } = parseStageMapTopologyNodes(topologyNodes);

    expect(branchIndices).toEqual([0, 1]);
    expect(
      branches.get(1)?.some((node) => node.id === 'rag_optimization__step__chunking__branch-1'),
    ).toBe(true);
    expect(branches.get(1)?.some((node) => node.id === 'rag_optimization__pattern__branch-1')).toBe(
      true,
    );
  });

  it('keeps linear stage ids that contain __step__ out of branch grouping', () => {
    const makeMockNode = (id: string, label: string) => ({
      id,
      type: 'DEFAULT_TASK_NODE',
      label,
      data: { pipelineTask: { type: 'task' as const, name: label } },
    });
    const topologyNodes = [
      makeMockNode('rag_optimization__validate_inputs', 'Validate inputs'),
      makeMockNode('rag_optimization__step__validation', 'Step validation'),
      makeMockNode('rag_optimization__optimize_templates', 'Optimize templates'),
      makeMockNode('rag_optimization__step__chunking__branch-0', 'Chunking'),
      makeMockNode('rag_optimization__pattern__branch-0', 'Pattern 1'),
      makeMockNode('rag_optimization__run_optimization', 'Run optimization'),
    ];

    const { linearPre, branches, postBranch } = parseStageMapTopologyNodes(topologyNodes);

    expect(linearPre.map((node) => node.id)).toEqual([
      'rag_optimization__validate_inputs',
      'rag_optimization__step__validation',
      'rag_optimization__optimize_templates',
    ]);
    expect(branches.get(0)?.map((node) => node.id)).toEqual([
      'rag_optimization__step__chunking__branch-0',
      'rag_optimization__pattern__branch-0',
    ]);
    expect(postBranch.map((node) => node.id)).toEqual(['rag_optimization__run_optimization']);
  });

  it('rejects a resumed branch phase after post-branch linear nodes', () => {
    const makeMockNode = (id: string, label: string) => ({
      id,
      type: 'DEFAULT_TASK_NODE',
      label,
      data: { pipelineTask: { type: 'task' as const, name: label } },
    });
    const topologyNodes = [
      makeMockNode('rag_optimization__validate_inputs', 'Validate inputs'),
      makeMockNode('rag_optimization__optimize_templates', 'Optimize templates'),
      makeMockNode('rag_optimization__step__chunking__branch-0', 'Chunking'),
      makeMockNode('rag_optimization__pattern__branch-0', 'Pattern 1'),
      makeMockNode('rag_optimization__run_optimization', 'Run optimization'),
      makeMockNode('rag_optimization2__validate_inputs', 'Validate inputs'),
      makeMockNode('rag_optimization2__optimize_templates', 'Optimize templates'),
      makeMockNode('rag_optimization2__step__chunking__branch-0', 'Chunking'),
      makeMockNode('rag_optimization2__pattern__branch-0', 'Pattern 2'),
      makeMockNode('rag_optimization2__run_optimization', 'Run optimization'),
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
    const invalidBranchId = 'rag_optimization__step__chunking__branch-999999999999999999999';
    const topologyNodes = [
      makeMockNode('rag_optimization__validate_inputs', 'Validate inputs'),
      makeMockNode('rag_optimization__optimize_templates', 'Optimize templates'),
      makeMockNode(invalidBranchId, 'Chunking'),
      makeMockNode('rag_optimization__run_optimization', 'Run optimization'),
    ];

    const { branches, branchIndices, postBranch } = parseStageMapTopologyNodes(topologyNodes);

    expect(branchIndices).toEqual([]);
    expect(postBranch.map((node) => node.id)).toEqual([
      invalidBranchId,
      'rag_optimization__run_optimization',
    ]);
    expect(branches.size).toBe(0);

    const { edges } = transformStageMapNodesToTree(topologyNodes);
    expect(edges).toContainEqual(
      expect.objectContaining({
        id: 'e-converge-0',
        source: 'rag_optimization__optimize_templates',
        target: invalidBranchId,
      }),
    );
  });
});
