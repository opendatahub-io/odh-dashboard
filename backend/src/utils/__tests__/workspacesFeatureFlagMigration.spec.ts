import { blankDashboardCR } from '../constants';
import { migrateWorkspacesFeatureFlag } from '../workspacesFeatureFlagMigration';
import type { DashboardConfig } from '../../types';

describe('migrateWorkspacesFeatureFlag', () => {
  const withMergedFlags = (
    flags: Partial<DashboardConfig['spec']['dashboardConfig']> & { workbenchesV2?: boolean },
  ): DashboardConfig => ({
    ...blankDashboardCR,
    spec: {
      ...blankDashboardCR.spec,
      dashboardConfig: {
        ...blankDashboardCR.spec.dashboardConfig,
        ...flags,
      },
    },
  });

  /** Raw CR shapes omit keys that were never written to the cluster object. */
  const withRawFlags = (
    flags: Partial<DashboardConfig['spec']['dashboardConfig']> & { workbenchesV2?: boolean },
  ): DashboardConfig =>
    ({
      ...blankDashboardCR,
      spec: {
        ...blankDashboardCR.spec,
        dashboardConfig: flags,
      },
    } as DashboardConfig);

  it('copies workbenchesV2 into workspaces when workspaces is absent from the raw CR', () => {
    const raw = withRawFlags({ workbenchesV2: true });
    // Simulate lodash merge with blank defaults (workspaces: false).
    const merged = withMergedFlags({ workspaces: false, workbenchesV2: true });

    expect(migrateWorkspacesFeatureFlag(raw, merged).spec.dashboardConfig.workspaces).toBe(true);
  });

  it('does not override an explicit workspaces value from the raw CR', () => {
    const raw = withRawFlags({ workspaces: false, workbenchesV2: true });
    const merged = withMergedFlags({ workspaces: false, workbenchesV2: true });

    expect(migrateWorkspacesFeatureFlag(raw, merged).spec.dashboardConfig.workspaces).toBe(false);
  });

  it('leaves workspaces unchanged when workbenchesV2 is absent', () => {
    const raw = withRawFlags({ workspaces: true });
    const merged = withMergedFlags({ workspaces: true });

    expect(migrateWorkspacesFeatureFlag(raw, merged).spec.dashboardConfig.workspaces).toBe(true);
  });
});
