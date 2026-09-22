import {
  DataScienceStackComponent,
  type DashboardConfigKind,
  type DataScienceClusterKindStatus,
} from '@odh-dashboard/k8s-core';

const NVIDIA_NIM_APPLICATION = 'nvidia-nim';

const getEffectiveDashboardConfig = (): Cypress.Chainable<DashboardConfigKind> =>
  cy
    .request<DashboardConfigKind>({
      url: '/api/config',
      headers: { 'Cache-Control': 'no-cache' },
    })
    .its('body');

/**
 * Filters out applications that have spec.hidden === true in their OdhApplication CR.
 * Queries the cluster for all OdhApplication CRs and excludes any with hidden set.
 * @param applicationNamespace - The namespace containing OdhApplication CRs.
 * @param apps - Array of application names.
 * @returns Cypress chainable array of filtered application names.
 */
export function filterHiddenApps(
  applicationNamespace: string,
  apps: string[],
): Cypress.Chainable<string[]> {
  return cy
    .exec(`oc get OdhApplication -n ${applicationNamespace} -o json`, {
      failOnNonZeroExit: false,
    })
    .then((result) => {
      if (result.exitCode !== 0 || !result.stdout.trim()) {
        cy.log(`Failed to query OdhApplication CRs: ${result.stderr}`);
        return cy.wrap(apps);
      }

      const items: { metadata: { name: string }; spec?: { hidden?: boolean } }[] =
        JSON.parse(result.stdout).items || [];

      const hiddenNames = new Set(
        items.filter((item) => item.spec?.hidden === true).map((item) => item.metadata.name),
      );

      if (hiddenNames.size > 0) {
        cy.log(`Filtering out hidden apps: ${[...hiddenNames].join(', ')}`);
      }

      return cy.wrap(apps.filter((app) => !hiddenNames.has(app)));
    });
}

/**
 * Checks if a specific feature flag is enabled in the dashboard configuration.
 * Handles both regular flags (truthy = enabled) and "disable" flags (truthy = disabled).
 * @param flagPath - The path to the flag in the dashboard config (e.g., 'dashboardConfig.mlflow')
 * @returns Cypress chainable boolean indicating whether the feature is enabled.
 */
export function isFeatureFlagEnabled(flagPath: string): Cypress.Chainable<boolean> {
  return cy.getDashboardConfig(flagPath).then((flagValue) => {
    // Extract the flag name from the path
    const flagName = flagPath.split('.').pop() || '';

    // Check if this is a "disable" flag (inverted logic)
    const isDisableFlag = flagName.startsWith('disable');

    // Handle inverted logic for "disable" flags
    const isEnabled = isDisableFlag ? flagValue !== true : flagValue === true;

    cy.log(`Feature flag ${flagPath}: ${isEnabled ? 'enabled' : 'disabled'}`);
    return cy.wrap(isEnabled);
  });
}

/**
 * Filters applications based on cluster state (feature flags + component installation).
 * Checks both OdhDashboardConfig feature flags AND DataScienceCluster component status.
 *
 * This matches the frontend logic which determines availability via:
 * 1. Feature flags (dashboardConfig.mlflow, etc.)
 * 2. Required components installed (mlflowoperator, etc.)
 *
 * @param apps - Array of application names.
 * @returns Cypress chainable array of filtered application names (only enabled apps).
 */
export function filterFeatureFlaggedApps(apps: string[]): Cypress.Chainable<string[]> {
  return cy.exec('oc get DataScienceCluster -A -o json').then((dscResult) => {
    const dscResponse = JSON.parse(dscResult.stdout) as {
      items?: Array<{ status?: DataScienceClusterKindStatus }>;
    };
    const dscComponents = dscResponse.items?.[0]?.status?.components ?? {};
    const componentsByName = dscComponents as unknown as Record<
      string,
      { managementState?: string } | undefined
    >;

    return getEffectiveDashboardConfig().then((config) => {
      const { dashboardConfig } = config.spec;
      const featureFlags = dashboardConfig as unknown as Record<string, unknown>;
      const kserveManagementState =
        componentsByName[DataScienceStackComponent.K_SERVE]?.managementState;
      const isKServeAvailable =
        dashboardConfig.disableModelServing === false &&
        dashboardConfig.disableKServe === false &&
        (kserveManagementState === 'Managed' || kserveManagementState === 'Unmanaged');
      const isNimWizardAvailable =
        dashboardConfig.nimWizard === true &&
        dashboardConfig.disableNIMModelServing === false &&
        isKServeAvailable;

      const filteredApps = apps.filter((appName) => {
        if (appName === NVIDIA_NIM_APPLICATION && isNimWizardAvailable) {
          cy.log(`Filtering out ${appName} (NIM Wizard is available)`);
          return false;
        }

        // Check if this app has a corresponding operator component in DSC
        // Map app names to their DSC component names (e.g., mlflow -> mlflowoperator)
        const componentName = `${appName}operator`;
        const component = componentsByName[componentName];

        // Frontend logic: component is available if managementState is 'Managed' OR 'Unmanaged'
        // Only 'Removed' (or missing) makes it unavailable
        if (component && component.managementState === 'Removed') {
          cy.log(`Filtering out ${appName} (component ${componentName} is Removed)`);
          return false;
        }

        // Check feature flag if no component requirement
        const featureFlagValue = featureFlags[appName];

        // If no feature flag, include the app
        if (featureFlagValue === undefined) {
          return true;
        }

        // Check if flag is enabled
        const isDisableFlag = appName.startsWith('disable');
        const isEnabled = isDisableFlag ? featureFlagValue !== true : featureFlagValue === true;

        if (!isEnabled) {
          cy.log(`Filtering out ${appName} (feature flag disabled)`);
        }

        return isEnabled;
      });

      return cy.wrap(filteredApps);
    });
  });
}
