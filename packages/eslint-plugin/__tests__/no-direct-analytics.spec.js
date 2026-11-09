const { createRequire } = require('node:module');

const nativeRequire = createRequire(__filename);
const { ESLint } = nativeRequire('eslint');
const plugin = require('..');

const ruleId = '@odh-dashboard/no-direct-analytics';
const guarded = (config, files) => ({
  ...config,
  plugins: ['@odh-dashboard'],
  overrides: [{ files, rules: { [ruleId]: 'error' } }],
});

const legacy = '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
const uiCore = '@odh-dashboard/ui-core/contexts/AnalyticsContext';
const base = {
  root: true,
  parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
};
const makeLinter = (config) =>
  new ESLint({ useEslintrc: false, plugins: { '@odh-dashboard': plugin }, overrideConfig: config });
const linter = makeLinter(guarded(base, ['src/**/*.{ts,tsx}']));
const lint = async (source, filePath = 'src/feature.ts', instance = linter) => {
  const [result] = await instance.lintText(source, { filePath });
  expect(result.fatalErrorCount).toBe(0);
  return result.messages;
};

for (const source of [
  `import { fireSimpleTrackingEvent } from '${legacy}';`,
  `export { fireSimpleTrackingEvent as track } from '${legacy}';`,
  `export * from '${legacy}/deep';`,
  `import { fireTrackingEvent } from '@odh-dashboard/analytics';`,
  `import '@odh-dashboard/analytics/deep';`,
  `import '@segment/analytics-next';`,
  `import '@segment/analytics-next/deep';`,
  `import 'analytics-node';`,
  `import 'analytics.js';`,
  `import { useAnalytics as useLegacy } from '${uiCore}'; useLegacy();`,
  `import { useAnalytics } from '@odh-dashboard/ui-core'; useAnalytics();`,
  `export { AnalyticsContext } from '${uiCore}';`,
  `import * as core from '@odh-dashboard/ui-core'; core.useAnalytics();`,
  `import useAnalytics from '@odh-dashboard/ui-core/useAnalytics'; useAnalytics();`,
  `import '@odh-dashboard/ui-core/useAnalytics/deep';`,
  `export * from '@odh-dashboard/ui-core';`,
  `export * as core from '${uiCore}';`,
  `export { useAnalytics as useLegacy } from '@odh-dashboard/ui-core';`,
  `import * as core from '${uiCore}'; core['useAnalytics']();`,
  `import * as core from '${uiCore}'; core?.['AnalyticsContext'];`,
  `import * as core from '${uiCore}'; const { useAnalytics: hook } = core;`,
  `import * as core from '${uiCore}'; let hook; ({ ['useAnalytics']: hook } = core);`,
  `import * as core from '${uiCore}'; const view = <core.AnalyticsContext.Provider />;`,
]) {
  it(`should reject ${source}`, async () => {
    expect((await lint(source)).some((item) => item.ruleId === ruleId)).toBeTruthy();
  });
}

for (const global of ['window', 'globalThis', 'self']) {
  for (const source of [
    `${global}.analytics.track('event');`,
    `${global}?.analytics?.track('event');`,
    `${global}['analytics'].track('event');`,
    `${global}?.['analytics']?.track('event');`,
    `const { analytics: client } = ${global};`,
    `const { ['analytics']: client } = ${global};`,
    `let client; ({ analytics: client } = ${global});`,
  ]) {
    it(`should reject ${source}`, async () => {
      expect((await lint(source)).some((item) => item.ruleId === ruleId)).toBeTruthy();
    });
  }
}

for (const source of [
  `import { useTrackEvent } from '@odh-dashboard/plugin-core/host-api'; useTrackEvent()('event', {});`,
  `import { TrackingOutcome, FormTrackingEventProperties } from '${uiCore}';`,
  `import { unrelated } from '@odh-dashboard/ui-core';`,
  `function useAnalytics() {} useAnalytics();`,
  `const feature = { analytics: {} }; feature.analytics;`,
  `window.location; const { location } = window;`,
  `import * as core from '@odh-dashboard/ui-core'; core.unrelated();`,
  `import * as core from '@odh-dashboard/ui-core'; const { unrelated } = core;`,
  `import * as useAnalytics from '@odh-dashboard/ui-core'; useAnalytics.unrelated();`,
  `import * as core from '${uiCore}'; function local(core) { core.useAnalytics(); }`,
  `function local(window) { window.analytics; const { analytics } = window; }`,
  `const globalThis = { analytics: {} }; globalThis.analytics;`,
  `const self = {}; let analytics; ({ analytics } = self);`,
  `let analytics; ({ location: analytics } = window);`,
  `const { ...rest } = window;`,
  `const { analytics } = { analytics: {} };`,
  `export const trackFeature = (trackEvent) => trackEvent('event', {});`,
]) {
  it(`should permit ${source}`, async () => expect(await lint(source)).toEqual([]));
}

it('should keep infrastructure, composition roots, and Cypress observation outside the guard scope', async () => {
  for (const file of ['infrastructure/adapter.ts', 'host/provider.tsx', 'cypress/observe.ts']) {
    expect(await lint(`import '${legacy}'; window.analytics;`, file)).toEqual([]);
  }
});

it('should document literal dynamic imports and require as outside static import guards', async () => {
  expect(await lint(`import('${legacy}'); require('@segment/analytics-next');`)).toEqual([]);
});

it('should document indirect global aliases and nonliteral computed access as outside syntax guards', async () => {
  expect(
    await lint(`const target = window; target.analytics; const key = 'analytics'; window[key];`),
  ).toEqual([]);
});

it('should permit TypeScript property types with both type import syntaxes', async () => {
  const typed = makeLinter(
    guarded({ ...base, parser: require.resolve('@typescript-eslint/parser') }, ['src/**']),
  );
  expect(
    await lint(
      `import type { FormTrackingEventProperties, AnalyticsContext } from '${uiCore}';
       import { type LinkTrackingEventProperties, TrackingOutcome, type useAnalytics } from '${uiCore}';
       export type { AnalyticsContext } from '${uiCore}';
       export { type useAnalytics } from '${uiCore}';
       import type * as types from '${uiCore}'; type Hook = typeof types.useAnalytics;`,
      undefined,
      typed,
    ),
  ).toEqual([]);
});

describe('TypeScript type and value namespaces', () => {
  const typed = makeLinter(
    guarded({ ...base, parser: require.resolve('@typescript-eslint/parser') }, ['src/**']),
  );

  for (const source of [
    ...['window', 'globalThis', 'self'].flatMap((global) => [
      `type ${global} = unknown; ${global}.analytics.track('event');`,
      `interface ${global} {} const { analytics } = ${global};`,
      `function example<${global}>() { ${global}?.['analytics']?.track('event'); }`,
    ]),
    ...['@odh-dashboard/ui-core', uiCore].flatMap((module) => [
      `import * as core from '${module}'; function example() { type core = unknown; core.useAnalytics(); }`,
      `import * as core from '${module}'; function example() { interface core {} const { useAnalytics } = core; }`,
      `import * as core from '${module}'; function example<core>() { return <core.AnalyticsContext.Provider />; }`,
    ]),
  ]) {
    it(`should reject runtime access despite a type-only shadow: ${source}`, async () => {
      expect(await lint(source, 'src/feature.tsx', typed)).toEqual(
        expect.arrayContaining([expect.objectContaining({ ruleId, severity: 2 })]),
      );
    });
  }

  for (const source of [
    `type window = unknown; const window = { analytics: {} }; window.analytics;`,
    `interface globalThis {} class globalThis { static analytics = {}; } globalThis.analytics;`,
    `enum self { analytics } self.analytics;`,
    `import * as core from '${uiCore}'; function example(core: { useAnalytics(): void }) { type core = unknown; core.useAnalytics(); }`,
    `import * as core from '${uiCore}'; function example() { interface core {} const core = { useAnalytics() {} }; const { useAnalytics } = core; }`,
  ]) {
    it(`should permit a genuine local value shadow: ${source}`, async () => {
      expect(await lint(source, 'src/feature.tsx', typed)).toEqual([]);
    });
  }
});
