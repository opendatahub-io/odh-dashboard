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

/* eslint-disable camelcase */
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { usePipelineTaskTopology } from '#~/concepts/pipelines/topology';
import { mockLargePipelineSpec } from '#~/concepts/pipelines/topology/__tests__/mockPipelineSpec';
import {
  mockParallelForPipelineSpec,
  mockParallelForWithArtifactsPipelineSpec,
} from '#~/concepts/pipelines/topology/__tests__/mockParallelForPipelineSpec';
import { PipelineNodeModelExpanded } from '#~/concepts/topology/types';
import {
  PipelineSpecVariable,
  PipelineTaskKF,
  TaskStateKF,
  TaskTypeKF,
} from '#~/concepts/pipelines/kfTypes';

const DEFAULT_TASK_NODE_TYPE = 'DEFAULT_TASK_NODE';
const EXECUTION_TASK_NODE_TYPE = 'EXECUTION_TASK_NODE';
const ICON_TASK_NODE_TYPE = 'ICON_TASK_NODE';

/** Helper: a v2beta1 task. Iteration fields are decimal strings. */
const createMockTask = (
  taskId: string,
  state: TaskStateKF,
  taskName: string,
  opts?: {
    parentTaskId?: string;
    iterationCount?: string;
    iterationIndex?: string;
    type?: TaskTypeKF;
    childTasks?: PipelineTaskKF['child_tasks'];
  },
): PipelineTaskKF => ({
  task_id: taskId,
  run_id: 'run-1',
  name: taskName,
  display_name: taskName,
  state,
  type: opts?.type ?? (opts?.iterationCount != null ? TaskTypeKF.LOOP : TaskTypeKF.RUNTIME),
  parent_task_id: opts?.parentTaskId,
  type_attributes:
    opts?.iterationCount != null || opts?.iterationIndex != null
      ? { iteration_count: opts.iterationCount, iteration_index: opts.iterationIndex }
      : undefined,
  child_tasks: opts?.childTasks,
  create_time: '2024-04-16T16:34:56.322Z',
  end_time: '2024-04-16T16:34:56.524Z',
});

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
    const parallelForTasks = (
      count: string,
      childState = TaskStateKF.SUCCEEDED,
    ): PipelineTaskKF[] => {
      const total = Number(count);
      const childTasks = Array.from({ length: total }, (_, index) => ({
        task_id: `iter-${index}`,
        name: 'for-loop-2',
      }));
      return [
        createMockTask('loop-1', TaskStateKF.RUNNING, 'for-loop-2', {
          iterationCount: count,
          type: TaskTypeKF.LOOP,
          childTasks,
        }),
        ...childTasks.map((child, index) =>
          createMockTask(child.task_id, childState, 'for-loop-2', {
            parentTaskId: 'loop-1',
            iterationIndex: String(index),
          }),
        ),
      ];
    };

    it('should render for-loop-2 as a group node without tasks', () => {
      const renderResult = testHook(usePipelineTaskTopology)(mockParallelForPipelineSpec);
      const nodes = renderResult.result.current as PipelineNodeModelExpanded[];

      const forLoopNode = nodes.find((n) => n.id === 'for-loop-2');
      expect(forLoopNode).toBeDefined();
      expect(forLoopNode?.group).toBe(true);
    });

    it('should synthesize iteration sub-groups from decimal-string iteration fields', () => {
      const renderResult = testHook(usePipelineTaskTopology)(
        mockParallelForPipelineSpec,
        undefined,
        parallelForTasks('3'),
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
      const renderResult = testHook(usePipelineTaskTopology)(
        mockParallelForPipelineSpec,
        undefined,
        parallelForTasks('2'),
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
      const renderResult = testHook(usePipelineTaskTopology)(
        mockParallelForPipelineSpec,
        undefined,
        parallelForTasks('2'),
      );
      const nodes = renderResult.result.current as PipelineNodeModelExpanded[];

      const forLoopNode = nodes.find((n) => n.id === 'for-loop-2');
      // The parent was RUNNING but all children COMPLETE — effective state should be Complete
      expect(forLoopNode?.data?.pipelineTask.status?.state).toBe('Complete');
    });

    it('should set iterationParentTaskId from the iteration task id', () => {
      const renderResult = testHook(usePipelineTaskTopology)(
        mockParallelForPipelineSpec,
        undefined,
        parallelForTasks('2'),
      );
      const nodes = renderResult.result.current as PipelineNodeModelExpanded[];

      const iterGroup0 = nodes.find((n) => n.id === 'for-loop-2-iteration-0');
      const iterGroup1 = nodes.find((n) => n.id === 'for-loop-2-iteration-1');

      expect(iterGroup0?.data?.pipelineTask.iterationParentTaskId).toBe('iter-0');
      expect(iterGroup1?.data?.pipelineTask.iterationParentTaskId).toBe('iter-1');
      expect(iterGroup0?.data?.pipelineTask.iterationIndex).toBe(0);
      expect(iterGroup1?.data?.pipelineTask.iterationIndex).toBe(1);
      expect(iterGroup0?.data?.pipelineTask.iterationTaskName).toBe('for-loop-2');
    });

    it('should give each iteration its own child status', () => {
      const renderResult = testHook(usePipelineTaskTopology)(
        mockParallelForPipelineSpec,
        undefined,
        [
          ...parallelForTasks('2'),
          createMockTask('leaf-0', TaskStateKF.SUCCEEDED, 'simple-task', {
            parentTaskId: 'iter-0',
          }),
          createMockTask('leaf-1', TaskStateKF.FAILED, 'simple-task', { parentTaskId: 'iter-1' }),
        ],
      );
      const nodes = renderResult.result.current as PipelineNodeModelExpanded[];

      expect(
        nodes.find((n) => n.id === 'for-loop-2-iteration-0~simple-task')?.data?.pipelineTask.status
          ?.state,
      ).toBe('Complete');
      expect(
        nodes.find((n) => n.id === 'for-loop-2-iteration-1~simple-task')?.data?.pipelineTask.status
          ?.state,
      ).toBe('Failed');
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
      const renderResult = testHook(usePipelineTaskTopology)(
        mockParallelForWithArtifactsPipelineSpec,
        undefined,
        parallelForTasks('2'),
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

    it('should cap inline iterations for a large decimal iteration_count', () => {
      const renderResult = testHook(usePipelineTaskTopology)(
        mockParallelForPipelineSpec,
        undefined,
        [
          createMockTask('loop-1', TaskStateKF.RUNNING, 'for-loop-2', {
            iterationCount: '250',
            type: TaskTypeKF.LOOP,
          }),
        ],
      );
      const nodes = renderResult.result.current as PipelineNodeModelExpanded[];
      const iterationNodes = nodes.filter(
        (n) => n.id.startsWith('for-loop-2-iteration-') && !n.id.includes('~'),
      );
      expect(iterationNodes).toHaveLength(100);
      expect(nodes.find((n) => n.id === 'for-loop-2')?.data?.pipelineTask.iterationCount).toBe(250);
    });

    it('should find an iteration listed only in child_tasks', () => {
      const renderResult = testHook(usePipelineTaskTopology)(
        mockParallelForPipelineSpec,
        undefined,
        [
          createMockTask('loop-1', TaskStateKF.RUNNING, 'for-loop-2', {
            iterationCount: '1',
            type: TaskTypeKF.LOOP,
            childTasks: [{ task_id: 'iter-0', name: 'for-loop-2' }],
          }),
          createMockTask('iter-0', TaskStateKF.SUCCEEDED, 'for-loop-2', {
            iterationIndex: '0',
          }),
        ],
      );
      const nodes = renderResult.result.current as PipelineNodeModelExpanded[];
      expect(
        nodes.find((n) => n.id === 'for-loop-2-iteration-0')?.data?.pipelineTask
          .iterationParentTaskId,
      ).toBe('iter-0');
    });
  });

  it('should color a sequential task from its runtime task state', () => {
    const spec = {
      components: {
        'comp-a': { executorLabel: 'exec-a' },
        'comp-b': { executorLabel: 'exec-b' },
      },
      deploymentSpec: {
        executors: {
          'exec-a': { container: { image: 'a' } },
          'exec-b': { container: { image: 'b' } },
        },
      },
      pipelineInfo: { name: 'sequential' },
      schemaVersion: '2.1.0',
      sdkVersion: 'kfp-2.15.2',
      root: {
        dag: {
          tasks: {
            a: { componentRef: { name: 'comp-a' }, taskInfo: { name: 'step-a' } },
            b: {
              componentRef: { name: 'comp-b' },
              taskInfo: { name: 'step-b' },
              dependentTasks: ['a'],
            },
          },
        },
      },
    } as PipelineSpecVariable;

    const renderResult = testHook(usePipelineTaskTopology)(spec, undefined, [
      createMockTask('root-1', TaskStateKF.RUNNING, 'root', { type: TaskTypeKF.ROOT }),
      createMockTask('a-1', TaskStateKF.SUCCEEDED, 'step-a', { parentTaskId: 'root-1' }),
      createMockTask('b-1', TaskStateKF.FAILED, 'step-b', { parentTaskId: 'root-1' }),
    ]);
    const nodes = renderResult.result.current as PipelineNodeModelExpanded[];
    expect(nodes.find((n) => n.id === 'a')?.data?.pipelineTask.status?.state).toBe('Complete');
    expect(nodes.find((n) => n.id === 'b')?.data?.pipelineTask.status?.state).toBe('Failed');
    expect(nodes.find((n) => n.id === 'b')?.runAfterTasks).toEqual(expect.arrayContaining(['a']));
  });

  it('should aggregate a condition branch and a nested DAG from parent_task_id', () => {
    const spec = {
      components: {
        'comp-branch': {
          dag: {
            tasks: {
              'when-true': {
                componentRef: { name: 'comp-leaf' },
                taskInfo: { name: 'when-true' },
              },
            },
          },
        },
        'comp-outer': {
          dag: {
            tasks: {
              mid: {
                componentRef: { name: 'comp-mid' },
                taskInfo: { name: 'mid' },
              },
            },
          },
        },
        'comp-mid': {
          dag: {
            tasks: {
              leaf: { componentRef: { name: 'comp-leaf' }, taskInfo: { name: 'leaf' } },
            },
          },
        },
        'comp-leaf': { executorLabel: 'exec-leaf' },
      },
      deploymentSpec: { executors: { 'exec-leaf': { container: { image: 'leaf' } } } },
      pipelineInfo: { name: 'nested' },
      schemaVersion: '2.1.0',
      sdkVersion: 'kfp-2.15.2',
      root: {
        dag: {
          tasks: {
            branch: { componentRef: { name: 'comp-branch' }, taskInfo: { name: 'branch' } },
            outer: { componentRef: { name: 'comp-outer' }, taskInfo: { name: 'outer' } },
          },
        },
      },
    } as PipelineSpecVariable;

    const renderResult = testHook(usePipelineTaskTopology)(spec, undefined, [
      createMockTask('branch-1', TaskStateKF.RUNNING, 'branch', {
        type: TaskTypeKF.CONDITION_BRANCH,
        childTasks: [{ task_id: 'when-1', name: 'when-true' }],
      }),
      createMockTask('when-1', TaskStateKF.SUCCEEDED, 'when-true', {
        parentTaskId: 'branch-1',
        type: TaskTypeKF.CONDITION,
      }),
      createMockTask('outer-1', TaskStateKF.RUNNING, 'outer', {
        type: TaskTypeKF.DAG,
        childTasks: [{ task_id: 'mid-1', name: 'mid' }],
      }),
      createMockTask('mid-1', TaskStateKF.RUNNING, 'mid', {
        parentTaskId: 'outer-1',
        type: TaskTypeKF.DAG,
        childTasks: [{ task_id: 'leaf-1', name: 'leaf' }],
      }),
      createMockTask('leaf-1', TaskStateKF.SUCCEEDED, 'leaf', { parentTaskId: 'mid-1' }),
    ]);
    const nodes = renderResult.result.current as PipelineNodeModelExpanded[];

    expect(nodes.find((n) => n.id === 'branch')?.data?.pipelineTask.status?.state).toBe('Complete');
    expect(nodes.find((n) => n.id === 'outer')?.data?.pipelineTask.status?.state).toBe('Complete');
    expect(nodes.find((n) => n.id === 'mid')?.data?.pipelineTask.status?.state).toBe('Complete');
    expect(nodes.find((n) => n.id === 'leaf')?.data?.pipelineTask.status?.state).toBe('Complete');
  });

  it('should match a repeated task name to the direct child', () => {
    const spec = {
      components: {
        'comp-outer': {
          dag: {
            tasks: {
              'train-a': { componentRef: { name: 'comp-leaf' }, taskInfo: { name: 'train' } },
              inner: { componentRef: { name: 'comp-inner' }, taskInfo: { name: 'inner' } },
            },
          },
        },
        'comp-inner': {
          dag: {
            tasks: {
              'train-b': { componentRef: { name: 'comp-leaf' }, taskInfo: { name: 'train' } },
            },
          },
        },
        'comp-leaf': { executorLabel: 'exec-leaf' },
      },
      deploymentSpec: { executors: { 'exec-leaf': { container: { image: 'leaf' } } } },
      pipelineInfo: { name: 'shadow' },
      schemaVersion: '2.1.0',
      sdkVersion: 'kfp-2.15.2',
      root: {
        dag: {
          tasks: {
            outer: { componentRef: { name: 'comp-outer' }, taskInfo: { name: 'outer' } },
          },
        },
      },
    } as PipelineSpecVariable;

    const renderResult = testHook(usePipelineTaskTopology)(spec, undefined, [
      createMockTask('outer-1', TaskStateKF.RUNNING, 'outer', {
        type: TaskTypeKF.DAG,
        childTasks: [
          { task_id: 'inner-1', name: 'inner' },
          { task_id: 'train-outer', name: 'train' },
        ],
      }),
      createMockTask('inner-1', TaskStateKF.RUNNING, 'inner', {
        parentTaskId: 'outer-1',
        type: TaskTypeKF.DAG,
        childTasks: [{ task_id: 'train-inner', name: 'train' }],
      }),
      createMockTask('train-inner', TaskStateKF.FAILED, 'train', { parentTaskId: 'inner-1' }),
      createMockTask('train-outer', TaskStateKF.SUCCEEDED, 'train', { parentTaskId: 'outer-1' }),
    ]);
    const nodes = renderResult.result.current as PipelineNodeModelExpanded[];

    expect(nodes.find((n) => n.id === 'train-a')?.data?.pipelineTask.status?.state).toBe(
      'Complete',
    );
    expect(nodes.find((n) => n.id === 'train-b')?.data?.pipelineTask.status?.state).toBe('Failed');
  });
});
