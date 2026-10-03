/* eslint-disable camelcase */
import type { AutoRAGResponsesTemplate } from '~/app/types/autoragPattern';
import {
  generateCurlSnippet,
  generateGoSnippet,
  generateNodeSnippet,
  generatePythonSnippet,
} from '~/app/components/run-results/playgroundSnippets';
import type { SnippetParams } from '~/app/components/run-results/playgroundSnippets';

const mockTemplate: AutoRAGResponsesTemplate = {
  model: 'test-model',
  stream: false,
  store: false,
  input: [{ type: 'message', role: 'user', content: [{ type: 'input_text', text: 'hello' }] }],
  metadata: {
    autorag_run_id: '123',
    rag_pattern_name: 'Pattern1',
    embedding_model: 'embedding-model',
  },
  instructions: 'Be helpful.',
  tools: [
    {
      type: 'file_search',
      vector_store_ids: ['vs-1'],
      max_num_results: 5,
      ranking_options: { ranker: 'rrf', alpha: 0.5 },
    },
  ],
  tool_choice: { type: 'file_search' },
  include: ['file_search_call.results'],
};

const mockParams: SnippetParams = {
  template: mockTemplate,
  namespace: 'test-ns',
  dbSecretName: 'vector-db-secret',
  maasSecretName: 'maas-secret',
};

const generators = [
  { name: 'curl', fn: generateCurlSnippet },
  { name: 'Node.js', fn: generateNodeSnippet },
  { name: 'Go', fn: generateGoSnippet },
  { name: 'Python', fn: generatePythonSnippet },
];

describe('playground snippets', () => {
  it.each(generators)('should generate a $name snippet for the AutoRAG BFF', ({ fn }) => {
    const result = fn(mockParams);

    expect(result).toContain('/autorag/api/v1/responses');
    expect(result).toContain('namespace=test-ns');
    expect(result).toContain('dbSecretName=vector-db-secret');
    expect(result).toContain('maasSecretName=maas-secret');
    expect(result).toContain('https://<DASHBOARD_HOST>');
    expect(result).toContain('DASHBOARD_URL');
    expect(result).toContain('DASHBOARD_TOKEN');
    expect(result).toContain('test-model');
    expect(result).not.toContain('OGX_CLIENT_BASE_URL');
    expect(result).not.toContain('OGX_CLIENT_API_KEY');
  });

  it('should provide valid Node.js ESM setup guidance without stray indentation', () => {
    const result = generateNodeSnippet(mockParams);

    expect(result).toContain(
      'Save as response.mjs (or set "type": "module" in package.json) and run with Node.js 18+',
    );
    expect(result).toContain('\nconst dashboardUrl =');
    expect(result).not.toContain('\n const dashboardUrl =');
  });

  it('should preserve template content in each displayed language', () => {
    for (const { fn } of generators) {
      expect(fn(mockParams)).toContain('Be helpful.');
    }
  });
});
