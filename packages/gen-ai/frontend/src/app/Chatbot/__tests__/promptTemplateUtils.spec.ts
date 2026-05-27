import {
  extractTemplateVariables,
  substituteTemplateVariables,
} from '~/app/Chatbot/promptTemplateUtils';

describe('extractTemplateVariables', () => {
  it('should extract a single variable', () => {
    expect(extractTemplateVariables('Hello {{name}}')).toEqual(['name']);
  });

  it('should extract multiple distinct variables', () => {
    expect(extractTemplateVariables('{{greeting}} {{name}}, welcome to {{place}}')).toEqual([
      'greeting',
      'name',
      'place',
    ]);
  });

  it('should deduplicate repeated variables', () => {
    expect(extractTemplateVariables('{{topic}} and {{topic}} and {{topic}}')).toEqual(['topic']);
  });

  it('should preserve insertion order after deduplication', () => {
    expect(extractTemplateVariables('{{a}} {{b}} {{a}} {{c}} {{b}}')).toEqual(['a', 'b', 'c']);
  });

  describe('whitespace handling', () => {
    it('should handle leading whitespace inside braces', () => {
      expect(extractTemplateVariables('{{  topic }}')).toEqual(['topic']);
    });

    it('should handle trailing whitespace inside braces', () => {
      expect(extractTemplateVariables('{{ topic  }}')).toEqual(['topic']);
    });

    it('should handle whitespace on both sides', () => {
      expect(extractTemplateVariables('{{  topic  }}')).toEqual(['topic']);
    });

    it('should handle tabs and mixed whitespace', () => {
      expect(extractTemplateVariables('{{\ttopic\t}}')).toEqual(['topic']);
    });
  });

  describe('variable name patterns', () => {
    it('should accept underscores in variable names', () => {
      expect(extractTemplateVariables('{{user_name}}')).toEqual(['user_name']);
    });

    it('should accept variables starting with underscore', () => {
      expect(extractTemplateVariables('{{_private}}')).toEqual(['_private']);
    });

    it('should accept alphanumeric variable names', () => {
      expect(extractTemplateVariables('{{item1}} {{item2}}')).toEqual(['item1', 'item2']);
    });

    it('should accept uppercase and mixed case', () => {
      expect(extractTemplateVariables('{{Name}} {{UPPER}} {{camelCase}}')).toEqual([
        'Name',
        'UPPER',
        'camelCase',
      ]);
    });
  });

  describe('malformed patterns', () => {
    it('should ignore single opening brace', () => {
      expect(extractTemplateVariables('{name}')).toEqual([]);
    });

    it('should ignore unclosed double braces', () => {
      expect(extractTemplateVariables('{{name')).toEqual([]);
    });

    it('should ignore triple braces', () => {
      expect(extractTemplateVariables('{{{name}}}')).toEqual(['name']);
    });

    it('should ignore empty braces', () => {
      expect(extractTemplateVariables('{{}}')).toEqual([]);
    });

    it('should ignore braces with only whitespace', () => {
      expect(extractTemplateVariables('{{   }}')).toEqual([]);
    });

    it('should ignore variables starting with a digit', () => {
      expect(extractTemplateVariables('{{1invalid}}')).toEqual([]);
    });

    it('should ignore variables with spaces in the name', () => {
      expect(extractTemplateVariables('{{two words}}')).toEqual([]);
    });

    it('should ignore variables with special characters', () => {
      expect(extractTemplateVariables('{{name!}} {{val@ue}} {{a-b}}')).toEqual([]);
    });
  });

  describe('empty and no-variable inputs', () => {
    it('should return empty array for empty string', () => {
      expect(extractTemplateVariables('')).toEqual([]);
    });

    it('should return empty array for plain text', () => {
      expect(extractTemplateVariables('Hello, how are you?')).toEqual([]);
    });

    it('should return empty array for null-ish input', () => {
      expect(extractTemplateVariables(undefined as unknown as string)).toEqual([]);
      expect(extractTemplateVariables(null as unknown as string)).toEqual([]);
    });
  });

  describe('real-world templates', () => {
    it('should extract variables from an MLflow-style system prompt', () => {
      const template =
        'You are a {{role}} assistant. Summarize the following about {{topic}}: {{content}}';
      expect(extractTemplateVariables(template)).toEqual(['role', 'topic', 'content']);
    });

    it('should extract variables from a multi-line template', () => {
      const template = `You are a helpful assistant.
The user wants to know about {{ topic }}.
Please respond in {{ language }}.`;
      expect(extractTemplateVariables(template)).toEqual(['topic', 'language']);
    });

    it('should handle a template mixing valid and invalid patterns', () => {
      const template = '{{valid}} {invalid} {{also_valid}} {{123bad}} {{ good }}';
      expect(extractTemplateVariables(template)).toEqual(['valid', 'also_valid', 'good']);
    });
  });
});

describe('substituteTemplateVariables', () => {
  it('should replace a single variable', () => {
    expect(substituteTemplateVariables('Hello {{name}}!', { name: 'World' })).toBe('Hello World!');
  });

  it('should replace multiple distinct variables', () => {
    const result = substituteTemplateVariables('{{greeting}} {{name}}', {
      greeting: 'Hi',
      name: 'Alice',
    });
    expect(result).toBe('Hi Alice');
  });

  it('should replace all occurrences of a duplicate variable', () => {
    expect(substituteTemplateVariables('{{x}} and {{x}} and {{x}}', { x: 'val' })).toBe(
      'val and val and val',
    );
  });

  it('should handle whitespace inside braces during substitution', () => {
    expect(substituteTemplateVariables('{{ name }}', { name: 'Alice' })).toBe('Alice');
  });

  it('should replace unfilled variables with empty string', () => {
    expect(substituteTemplateVariables('{{name}} {{age}}', { name: 'Alice' })).toBe('Alice ');
  });

  it('should replace variables with empty-string values as empty', () => {
    expect(substituteTemplateVariables('{{name}}', { name: '' })).toBe('');
  });

  it('should replace all variables with empty string when values is empty', () => {
    expect(substituteTemplateVariables('{{name}}', {})).toBe('');
  });

  it('should return original string when no variables present', () => {
    expect(substituteTemplateVariables('Hello World', { name: 'Alice' })).toBe('Hello World');
  });

  it('should return empty string for empty input', () => {
    expect(substituteTemplateVariables('', { name: 'Alice' })).toBe('');
  });

  it('should return empty string for null-ish input', () => {
    expect(substituteTemplateVariables(null as unknown as string, {})).toBe('');
  });

  it('should not mutate the original template', () => {
    const template = 'Hello {{name}}';
    substituteTemplateVariables(template, { name: 'World' });
    expect(template).toBe('Hello {{name}}');
  });

  it('should handle a real-world MLflow prompt substitution', () => {
    const template = 'You are a {{role}} assistant. Summarize {{topic}} in {{language}}.';
    const result = substituteTemplateVariables(template, {
      role: 'technical',
      topic: 'Kubernetes',
      language: 'English',
    });
    expect(result).toBe('You are a technical assistant. Summarize Kubernetes in English.');
  });
});
