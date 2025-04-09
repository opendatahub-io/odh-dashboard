import { aboutDialog } from '~/__tests__/cypress/cypress/pages/aboutDialog';
import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';
// eslint-disable-next-line no-restricted-syntax
import { DataScienceStackComponentMap } from '~/concepts/areas/const';
import {
  getCsvByDisplayName,
  getResourceVersionByName,
  getSubscriptionChannelFromCsv,
  getVersionFromCsv,
} from '~/__tests__/cypress/cypress/utils/oc_commands/applications';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { retryableBefore } from '~/__tests__/cypress/cypress/utils/retryableHooks';

const productName = Cypress.env('PRODUCT_NAME');
const dataScienceStackComponentMap = DataScienceStackComponentMap;

describe('Verify RHODS About Section Contains Correct Information', () => {
  let odhCsv: Record<string, unknown>;

  retryableBefore(async () => {
    cy.log(`Prepare the CSV JSON for the tests according to the installed Product: ${productName}`);
    getCsvByDisplayName(productName, 'default').then((csv) => {
      odhCsv = csv as Record<string, unknown>;
    });
  });

  it(
    'Verify RHODS About Section Contains Correct Information',
    { tags: ['@Smoke', '@SmokeSet1', '@Dashboard', '@RHOAIENG-21403'] },
    () => {
      // Login and open the About page
      cy.step(`Login to ${productName}`);
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Open the About page');
      appChrome.visit();
      aboutDialog.show();

      cy.step(`Verify product '${productName}' in About details`);
      aboutDialog
        .findText()
        .invoke('text')
        .should((text) => {
          const simplifiedText = text.replace(/[^\w\s]/g, '');
          expect(simplifiedText).to.contain(productName);
        });

      cy.step(`Verify product '${productName}' in About image`);
      aboutDialog.findImageByAltText(productName);

      cy.step(`Verify ${productName} version in About details`);
      getVersionFromCsv(odhCsv as { spec: { version: string } }).then((version) => {
        aboutDialog
          .findProductVersion()
          .invoke('text')
          .should('match', /\d/) // Wait until text contains at least one digit
          .then((uiVersion) => {
            softTrue(
              version.includes(uiVersion),
              `Expected version '${version}' to include '${uiVersion}'`,
            );
          });
      });

      cy.step(`Verify ${productName} channel in About details`);
      getSubscriptionChannelFromCsv(
        odhCsv as { metadata: { annotations: { [key: string]: string } } },
      ).then((channel) => {
        aboutDialog.findChannel().should('contain.text', channel);
      });

      cy.step(`Verify ${HTPASSWD_CLUSTER_ADMIN_USER.USERNAME} access level`);
      aboutDialog.isAdminAccessLevel();

      aboutDialog
        .findTable()
        .should('exist')
        .then(() => {
          Object.entries(dataScienceStackComponentMap).forEach(([, component]) => {
            cy.step(`Verify versions in About table for component: ${component}`);
            cy.wrap(null)
              .then(() => {
                return aboutDialog.getComponentReleasesText(component);
              })
              .then((texts) => {
                getResourceVersionByName(component).then((version) => {
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
