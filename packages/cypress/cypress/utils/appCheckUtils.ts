import * as yaml from 'js-yaml';

/**
 * Reads and parses the rhoai-app.yaml YAML file and returns a boolean based on the 'hidden' value.
 * @returns Cypress chainable boolean indicating whether RHOAI is hidden.
 */
export function isRhoaiHidden(): Cypress.Chainable<boolean> {
  const rhoaiYamlPath = '../../manifests/rhoai/shared/apps/rhoai/rhoai-app.yaml';

  return cy.readFile(rhoaiYamlPath).then((fileContent) => {
    // Parse the YAML content
    const parsedYaml = yaml.load(fileContent) as { spec?: { hidden?: boolean } };

    // Extract the "hidden" property
    const isHidden = parsedYaml.spec?.hidden === true;

    return isHidden;
  });
}

/**
 * Filters the applications list by excluding RHOAI if it is hidden=true in the rhoai-app.yaml.
 * @param apps - Array of application names.
 * @returns Cypress chainable array of filtered application names.
 */
export function filterRhoaiIfHidden(apps: string[]): Cypress.Chainable<string[]> {
  return isRhoaiHidden().then((isHidden) => {
    const filteredApps = isHidden ? apps.filter((app) => app !== 'rhoai') : apps;
    return filteredApps;
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
    return isEnabled;
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
    const dscComponents = JSON.parse(dscResult.stdout).items?.[0]?.status?.components || {};

    return cy.getDashboardConfig().then((config) => {
      const dashboardConfig = (config as Record<string, unknown>).dashboardConfig as
        | Record<string, unknown>
        | undefined;

      const filteredApps = apps.filter((appName) => {
        // Check if this app has a corresponding operator component in DSC
        // Map app names to their DSC component names (e.g., mlflow -> mlflowoperator)
        const componentName = `${appName}operator`;
        const component = dscComponents[componentName];

        // Frontend logic: component is available if managementState is 'Managed' OR 'Unmanaged'
        // Only 'Removed' (or missing) makes it unavailable
        if (component && component.managementState === 'Removed') {
          cy.log(`Filtering out ${appName} (component ${componentName} is Removed)`);
          return false;
        }

        // Check feature flag if no component requirement
        const featureFlagValue = dashboardConfig?.[appName];

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
