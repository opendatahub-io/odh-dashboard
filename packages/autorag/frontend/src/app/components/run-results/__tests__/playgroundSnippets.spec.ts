/* eslint-disable camelcase */
import type { ResponsesTemplate } from '~/app/types/autoragPattern';
import {
  generateCurlSnippet,
  generateGoSnippet,
  generateNodeSnippet,
  generatePythonSnippet,
} from '~/app/components/run-results/playgroundSnippets';
import type { SnippetCredentials } from '~/app/components/run-results/playgroundSnippets';

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

describe('generateCurlSnippet', () => {
  it('should return a string', () => {
    expect(typeof generateCurlSnippet(mockTemplate)).toBe('string');
  });

  it('should contain the model name from the template', () => {
    expect(generateCurlSnippet(mockTemplate)).toContain('test-model');
  });

  it('should contain curl -X POST', () => {
    expect(generateCurlSnippet(mockTemplate)).toContain('curl -X POST');
  });

  it('should show <HOSTNAME> and <API_KEY> placeholders when no credentials', () => {
    const result = generateCurlSnippet(mockTemplate);
    expect(result).toContain('<HOSTNAME>');
    expect(result).toContain('<API_KEY>');
  });
});

describe('generateNodeSnippet', () => {
  it('should return a string', () => {
    expect(typeof generateNodeSnippet(mockTemplate)).toBe('string');
  });

  it('should contain the model name from the template', () => {
    expect(generateNodeSnippet(mockTemplate)).toContain('test-model');
  });

  it('should contain import OpenAI', () => {
    expect(generateNodeSnippet(mockTemplate)).toContain('import OpenAI');
  });

  it('should show <HOSTNAME> and <API_KEY> placeholders when no credentials', () => {
    const result = generateNodeSnippet(mockTemplate);
    expect(result).toContain('<HOSTNAME>');
    expect(result).toContain('<API_KEY>');
  });
});

describe('generateGoSnippet', () => {
  it('should return a string', () => {
    expect(typeof generateGoSnippet(mockTemplate)).toBe('string');
  });

  it('should contain the model name from the template', () => {
    expect(generateGoSnippet(mockTemplate)).toContain('test-model');
  });

  it('should contain package main', () => {
    expect(generateGoSnippet(mockTemplate)).toContain('package main');
  });

  it('should show <HOSTNAME> and <API_KEY> placeholders when no credentials', () => {
    const result = generateGoSnippet(mockTemplate);
    expect(result).toContain('<HOSTNAME>');
    expect(result).toContain('<API_KEY>');
  });
});

describe('generatePythonSnippet', () => {
  it('should return a string', () => {
    expect(typeof generatePythonSnippet(mockTemplate)).toBe('string');
  });

  it('should contain the model name from the template', () => {
    expect(generatePythonSnippet(mockTemplate)).toContain('test-model');
  });

  it('should contain from openai import OpenAI', () => {
    expect(generatePythonSnippet(mockTemplate)).toContain('from openai import OpenAI');
  });

  it('should show <HOSTNAME> and <API_KEY> placeholders when no credentials', () => {
    const result = generatePythonSnippet(mockTemplate);
    expect(result).toContain('<HOSTNAME>');
    expect(result).toContain('<API_KEY>');
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
    const result = fn(mockTemplate, mockCredentials);
    expect(result).toContain('ogx.example.com');
    expect(result).toContain('sk-test-key-123');
    expect(result).not.toContain('<HOSTNAME>');
    expect(result).not.toContain('<API_KEY>');
  });

  it.each(generators)(
    'should use placeholders when credentials are undefined for $name',
    ({ fn }) => {
      const result = fn(mockTemplate);
      expect(result).toContain('<HOSTNAME>');
      expect(result).toContain('<API_KEY>');
      expect(result).not.toContain('ogx.example.com');
    },
  );

  it('should escape shell metacharacters in curl snippet', () => {
    const adversarial: SnippetCredentials = {
      hostname: 'host"$(whoami)`id`.com',
      apiKey: 'key"$(cmd)`run`',
    };
    const result = generateCurlSnippet(mockTemplate, adversarial);
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
    const result = generateCurlSnippet(mockTemplate, adversarial);
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
      const result = fn(mockTemplate, adversarial);
      expect(result).not.toContain('<HOSTNAME>');
      expect(result).not.toContain('<API_KEY>');
      expect(result).not.toMatch(/[^\\]"\.evil\.com/);
      expect(result).not.toMatch(/[^\\]"injection/);
    },
  );
});
