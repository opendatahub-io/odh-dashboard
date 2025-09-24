import { aboutDialog } from '#~/__tests__/cypress/cypress/pages/aboutDialog';
// eslint-disable-next-line no-restricted-syntax
import { DataScienceStackComponentMap } from '#~/concepts/areas/const';
import {
  getCsvByDisplayName,
  getResourceVersionByName,
  getSubscriptionChannelFromCsv,
  getVersionFromCsv,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/applications';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';

const productName = Cypress.env('PRODUCT_NAME');
const dataScienceStackComponentMap = DataScienceStackComponentMap;

describe('Verify RHODS About Dialog', () => {
  let odhCsv: Record<string, unknown>;

  retryableBefore(async () => {
    cy.log(`Prepare the CSV JSON for the tests according to the installed Product: ${productName}`);
    getCsvByDisplayName(productName, 'default').then((csv) => {
      odhCsv = csv as Record<string, unknown>;
    });
  });

  it(
    'Verify RHODS About Dialog contains correct information',
    { tags: ['@Smoke', '@SmokeSet1', '@Dashboard', '@RHOAIENG-21403', '@NonConcurrent'] },
    () => {
      // Login and open the About dialog
      cy.step(`Login to ${productName}`);
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Open the About dialog');
      aboutDialog.show();

      cy.step(`Verify product '${productName}' in About dialog`);
      aboutDialog
        .findText()
        .invoke('text')
        .should((text) => {
          // Remove special characters from the text before comparison
          expect(text.replace(/[^\w\s]/g, '')).to.contain(productName);
        });

      cy.step(`Verify product '${productName}' in About image`);
      aboutDialog.findImageByAltText(productName);

      cy.step(`Verify ${productName} version in About dialog`);
      getVersionFromCsv(odhCsv as { spec: { version: string } }).then((version) => {
        aboutDialog
          .findProductVersion()
          .invoke('text')
          .should('match', /\d/) // Wait until text contains at least one digit
          .then((uiVersion) => {
            softTrue(
              version.includes(uiVersion),
              `${productName} version '${version}' is not similar to '${uiVersion}' in About dialog`,
            );
          });
      });

      cy.step(`Verify ${productName} channel in About dialog`);
      getSubscriptionChannelFromCsv(odhCsv as { metadata: { name: string } }).then((channel) => {
        aboutDialog.findChannel().should('contain.text', channel);
      });

      cy.step(`Verify ${HTPASSWD_CLUSTER_ADMIN_USER.USERNAME} access level`);
      aboutDialog.isAdminAccessLevel();

      aboutDialog.findTable().then(() => {
        Object.entries(dataScienceStackComponentMap).forEach(([, component]) => {
          cy.step(`Verify versions in About dialog's table for component: ${component}`);
          aboutDialog.getComponentReleasesText(component).then((texts) => {
            getResourceVersionByName(component).then((version) => {
              if (version.length === 0) {
                return;
              }
              const text = texts.join(' ');
              softTrue(
                version.some((v) => text.includes(v)),
                `Version ${version} not found for component ${component}`,
              );
            });
          });
        });
      });
    },
  );
});
