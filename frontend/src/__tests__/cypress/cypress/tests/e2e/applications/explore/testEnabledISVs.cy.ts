import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { explorePage } from '#~/__tests__/cypress/cypress/pages/explore';
import { getOcResourceNames } from '#~/__tests__/cypress/cypress/utils/oc_commands/applications';
import { filterRhoaiIfHidden } from '#~/__tests__/cypress/cypress/utils/appCheckUtils';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';

const applicationNamespace = Cypress.env('APPLICATIONS_NAMESPACE');

describe('Verify RHODS Explore Section Contains Only Expected ISVs', () => {
  let expectedISVs: string[];

  retryableBefore(() => {
    // Setup: Retrieve the resource names of 'OdhApplication' objects from the OpenShift cluster
    getOcResourceNames(applicationNamespace, 'OdhApplication').then((metadataNames) =>
      // Filter out the 'RHOAI' application if it is marked as hidden in the RHOAI YAML configuration
      filterRhoaiIfHidden(metadataNames).then((filteredApps) => {
        // Store the filtered applications (excluding 'RHOAI' if hidden) into the expectedISVs variable
        expectedISVs = filteredApps;
        cy.log(
          `Expected applications which should display as Cards in Explore Section: ${expectedISVs.join(
            ', ',
          )}`,
        );
      }),
    );
  });

  it(
    'Validate that configured ISVs display in the Explore Section',
    { tags: ['@Smoke', '@SmokeSet1', '@ODS-1890', '@Dashboard'] },
    () => {
      // Authentication and navigation
      cy.step('Login to the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Navigate to the Explore page and search for each ISV
      cy.step('Navigate to the Explore page');
      explorePage.visit();

      cy.step('Searching for each ISV based on the oc command output and rhoai-app manifest flag');
      expectedISVs.forEach((isv) => {
        explorePage
          .findCardLocator(isv)
          .should('be.visible')
          .then(() => {
            cy.log(`✅ Application found: ${isv}`);
          });
      });
    },
  );
});
