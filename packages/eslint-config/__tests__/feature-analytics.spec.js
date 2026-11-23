const { mkdtempSync, writeFileSync, mkdirSync, rmSync } = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const nativeRequire = createRequire(__filename);
const { ESLint } = nativeRequire('eslint');
const featureAnalytics = require('../feature-analytics');

const ruleId = '@odh-dashboard/no-direct-analytics';

describe('feature analytics config', () => {
  const fixtureRoot = path.join(__dirname, '../__fixtures__');
  mkdirSync(fixtureRoot, { recursive: true });
  const directory = mkdtempSync(path.join(fixtureRoot, 'feature-analytics-'));
  afterAll(() => rmSync(directory, { recursive: true, force: true }));
  let configIndex = 0;
  const makeLinter = (config) => {
    const filename = path.join(directory, `config-${configIndex++}.cjs`);
    writeFileSync(filename, `module.exports = ${JSON.stringify(config)};`);
    return new ESLint({ useEslintrc: false, overrideConfigFile: filename });
  };
  const files = ['src/feature.ts', 'src/extensions.ts', 'src/__tests__/feature.ts'];
  for (const file of files) {
    mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
    writeFileSync(path.join(directory, file), 'export {};');
  }
  writeFileSync(
    path.join(directory, 'tsconfig.json'),
    JSON.stringify({ compilerOptions: { strict: true }, include: ['src'] }),
  );

  it('should preserve inherited and local rules when scoped to migrated files', async () => {
    // Initialize the native ESLint loader before accessing the Rushstack-patched preset.
    await new ESLint().calculateConfigForFile(path.join(__dirname, '../base.js'));
    const shared = nativeRequire('..');
    expect(shared.featureAnalytics).toEqual(featureAnalytics);
    const config = shared.recommendedReactTypescript(directory);
    config.parserOptions = {
      project: path.join(directory, 'tsconfig.json'),
      tsconfigRootDir: directory,
    };
    config.rules['no-restricted-imports'] = ['warn', 'forbidden-module'];
    config.overrides.push({
      files: ['**/__tests__/**'],
      rules: { 'no-restricted-syntax': ['warn', 'DebuggerStatement'] },
    });
    const original = makeLinter(config);
    const guarded = makeLinter({
      ...config,
      overrides: [...config.overrides, { files: ['**/src/**/*.ts'], ...featureAnalytics }],
    });
    for (const file of files) {
      const filePath = path.join(directory, file);
      const before = await original.calculateConfigForFile(filePath);
      expect(before.rules[ruleId]).toBeUndefined();
      const after = await guarded.calculateConfigForFile(filePath);
      for (const name of Object.keys(before.rules)) {
        expect(after.rules[name]).toEqual(before.rules[name]);
      }
      expect(after.rules[ruleId]).toEqual(['error']);
      const [result] = await guarded.lintText("import 'forbidden-module'; window.analytics;", {
        filePath,
      });
      expect(result.fatalErrorCount).toBe(0);
      expect(result.messages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ ruleId: 'no-restricted-imports', severity: 1 }),
          expect.objectContaining({ ruleId, severity: 2 }),
        ]),
      );
    }
    const outside = path.join(directory, 'infrastructure.ts');
    expect(await guarded.calculateConfigForFile(outside)).toEqual(
      await original.calculateConfigForFile(outside),
    );
  });
});
