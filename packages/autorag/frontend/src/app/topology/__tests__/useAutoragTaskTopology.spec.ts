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
import { useAutoragTaskTopology } from '~/app/topology/useAutoragTaskTopology';

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

describe('useAutoragTaskTopology', () => {
  it('should return empty array when spec is undefined', () => {
    const renderResult = testHook(useAutoragTaskTopology)(undefined, undefined);
    expect(renderResult.result.current).toEqual([]);
  });

  it('should return empty array when spec has no tasks', () => {
    const emptySpec: PipelineSpecVariable = {
      root: { dag: { tasks: {} } },
    };
    const renderResult = testHook(useAutoragTaskTopology)(emptySpec, undefined);
    expect(renderResult.result.current).toEqual([]);
  });

  it('should create task nodes in topological order', () => {
    const renderResult = testHook(useAutoragTaskTopology)(mockSpec, undefined);
    const nodes = renderResult.result.current;

    expect(nodes).toHaveLength(3);
    expect(nodes[0].id).toBe('test-data-loader');
    expect(nodes[1].id).toBe('documents-sampling');
    expect(nodes[2].id).toBe('text-extraction');
  });

  it('should set runAfterTasks to create linear chain', () => {
    const renderResult = testHook(useAutoragTaskTopology)(mockSpec, undefined);
    const nodes = renderResult.result.current;

    expect(nodes[0].runAfterTasks).toEqual([]);
    expect(nodes[1].runAfterTasks).toEqual(['test-data-loader']);
    expect(nodes[2].runAfterTasks).toEqual(['documents-sampling']);
  });

  it('should humanize known task names', () => {
    const renderResult = testHook(useAutoragTaskTopology)(mockSpec, undefined);
    const nodes = renderResult.result.current;

    expect(nodes[0].label).toBe('Test Data Loader');
    expect(nodes[1].label).toBe('Documents Sampling');
    expect(nodes[2].label).toBe('Text Extraction');
  });

  it('should use completed fallback status when run succeeded but task has no details', () => {
    const renderResult = testHook(useAutoragTaskTopology)(mockSpec, undefined, 'SUCCEEDED');
    const nodes = renderResult.result.current;

    expect(nodes).toHaveLength(3);
    nodes.forEach((node) => {
      expect(node.data?.runStatus).toBe('Succeeded');
    });
  });

  it('should not apply fallback when run is failed and task has no details', () => {
    const renderResult = testHook(useAutoragTaskTopology)(mockSpec, undefined, 'FAILED');
    const nodes = renderResult.result.current;

    nodes.forEach((node) => {
      expect(node.data?.runStatus).toBeUndefined();
    });
  });

  it('should not apply fallback when run is canceled and task has no details', () => {
    const renderResult = testHook(useAutoragTaskTopology)(mockSpec, undefined, 'CANCELED');
    const nodes = renderResult.result.current;

    nodes.forEach((node) => {
      expect(node.data?.runStatus).toBeUndefined();
    });
  });

  it('should not apply fallback when run is skipped and task has no details', () => {
    const renderResult = testHook(useAutoragTaskTopology)(mockSpec, undefined, 'SKIPPED');
    const nodes = renderResult.result.current;

    nodes.forEach((node) => {
      expect(node.data?.runStatus).toBeUndefined();
    });
  });

  it('should retain explicit task status and leave unexecuted tasks without status', () => {
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
    const renderResult = testHook(useAutoragTaskTopology)(mockSpec, runDetails, 'FAILED');
    const nodes = renderResult.result.current;

    // Task with explicit status retains its own status
    expect(nodes[0].id).toBe('test-data-loader');
    expect(nodes[0].data?.runStatus).toBe('Succeeded');

    // Tasks without details show no status — they never executed
    expect(nodes[1].data?.runStatus).toBeUndefined();
    expect(nodes[2].data?.runStatus).toBeUndefined();
  });

  it('should not apply fallback when run is still running', () => {
    const renderResult = testHook(useAutoragTaskTopology)(mockSpec, undefined, 'RUNNING');
    const nodes = renderResult.result.current;

    nodes.forEach((node) => {
      expect(node.data?.runStatus).toBeUndefined();
    });
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
    const renderResult = testHook(useAutoragTaskTopology)(spec, undefined);
    expect(renderResult.result.current[0].label).toBe('My Custom Task');
  });
});
