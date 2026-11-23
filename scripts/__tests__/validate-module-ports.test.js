const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { parseModuleRegistryContent, validateProductionPorts } = require('../validate-module-ports');

const registry = (body) =>
  [
    'package controller',
    '',
    'var moduleRegistry = map[string]ModuleDefinition{',
    ...body,
    '}',
    '',
  ].join('\n');

describe('parseModuleRegistryContent', () => {
  it('extracts every module and its numeric Port', () => {
    const { entries, errors } = parseModuleRegistryContent(
      registry([
        '\t"modelRegistry": {',
        '\t\tName:          "modelRegistry",',
        '\t\tPort:          8043,',
        '\t\tInterBFFDeps: []interBFFDependency{{',
        '\t\t\tEnvServicePort: "BFF_MAAS_SERVICE_PORT",',
        '\t\t}},',
        '\t},',
        '\t"genAi": {',
        '\t\tPort: 8143,',
        '\t},',
      ]),
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(entries, [
      { name: 'modelRegistry', port: 8043 },
      { name: 'genAi', port: 8143 },
    ]);
  });

  it('keeps duplicate ports so the caller can report the conflict', () => {
    const { entries, errors } = parseModuleRegistryContent(
      registry(['\t"a": {', '\t\tPort: 8043,', '\t},', '\t"b": {', '\t\tPort: 8043,', '\t},']),
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(
      entries.map((e) => e.port),
      [8043, 8043],
    );
  });

  it('fails when the registry declaration is missing', () => {
    const { errors } = parseModuleRegistryContent('package controller\n');
    assert.equal(errors.length, 1);
    assert.match(errors[0], /not found/);
  });

  it('fails when the registry is empty', () => {
    const { errors } = parseModuleRegistryContent(registry([]));
    assert.deepEqual(errors, ['moduleRegistry has no entries']);
  });

  it('fails when an entry has a non-literal Port', () => {
    const { entries, errors } = parseModuleRegistryContent(
      registry([
        '\t"a": {',
        '\t\tPort: servicePort,',
        '\t},',
        '\t"b": {',
        '\t\tPort: 8143,',
        '\t},',
      ]),
    );
    assert.deepEqual(entries, [{ name: 'b', port: 8143 }]);
    assert.deepEqual(errors, [
      'module "a" has a Port value "servicePort" that is not a plain decimal literal',
    ]);
  });

  it('rejects Go integer literals that are not plain decimal', () => {
    const { entries, errors } = parseModuleRegistryContent(
      registry([
        '\t"a": {Port: 017553},',
        '\t"b": {Port: 8043},',
        '\t"c": {Port: 0x1F6B},',
        '\t"d": {Port: 8_143},',
      ]),
    );
    assert.deepEqual(entries, [{ name: 'b', port: 8043 }]);
    assert.deepEqual(errors, [
      'module "a" has a Port value "017553" that is not a plain decimal literal',
      'module "c" has a Port value "0x1F6B" that is not a plain decimal literal',
      'module "d" has a Port value "8_143" that is not a plain decimal literal',
    ]);
    assert.equal(validateProductionPorts({ entries, errors }), true);
  });

  it('fails when an entry has no Port field', () => {
    const { errors } = parseModuleRegistryContent(
      registry(['\t"a": {', '\t\tName: "a",', '\t},', '\t"b": {', '\t\tPort: 8143,', '\t},']),
    );
    assert.deepEqual(errors, ['module "a" has no numeric Port field']);
  });

  it('fails when the registry literal is not terminated', () => {
    const { errors } = parseModuleRegistryContent(
      'var moduleRegistry = map[string]ModuleDefinition{\n\t"a": {\n\t\tPort: 8043,\n',
    );
    assert.ok(errors.includes('moduleRegistry literal is not terminated'));
  });

  it('parses explicitly typed entries, so their duplicate ports are still checked', () => {
    const { entries, errors } = parseModuleRegistryContent(
      registry([
        '\t"a": {',
        '\t\tPort: 8043,',
        '\t},',
        '\t"b": ModuleDefinition{',
        '\t\tPort: 8043,',
        '\t},',
      ]),
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(entries, [
      { name: 'a', port: 8043 },
      { name: 'b', port: 8043 },
    ]);
    assert.equal(validateProductionPorts({ entries, errors }), true);
  });

  it('fails on top-level entry forms it does not understand', () => {
    const { errors } = parseModuleRegistryContent(
      registry([
        '\tmodelRegistryKey: {',
        '\t\tPort: 8043,',
        '\t},',
        '\t"b": {',
        '\t\tPort: 8143,',
        '\t},',
      ]),
    );
    assert.deepEqual(errors, ['unsupported moduleRegistry entry form: modelRegistryKey: {']);
  });

  it('parses space-indented entries, so their duplicate ports are still checked', () => {
    const { entries, errors } = parseModuleRegistryContent(
      registry([
        '\t"a": {',
        '\t\tPort: 8043,',
        '\t},',
        '    "b": {',
        '        Port: 8043,',
        '    },',
      ]),
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(
      entries.map((e) => e.name),
      ['a', 'b'],
    );
    assert.equal(validateProductionPorts({ entries, errors }), true);
  });

  it('parses single-line entries', () => {
    const { entries, errors } = parseModuleRegistryContent(
      registry(['\t"a": {Name: "a", Port: 8043},', '\t"b": {', '\t\tPort: 8143,', '\t},']),
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(entries, [
      { name: 'a', port: 8043 },
      { name: 'b', port: 8143 },
    ]);
  });

  it('parses several entries sharing one line', () => {
    const { entries, errors } = parseModuleRegistryContent(
      registry(['\t"a": {Port: 8043}, "b": {Port: 8043},', '\t"c": {', '\t\tPort: 8143,', '\t},']),
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(
      entries.map((e) => e.name),
      ['a', 'b', 'c'],
    );
    assert.equal(validateProductionPorts({ entries, errors }), true);
  });

  it('parses entries on the declaration line and on the closing-brace line', () => {
    const { entries, errors } = parseModuleRegistryContent(
      'var moduleRegistry = map[string]ModuleDefinition{"a": {Port: 8043},\n"b": {Port: 8143},\n"c": {Port: 8043}}\n',
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(
      entries.map((e) => e.name),
      ['a', 'b', 'c'],
    );
    assert.equal(validateProductionPorts({ entries, errors }), true);
  });

  it('ignores braces inside block comments, so later duplicates are still checked', () => {
    const { entries, errors } = parseModuleRegistryContent(
      registry([
        '\t"a": {',
        '\t\tPort: 8043,',
        '\t},',
        '\t/* } closing brace in a comment */',
        '\t/*',
        '\t}',
        '\t*/',
        '\t"b": {',
        '\t\tPort: 8043, // trailing } comment',
        '\t\tName: "has } and /* in a string",',
        '\t},',
      ]),
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(
      entries.map((e) => e.name),
      ['a', 'b'],
    );
    assert.equal(validateProductionPorts({ entries, errors }), true);
  });

  it('ignores a commented-out example registry above the live declaration', () => {
    const content = [
      'package controller',
      '',
      '/* Example:',
      'var moduleRegistry = map[string]ModuleDefinition{',
      '\t"example": {',
      '\t\tPort: 9999,',
      '\t},',
      '}',
      '*/',
      '',
      '// var moduleRegistry = map[string]ModuleDefinition{"other": {Port: 1}}',
      'var moduleRegistry = map[string]ModuleDefinition{',
      '\t"a": {',
      '\t\tPort: 8043,',
      '\t},',
      '\t"b": {',
      '\t\tPort: 8043,',
      '\t},',
      '}',
      '',
    ].join('\n');
    const { entries, errors } = parseModuleRegistryContent(content);
    assert.deepEqual(errors, []);
    assert.deepEqual(
      entries.map((e) => [e.name, e.port]),
      [
        ['a', 8043],
        ['b', 8043],
      ],
    );
  });

  it('ignores an example registry inside a raw string literal', () => {
    const content = [
      'package controller',
      '',
      'const example = `',
      'var moduleRegistry = map[string]ModuleDefinition{',
      '\t"example": {',
      '\t\tPort: 9999,',
      '\t},',
      '}',
      '`',
      '',
      'var moduleRegistry = map[string]ModuleDefinition{',
      '\t"a": {',
      '\t\tPort: 8043,',
      '\t},',
      '\t"b": {',
      '\t\tPort: 8043,',
      '\t},',
      '}',
      '',
    ].join('\n');
    const { entries, errors } = parseModuleRegistryContent(content);
    assert.deepEqual(errors, []);
    assert.deepEqual(
      entries.map((e) => [e.name, e.port]),
      [
        ['a', 8043],
        ['b', 8043],
      ],
    );
  });

  it('fails on an unterminated block comment', () => {
    const { errors } = parseModuleRegistryContent(
      registry(['\t"a": {', '\t\tPort: 8043,', '\t},', '\t/* never closed']),
    );
    assert.deepEqual(errors, ['moduleRegistry contains an unterminated block comment']);
  });

  it('ignores Port fields nested deeper than the entry', () => {
    const { entries, errors } = parseModuleRegistryContent(
      registry([
        '\t"a": {',
        '\t\tInterBFFDeps: []interBFFDependency{{',
        '\t\t\tPort: 9999,',
        '\t\t}},',
        '\t\tPort: 8043,',
        '\t},',
      ]),
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(entries, [{ name: 'a', port: 8043 }]);
  });

  it('ignores comments between entries', () => {
    const { entries, errors } = parseModuleRegistryContent(
      registry(['\t// first module', '\t"a": {', '\t\tPort: 8043,', '\t},']),
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(entries, [{ name: 'a', port: 8043 }]);
  });
});

describe('validateProductionPorts', () => {
  const quiet = (fn) => {
    const { log, error } = console;
    console.log = () => undefined;
    console.error = () => undefined;
    try {
      return fn();
    } finally {
      console.log = log;
      console.error = error;
    }
  };

  it('passes for unique ports with no parse errors', () => {
    const result = quiet(() =>
      validateProductionPorts({
        entries: [
          { name: 'a', port: 8043 },
          { name: 'b', port: 8143 },
        ],
        errors: [],
      }),
    );
    assert.equal(result, false);
  });

  it('fails on duplicate production ports', () => {
    const result = quiet(() =>
      validateProductionPorts({
        entries: [
          { name: 'a', port: 8043 },
          { name: 'b', port: 8043 },
        ],
        errors: [],
      }),
    );
    assert.equal(result, true);
  });

  it('fails when the registry could not be fully read', () => {
    const result = quiet(() =>
      validateProductionPorts({
        entries: [{ name: 'b', port: 8143 }],
        errors: ['module "a" has no numeric Port field'],
      }),
    );
    assert.equal(result, true);
  });
});
