/* eslint-disable camelcase */
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import type { PipelineSpecVariable } from '~/app/types/pipeline';

jest.mock('@patternfly/react-topology', () => ({
  DEFAULT_TASK_NODE_TYPE: 'DEFAULT_TASK_NODE',
  RunStatus: {
    Succeeded: 'Succeeded',
    Failed: 'Failed',
    Running: 'Running',
    InProgress: 'InProgress',
    Idle: 'Idle',
    Pending: 'Pending',
  },
}));

// eslint-disable-next-line import/first
import { useAutoRAGTaskTopology } from '../useAutoRAGTaskTopology';

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

describe('useAutoRAGTaskTopology', () => {
  it('should return empty array when spec is undefined', () => {
    const renderResult = testHook(useAutoRAGTaskTopology)(undefined, undefined);
    expect(renderResult.result.current).toEqual([]);
  });

  it('should return empty array when spec has no tasks', () => {
    const emptySpec: PipelineSpecVariable = {
      root: { dag: { tasks: {} } },
    };
    const renderResult = testHook(useAutoRAGTaskTopology)(emptySpec, undefined);
    expect(renderResult.result.current).toEqual([]);
  });

  it('should create task nodes in topological order', () => {
    const renderResult = testHook(useAutoRAGTaskTopology)(mockSpec, undefined);
    const nodes = renderResult.result.current;

    expect(nodes).toHaveLength(3);
    expect(nodes[0].id).toBe('test-data-loader');
    expect(nodes[1].id).toBe('documents-sampling');
    expect(nodes[2].id).toBe('text-extraction');
  });

  it('should set runAfterTasks to create linear chain', () => {
    const renderResult = testHook(useAutoRAGTaskTopology)(mockSpec, undefined);
    const nodes = renderResult.result.current;

    expect(nodes[0].runAfterTasks).toEqual([]);
    expect(nodes[1].runAfterTasks).toEqual(['test-data-loader']);
    expect(nodes[2].runAfterTasks).toEqual(['documents-sampling']);
  });

  it('should humanize known task names', () => {
    const renderResult = testHook(useAutoRAGTaskTopology)(mockSpec, undefined);
    const nodes = renderResult.result.current;

    expect(nodes[0].label).toBe('Test Data Loader');
    expect(nodes[1].label).toBe('Documents Sampling');
    expect(nodes[2].label).toBe('Text Extraction');
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
    const renderResult = testHook(useAutoRAGTaskTopology)(spec, undefined);
    expect(renderResult.result.current[0].label).toBe('My Custom Task');
  });
});
