import { ESLint } from 'eslint';

// Jest's jsdom environment does not expose Node's structuredClone implementation.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
globalThis.structuredClone ??= ((value: unknown) =>
  JSON.parse(JSON.stringify(value))) as typeof structuredClone;

describe('component React Query import boundary', () => {
  it('rejects runtime composition APIs but permits type-only imports', async () => {
    const eslint = new ESLint({
      cwd: __dirname.replace(/\/src\/app\/components\/__tests__$/, ''),
      useEslintrc: false,
      overrideConfig: {
        parser: require.resolve('@typescript-eslint/parser'),
        parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
        plugins: ['@odh-dashboard'],
        rules: {
          '@odh-dashboard/no-restricted-imports': [
            'error',
            {
              paths: [
                {
                  name: '@tanstack/react-query',
                  allowTypeImports: true,
                },
              ],
            },
          ],
        },
      },
    } as unknown as ConstructorParameters<typeof ESLint>[0]);
    const prohibited = await eslint.lintText(
      "import { useMutationState } from '@tanstack/react-query';",
      { filePath: 'src/app/components/configure/AutoragVectorStoreSelector.tsx' },
    );
    const allowed = await eslint.lintText(
      "import type { UseQueryResult } from '@tanstack/react-query';",
      { filePath: 'src/app/components/configure/AutoragVectorStoreSelector.tsx' },
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
