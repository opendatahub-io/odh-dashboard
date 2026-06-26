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

const mockParams = {
  template: mockTemplate,
  secretName: 'my-secret',
  namespace: 'my-namespace',
};

describe('generateCurlSnippet', () => {
  it('should return a string', () => {
    const result = generateCurlSnippet(mockParams);
    expect(typeof result).toBe('string');
  });

  it('should contain the model name from the template', () => {
    const result = generateCurlSnippet(mockParams);
    expect(result).toContain('test-model');
  });

  it('should contain curl -X POST', () => {
    const result = generateCurlSnippet(mockParams);
    expect(result).toContain('curl -X POST');
  });

  it('should contain the secret name and namespace in kubectl commands', () => {
    const result = generateCurlSnippet(mockParams);
    expect(result).toContain('my-secret');
    expect(result).toContain('my-namespace');
  });

  it('should reference OGX_CLIENT_BASE_URL and OGX_CLIENT_API_KEY', () => {
    const result = generateCurlSnippet(mockParams);
    expect(result).toContain('OGX_CLIENT_BASE_URL');
    expect(result).toContain('OGX_CLIENT_API_KEY');
  });
});

describe('generateNodeSnippet', () => {
  it('should return a string', () => {
    const result = generateNodeSnippet(mockParams);
    expect(typeof result).toBe('string');
  });

  it('should contain the model name from the template', () => {
    const result = generateNodeSnippet(mockParams);
    expect(result).toContain('test-model');
  });

  it('should use fetch to call the OGX Responses API directly', () => {
    const result = generateNodeSnippet(mockParams);
    expect(result).toContain('await fetch(');
    expect(result).toContain('/v1/responses');
    expect(result).not.toContain('openai');
    expect(result).not.toContain('OpenAI');
  });

  it('should include request timeout and error handling', () => {
    const result = generateNodeSnippet(mockParams);
    expect(result).toContain('AbortSignal.timeout(');
    expect(result).toContain('response.ok');
    expect(result).toContain('result.output ?? result');
  });

  it('should contain the secret name and namespace', () => {
    const result = generateNodeSnippet(mockParams);
    expect(result).toContain('my-secret');
    expect(result).toContain('my-namespace');
  });

  it('should use @kubernetes/client-node to fetch the secret', () => {
    const result = generateNodeSnippet(mockParams);
    expect(result).toContain('@kubernetes/client-node');
    expect(result).toContain('readNamespacedSecret');
  });
});

describe('generateGoSnippet', () => {
  it('should return a string', () => {
    const result = generateGoSnippet(mockParams);
    expect(typeof result).toBe('string');
  });

  it('should contain the model name from the template', () => {
    const result = generateGoSnippet(mockParams);
    expect(result).toContain('test-model');
  });

  it('should contain package main', () => {
    const result = generateGoSnippet(mockParams);
    expect(result).toContain('package main');
  });

  it('should contain the secret name and namespace', () => {
    const result = generateGoSnippet(mockParams);
    expect(result).toContain('my-secret');
    expect(result).toContain('my-namespace');
  });

  it('should use client-go to fetch the secret', () => {
    const result = generateGoSnippet(mockParams);
    expect(result).toContain('k8s.io/client-go');
    expect(result).toContain('secret.Data');
  });
});

describe('generatePythonSnippet', () => {
  it('should return a string', () => {
    const result = generatePythonSnippet(mockParams);
    expect(typeof result).toBe('string');
  });

  it('should contain the model name from the template', () => {
    const result = generatePythonSnippet(mockParams);
    expect(result).toContain('test-model');
  });

  it('should use requests to call the OGX Responses API directly', () => {
    const result = generatePythonSnippet(mockParams);
    expect(result).toContain('requests.post');
    expect(result).toContain('/v1/responses');
    expect(result).not.toContain('from openai');
    expect(result).not.toContain('openai_client');
  });

  it('should include request timeout and error handling', () => {
    const result = generatePythonSnippet(mockParams);
    expect(result).toContain('timeout=30');
    expect(result).toContain('raise_for_status()');
    expect(result).toContain('result.get("output", result)');
  });

  it('should contain the secret name and namespace', () => {
    const result = generatePythonSnippet(mockParams);
    expect(result).toContain('my-secret');
    expect(result).toContain('my-namespace');
  });

  it('should use the kubernetes Python client to fetch the secret', () => {
    const result = generatePythonSnippet(mockParams);
    expect(result).toContain('from kubernetes import client, config');
    expect(result).toContain('read_namespaced_secret');
  });
});
