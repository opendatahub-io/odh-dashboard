/* eslint-disable camelcase -- collection definition field names match the EvalHub API contract */
import { mockCollection } from '~/__mocks__/mockCollection';
import {
  applyImportName,
  findNameCollision,
  getImportWarnings,
  IMPORT_COLLECTION_TEMPLATE,
  isNameConflictError,
  parseImportContent,
  proposeUniqueName,
} from '~/app/utils/collectionImport';

const validYAML = `
name: release-gate-safety
description: Release-gate collection
domains:
  - knowledge_and_reasoning
benchmarks:
  - id: arc_easy
    provider_id: lm_evaluation_harness
`;

describe('parseImportContent', () => {
  it('should parse a valid YAML document', () => {
    const result = parseImportContent(validYAML);
    expect(result.error).toBeUndefined();
    expect(result.doc).not.toBeNull();
    expect(result.doc?.name).toBe('release-gate-safety');
    expect(result.documentCount).toBe(1);
  });

  it('should parse a valid JSON document', () => {
    const result = parseImportContent(
      '{"name": "json-collection", "domains": ["software"], "benchmarks": [{"id": "a", "provider_id": "b"}]}',
    );
    expect(result.error).toBeUndefined();
    expect(result.doc?.name).toBe('json-collection');
  });

  it('should reject empty or whitespace-only content', () => {
    expect(parseImportContent('   \n\t ').error).toBe('No collection definition found in file');
  });

  it('should reject comment-only YAML', () => {
    expect(parseImportContent('# just a comment\n').error).toBe(
      'No collection definition found in file',
    );
  });

  it('should reject a non-object document', () => {
    expect(parseImportContent('- one\n- two\n').error).toBe(
      'Collection definition must be an object',
    );
  });

  it('should surface the line number of a YAML syntax error', () => {
    const result = parseImportContent('name: broken\n  bad_indent: true\n');
    expect(result.error).toContain('line 2');
    expect(result.errorLine).toBe(2);
    expect(result.doc).toBeNull();
  });

  it('should rebase the error line onto absolute line numbers when content has leading blank lines', () => {
    const result = parseImportContent('\n\nname: broken\n  bad_indent: true\n');
    expect(result.errorLine).toBe(4);
  });

  it('should report invalid JSON', () => {
    const result = parseImportContent('{"name": "x",');
    expect(result.error).toContain('Invalid JSON');
  });

  it('should reject custom YAML tags', () => {
    const result = parseImportContent('name: !evil {}\nbenchmarks: []\n');
    expect(result.error).toContain('Invalid YAML');
  });

  it('should count documents in a multi-document file', () => {
    const result = parseImportContent(`${validYAML}\n---\n${validYAML}\n`);
    expect(result.error).toBeUndefined();
    expect(result.documentCount).toBe(2);
    expect(result.doc?.name).toBe('release-gate-safety');
  });
});

describe('getImportWarnings', () => {
  it('should warn about a missing description', () => {
    const warnings = getImportWarnings({ name: 'x', category: 'safety', benchmarks: [] });
    expect(warnings).toContainEqual(expect.stringContaining('No description provided'));
  });

  it('should warn about server-managed and unrecognized collection fields', () => {
    const warnings = getImportWarnings({
      name: 'x',
      description: 'd',
      category: 'safety',
      id: 'shipped-1',
      curation_order: 5,
      mystery: true,
      benchmarks: [],
    });
    expect(warnings).toContainEqual('Field "id" is managed by the server and will be ignored.');
    expect(warnings).toContainEqual(
      'Field "curation_order" is managed by the server and will be ignored.',
    );
    expect(warnings).toContainEqual('Unrecognized field "mystery" will be ignored.');
  });

  it('should warn about server-managed and unrecognized benchmark fields', () => {
    const warnings = getImportWarnings({
      name: 'x',
      description: 'd',
      category: 'safety',
      benchmarks: [{ id: 'quality', provider_id: 'garak', url: 'https://x', mystery: 1 }],
    });
    expect(warnings).toContainEqual(
      'Benchmark "quality": field "url" is managed by the server and will be ignored.',
    );
    expect(warnings).toContainEqual(
      'Benchmark "quality": unrecognized field "mystery" will be ignored.',
    );
  });

  it('should return no warnings for a clean definition', () => {
    const warnings = getImportWarnings({
      name: 'x',
      description: 'described',
      domains: ['software'],
      benchmarks: [{ id: 'quality', provider_id: 'garak', weight: 1 }],
    });
    expect(warnings).toEqual([]);
  });
});

describe('findNameCollision', () => {
  const collections = [mockCollection({ name: 'Safety Suite' })];

  it('should detect a case-insensitive collision', () => {
    expect(findNameCollision('safety suite', collections)).toBe(collections[0]);
    expect(findNameCollision(' SAFETY SUITE ', collections)).toBe(collections[0]);
  });

  it('should not match a different name', () => {
    expect(findNameCollision('other', collections)).toBeUndefined();
  });
});

describe('proposeUniqueName', () => {
  const today = new Date().toISOString().slice(0, 10);

  it('should propose a date-suffixed name when the base is taken', () => {
    const collections = [mockCollection({ name: 'safety-suite' })];
    expect(proposeUniqueName('safety-suite', collections)).toBe(`safety-suite-${today}`);
  });

  it('should fall back to an incrementing counter when the dated name is taken', () => {
    const collections = [
      mockCollection({ name: 'safety-suite' }),
      mockCollection({ name: `safety-suite-${today}` }),
    ];
    expect(proposeUniqueName('safety-suite', collections)).toBe(`safety-suite-${today}-1`);
  });

  it('should keep the original name when there is no collision', () => {
    const collections = [mockCollection({ name: 'other' })];
    expect(proposeUniqueName('safety-suite', collections)).toBe('safety-suite');
  });
});

describe('applyImportName', () => {
  it('should replace the top-level YAML name line', () => {
    expect(applyImportName(validYAML, 'renamed')).toContain('name: renamed');
    expect(applyImportName(validYAML, 'renamed')).not.toContain('release-gate-safety');
  });

  it('should not replace indented benchmark name fields', () => {
    const text = 'name: top\nbenchmarks:\n  - id: x\n    name: nested\n';
    const result = applyImportName(text, 'renamed');
    expect(result).toContain('name: renamed');
    expect(result).toContain('name: nested');
  });

  it('should re-serialize JSON content', () => {
    const result = applyImportName('{"name": "old", "domains": ["x"]}', 'renamed');
    expect(JSON.parse(result)).toEqual({ name: 'renamed', domains: ['x'] });
  });
});

describe('isNameConflictError', () => {
  it('should match name conflict messages', () => {
    expect(isNameConflictError('collection name already exists')).toBe(true);
    expect(isNameConflictError('A collection with this name may already exist')).toBe(true);
  });

  it('should not match unrelated errors', () => {
    expect(isNameConflictError('provider not found')).toBe(false);
    expect(isNameConflictError('invalid benchmarks')).toBe(false);
  });
});

describe('IMPORT_COLLECTION_TEMPLATE', () => {
  it('should parse as a valid collection definition', () => {
    const result = parseImportContent(IMPORT_COLLECTION_TEMPLATE);
    expect(result.error).toBeUndefined();
    expect(result.doc?.name).toBe('my-collection');
    expect(getImportWarnings(result.doc ?? {})).toEqual([]);
  });
});
