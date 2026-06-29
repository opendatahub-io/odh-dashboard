/* eslint-disable camelcase */
import type { ResponsesTemplate } from '~/app/types/autoragPattern';
import {
  generateCurlSnippet,
  generateGoSnippet,
  generateNodeSnippet,
  generatePythonSnippet,
} from '~/app/components/run-results/playgroundSnippets';
import type {
  SnippetCredentials,
  SnippetParams,
} from '~/app/components/run-results/playgroundSnippets';

const mockCredentials: SnippetCredentials = {
  hostname: 'ogx.example.com',
  apiKey: 'sk-test-key-123',
};

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

const mockParams: SnippetParams = {
  template: mockTemplate,
  secretName: 'test-secret',
  namespace: 'test-ns',
};

describe('generateCurlSnippet', () => {
  it('should return a string', () => {
    expect(typeof generateCurlSnippet(mockParams)).toBe('string');
  });

  it('should contain the model name from the template', () => {
    expect(generateCurlSnippet(mockParams)).toContain('test-model');
  });

  it('should contain curl -X POST', () => {
    expect(generateCurlSnippet(mockParams)).toContain('curl -X POST');
  });

  it('should show oc get secret with secretName and namespace when no credentials', () => {
    const result = generateCurlSnippet(mockParams);
    expect(result).toContain('oc get secret test-secret');
    expect(result).toContain('-n test-ns');
  });
});

describe('generateNodeSnippet', () => {
  it('should return a string', () => {
    expect(typeof generateNodeSnippet(mockParams)).toBe('string');
  });

  it('should contain the model name from the template', () => {
    expect(generateNodeSnippet(mockParams)).toContain('test-model');
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

  it('should show k8s client with secretName and namespace when no credentials', () => {
    const result = generateNodeSnippet(mockParams);
    expect(result).toContain('k8s.KubeConfig');
    expect(result).toContain('"test-secret"');
    expect(result).toContain('"test-ns"');
  });
});

describe('generateGoSnippet', () => {
  it('should return a string', () => {
    expect(typeof generateGoSnippet(mockParams)).toBe('string');
  });

  it('should contain the model name from the template', () => {
    expect(generateGoSnippet(mockParams)).toContain('test-model');
  });

  it('should contain package main', () => {
    expect(generateGoSnippet(mockParams)).toContain('package main');
  });

  it('should show k8s client with secretName and namespace when no credentials', () => {
    const result = generateGoSnippet(mockParams);
    expect(result).toContain('kubernetes.NewForConfig');
    expect(result).toContain('"test-ns"');
    expect(result).toContain('"test-secret"');
  });
});

describe('generatePythonSnippet', () => {
  it('should return a string', () => {
    expect(typeof generatePythonSnippet(mockParams)).toBe('string');
  });

  it('should contain the model name from the template', () => {
    expect(generatePythonSnippet(mockParams)).toContain('test-model');
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

  it('should show k8s client with secretName and namespace when no credentials', () => {
    const result = generatePythonSnippet(mockParams);
    expect(result).toContain('config.load_config');
    expect(result).toContain('"test-secret"');
    expect(result).toContain('"test-ns"');
  });
});

describe('credential injection', () => {
  const generators = [
    { name: 'curl', fn: generateCurlSnippet },
    { name: 'Node.js', fn: generateNodeSnippet },
    { name: 'Go', fn: generateGoSnippet },
    { name: 'Python', fn: generatePythonSnippet },
  ];

  it.each(generators)('should inject credentials and remove placeholders for $name', ({ fn }) => {
    const result = fn(mockParams, mockCredentials);
    expect(result).toContain('ogx.example.com');
    expect(result).toContain('sk-test-key-123');
    expect(result).not.toContain('test-secret');
    expect(result).not.toContain('test-ns');
  });

  it.each(generators)(
    'should not contain credentials when no credentials provided for $name',
    ({ fn }) => {
      const result = fn(mockParams);
      expect(result).not.toContain('ogx.example.com');
      expect(result).not.toContain('sk-test-key-123');
    },
  );

  it('should escape shell metacharacters in curl snippet', () => {
    const adversarial: SnippetCredentials = {
      hostname: 'host"$(whoami)`id`.com',
      apiKey: 'key"$(cmd)`run`',
    };
    const result = generateCurlSnippet(mockParams, adversarial);
    expect(result).not.toContain('<HOSTNAME>');
    expect(result).not.toContain('<API_KEY>');
    // $ and backticks must be backslash-escaped in the output
    expect(result).toContain('\\$(whoami)');
    expect(result).toContain('\\`id\\`');
    expect(result).toContain('\\$(cmd)');
    expect(result).toContain('\\`run\\`');
  });

  it('should not allow shell command injection via ; or & in curl snippet', () => {
    const adversarial: SnippetCredentials = {
      hostname: 'good.com;rm -rf ~',
      apiKey: 'key&background-cmd',
    };
    const result = generateCurlSnippet(mockParams, adversarial);
    // URL must be double-quoted so ; and & are literal, not shell separators
    expect(result).toContain('"https://good.com;rm -rf ~/v1/responses"');
    // apiKey is also in a double-quoted header, ; and & are safe there too
    expect(result).toContain('Bearer key&background-cmd');
  });

  it.each(generators)(
    'should escape double-quote characters in credentials for $name',
    ({ fn }) => {
      const adversarial: SnippetCredentials = {
        hostname: 'host".evil.com',
        apiKey: 'key"injection',
      };
      const result = fn(mockParams, adversarial);
      expect(result).not.toContain('<HOSTNAME>');
      expect(result).not.toContain('<API_KEY>');
      expect(result).not.toMatch(/[^\\]"\.evil\.com/);
      expect(result).not.toMatch(/[^\\]"injection/);
    },
  );
});
