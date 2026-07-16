/* eslint-disable camelcase */
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import { RuntimeStateKF, PipelineSpecVariable } from '~/app/types/pipeline';

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
}));

// eslint-disable-next-line import/first
import { useAutomlTaskTopology } from '~/app/topology/useAutomlTaskTopology';

const mockSpec: PipelineSpecVariable = {
  root: {
    dag: {
      tasks: {
        'test-data-loader': {
          taskInfo: { name: 'test-data-loader' },
          dependentTasks: [],
          componentRef: { name: '' },
        },
        'documents-sampling': {
          taskInfo: { name: 'documents-sampling' },
          dependentTasks: ['test-data-loader'],
          componentRef: { name: '' },
        },
        'text-extraction': {
          taskInfo: { name: 'text-extraction' },
          dependentTasks: ['documents-sampling'],
          componentRef: { name: '' },
        },
      },
    },
  },
};

describe('useAutomlTaskTopology', () => {
  it('should return empty array when spec is undefined', () => {
    const renderResult = testHook(useAutomlTaskTopology)(undefined, undefined);
    expect(renderResult.result.current).toEqual([]);
  });

  it('should return empty array when spec has no tasks', () => {
    const emptySpec: PipelineSpecVariable = {
      root: { dag: { tasks: {} } },
    };
    const renderResult = testHook(useAutomlTaskTopology)(emptySpec, undefined);
    expect(renderResult.result.current).toEqual([]);
  });

  it('should create task nodes in topological order', () => {
    const renderResult = testHook(useAutomlTaskTopology)(mockSpec, undefined);
    const nodes = renderResult.result.current;

    expect(nodes).toHaveLength(3);
    expect(nodes[0].id).toBe('test-data-loader');
    expect(nodes[1].id).toBe('documents-sampling');
    expect(nodes[2].id).toBe('text-extraction');
  });

  it('should set runAfterTasks from each task DAG dependencies', () => {
    const renderResult = testHook(useAutomlTaskTopology)(mockSpec, undefined);
    const nodes = renderResult.result.current;

    expect(nodes[0].runAfterTasks).toEqual([]);
    expect(nodes[1].runAfterTasks).toEqual(['test-data-loader']);
    expect(nodes[2].runAfterTasks).toEqual(['documents-sampling']);
  });

  it('should preserve parallel branches and multi-parent fan-in dependencies', () => {
    const buildParallelBranchSpec = (
      firstBranchId: 'branch-a' | 'branch-b',
      secondBranchId: 'branch-a' | 'branch-b',
    ): PipelineSpecVariable => ({
      root: {
        dag: {
          tasks: {
            root: {
              taskInfo: { name: 'root' },
              dependentTasks: [],
              componentRef: { name: '' },
            },
            [firstBranchId]: {
              taskInfo: { name: firstBranchId },
              dependentTasks: ['root'],
              componentRef: { name: '' },
            },
            [secondBranchId]: {
              taskInfo: { name: secondBranchId },
              dependentTasks: ['root'],
              componentRef: { name: '' },
            },
            merge: {
              taskInfo: { name: 'merge' },
              dependentTasks: ['branch-a', 'branch-b'],
              componentRef: { name: '' },
            },
          },
        },
      },
    });

    const runDetailsWithFailedBranchA = {
      task_details: [
        {
          run_id: 'run-1',
          task_id: 'root',
          display_name: 'root',
          create_time: '2024-01-01T00:00:00Z',
          start_time: '2024-01-01T00:00:01Z',
          end_time: '2024-01-01T00:00:10Z',
          state: RuntimeStateKF.SUCCEEDED,
        },
        {
          run_id: 'run-1',
          task_id: 'branch-a',
          display_name: 'branch-a',
          create_time: '2024-01-01T00:00:10Z',
          start_time: '2024-01-01T00:00:11Z',
          end_time: '2024-01-01T00:00:20Z',
          state: RuntimeStateKF.FAILED,
        },
      ],
    };

    const assertParallelBranchTopology = (
      spec: PipelineSpecVariable,
      runDetails: typeof runDetailsWithFailedBranchA,
    ) => {
      const renderResult = testHook(useAutomlTaskTopology)(spec, runDetails, RuntimeStateKF.FAILED);
      const byId = Object.fromEntries(renderResult.result.current.map((node) => [node.id, node]));

      expect(byId.root.runAfterTasks).toEqual([]);
      expect(byId['branch-a'].runAfterTasks).toEqual(['root']);
      expect(byId['branch-b'].runAfterTasks).toEqual(['root']);
      expect(byId.merge.runAfterTasks).toEqual(['branch-a', 'branch-b']);

      expect(byId.root.data?.runStatus).toBe('Succeeded');
      expect(byId['branch-a'].data?.runStatus).toBe('Failed');
      expect(byId['branch-b'].data?.runStatus).toBeUndefined();
      expect(byId.merge.data?.runStatus).toBe('Pending');
    };

    assertParallelBranchTopology(
      buildParallelBranchSpec('branch-a', 'branch-b'),
      runDetailsWithFailedBranchA,
    );
    assertParallelBranchTopology(
      buildParallelBranchSpec('branch-b', 'branch-a'),
      runDetailsWithFailedBranchA,
    );
  });

  it('infers failure on all parallel branches when only root succeeded and the run failed', () => {
    const buildParallelBranchSpec = (
      firstBranchId: 'branch-a' | 'branch-b',
      secondBranchId: 'branch-a' | 'branch-b',
    ): PipelineSpecVariable => ({
      root: {
        dag: {
          tasks: {
            root: {
              taskInfo: { name: 'root' },
              dependentTasks: [],
              componentRef: { name: '' },
            },
            [firstBranchId]: {
              taskInfo: { name: firstBranchId },
              dependentTasks: ['root'],
              componentRef: { name: '' },
            },
            [secondBranchId]: {
              taskInfo: { name: secondBranchId },
              dependentTasks: ['root'],
              componentRef: { name: '' },
            },
            merge: {
              taskInfo: { name: 'merge' },
              dependentTasks: ['branch-a', 'branch-b'],
              componentRef: { name: '' },
            },
          },
        },
      },
    });

    const runDetailsWithOnlyRootSucceeded = {
      task_details: [
        {
          run_id: 'run-1',
          task_id: 'root',
          display_name: 'root',
          create_time: '2024-01-01T00:00:00Z',
          start_time: '2024-01-01T00:00:01Z',
          end_time: '2024-01-01T00:00:10Z',
          state: RuntimeStateKF.SUCCEEDED,
        },
      ],
    };

    const assertInferredParallelFailures = (
      spec: PipelineSpecVariable,
      runDetails: typeof runDetailsWithOnlyRootSucceeded,
    ) => {
      const renderResult = testHook(useAutomlTaskTopology)(spec, runDetails, RuntimeStateKF.FAILED);
      const byId = Object.fromEntries(renderResult.result.current.map((node) => [node.id, node]));

      expect(byId.root.data?.runStatus).toBe('Succeeded');
      expect(byId['branch-a'].data?.runStatus).toBe('Failed');
      expect(byId['branch-b'].data?.runStatus).toBe('Failed');
      expect(byId.merge.data?.runStatus).toBe('Pending');
    };

    assertInferredParallelFailures(
      buildParallelBranchSpec('branch-a', 'branch-b'),
      runDetailsWithOnlyRootSucceeded,
    );
    assertInferredParallelFailures(
      buildParallelBranchSpec('branch-b', 'branch-a'),
      runDetailsWithOnlyRootSucceeded,
    );
  });

  it('should humanize known task names', () => {
    const renderResult = testHook(useAutomlTaskTopology)(mockSpec, undefined);
    const nodes = renderResult.result.current;

    expect(nodes[0].label).toBe('Test data loader');
    expect(nodes[1].label).toBe('Documents sampling');
    expect(nodes[2].label).toBe('Text extraction');
  });

  it('should humanize unknown task names via fallback', () => {
    const spec: PipelineSpecVariable = {
      root: {
        dag: {
          tasks: {
            'my-custom-task': {
              taskInfo: { name: 'my-custom-task' },
              dependentTasks: [],
              componentRef: { name: '' },
            },
          },
        },
      },
    };
    const renderResult = testHook(useAutomlTaskTopology)(spec, undefined);
    expect(renderResult.result.current[0].label).toBe('My custom task');
  });

  it('should show no status when no run details are provided', () => {
    const renderResult = testHook(useAutomlTaskTopology)(mockSpec, undefined);
    const nodes = renderResult.result.current;

    nodes.forEach((node) => {
      expect(node.data?.runStatus).toBeUndefined();
    });
  });

  it('should translate task status from run details', () => {
    const runDetails = {
      task_details: [
        {
          run_id: 'run-1',
          task_id: 'test-data-loader',
          display_name: 'test-data-loader',
          create_time: '2024-01-01T00:00:00Z',
          start_time: '2024-01-01T00:00:01Z',
          end_time: '2024-01-01T00:00:10Z',
          state: RuntimeStateKF.SUCCEEDED,
        },
        {
          run_id: 'run-1',
          task_id: 'documents-sampling',
          display_name: 'documents-sampling',
          create_time: '2024-01-01T00:00:10Z',
          start_time: '2024-01-01T00:00:11Z',
          end_time: '2024-01-01T00:00:20Z',
          state: RuntimeStateKF.FAILED,
        },
      ],
    };
    const renderResult = testHook(useAutomlTaskTopology)(mockSpec, runDetails);
    const nodes = renderResult.result.current;

    expect(nodes[0].data?.runStatus).toBe('Succeeded');
    expect(nodes[1].data?.runStatus).toBe('Failed');
    expect(nodes[2].data?.runStatus).toBe('Pending');
  });

  it('marks pipeline preparation failed when the run failed before component tasks started', () => {
    const spec: PipelineSpecVariable = {
      root: {
        dag: {
          tasks: {
            'publish-component-stage-map': {
              taskInfo: { name: 'publish-component-stage-map' },
              dependentTasks: [],
              componentRef: { name: '' },
            },
            'automl-data-loader': {
              taskInfo: { name: 'automl-data-loader' },
              dependentTasks: ['publish-component-stage-map'],
              componentRef: { name: '' },
            },
            'condition-branches-1': {
              taskInfo: { name: 'condition-branches-1' },
              dependentTasks: ['automl-data-loader'],
              componentRef: { name: '' },
            },
          },
        },
      },
    };
    const runDetails = {
      task_details: [
        {
          run_id: '6f60f53d-62ab-4aec-8767-21f62a92a0d1',
          task_id: '11f90339-5b7e-4845-b9eb-72349b7d29d8',
          display_name: 'root-driver',
          create_time: '2026-07-09T21:09:38Z',
          start_time: '2026-07-09T21:09:38Z',
          end_time: '2026-07-09T21:09:43Z',
          state: RuntimeStateKF.FAILED,
        },
      ],
    };
    const renderResult = testHook(useAutomlTaskTopology)(spec, runDetails, RuntimeStateKF.FAILED);
    const nodes = renderResult.result.current;

    expect(nodes[0].label).toBe('Pipeline preparation');
    expect(nodes[0].data?.runStatus).toBe('Failed');
    expect(nodes[1].data?.runStatus).toBe('Pending');
    expect(nodes[2].data?.runStatus).toBe('Pending');
  });

  it('should leave tasks without run details as undefined', () => {
    const runDetails = {
      task_details: [
        {
          run_id: 'run-1',
          task_id: 'test-data-loader',
          display_name: 'test-data-loader',
          create_time: '2024-01-01T00:00:00Z',
          start_time: '2024-01-01T00:00:01Z',
          end_time: '2024-01-01T00:00:10Z',
          state: RuntimeStateKF.SUCCEEDED,
        },
      ],
    };
    const renderResult = testHook(useAutomlTaskTopology)(mockSpec, runDetails);
    const nodes = renderResult.result.current;

    expect(nodes[0].data?.runStatus).toBe('Succeeded');
    expect(nodes[1].data?.runStatus).toBeUndefined();
    expect(nodes[2].data?.runStatus).toBeUndefined();
  });

  it('should map title-cased API display name to Model selection via normalized lookup', () => {
    const spec: PipelineSpecVariable = {
      root: {
        dag: {
          tasks: {
            loader: {
              taskInfo: { name: 'loader' },
              dependentTasks: [],
              componentRef: { name: '' },
            },
            someTaskId: {
              taskInfo: { name: 'Autogluon Timeseries Models Selection' },
              dependentTasks: ['loader'],
              componentRef: { name: '' },
            },
          },
        },
      },
    };
    const renderResult = testHook(useAutomlTaskTopology)(spec, undefined);
    expect(renderResult.result.current[1].label).toBe('Model selection');
  });

  it('should map autogluon-timeseries-models-selection task id to Model selection label', () => {
    const spec: PipelineSpecVariable = {
      root: {
        dag: {
          tasks: {
            loader: {
              taskInfo: { name: 'loader' },
              dependentTasks: [],
              componentRef: { name: '' },
            },
            'autogluon-timeseries-models-selection': {
              taskInfo: { name: 'unexpected-api-name' },
              dependentTasks: ['loader'],
              componentRef: { name: '' },
            },
          },
        },
      },
    };
    const renderResult = testHook(useAutomlTaskTopology)(spec, undefined);
    const nodes = renderResult.result.current;

    expect(nodes[1].label).toBe('Model selection');
  });

  it('should ignore inherited prototype names listed as dependentTasks', () => {
    const spec: PipelineSpecVariable = {
      root: {
        dag: {
          tasks: {
            loader: {
              taskInfo: { name: 'loader' },
              dependentTasks: [],
              componentRef: { name: '' },
            },
            train: {
              taskInfo: { name: 'train' },
              dependentTasks: ['loader', 'toString'],
              componentRef: { name: '' },
            },
          },
        },
      },
    };

    const renderResult = testHook(useAutomlTaskTopology)(spec, undefined);
    const nodes = renderResult.result.current;

    expect(nodes).toHaveLength(2);
    expect(nodes.map((node) => node.id)).toEqual(['loader', 'train']);
    expect(nodes[1].runAfterTasks).toEqual(['loader']);
  });

  it('should ignore non-array dependentTasks and non-string dependency entries', () => {
    const spec = {
      root: {
        dag: {
          tasks: {
            loader: {
              taskInfo: { name: 'loader' },
              dependentTasks: 'loader',
              componentRef: { name: '' },
            },
            train: {
              taskInfo: { name: 'train' },
              dependentTasks: ['loader', 42, null, { id: 'loader' }],
              componentRef: { name: '' },
            },
          },
        },
      },
    } as unknown as PipelineSpecVariable;

    const renderResult = testHook(useAutomlTaskTopology)(spec, undefined);
    const nodes = renderResult.result.current;

    expect(nodes).toHaveLength(2);
    expect(nodes.map((node) => node.id)).toEqual(['loader', 'train']);
    expect(nodes[0].runAfterTasks).toEqual([]);
    expect(nodes[1].runAfterTasks).toEqual(['loader']);
  });

  it('should skip null or non-object task records without throwing', () => {
    const spec = {
      root: {
        dag: {
          tasks: {
            loader: {
              taskInfo: { name: 'loader' },
              dependentTasks: [],
              componentRef: { name: '' },
            },
            broken: null,
            alsoBroken: 'not-a-task',
            train: {
              taskInfo: { name: 'train' },
              dependentTasks: ['loader', 'broken', 'alsoBroken'],
              componentRef: { name: '' },
            },
          },
        },
      },
    } as unknown as PipelineSpecVariable;

    const renderResult = testHook(useAutomlTaskTopology)(spec, undefined);
    const nodes = renderResult.result.current;

    expect(nodes).toHaveLength(2);
    expect(nodes.map((node) => node.id)).toEqual(['loader', 'train']);
    expect(nodes[1].runAfterTasks).toEqual(['loader']);
  });

  it('should assign wider layout width to longer resolved labels', () => {
    const mockMeasureText = jest.fn((text: string) => ({ width: text.length * 8 }));
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      measureText: mockMeasureText,
      font: '',
    } as unknown as CanvasRenderingContext2D);

    const spec: PipelineSpecVariable = {
      root: {
        dag: {
          tasks: {
            short: {
              taskInfo: { name: 'short' },
              dependentTasks: [],
              componentRef: { name: '' },
            },
            'very-long-task-name-for-layout': {
              taskInfo: { name: 'very-long-task-name-for-layout' },
              dependentTasks: ['short'],
              componentRef: { name: '' },
            },
            tail: {
              taskInfo: { name: 'tail' },
              dependentTasks: ['very-long-task-name-for-layout'],
              componentRef: { name: '' },
            },
          },
        },
      },
    };
    const renderResult = testHook(useAutomlTaskTopology)(spec, undefined);
    const nodes = renderResult.result.current;

    expect(nodes).toHaveLength(3);
    const shortW = nodes[0].width;
    const longW = nodes[1].width;
    const tailW = nodes[2].width;
    if (shortW === undefined || longW === undefined || tailW === undefined) {
      throw new Error('expected layout width on every topology node');
    }
    expect(longW).toBeGreaterThan(shortW);
    expect(longW).toBeGreaterThan(tailW);
  });
});
