const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { parseModuleRegistryContent } = require('../validate-module-ports');

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
    assert.deepEqual(errors, ['module "a" has a non-literal Port value "servicePort"']);
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
});
