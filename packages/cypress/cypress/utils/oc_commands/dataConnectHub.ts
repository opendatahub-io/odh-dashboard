const DCH_BACKEND_SERVICE = 'dch-rest-service';
const DCH_UI_SERVICE = 'odh-dashboard-data-connect-hub-ui';

const hasReadyServiceEndpoints = (serviceName: string): Cypress.Chainable<boolean> =>
  cy
    .exec(
      `oc get endpoints --all-namespaces -o json | jq -e --arg name '${serviceName}' '[.items[] | select(.metadata.name == $name) | .subsets[]?.addresses[]?] | length > 0'`,
      { failOnNonZeroExit: false },
    )
    .then((result) => {
      if (result.exitCode !== 0 && result.stdout.trim() !== 'false') {
        throw new Error(
          `Unable to check ready endpoints for ${serviceName}: ${result.stderr || result.stdout}`,
        );
      }
      return cy.wrap(result.stdout.trim() === 'true');
    });

export const isDataConnectHubBackendAvailable = (): Cypress.Chainable<boolean> =>
  hasReadyServiceEndpoints(DCH_BACKEND_SERVICE).then((ready) => {
    cy.log(`Data Connect Hub backend ${DCH_BACKEND_SERVICE} ready: ${ready}`);
    return cy.wrap(ready);
  });

export const isDataConnectHubUiAvailable = (): Cypress.Chainable<boolean> =>
  hasReadyServiceEndpoints(DCH_UI_SERVICE).then((ready) => {
    cy.log(`Data Connect Hub module service ${DCH_UI_SERVICE} ready: ${ready}`);
    return cy.wrap(ready);
  });

export const isDataConnectHubAvailable = (): Cypress.Chainable<boolean> =>
  isDataConnectHubBackendAvailable().then((backendReady) => {
    if (!backendReady) {
      return cy.wrap(false);
    }
    return isDataConnectHubUiAvailable();
  });
