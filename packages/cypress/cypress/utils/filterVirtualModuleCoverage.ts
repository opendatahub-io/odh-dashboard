type CoverageEntry = {
  path?: string;
};

/**
 * Module federation runtimes can appear in Istanbul coverage as `data:text/javascript,...`
 * URLs. NYC's HTML reporter uses those paths as filenames and fails with ENAMETOOLONG on CI.
 */
export const filterVirtualModuleCoverage = <T extends Record<string, CoverageEntry>>(
  coverage: T,
): T =>
  Object.fromEntries(
    Object.entries(coverage).filter(([key, entry]) => {
      const filePath = entry.path ?? key;
      return !key.startsWith('data:') && !filePath.startsWith('data:');
    }),
  ) as T;
