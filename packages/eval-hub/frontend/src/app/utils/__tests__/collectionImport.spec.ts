/* eslint-disable camelcase -- collection definition field names match the EvalHub API contract */
import { mockCollection } from '~/__mocks__/mockCollection';
import {
  applyImportName,
  findImportWarningLine,
  findNameCollision,
  getImportWarnings,
  IMPORT_COLLECTION_TEMPLATE,
  IMPORT_FILE_SIZE_LIMIT,
  isNameConflictError,
  isUnmodifiedTemplate,
  detectImportLanguage,
  parseImportContent,
  proposeUniqueName,
  readFileAsUTF8Text,
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

describe('detectImportLanguage', () => {
  it('should detect JSON objects and arrays', () => {
    expect(detectImportLanguage('{"name": "x"}')).toBe('json');
    expect(detectImportLanguage('  [1, 2]')).toBe('json');
  });

  it('should default to YAML when the content is not recognizable JSON', () => {
    expect(detectImportLanguage('name: x')).toBe('yaml');
    expect(detectImportLanguage('')).toBe('yaml');
    expect(detectImportLanguage('   ')).toBe('yaml');
  });
});

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

  it('should recover a YAML flow mapping that is not strict JSON', () => {
    const result = parseImportContent(
      '{name: flow-suite, domains: [software], benchmarks: [{id: a, provider_id: b}]}',
    );
    expect(result.error).toBeUndefined();
    expect(result.doc?.name).toBe('flow-suite');
    expect(result.documentCount).toBe(1);
  });

  it('should report the language of the parser that accepted the content', () => {
    expect(parseImportContent('{"name": "x"}').language).toBe('json');
    // Brace-leading content recovered through the YAML fallback is YAML.
    expect(parseImportContent('{name: x}').language).toBe('yaml');
    expect(parseImportContent('name: x').language).toBe('yaml');
    expect(parseImportContent('{"name": "x",').language).toBeUndefined();
  });

  it('should parse a document that is indented as a whole', () => {
    const result = parseImportContent('  name: indented\n  domains:\n    - software\n');
    expect(result.error).toBeUndefined();
    expect(result.doc?.name).toBe('indented');
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

  it('should not shift the error line when content has trailing blank lines', () => {
    const result = parseImportContent('name: broken\n  bad_indent: true\n\n\n\n\n');
    expect(result.errorLine).toBe(2);
  });

  it('should reject content over the size limit', () => {
    const result = parseImportContent(`name: ${'a'.repeat(IMPORT_FILE_SIZE_LIMIT)}`);
    expect(result.error).toBe('Content exceeds the 1 MiB size limit');
    expect(result.doc).toBeNull();
  });

  it('should reject content whose UTF-8 byte length exceeds the size limit', () => {
    // 'é' encodes to two UTF-8 bytes, so the byte length passes the limit
    // while the UTF-16 code-unit length stays under it.
    const result = parseImportContent(`name: ${'é'.repeat(IMPORT_FILE_SIZE_LIMIT / 2 + 1)}`);
    expect(result.error).toBe('Content exceeds the 1 MiB size limit');
    expect(result.doc).toBeNull();
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
    const second = validYAML.replace('release-gate-safety', 'second-collection');
    const result = parseImportContent(`${validYAML}\n---\n${second}\n`);
    expect(result.error).toBeUndefined();
    expect(result.documentCount).toBe(2);
    expect(result.doc?.name).toBe('release-gate-safety');
  });

  it('should reject a null first document even when a later document is valid', () => {
    const result = parseImportContent('---\n---\nname: second\n');
    expect(result.error).toBe('No collection definition found in file');
    expect(result.doc).toBeNull();
  });
});

describe('getImportWarnings', () => {
  it('should warn about a missing description', () => {
    const warnings = getImportWarnings({ name: 'x', category: 'safety', benchmarks: [] });
    expect(warnings).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining('No description provided') }),
    );
  });

  it('should warn about server-managed and unrecognized collection fields with field anchors', () => {
    const warnings = getImportWarnings({
      name: 'x',
      description: 'd',
      category: 'safety',
      id: 'shipped-1',
      curation_order: 5,
      mystery: true,
      benchmarks: [],
    });
    expect(warnings).toContainEqual({
      message: 'Field "id" is managed by the server and will be ignored.',
      field: 'id',
    });
    expect(warnings).toContainEqual({
      message: 'Field "curation_order" is managed by the server and will be ignored.',
      field: 'curation_order',
    });
    expect(warnings).toContainEqual({
      message: 'Unrecognized field "mystery" will be ignored.',
      field: 'mystery',
    });
  });

  it('should warn about server-managed and unrecognized benchmark fields with benchmark anchors', () => {
    const warnings = getImportWarnings({
      name: 'x',
      description: 'd',
      category: 'safety',
      benchmarks: [{ id: 'quality', provider_id: 'garak', url: 'https://x', mystery: 1 }],
    });
    expect(warnings).toContainEqual({
      message: 'Benchmark "quality": field "url" is managed by the server and will be ignored.',
      benchmarkId: 'quality',
      benchmarkField: 'url',
    });
    expect(warnings).toContainEqual({
      message: 'Benchmark "quality": unrecognized field "mystery" will be ignored.',
      benchmarkId: 'quality',
      benchmarkField: 'mystery',
    });
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

describe('findImportWarningLine', () => {
  const text = [
    'name: warn-me',
    'category: safety',
    'mystery: 1',
    'benchmarks:',
    '  - id: quality',
    '    provider_id: garak',
    '    url: https://example.com',
    '  - id: other',
    '    provider_id: garak',
    '    weight: 1',
  ].join('\n');
  const lines = text.split('\n');

  it('should resolve a top-level field to its own line', () => {
    expect(findImportWarningLine(lines, { message: 'mystery', field: 'mystery' })).toBe(3);
  });

  it('should resolve a benchmark field to its line within the benchmark entry', () => {
    expect(
      findImportWarningLine(lines, {
        message: 'url',
        benchmarkId: 'quality',
        benchmarkField: 'url',
      }),
    ).toBe(7);
  });

  it('should not resolve a benchmark field against a later benchmark entry', () => {
    // "weight" only exists under the "other" entry; a warning scoped to
    // "quality" falls back to quality's id line instead.
    expect(
      findImportWarningLine(lines, {
        message: 'weight',
        benchmarkId: 'quality',
        benchmarkField: 'weight',
      }),
    ).toBe(5);
  });

  it('should resolve a benchmark-scoped warning without a field to the benchmark id line', () => {
    expect(findImportWarningLine(lines, { message: 'benchmark', benchmarkId: 'other' })).toBe(8);
  });

  it('should fall back to line 1 for file-level warnings or unresolvable anchors', () => {
    expect(findImportWarningLine(lines, { message: 'no description' })).toBe(1);
    expect(findImportWarningLine(lines, { message: 'missing', field: 'absent-field' })).toBe(1);
    expect(findImportWarningLine(lines, { message: 'missing', benchmarkId: 'not-there' })).toBe(1);
  });

  const jsonLines = [
    '{',
    '  "name": "warn-me",',
    '  "id": "top-level-id",',
    '  "mystery": 1,',
    '  "benchmarks": [',
    '    {',
    '      "id": "quality",',
    '      "provider_id": "garak",',
    '      "url": "https://example.com"',
    '    }',
    '  ]',
    '}',
  ];

  it('should resolve a top-level field in pretty-printed JSON to its own line', () => {
    expect(findImportWarningLine(jsonLines, { message: 'mystery', field: 'mystery' })).toBe(4);
  });

  it('should prefer the shallowest quoted match when a field name repeats nested', () => {
    expect(findImportWarningLine(jsonLines, { message: 'id', field: 'id' })).toBe(3);
  });

  it('should resolve a benchmark id and benchmark field in pretty-printed JSON', () => {
    expect(findImportWarningLine(jsonLines, { message: 'b', benchmarkId: 'quality' })).toBe(7);
    expect(
      findImportWarningLine(jsonLines, {
        message: 'url',
        benchmarkId: 'quality',
        benchmarkField: 'url',
      }),
    ).toBe(9);
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
  // Freeze the clock so the expected suffix cannot drift across UTC midnight
  // between test registration and execution.
  const fixedTime = new Date('2026-01-15T12:00:00Z');
  const today = fixedTime.toISOString().slice(0, 10);

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedTime);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

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

  it('should preserve an anchor on the name value so aliases stay defined', () => {
    const text = 'name: &n old\ndescription: *n\n';
    const result = applyImportName(text, 'renamed');
    expect(result).toBe('name: &n renamed\ndescription: *n\n');
    expect(parseImportContent(result).doc).toEqual({ name: 'renamed', description: 'renamed' });
  });

  it('should not replace indented benchmark name fields', () => {
    const text = 'name: top\nbenchmarks:\n  - id: x\n    name: nested\n';
    const result = applyImportName(text, 'renamed');
    expect(result).toContain('name: renamed');
    expect(result).toContain('name: nested');
  });

  it('should rename an indented root mapping without corrupting the document', () => {
    const text = '  name: old\n  domains: [software]\n';
    const result = applyImportName(text, 'renamed');
    expect(result).toBe('  name: renamed\n  domains: [software]\n');
    expect(parseImportContent(result).doc).toEqual({ name: 'renamed', domains: ['software'] });
  });

  it('should insert a name at an indented root mapping without corrupting the document', () => {
    const text = '  domains: [software]\n';
    const result = applyImportName(text, 'inserted');
    expect(result).toBe('  name: inserted\n  domains: [software]\n');
    expect(parseImportContent(result).doc).toEqual({ name: 'inserted', domains: ['software'] });
  });

  it('should replace a multi-line name entry in an indented root without swallowing siblings', () => {
    const text = '  name: >\n    folded\n  domains: [software]\n';
    const result = applyImportName(text, 'renamed');
    expect(result).toBe('  name: renamed\n  domains: [software]\n');
    expect(parseImportContent(result).doc).toEqual({ name: 'renamed', domains: ['software'] });
  });

  it('should not rewrite a name that only exists in a later document', () => {
    const text = 'description: first\n---\nname: second-doc\n';
    const result = applyImportName(text, 'renamed');
    expect(result).toContain('name: renamed');
    expect(result).toContain('name: second-doc');
    expect(parseImportContent(result).doc?.name).toBe('renamed');
  });

  it('should not rewrite a flow-mapping name that only exists in a later document', () => {
    const text = '{domains: [software]}\n---\n{name: second-doc}';
    const result = applyImportName(text, 'renamed');
    expect(result).toContain('name: second-doc');
    expect(parseImportContent(result).doc?.name).toBe('renamed');
  });

  it('should not rewrite a name that only exists in a later document after a comment-bearing marker', () => {
    const text = 'description: first\n--- # second\nname: second-doc\n';
    const result = applyImportName(text, 'renamed');
    expect(result).toContain('name: renamed');
    expect(result).toContain('name: second-doc');
    expect(parseImportContent(result).doc?.name).toBe('renamed');
  });

  it('should treat a marker with content on its line as a document boundary', () => {
    const text = 'description: first\n--- name: second-doc\n';
    const result = applyImportName(text, 'renamed');
    expect(result).toContain('name: renamed');
    expect(result).toContain('name: second-doc');
    expect(parseImportContent(result).doc?.name).toBe('renamed');
  });

  it('should replace an escaped JSON name key without inserting a duplicate', () => {
    const result = applyImportName('{"\\u006eame": "old", "domains": ["x"]}', 'renamed');
    expect(JSON.parse(result)).toEqual({ name: 'renamed', domains: ['x'] });
  });

  it('should replace a double-quoted name key without creating a duplicate', () => {
    const text = '"name": old\ndomains: [software]\n';
    const result = applyImportName(text, 'renamed');
    expect(result).toBe('name: renamed\ndomains: [software]\n');
    expect(parseImportContent(result).doc?.name).toBe('renamed');
  });

  it('should replace a single-quoted name key without creating a duplicate', () => {
    const text = "'name': old\ndomains: [software]\n";
    const result = applyImportName(text, 'renamed');
    expect(result).toBe('name: renamed\ndomains: [software]\n');
    expect(parseImportContent(result).doc?.name).toBe('renamed');
  });

  it('should replace a quoted name key with a multi-line value', () => {
    const text = '"name": >\n  original\ndomains: [software]\n';
    expect(applyImportName(text, 'renamed')).toBe('name: renamed\ndomains: [software]\n');
  });

  it('should replace a name key with a space before the colon', () => {
    const text = 'name : old\ndomains: [software]\n';
    expect(applyImportName(text, 'renamed')).toBe('name: renamed\ndomains: [software]\n');
  });

  it('should replace a multi-line YAML name entry including its continuation lines', () => {
    const text = 'name: >\n  folded-name\ndescription: kept\n';
    expect(applyImportName(text, 'renamed')).toBe('name: renamed\ndescription: kept\n');
  });

  it('should remove blank lines inside a multi-line name entry', () => {
    const text = 'name: >\n\n  folded-name\n\ndomains:\n  - x\n';
    expect(applyImportName(text, 'renamed')).toBe('name: renamed\n\ndomains:\n  - x\n');
  });

  it('should preserve blank lines separating the name entry from other fields', () => {
    const text = 'name: old\n\ndescription: kept\n';
    expect(applyImportName(text, 'renamed')).toBe('name: renamed\n\ndescription: kept\n');
  });

  it('should replace only the top-level name value in JSON content', () => {
    const result = applyImportName('{"name": "old", "domains": ["x"]}', 'renamed');
    expect(result).toBe('{"name": "renamed", "domains": ["x"]}');
  });

  it('should rewrite the last of duplicate JSON name keys, matching the parser', () => {
    const result = applyImportName('{"name": "first", "name": "last"}', 'renamed');
    expect(result).toBe('{"name": "first", "name": "renamed"}');
    expect(JSON.parse(result)).toEqual({ name: 'renamed' });
  });

  it('should preserve JSON values that do not survive a numeric round-trip', () => {
    const text = '{"name": "old", "parameters": {"id": 9007199254740993}}';
    expect(applyImportName(text, 'renamed')).toBe(
      '{"name": "renamed", "parameters": {"id": 9007199254740993}}',
    );
  });

  it('should not replace nested JSON name keys or name-like string values', () => {
    const text = '{"name": "old", "benchmarks": [{"name": "nested"}], "note": "name: decoy"}';
    const result = applyImportName(text, 'renamed');
    expect(JSON.parse(result)).toEqual({
      name: 'renamed',
      benchmarks: [{ name: 'nested' }],
      note: 'name: decoy',
    });
  });

  it('should replace a non-string JSON name value', () => {
    const result = applyImportName('{"name": 123, "domains": ["x"]}', 'renamed');
    expect(JSON.parse(result)).toEqual({ name: 'renamed', domains: ['x'] });
  });

  it('should add a name property to JSON content that has none', () => {
    const result = applyImportName('{"domains": ["x"]}', 'renamed');
    expect(JSON.parse(result)).toEqual({ domains: ['x'], name: 'renamed' });
  });

  it('should add a name property to an empty JSON object', () => {
    expect(applyImportName('{}', 'renamed')).toBe('{"name": "renamed"}');
  });

  it('should replace the name in a YAML flow mapping', () => {
    const result = applyImportName('{name: old, domains: [software]}', 'renamed');
    expect(result).toBe('{name: "renamed", domains: [software]}');
    expect(parseImportContent(result).doc?.name).toBe('renamed');
  });

  it('should replace a flow-mapping name value that contains spaces', () => {
    const result = applyImportName('{name: old suite, domains: [software]}', 'renamed suite');
    expect(result).toBe('{name: "renamed suite", domains: [software]}');
    expect(parseImportContent(result).doc?.name).toBe('renamed suite');
  });

  it('should replace a flow-mapping name value that contains an apostrophe', () => {
    const result = applyImportName("{name: team's suite, domains: [software]}", 'renamed');
    expect(result).toBe('{name: "renamed", domains: [software]}');
    expect(parseImportContent(result).doc?.name).toBe('renamed');
  });

  it('should replace the name when a nested plain flow scalar contains an apostrophe', () => {
    const result = applyImportName("{benchmarks: [{note: it's broken}], name: old}", 'renamed');
    expect(result).toBe('{benchmarks: [{note: it\'s broken}], name: "renamed"}');
    expect(parseImportContent(result).doc?.name).toBe('renamed');
  });

  it('should leave a flow mapping unchanged when the name cannot be replaced in place', () => {
    const text = "{name: 'unclosed}";
    expect(applyImportName(text, 'renamed')).toBe(text);
  });

  it('should add a name to a YAML flow mapping that has none', () => {
    const result = applyImportName('{domains: [software]}', 'renamed');
    expect(result).toBe('{"name": "renamed",domains: [software]}');
    expect(parseImportContent(result).doc?.name).toBe('renamed');
  });

  it('should not rewrite a name key that only exists in a comment', () => {
    const text = '{domains: [software], # name: old\n description: d}';
    const result = applyImportName(text, 'renamed');
    expect(parseImportContent(result).doc).toEqual({
      name: 'renamed',
      domains: ['software'],
      description: 'd',
    });
  });

  it('should preserve a trailing comment when replacing a flow name value', () => {
    const text = '{name: old # keep this\n, domains: [software]}';
    const result = applyImportName(text, 'renamed');
    expect(result).toBe('{name: "renamed" # keep this\n, domains: [software]}');
    expect(parseImportContent(result).doc).toEqual({ name: 'renamed', domains: ['software'] });
  });

  it('should replace the name in a flow mapping preceded by a document marker', () => {
    const text = '---\n{name: old, domains: [software], benchmarks: [{id: a, provider_id: b}]}';
    const result = applyImportName(text, 'renamed');
    expect(result).toBe(
      '---\n{name: "renamed", domains: [software], benchmarks: [{id: a, provider_id: b}]}',
    );
    expect(parseImportContent(result).doc?.name).toBe('renamed');
  });

  it('should replace the name in a flow mapping preceded by a comment', () => {
    const text = '# Example collection format\n{name: old, domains: [software]}';
    const result = applyImportName(text, 'renamed');
    expect(result).toBe('# Example collection format\n{name: "renamed", domains: [software]}');
    expect(parseImportContent(result).doc?.name).toBe('renamed');
  });

  it('should preserve leading comments when replacing the name', () => {
    const text = '# Example collection format\n\nname: old\ndescription: kept\n';
    expect(applyImportName(text, 'new')).toBe(
      '# Example collection format\n\nname: new\ndescription: kept\n',
    );
  });

  it('should treat an indented leading comment as a comment, not root content', () => {
    const text = '  # header\nname: old\ndomains: [software]\n';
    const result = applyImportName(text, 'renamed');
    expect(result).toBe('  # header\nname: renamed\ndomains: [software]\n');
    expect(parseImportContent(result).doc).toEqual({ name: 'renamed', domains: ['software'] });
  });

  it('should insert a name at the root when an indented comment precedes unnamed content', () => {
    const text = '  # header\ndomains: [software]\n';
    const result = applyImportName(text, 'inserted');
    expect(result).toBe('  # header\nname: inserted\ndomains: [software]\n');
    expect(parseImportContent(result).doc).toEqual({ name: 'inserted', domains: ['software'] });
  });

  it('should replace the name in a flow mapping preceded by an indented comment', () => {
    const text = '  # header\n{name: old, domains: [software]}';
    const result = applyImportName(text, 'renamed');
    expect(result).toBe('  # header\n{name: "renamed", domains: [software]}');
    expect(parseImportContent(result).doc?.name).toBe('renamed');
  });

  it('should insert a name after the leading comment block when one is missing', () => {
    const text = '# Example collection format\n\ndescription: kept\n';
    expect(applyImportName(text, 'inserted')).toBe(
      '# Example collection format\n\nname: inserted\ndescription: kept\n',
    );
  });

  it('should insert a name into empty content', () => {
    expect(applyImportName('', 'inserted')).toBe('name: inserted\n');
  });

  it('should insert a name inside the first document when content begins with a marker', () => {
    const text = '---\ndescription: kept\nbenchmarks:\n  - id: arc_easy\n';
    expect(applyImportName(text, 'inserted')).toBe(
      '---\nname: inserted\ndescription: kept\nbenchmarks:\n  - id: arc_easy\n',
    );
  });

  it('should insert a name inside the first document when the leading marker carries a comment', () => {
    const text = '--- # top\ndescription: kept\n';
    expect(applyImportName(text, 'inserted')).toBe(
      '--- # top\nname: inserted\ndescription: kept\n',
    );
  });

  it('should insert a name inside the first document when the marker comment has no leading space', () => {
    const text = '---# top\ndescription: kept\n';
    expect(applyImportName(text, 'inserted')).toBe('---# top\nname: inserted\ndescription: kept\n');
  });

  it('should replace the name in a flow mapping preceded by a comment-bearing marker', () => {
    const text = '--- # top\n{name: old, domains: [software]}';
    const result = applyImportName(text, 'renamed');
    expect(result).toBe('--- # top\n{name: "renamed", domains: [software]}');
    expect(parseImportContent(result).doc?.name).toBe('renamed');
  });

  it('should replace the name in a flow mapping on the marker line', () => {
    const text = '--- {name: old, domains: [software]}';
    const result = applyImportName(text, 'renamed');
    expect(result).toBe('--- {name: "renamed", domains: [software]}');
    expect(parseImportContent(result).doc?.name).toBe('renamed');
  });

  it('should round-trip a marker-led definition, preserving benchmarks and description', () => {
    const text = '---\ndescription: kept\nbenchmarks:\n  - id: arc_easy\n';
    const { doc, documentCount, error } = parseImportContent(applyImportName(text, 'inserted'));
    expect(error).toBeUndefined();
    expect(documentCount).toBe(1);
    expect(doc).toEqual({
      name: 'inserted',
      description: 'kept',
      benchmarks: [{ id: 'arc_easy' }],
    });
  });

  it('should not insert an empty name when the definition has none', () => {
    const text = 'description: kept\n';
    expect(applyImportName(text, '   ')).toBe(text);
  });

  it('should insert a name containing dollar sequences literally', () => {
    const text = 'name: old\ndescription: kept\n';
    expect(applyImportName(text, 'my-$&-collection')).toBe(
      'name: my-$&-collection\ndescription: kept\n',
    );
  });

  it('should quote names that would otherwise break the YAML', () => {
    const result = applyImportName('name: old\ndescription: kept\n', 'a: b # c');
    expect(parseImportContent(result).doc?.name).toBe('a: b # c');
  });
});

describe('readFileAsUTF8Text', () => {
  it('should read a UTF-8 file as text', async () => {
    const file = new File(['name: x\n'], 'a.yaml', { type: 'text/yaml' });
    await expect(readFileAsUTF8Text(file)).resolves.toBe('name: x\n');
  });

  it('should accept a file containing a literal replacement character', async () => {
    const file = new File(['name: �\n'], 'a.yaml', { type: 'text/yaml' });
    await expect(readFileAsUTF8Text(file)).resolves.toBe('name: �\n');
  });

  it('should reject a file with invalid UTF-8 bytes', async () => {
    const file = new File([new Uint8Array([0x6e, 0xff, 0xfe])], 'a.yaml');
    await expect(readFileAsUTF8Text(file)).rejects.toThrow('does not appear to be UTF-8');
  });

  it('should reject a UTF-16 file by its BOM', async () => {
    const file = new File([new Uint8Array([0xff, 0xfe, 0x6e, 0x00, 0x61, 0x00])], 'a.yaml');
    await expect(readFileAsUTF8Text(file)).rejects.toThrow('UTF-16');
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

  it('should start with the example comment line', () => {
    expect(IMPORT_COLLECTION_TEMPLATE.startsWith('# Example collection format\n\nname: ')).toBe(
      true,
    );
  });
});

describe('isUnmodifiedTemplate', () => {
  it('should match the parsed template', () => {
    const { doc } = parseImportContent(IMPORT_COLLECTION_TEMPLATE);
    expect(isUnmodifiedTemplate(doc ?? {})).toBe(true);
  });

  it('should match a semantically identical definition regardless of format or key order', () => {
    const { doc } = parseImportContent(
      JSON.stringify({
        benchmarks: [
          {
            pass_criteria: { threshold: 0.25 },
            primary_score: { metric: 'acc_norm', lower_is_better: false },
            weight: 1.0,
            provider_id: 'lm_evaluation_harness',
            id: 'arc_easy',
          },
        ],
        domains: ['knowledge_and_reasoning'],
        description: 'A short description of what this collection evaluates.\n',
        name: 'my-collection',
      }),
    );
    expect(isUnmodifiedTemplate(doc ?? {})).toBe(true);
  });

  it('should not match a renamed definition', () => {
    const { doc } = parseImportContent(applyImportName(IMPORT_COLLECTION_TEMPLATE, 'renamed'));
    expect(isUnmodifiedTemplate(doc ?? {})).toBe(false);
  });

  it('should not match a definition with changed content', () => {
    const { doc } = parseImportContent(validYAML);
    expect(isUnmodifiedTemplate(doc ?? {})).toBe(false);
  });
});
