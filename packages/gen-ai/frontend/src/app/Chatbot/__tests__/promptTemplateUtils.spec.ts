import {
  extractTemplateVariables,
  substituteTemplateVariables,
} from '~/app/Chatbot/promptTemplateUtils';

describe('extractTemplateVariables', () => {
  it.each([
    ['single variable', 'Hello {{name}}', ['name']],
    [
      'multiple distinct variables',
      '{{greeting}} {{name}}, welcome to {{place}}',
      ['greeting', 'name', 'place'],
    ],
    ['deduplicates repeated variables', '{{topic}} and {{topic}} and {{topic}}', ['topic']],
    ['preserves insertion order after dedup', '{{a}} {{b}} {{a}} {{c}} {{b}}', ['a', 'b', 'c']],
  ])('should handle %s', (_label, input, expected) => {
    expect(extractTemplateVariables(input as string)).toEqual(expected);
  });

  describe('whitespace handling', () => {
    it.each([
      ['leading whitespace', '{{  topic }}'],
      ['trailing whitespace', '{{ topic  }}'],
      ['whitespace on both sides', '{{  topic  }}'],
      ['tabs and mixed whitespace', '{{\ttopic\t}}'],
    ])('should handle %s inside braces', (_label, input) => {
      expect(extractTemplateVariables(input)).toEqual(['topic']);
    });
  });

  describe('variable name patterns', () => {
    it.each([
      ['underscores', '{{user_name}}', ['user_name']],
      ['leading underscore', '{{_private}}', ['_private']],
      ['alphanumeric', '{{item1}} {{item2}}', ['item1', 'item2']],
      [
        'uppercase and mixed case',
        '{{Name}} {{UPPER}} {{camelCase}}',
        ['Name', 'UPPER', 'camelCase'],
      ],
    ])('should accept %s', (_label, input, expected) => {
      expect(extractTemplateVariables(input)).toEqual(expected);
    });
  });

  describe('malformed patterns', () => {
    it.each([
      ['single opening brace', '{name}'],
      ['unclosed double braces', '{{name'],
      ['empty braces', '{{}}'],
      ['braces with only whitespace', '{{   }}'],
      ['variable starting with digit', '{{1invalid}}'],
      ['variable with spaces in name', '{{two words}}'],
      ['special characters', '{{name!}} {{val@ue}} {{a-b}}'],
      ['empty string', ''],
      ['plain text', 'Hello, how are you?'],
    ])('should return [] for %s', (_label, input) => {
      expect(extractTemplateVariables(input)).toEqual([]);
    });

    it('should still extract valid name from triple braces', () => {
      expect(extractTemplateVariables('{{{name}}}')).toEqual(['name']);
    });

    it('should return empty array for null-ish input', () => {
      expect(extractTemplateVariables(undefined as unknown as string)).toEqual([]);
      expect(extractTemplateVariables(null as unknown as string)).toEqual([]);
    });
  });

  describe('real-world templates', () => {
    it.each([
      [
        'MLflow-style system prompt',
        'You are a {{role}} assistant. Summarize the following about {{topic}}: {{content}}',
        ['role', 'topic', 'content'],
      ],
      [
        'multi-line template',
        'You are a helpful assistant.\nThe user wants to know about {{ topic }}.\nPlease respond in {{ language }}.',
        ['topic', 'language'],
      ],
      [
        'mixed valid and invalid patterns',
        '{{valid}} {invalid} {{also_valid}} {{123bad}} {{ good }}',
        ['valid', 'also_valid', 'good'],
      ],
    ])('should extract variables from %s', (_label, input, expected) => {
      expect(extractTemplateVariables(input)).toEqual(expected);
    });
  });
});

describe('substituteTemplateVariables', () => {
  it.each<[string, string, Record<string, string>, string]>([
    ['single variable', 'Hello {{name}}!', { name: 'World' }, 'Hello World!'],
    [
      'multiple distinct variables',
      '{{greeting}} {{name}}',
      { greeting: 'Hi', name: 'Alice' },
      'Hi Alice',
    ],
    [
      'all occurrences of duplicate',
      '{{x}} and {{x}} and {{x}}',
      { x: 'val' },
      'val and val and val',
    ],
    ['whitespace inside braces', '{{ name }}', { name: 'Alice' }, 'Alice'],
    ['unfilled variables with empty string', '{{name}} {{age}}', { name: 'Alice' }, 'Alice '],
    ['empty-string values as empty', '{{name}}', { name: '' }, ''],
    ['all variables when values is empty', '{{name}}', {}, ''],
    ['no variables present unchanged', 'Hello World', { name: 'Alice' }, 'Hello World'],
    ['empty input as empty string', '', { name: 'Alice' }, ''],
  ])('should replace %s', (_label, template, values, expected) => {
    expect(substituteTemplateVariables(template, values)).toBe(expected);
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
