import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../../utils/e2eUsers';
import { explorePage } from '../../../../pages/explore';
import { getOcResourceNames } from '../../../../utils/oc_commands/applications';
import { filterRhoaiIfHidden, filterFeatureFlaggedApps } from '../../../../utils/appCheckUtils';
import { retryableBefore } from '../../../../utils/retryableHooks';

const applicationNamespace = Cypress.env('APPLICATIONS_NAMESPACE');

describe('Verify RHODS Explore Section Contains Only Expected ISVs', () => {
  let expectedISVs: string[];

  retryableBefore(() => {
    getOcResourceNames(applicationNamespace, 'OdhApplication').then((metadataNames) =>
      filterRhoaiIfHidden(metadataNames)
        .then((filteredRhoaiApps) => filterFeatureFlaggedApps(filteredRhoaiApps))
        .then((filteredApps) => {
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
