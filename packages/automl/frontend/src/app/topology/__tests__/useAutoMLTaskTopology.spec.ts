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
import { useAutoMLTaskTopology } from '~/app/topology/useAutoMLTaskTopology';

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

describe('useAutoMLTaskTopology', () => {
  it('should return empty array when spec is undefined', () => {
    const renderResult = testHook(useAutoMLTaskTopology)(undefined, undefined);
    expect(renderResult.result.current).toEqual([]);
  });

  it('should return empty array when spec has no tasks', () => {
    const emptySpec: PipelineSpecVariable = {
      root: { dag: { tasks: {} } },
    };
    const renderResult = testHook(useAutoMLTaskTopology)(emptySpec, undefined);
    expect(renderResult.result.current).toEqual([]);
  });

  it('should create task nodes in topological order', () => {
    const renderResult = testHook(useAutoMLTaskTopology)(mockSpec, undefined);
    const nodes = renderResult.result.current;

    expect(nodes).toHaveLength(3);
    expect(nodes[0].id).toBe('test-data-loader');
    expect(nodes[1].id).toBe('documents-sampling');
    expect(nodes[2].id).toBe('text-extraction');
  });

  it('should set runAfterTasks to create linear chain', () => {
    const renderResult = testHook(useAutoMLTaskTopology)(mockSpec, undefined);
    const nodes = renderResult.result.current;

    expect(nodes[0].runAfterTasks).toEqual([]);
    expect(nodes[1].runAfterTasks).toEqual(['test-data-loader']);
    expect(nodes[2].runAfterTasks).toEqual(['documents-sampling']);
  });

  it('should humanize known task names', () => {
    const renderResult = testHook(useAutoMLTaskTopology)(mockSpec, undefined);
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
    const renderResult = testHook(useAutoMLTaskTopology)(spec, undefined);
    expect(renderResult.result.current[0].label).toBe('My custom task');
  });

  it('should use terminal fallback status when run is succeeded but task has no details', () => {
    const renderResult = testHook(useAutoMLTaskTopology)(mockSpec, undefined, 'SUCCEEDED');
    const nodes = renderResult.result.current;

    expect(nodes).toHaveLength(3);
    nodes.forEach((node) => {
      expect(node.data?.runStatus).toBe('Succeeded');
    });
  });

  it('should use terminal fallback status when run is failed but task has no details', () => {
    const renderResult = testHook(useAutoMLTaskTopology)(mockSpec, undefined, 'FAILED');
    const nodes = renderResult.result.current;

    nodes.forEach((node) => {
      expect(node.data?.runStatus).toBe('Failed');
    });
  });

  it('should use terminal fallback status when run is canceled but task has no details', () => {
    const renderResult = testHook(useAutoMLTaskTopology)(mockSpec, undefined, 'CANCELED');
    const nodes = renderResult.result.current;

    nodes.forEach((node) => {
      expect(node.data?.runStatus).toBe('Cancelled');
    });
  });

  it('should use terminal fallback status when run is skipped but task has no details', () => {
    const renderResult = testHook(useAutoMLTaskTopology)(mockSpec, undefined, 'SKIPPED');
    const nodes = renderResult.result.current;

    nodes.forEach((node) => {
      expect(node.data?.runStatus).toBe('Skipped');
    });
  });

  it('should use terminal fallback status when run is cached but task has no details', () => {
    const renderResult = testHook(useAutoMLTaskTopology)(mockSpec, undefined, 'CACHED');
    const nodes = renderResult.result.current;

    nodes.forEach((node) => {
      expect(node.data?.runStatus).toBe('Succeeded');
    });
  });

  it('should retain explicit task status instead of terminal fallback', () => {
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
    const renderResult = testHook(useAutoMLTaskTopology)(mockSpec, runDetails, 'FAILED');
    const nodes = renderResult.result.current;

    // Task with explicit status retains its own status
    expect(nodes[0].id).toBe('test-data-loader');
    expect(nodes[0].data?.runStatus).toBe('Succeeded');

    // Tasks without details fall back to run-level status
    expect(nodes[1].data?.runStatus).toBe('Failed');
    expect(nodes[2].data?.runStatus).toBe('Failed');
  });

  it('should not apply terminal fallback when run is still running', () => {
    const renderResult = testHook(useAutoMLTaskTopology)(mockSpec, undefined, 'RUNNING');
    const nodes = renderResult.result.current;

    nodes.forEach((node) => {
      expect(node.data?.runStatus).toBeUndefined();
    });
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
    const renderResult = testHook(useAutoMLTaskTopology)(spec, undefined);
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
    const renderResult = testHook(useAutoMLTaskTopology)(spec, undefined);
    const nodes = renderResult.result.current;

    expect(nodes[1].label).toBe('Model selection');
  });

  it('should assign wider layout width to longer resolved labels', () => {
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
    const renderResult = testHook(useAutoMLTaskTopology)(spec, undefined);
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
