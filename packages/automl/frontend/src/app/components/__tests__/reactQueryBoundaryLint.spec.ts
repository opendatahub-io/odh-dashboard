import { ESLint } from 'eslint';

// Jest's jsdom environment does not expose Node's structuredClone implementation.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
globalThis.structuredClone ??= ((value: unknown) =>
  JSON.parse(JSON.stringify(value))) as typeof structuredClone;

describe('component React Query import boundary', () => {
  it('rejects runtime composition APIs but permits type-only imports', async () => {
    const eslint = new ESLint({ cwd: __dirname.replace(/\/src\/app\/components\/__tests__$/, '') });
    const prohibited = await eslint.lintText(
      "import { usePrefetchQuery } from '@tanstack/react-query';",
      { filePath: 'src/app/components/run-results/AutomlResults.tsx' },
    );
    const allowed = await eslint.lintText(
      "import type { UseQueryResult } from '@tanstack/react-query';",
      { filePath: 'src/app/components/run-results/AutomlResults.tsx' },
    );

    expect(prohibited).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ ruleId: '@odh-dashboard/no-restricted-imports' }),
          ]),
        }),
      ]),
    );
    expect(allowed.flatMap((result) => result.messages)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: '@odh-dashboard/no-restricted-imports' }),
      ]),
    );
  });
});
