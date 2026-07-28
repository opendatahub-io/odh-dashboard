// Mock @patternfly/react-topology to prevent CSS imports that Jest cannot parse.
// Provide all exports consumed transitively by usePipelineTaskTopology and its
// dependency tree (utils.ts, factories.ts, StandardTaskNode, etc.).
jest.mock('@patternfly/react-topology', () => ({
  DEFAULT_TASK_NODE_TYPE: 'DEFAULT_TASK_NODE',
  RunStatus: {
    Succeeded: 'Succeeded',
    Failed: 'Failed',
    Running: 'Running',
    InProgress: 'InProgress',
    Idle: 'Idle',
    Pending: 'Pending',
    Cancelled: 'Cancelled',
    Skipped: 'Skipped',
  },
  observer: (c: unknown) => c,
  GraphComponent: {},
  ModelKind: { graph: 'graph', node: 'node', edge: 'edge' },
  ComponentFactory: {},
  Visualization: jest.fn().mockImplementation(() => ({
    registerLayoutFactory: jest.fn(),
    registerComponentFactory: jest.fn(),
    fromModel: jest.fn(),
    getGraph: jest.fn().mockReturnValue({ layout: jest.fn() }),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })),
  VisualizationProvider: ({ children }: { children: unknown }) => children,
  VisualizationSurface: () => null,
  TopologyView: ({ children }: { children: unknown }) => children,
  SELECTION_EVENT: 'selection',
  SelectionEventListener: {},
  isNode: () => true,
  withSelection: () => (c: unknown) => c,
  DagreLayout: jest.fn(),
  useVisualizationController: jest.fn(),
  DefaultTaskGroup: () => null,
  TaskGroupPillLabel: () => null,
  LabelPosition: { top: 'top' },
  ScaleDetailsLevel: { high: 'high' },
  useHover: () => [false, { current: null }],
  WhenStatus: {},
  WithSelectionProps: {},
}));

import { testHook } from '@odh-dashboard/jest-config/hooks';
import { usePipelineTaskTopology } from '#~/concepts/pipelines/topology';
import { mockLargePipelineSpec } from '#~/concepts/pipelines/topology/__tests__/mockPipelineSpec';
import {
  mockParallelForPipelineSpec,
  mockParallelForWithArtifactsPipelineSpec,
} from '#~/concepts/pipelines/topology/__tests__/mockParallelForPipelineSpec';
import { PipelineNodeModelExpanded } from '#~/concepts/topology/types';
import { Execution, Value } from '#~/third_party/mlmd';

const DEFAULT_TASK_NODE_TYPE = 'DEFAULT_TASK_NODE';
const EXECUTION_TASK_NODE_TYPE = 'EXECUTION_TASK_NODE';
const ICON_TASK_NODE_TYPE = 'ICON_TASK_NODE';

/** Helper: create a mock Execution with id, state, task_name, and optional MLMD properties. */
const createMockExecution = (
  id: number,
  state: Execution.State,
  taskName: string,
  opts?: { parentDagId?: number; iterationCount?: number; iterationIndex?: number },
): Execution => {
  const exec = new Execution();
  exec.setId(id);
  exec.setLastKnownState(state);
  exec.setCreateTimeSinceEpoch(Date.now());
  exec.setLastUpdateTimeSinceEpoch(Date.now());

  const nameVal = new Value();
  exec.getCustomPropertiesMap().set('task_name', nameVal.setStringValue(taskName));

  if (opts?.parentDagId != null) {
    const val = new Value();
    exec.getCustomPropertiesMap().set('parent_dag_id', val.setIntValue(opts.parentDagId));
  }
  if (opts?.iterationCount != null) {
    const val = new Value();
    exec.getCustomPropertiesMap().set('iteration_count', val.setIntValue(opts.iterationCount));
  }
  if (opts?.iterationIndex != null) {
    const val = new Value();
    exec.getCustomPropertiesMap().set('iteration_index', val.setIntValue(opts.iterationIndex));
  }
  return exec;
};

describe('usePipelineTaskTopology', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(jest.fn());
  });

  it('returns the correct number of nodes', () => {
    const renderResult = testHook(usePipelineTaskTopology)(mockLargePipelineSpec);
    const nodes = renderResult.result.current;

    const pipelineNodes = nodes as PipelineNodeModelExpanded[];

    const tasks = pipelineNodes.filter((n) => n.type === DEFAULT_TASK_NODE_TYPE);
    const groups = pipelineNodes.filter((n) => n.type === EXECUTION_TASK_NODE_TYPE);
    const artifactNodes = pipelineNodes.filter((n) => n.type === ICON_TASK_NODE_TYPE);

    expect(pipelineNodes).toHaveLength(107);
    expect(tasks).toHaveLength(35);
    expect(groups).toHaveLength(5);
    expect(artifactNodes).toHaveLength(67);
  });

  describe('ParallelFor inline expansion', () => {
    it('should render for-loop-2 as a group node without executions', () => {
      const renderResult = testHook(usePipelineTaskTopology)(mockParallelForPipelineSpec);
      const nodes = renderResult.result.current as PipelineNodeModelExpanded[];

      // Without executions, no iterations are synthesized — just the group node + its child task
      const forLoopNode = nodes.find((n) => n.id === 'for-loop-2');
      expect(forLoopNode).toBeDefined();
      expect(forLoopNode?.group).toBe(true);
    });

    it('should synthesize iteration sub-groups when executions provide iteration_count', () => {
      // DAG execution for for-loop-2 with 3 iterations
      const dagExec = createMockExecution(100, Execution.State.RUNNING, 'for-loop-2', {
        iterationCount: 3,
      });

      // Iteration executions
      const iter0 = createMockExecution(101, Execution.State.COMPLETE, 'for-loop-2', {
        parentDagId: 100,
        iterationIndex: 0,
      });
      const iter1 = createMockExecution(102, Execution.State.COMPLETE, 'for-loop-2', {
        parentDagId: 100,
        iterationIndex: 1,
      });
      const iter2 = createMockExecution(103, Execution.State.COMPLETE, 'for-loop-2', {
        parentDagId: 100,
        iterationIndex: 2,
      });

      const executions = [dagExec, iter0, iter1, iter2];

      const renderResult = testHook(usePipelineTaskTopology)(
        mockParallelForPipelineSpec,
        undefined,
        executions,
      );
      const nodes = renderResult.result.current as PipelineNodeModelExpanded[];

      // Should have the parent group node
      const forLoopNode = nodes.find((n) => n.id === 'for-loop-2');
      expect(forLoopNode).toBeDefined();
      expect(forLoopNode?.group).toBe(true);
      expect(forLoopNode?.data?.pipelineTask.iterationCount).toBe(3);

      // Should have 3 iteration group nodes (filter out prefixed child nodes)
      const iterationNodes = nodes.filter(
        (n) => n.id.startsWith('for-loop-2-iteration-') && !n.id.includes('~'),
      );
      expect(iterationNodes).toHaveLength(3);
      expect(iterationNodes[0].id).toBe('for-loop-2-iteration-0');
      expect(iterationNodes[1].id).toBe('for-loop-2-iteration-1');
      expect(iterationNodes[2].id).toBe('for-loop-2-iteration-2');

      // Each iteration should be a group
      iterationNodes.forEach((n) => {
        expect(n.group).toBe(true);
      });

      // Parent should list iteration IDs as children
      expect(forLoopNode?.children).toEqual([
        'for-loop-2-iteration-0',
        'for-loop-2-iteration-1',
        'for-loop-2-iteration-2',
      ]);
    });

    it('should prefix child task IDs with iteration node ID', () => {
      const dagExec = createMockExecution(100, Execution.State.RUNNING, 'for-loop-2', {
        iterationCount: 2,
      });
      const iter0 = createMockExecution(101, Execution.State.COMPLETE, 'for-loop-2', {
        parentDagId: 100,
        iterationIndex: 0,
      });
      const iter1 = createMockExecution(102, Execution.State.COMPLETE, 'for-loop-2', {
        parentDagId: 100,
        iterationIndex: 1,
      });

      const executions = [dagExec, iter0, iter1];

      const renderResult = testHook(usePipelineTaskTopology)(
        mockParallelForPipelineSpec,
        undefined,
        executions,
      );
      const nodes = renderResult.result.current as PipelineNodeModelExpanded[];

      // Child tasks should be prefixed: "for-loop-2-iteration-0~simple-task"
      const prefixedTask0 = nodes.find((n) => n.id === 'for-loop-2-iteration-0~simple-task');
      const prefixedTask1 = nodes.find((n) => n.id === 'for-loop-2-iteration-1~simple-task');
      expect(prefixedTask0).toBeDefined();
      expect(prefixedTask1).toBeDefined();

      // Iteration groups should list prefixed children
      const iterGroup0 = nodes.find((n) => n.id === 'for-loop-2-iteration-0');
      expect(iterGroup0?.children).toContain('for-loop-2-iteration-0~simple-task');
    });

    it('should aggregate recursive status for the parent group node', () => {
      const dagExec = createMockExecution(100, Execution.State.RUNNING, 'for-loop-2', {
        iterationCount: 2,
      });
      const iter0 = createMockExecution(101, Execution.State.COMPLETE, 'for-loop-2', {
        parentDagId: 100,
        iterationIndex: 0,
      });
      const iter1 = createMockExecution(102, Execution.State.COMPLETE, 'for-loop-2', {
        parentDagId: 100,
        iterationIndex: 1,
      });

      const executions = [dagExec, iter0, iter1];

      const renderResult = testHook(usePipelineTaskTopology)(
        mockParallelForPipelineSpec,
        undefined,
        executions,
      );
      const nodes = renderResult.result.current as PipelineNodeModelExpanded[];

      const forLoopNode = nodes.find((n) => n.id === 'for-loop-2');
      // The parent was RUNNING but all children COMPLETE — effective state should be Complete
      expect(forLoopNode?.data?.pipelineTask.status?.state).toBe('Complete');
    });

    it('should set iterationParentDagId on each iteration group node', () => {
      const dagExec = createMockExecution(100, Execution.State.RUNNING, 'for-loop-2', {
        iterationCount: 2,
      });
      const iter0 = createMockExecution(101, Execution.State.COMPLETE, 'for-loop-2', {
        parentDagId: 100,
        iterationIndex: 0,
      });
      const iter1 = createMockExecution(102, Execution.State.COMPLETE, 'for-loop-2', {
        parentDagId: 100,
        iterationIndex: 1,
      });

      const executions = [dagExec, iter0, iter1];

      const renderResult = testHook(usePipelineTaskTopology)(
        mockParallelForPipelineSpec,
        undefined,
        executions,
      );
      const nodes = renderResult.result.current as PipelineNodeModelExpanded[];

      const iterGroup0 = nodes.find((n) => n.id === 'for-loop-2-iteration-0');
      const iterGroup1 = nodes.find((n) => n.id === 'for-loop-2-iteration-1');

      expect(iterGroup0?.data?.pipelineTask.iterationParentDagId).toBe(101);
      expect(iterGroup1?.data?.pipelineTask.iterationParentDagId).toBe(102);
    });

    it('should handle ParallelFor without any executions gracefully', () => {
      const renderResult = testHook(usePipelineTaskTopology)(
        mockParallelForPipelineSpec,
        undefined,
        [],
      );
      const nodes = renderResult.result.current as PipelineNodeModelExpanded[];

      // Should still render the group + sub-tasks, just without iterations
      const forLoopNode = nodes.find((n) => n.id === 'for-loop-2');
      expect(forLoopNode).toBeDefined();
      expect(forLoopNode?.group).toBe(true);
      // Without a dag execution with iteration_count, falls into regular sub-DAG path
      expect(forLoopNode?.data?.pipelineTask.iterationCount).toBeUndefined();
    });

    it('should prefix artifact producerTask references for correct edge resolution', () => {
      const dagExec = createMockExecution(100, Execution.State.RUNNING, 'for-loop-2', {
        iterationCount: 2,
      });
      const iter0 = createMockExecution(101, Execution.State.COMPLETE, 'for-loop-2', {
        parentDagId: 100,
        iterationIndex: 0,
      });
      const iter1 = createMockExecution(102, Execution.State.COMPLETE, 'for-loop-2', {
        parentDagId: 100,
        iterationIndex: 1,
      });

      const executions = [dagExec, iter0, iter1];

      const renderResult = testHook(usePipelineTaskTopology)(
        mockParallelForWithArtifactsPipelineSpec,
        undefined,
        executions,
      );
      const nodes = renderResult.result.current as PipelineNodeModelExpanded[];

      // The train-model task depends on create-features via artifact edge
      // In iteration 0, the prefixed train-model should have a runAfterTasks
      // that references the prefixed artifact node
      const trainModel0 = nodes.find((n) => n.id === 'for-loop-2-iteration-0~train-model');
      expect(trainModel0).toBeDefined();

      // The dependent task should be prefixed
      expect(trainModel0?.runAfterTasks).toEqual(
        expect.arrayContaining(['for-loop-2-iteration-0~create-features']),
      );

      // Artifact node should exist with prefixed ID
      const artifactNodes = nodes.filter(
        (n) => n.type === ICON_TASK_NODE_TYPE && n.id.includes('iteration-0'),
      );
      expect(artifactNodes.length).toBeGreaterThan(0);
    });
  });
});
