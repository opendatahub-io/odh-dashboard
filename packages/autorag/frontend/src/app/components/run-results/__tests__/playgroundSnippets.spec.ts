/* eslint-disable camelcase */
import type { ResponsesTemplate } from '~/app/types/autoragPattern';
import {
  generateCurlSnippet,
  generateGoSnippet,
  generateNodeSnippet,
  generatePythonSnippet,
} from '~/app/components/run-results/playgroundSnippets';

const mockTemplate: ResponsesTemplate = {
  model: 'test-model',
  stream: false,
  store: false,
  input: [{ type: 'message', role: 'user', content: [{ type: 'input_text', text: 'hello' }] }],
  metadata: { autorag_run_id: '123', rag_pattern_name: 'Pattern1' },
  instructions: 'Be helpful.',
  tools: [
    {
      type: 'file_search',
      vector_store_ids: ['vs-1'],
      max_num_results: 5,
      ranking_options: {
        search_mode: 'hybrid',
        ranker_strategy: 'rrf',
        ranker_k: 60,
        ranker_alpha: 0.5,
      },
    },
  ],
  tool_choice: { type: 'file_search' },
  include: ['file_search_call.results'],
};

describe('generateCurlSnippet', () => {
  it('should return a string', () => {
    const result = generateCurlSnippet(mockTemplate);
    expect(typeof result).toBe('string');
  });

  it('should contain the model name from the template', () => {
    const result = generateCurlSnippet(mockTemplate);
    expect(result).toContain('test-model');
  });

  it('should contain curl -X POST', () => {
    const result = generateCurlSnippet(mockTemplate);
    expect(result).toContain('curl -X POST');
  });

  it('should contain the hostname and API key placeholders', () => {
    const result = generateCurlSnippet(mockTemplate);
    expect(result).toContain('<HOSTNAME>');
    expect(result).toContain('<API_KEY>');
  });
});

describe('generateNodeSnippet', () => {
  it('should return a string', () => {
    const result = generateNodeSnippet(mockTemplate);
    expect(typeof result).toBe('string');
  });

  it('should contain the model name from the template', () => {
    const result = generateNodeSnippet(mockTemplate);
    expect(result).toContain('test-model');
  });

  it('should contain import OpenAI', () => {
    const result = generateNodeSnippet(mockTemplate);
    expect(result).toContain('import OpenAI');
  });

  it('should contain the hostname and API key placeholders', () => {
    const result = generateNodeSnippet(mockTemplate);
    expect(result).toContain('<HOSTNAME>');
    expect(result).toContain('<API_KEY>');
  });
});

describe('generateGoSnippet', () => {
  it('should return a string', () => {
    const result = generateGoSnippet(mockTemplate);
    expect(typeof result).toBe('string');
  });

  it('should contain the model name from the template', () => {
    const result = generateGoSnippet(mockTemplate);
    expect(result).toContain('test-model');
  });

  it('should contain package main', () => {
    const result = generateGoSnippet(mockTemplate);
    expect(result).toContain('package main');
  });

  it('should contain the hostname and API key placeholders', () => {
    const result = generateGoSnippet(mockTemplate);
    expect(result).toContain('<HOSTNAME>');
    expect(result).toContain('<API_KEY>');
  });
});

describe('generatePythonSnippet', () => {
  it('should return a string', () => {
    const result = generatePythonSnippet(mockTemplate);
    expect(typeof result).toBe('string');
  });

  it('should contain the model name from the template', () => {
    const result = generatePythonSnippet(mockTemplate);
    expect(result).toContain('test-model');
  });

  it('should contain from openai import OpenAI', () => {
    const result = generatePythonSnippet(mockTemplate);
    expect(result).toContain('from openai import OpenAI');
  });

  it('should contain the hostname and API key placeholders', () => {
    const result = generatePythonSnippet(mockTemplate);
    expect(result).toContain('<HOSTNAME>');
    expect(result).toContain('<API_KEY>');
  });
});
