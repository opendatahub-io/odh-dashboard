import * as yaml from 'js-yaml';

/**
 * Reads and parses the rhoai-app.yaml YAML file and returns a boolean based on the 'hidden' value.
 * @returns Cypress chainable boolean indicating whether RHOAI is hidden.
 */
export function isRhoaiHidden(): Cypress.Chainable<boolean> {
  const rhoaiYamlPath = '../../../../manifests/rhoai/shared/apps/rhoai/rhoai-app.yaml';

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
