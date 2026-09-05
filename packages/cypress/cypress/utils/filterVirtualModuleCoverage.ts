type CoverageEntry = {
  path?: string;
};

/**
 * Module federation runtimes can appear in Istanbul coverage as `data:text/javascript,...`
 * URLs or `__module_federation` virtual module paths. NYC's HTML reporter uses those paths as
 * filenames and fails with ENAMETOOLONG on CI.
 */
export const filterVirtualModuleCoverage = <T extends Record<string, CoverageEntry>>(
  coverage: T,
): T =>
  Object.fromEntries(
    Object.entries(coverage).filter(([key, entry]) => {
      const filePath = entry.path ?? key;
      return (
        !key.startsWith('data:') &&
        !filePath.startsWith('data:') &&
        !/__module_federation/i.test(key) &&
        !/__module_federation/i.test(filePath)
      );
    }),
  ) as T;
