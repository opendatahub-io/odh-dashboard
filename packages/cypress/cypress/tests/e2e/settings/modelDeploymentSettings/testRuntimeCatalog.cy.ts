import * as yaml from 'js-yaml';
import { LDAP_ADMIN_USER, LDAP_CONTRIBUTOR_USER } from '../../../../utils/e2eUsers';
import { generalSettingsPage } from '../../../../pages/modelDeploymentSettings/generalSettings';
import { runtimeCatalogPage } from '../../../../pages/runtimeCatalog';
import { runtimeCatalogDetailsPage } from '../../../../pages/runtimeCatalogDetails';
import { pageNotfound } from '../../../../pages/pageNotFound';
import { verifyModelCatalogDeployment } from '../../../../utils/oc_commands/modelCatalog';
import {
  interceptRuntimeCatalogList,
  verifyRuntimeCatalogListFilteredByHardware,
} from '../../../../utils/runtimeCatalogUtils';

describe('Verify the Runtime image library on Model deployment settings', () => {
  let testData: Record<string, string>;

  before(() => {
    cy.fixture('e2e/settings/runtimeCatalog/testRuntimeCatalog.yaml', 'utf8').then(
      (yamlContent: string) => {
        testData = yaml.load(yamlContent) as Record<string, string>;
      },
    );
  });

  it(
    'Admin can filter the runtime image library, open a runtime image and see the Install action',
    { tags: ['@Dashboard', '@RuntimeCatalog'] },
    () => {
      // Checked here rather than in a shared hook so a missing catalog only fails the admin test
      cy.step('Verify the model catalog backend that serves the runtime image library is deployed');
      verifyModelCatalogDeployment();

      cy.step('Log in as admin');
      cy.visitWithLogin('/', LDAP_ADMIN_USER);

      cy.step('Navigate to Model deployment settings');
      generalSettingsPage.navigate();

      cy.step('Open the Runtime image library tab');
      runtimeCatalogPage.navigate();

      cy.step('Verify runtime image cards are displayed');
      runtimeCatalogPage.findCardDetailLinks().should('have.length.at.least', 1);

      cy.step('Filter by the first available hardware option');
      runtimeCatalogPage
        .findHardwareFilterCheckboxes()
        .first()
        .then(($checkbox) => {
          const hardware = runtimeCatalogPage.getHardwareFilterValue($checkbox);
          interceptRuntimeCatalogList();
          cy.wrap($checkbox).check();
          runtimeCatalogPage.findHardwareFilterChip(hardware).should('exist');

          cy.step('Verify the runtime image list is requested with the selected hardware');
          verifyRuntimeCatalogListFilteredByHardware(hardware);
        });
      runtimeCatalogPage.findHardwareFilterChips().should('have.length', 1);

      cy.step('Verify runtime image cards are displayed for the selected hardware');
      runtimeCatalogPage.findCardDetailLinks().should('have.length.at.least', 1);

      cy.step('Open the first filtered runtime image');
      runtimeCatalogPage
        .findCardDetailLinks()
        .first()
        .invoke('text')
        .then((runtimeName) => {
          runtimeCatalogPage.findCardDetailLinks().first().click();

          cy.step('Verify the details page shows the selected runtime image');
          runtimeCatalogDetailsPage.findTitle().should('have.text', runtimeName);

          // Install is a link when a target can install this image and aria-disabled otherwise,
          // depending on the runtime's resources, so only its presence is asserted here.
          cy.step('Verify the Install action is shown for the selected runtime image');
          runtimeCatalogDetailsPage.findInstallAction().should('be.visible');
        });
    },
  );

  it(
    'Non-admin user cannot access the Runtime image library or its details pages',
    { tags: ['@Dashboard', '@RuntimeCatalog'] },
    () => {
      cy.step('Visit the Runtime image library as a non-admin user');
      runtimeCatalogPage.visitAs(LDAP_CONTRIBUTOR_USER);

      cy.step('Verify the page is not found and the library is not rendered');
      pageNotfound.findPage().should('exist');
      runtimeCatalogPage.findPage().should('not.exist');
      runtimeCatalogPage.findTab().should('not.exist');

      cy.step('Visit a runtime image details page as a non-admin user');
      runtimeCatalogDetailsPage.visitAs(testData.nonAdminProbeRuntimeId, LDAP_CONTRIBUTOR_USER);

      cy.step('Verify the page is not found and no Install action is rendered');
      pageNotfound.findPage().should('exist');
      runtimeCatalogDetailsPage.findPage().should('not.exist');
      runtimeCatalogDetailsPage.findInstallAction().should('not.exist');
    },
  );
});
