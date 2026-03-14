/* eslint-disable camelcase */
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import type { PipelineSpecVariable } from '~/app/types/pipeline';
import type { AutoRAGPattern } from '~/app/types/autoragPattern';

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
import { useAutoRAGTaskTopology, MODEL_NODE_PREFIX } from '../useAutoRAGTaskTopology';

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

const mockPatterns: AutoRAGPattern[] = [
  {
    name: 'pattern0',
    iteration: 0,
    max_combinations: 3,
    duration_seconds: 0,
    settings: {
      vector_store: { datasource_type: 'milvus', collection_name: 'c0' },
      chunking: { method: 'recursive', chunk_size: 256, chunk_overlap: 128 },
      embedding: { model_id: 'embed-a', distance_metric: 'cosine' },
      retrieval: { method: 'window', number_of_chunks: 5 },
      generation: {
        model_id: 'granite-3.1-8b',
        context_template_text: '',
        user_message_text: '',
        system_message_text: '',
      },
    },
    scores: {
      answer_correctness: { mean: 0.5, ci_low: 0.4, ci_high: 0.7 },
      faithfulness: { mean: 0.3, ci_low: 0.1, ci_high: 0.5 },
      context_correctness: { mean: 1.0, ci_low: 0.9, ci_high: 1.0 },
    },
    final_score: 0.5,
  },
  {
    name: 'pattern1',
    iteration: 1,
    max_combinations: 3,
    duration_seconds: 0,
    settings: {
      vector_store: { datasource_type: 'milvus', collection_name: 'c1' },
      chunking: { method: 'recursive', chunk_size: 256, chunk_overlap: 128 },
      embedding: { model_id: 'embed-b', distance_metric: 'cosine' },
      retrieval: { method: 'window', number_of_chunks: 5 },
      generation: {
        model_id: 'granite-3.1-8b',
        context_template_text: '',
        user_message_text: '',
        system_message_text: '',
      },
    },
    scores: {
      answer_correctness: { mean: 0.6, ci_low: 0.4, ci_high: 0.7 },
      faithfulness: { mean: 0.4, ci_low: 0.1, ci_high: 0.5 },
      context_correctness: { mean: 1.0, ci_low: 0.9, ci_high: 1.0 },
    },
    final_score: 0.6,
  },
  {
    name: 'pattern2',
    iteration: 2,
    max_combinations: 3,
    duration_seconds: 0,
    settings: {
      vector_store: { datasource_type: 'milvus', collection_name: 'c2' },
      chunking: { method: 'recursive', chunk_size: 256, chunk_overlap: 128 },
      embedding: { model_id: 'embed-a', distance_metric: 'cosine' },
      retrieval: { method: 'window', number_of_chunks: 5 },
      generation: {
        model_id: 'llama-3.3-70b',
        context_template_text: '',
        user_message_text: '',
        system_message_text: '',
      },
    },
    scores: {
      answer_correctness: { mean: 0.7, ci_low: 0.4, ci_high: 0.7 },
      faithfulness: { mean: 0.5, ci_low: 0.1, ci_high: 0.5 },
      context_correctness: { mean: 1.0, ci_low: 0.9, ci_high: 1.0 },
    },
    final_score: 0.7,
  },
];

describe('useAutoRAGTaskTopology', () => {
  it('should return empty array when spec is undefined', () => {
    const renderResult = testHook(useAutoRAGTaskTopology)(undefined, undefined, undefined);
    expect(renderResult.result.current).toEqual([]);
  });

  it('should return empty array when spec has no tasks', () => {
    const emptySpec: PipelineSpecVariable = {
      root: { dag: { tasks: {} } },
    };
    const renderResult = testHook(useAutoRAGTaskTopology)(emptySpec, undefined, undefined);
    expect(renderResult.result.current).toEqual([]);
  });

  it('should create task nodes in topological order', () => {
    const renderResult = testHook(useAutoRAGTaskTopology)(mockSpec, undefined, undefined);
    const nodes = renderResult.result.current;

    expect(nodes).toHaveLength(3);
    expect(nodes[0].id).toBe('test-data-loader');
    expect(nodes[1].id).toBe('documents-sampling');
    expect(nodes[2].id).toBe('text-extraction');
  });

  it('should set runAfterTasks to create linear chain', () => {
    const renderResult = testHook(useAutoRAGTaskTopology)(mockSpec, undefined, undefined);
    const nodes = renderResult.result.current;

    expect(nodes[0].runAfterTasks).toEqual([]);
    expect(nodes[1].runAfterTasks).toEqual(['test-data-loader']);
    expect(nodes[2].runAfterTasks).toEqual(['documents-sampling']);
  });

  it('should humanize known task names', () => {
    const renderResult = testHook(useAutoRAGTaskTopology)(mockSpec, undefined, undefined);
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
    const renderResult = testHook(useAutoRAGTaskTopology)(spec, undefined, undefined);
    expect(renderResult.result.current[0].label).toBe('My Custom Task');
  });

  it('should not create model nodes when patterns are undefined', () => {
    const renderResult = testHook(useAutoRAGTaskTopology)(mockSpec, undefined, undefined);
    const nodes = renderResult.result.current;

    const modelNodes = nodes.filter((n) => n.id.startsWith(MODEL_NODE_PREFIX));
    expect(modelNodes).toHaveLength(0);
  });

  it('should not create model nodes when patterns array is empty', () => {
    const renderResult = testHook(useAutoRAGTaskTopology)(mockSpec, undefined, []);
    const nodes = renderResult.result.current;

    const modelNodes = nodes.filter((n) => n.id.startsWith(MODEL_NODE_PREFIX));
    expect(modelNodes).toHaveLength(0);
  });

  it('should create model nodes grouped by model_id', () => {
    const renderResult = testHook(useAutoRAGTaskTopology)(mockSpec, undefined, mockPatterns);
    const nodes = renderResult.result.current;

    const modelNodes = nodes.filter((n) => n.id.startsWith(MODEL_NODE_PREFIX));
    expect(modelNodes).toHaveLength(2);
    expect(modelNodes[0].id).toBe(`${MODEL_NODE_PREFIX}granite-3.1-8b`);
    expect(modelNodes[1].id).toBe(`${MODEL_NODE_PREFIX}llama-3.3-70b`);
  });

  it('should set correct badge text on model nodes', () => {
    const renderResult = testHook(useAutoRAGTaskTopology)(mockSpec, undefined, mockPatterns);
    const nodes = renderResult.result.current;

    const modelNodes = nodes.filter((n) => n.id.startsWith(MODEL_NODE_PREFIX));
    expect(modelNodes[0].data?.badge).toBe('2 patterns');
    expect(modelNodes[1].data?.badge).toBe('1 pattern');
  });

  it('should set model nodes runAfterTasks to the last task', () => {
    const renderResult = testHook(useAutoRAGTaskTopology)(mockSpec, undefined, mockPatterns);
    const nodes = renderResult.result.current;

    const modelNodes = nodes.filter((n) => n.id.startsWith(MODEL_NODE_PREFIX));
    modelNodes.forEach((node) => {
      expect(node.runAfterTasks).toEqual(['text-extraction']);
    });
  });

  it('should set model nodes status to Succeeded', () => {
    const renderResult = testHook(useAutoRAGTaskTopology)(mockSpec, undefined, mockPatterns);
    const nodes = renderResult.result.current;

    const modelNodes = nodes.filter((n) => n.id.startsWith(MODEL_NODE_PREFIX));
    modelNodes.forEach((node) => {
      expect(node.data?.runStatus).toBe('Succeeded');
    });
  });
});
