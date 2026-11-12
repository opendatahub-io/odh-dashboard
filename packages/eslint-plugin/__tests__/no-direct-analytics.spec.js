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
  `import '@odh-dashboard/analytics/types/deep';`,
  `import '@odh-dashboard/analytics/types-extra';`,
  `import '@odh-dashboard/analytics/react/deep';`,
  `import '@odh-dashboard/analytics/react-extra';`,
  `import '@odh-dashboard/analytics/standalone/deep';`,
  `import '@odh-dashboard/analytics/standalone-extra';`,
  `export * from '@odh-dashboard/analytics/react/deep';`,
  `export * from '@odh-dashboard/analytics';`,
  `import '@segment/analytics-next';`,
  `import '@segment/analytics-next/deep';`,
  `import 'analytics-node';`,
  `import 'analytics.js';`,
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
  `import { useTrackEvent } from '@odh-dashboard/analytics/react'; useTrackEvent()('event', {});`,
  `import { AnalyticsTrackingProvider, useTrackPageEvent } from '@odh-dashboard/analytics/react';`,
  `export { useTrackEvent } from '@odh-dashboard/analytics/react';`,
  `import { createStandaloneAnalytics } from '@odh-dashboard/analytics/standalone';`,
  `import * as tracking from '@odh-dashboard/analytics/react'; tracking.useTrackEvent();`,
  `import { TrackingOutcome } from '@odh-dashboard/analytics/types';`,
  `export { TrackingOutcome } from '@odh-dashboard/analytics/types';`,
  `export * from '@odh-dashboard/analytics/types';`,
  `import * as contracts from '@odh-dashboard/analytics/types'; contracts.TrackingOutcome;`,
  `import { unrelated } from '@odh-dashboard/ui-core';`,
  `export * from '@odh-dashboard/ui-core';`,
  `const feature = { analytics: {} }; feature.analytics;`,
  `window.location; const { location } = window;`,
  `import * as core from '@odh-dashboard/ui-core'; core.unrelated();`,
  `import * as core from '@odh-dashboard/ui-core'; const { unrelated } = core;`,
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

it('should permit TypeScript contracts with both type import syntaxes', async () => {
  const typed = makeLinter(
    guarded({ ...base, parser: require.resolve('@typescript-eslint/parser') }, ['src/**']),
  );
  expect(
    await lint(
      `import type { FormTrackingEventProperties } from '@odh-dashboard/analytics/types';
       import { type LinkTrackingEventProperties, TrackingOutcome } from '@odh-dashboard/analytics/types';
       export type { IdentifyEventProperties } from '@odh-dashboard/analytics/types';
       import type * as contracts from '@odh-dashboard/analytics/types';
       type Outcome = typeof contracts.TrackingOutcome;`,
      undefined,
      typed,
    ),
  ).toEqual([]);
});

describe('TypeScript type and value namespaces', () => {
  const typed = makeLinter(
    guarded({ ...base, parser: require.resolve('@typescript-eslint/parser') }, ['src/**']),
  );

  for (const global of ['window', 'globalThis', 'self']) {
    for (const source of [
      `(${global} as any).analytics.track('event');`,
      `${global}!.analytics.track('event');`,
      `(<any>${global}).analytics.track('event');`,
      `(${global} satisfies unknown)?.['analytics']?.track('event');`,
      `${global}['analytics' as const].track('event');`,
      `${global}['analytics' satisfies string].track('event');`,
      `const { analytics: client } = (${global} as any)!;`,
      `const { ['analytics' as const]: client } = (${global} as any);`,
      `let client; ({ ['analytics']: client } = ${global}!);`,
      `declare const ${global}: { analytics: any }; ${global}.analytics.track('event');`,
      `declare var ${global}: { analytics: any }; const { analytics } = ${global};`,
      `interface ${global} {} declare const ${global}: any; (${global} as any).analytics;`,
      `declare namespace ${global} { const analytics: any; } ${global}.analytics;`,
    ]) {
      it(`should reject global access through erased TypeScript syntax: ${source}`, async () => {
        expect(await lint(source, 'src/feature.ts', typed)).toEqual(
          expect.arrayContaining([expect.objectContaining({ ruleId, severity: 2 })]),
        );
      });
    }

    for (const source of [
      `function local(${global}: any) { (${global} as any).analytics; const { ['analytics' as const]: client } = ${global}!; }`,
      `const ${global} = { analytics: {} }; (${global} satisfies unknown).analytics;`,
      `const ${global} = { analytics: {} }; function local() { declare const ${global}: any; (${global} as any).analytics; }`,
    ]) {
      it(`should preserve a real local value through TypeScript wrappers: ${source}`, async () => {
        expect(await lint(source, 'src/feature.ts', typed)).toEqual([]);
      });
    }
  }

  for (const source of [
    ...['window', 'globalThis', 'self'].flatMap((global) => [
      `type ${global} = unknown; ${global}.analytics.track('event');`,
      `interface ${global} {} const { analytics } = ${global};`,
      `function example<${global}>() { ${global}?.['analytics']?.track('event'); }`,
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
  ]) {
    it(`should permit a genuine local value shadow: ${source}`, async () => {
      expect(await lint(source, 'src/feature.tsx', typed)).toEqual([]);
    });
  }
});
