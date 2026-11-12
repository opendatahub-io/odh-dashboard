import type { DashboardConfig } from '../types';

type RawDashboardConfigFlags = {
  workspaces?: boolean;
  workbenchesV2?: boolean;
};

/**
 * Migrates deprecated `workbenchesV2` to `workspaces` when the new flag is absent
 * from the raw OdhDashboardConfig. Existing `workspaces` values win.
 */
export const migrateWorkspacesFeatureFlag = (
  rawConfig: DashboardConfig | undefined,
  mergedConfig: DashboardConfig,
): DashboardConfig => {
  if (!mergedConfig?.spec?.dashboardConfig) {
    return mergedConfig;
  }

  const rawFlags = (rawConfig?.spec?.dashboardConfig ?? {}) as RawDashboardConfigFlags;
  if ('workspaces' in rawFlags || typeof rawFlags.workbenchesV2 !== 'boolean') {
    return mergedConfig;
  }

  return {
    ...mergedConfig,
    spec: {
      ...mergedConfig.spec,
      dashboardConfig: {
        ...mergedConfig.spec.dashboardConfig,
        workspaces: rawFlags.workbenchesV2,
      },
    },
  };
};
