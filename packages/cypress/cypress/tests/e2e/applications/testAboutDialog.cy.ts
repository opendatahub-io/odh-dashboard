import { DataScienceStackComponentMap } from '@odh-dashboard/plugin-core/areas';
import { aboutDialog } from '../../../pages/aboutDialog';
import {
  getCsvByDisplayName,
  getDscComponentVersions,
  getInstalledProductName,
  getSubscriptionChannelFromCsv,
  getVersionFromCsv,
} from '../../../utils/oc_commands/applications';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import { retryableBefore } from '../../../utils/retryableHooks';

const dataScienceStackComponentMap = DataScienceStackComponentMap;

describe('Verify RHODS About Dialog', () => {
  let odhCsv: Record<string, unknown>;
  let productName: string;
  let dscVersions: Partial<Record<string, string[]>>;

  retryableBefore(async () => {
    cy.log('Auto-detecting installed product (RHOAI or ODH)...');
    getInstalledProductName('default').then((detectedProduct) => {
      productName = detectedProduct;
      cy.log(
        `Prepare the CSV JSON for the tests according to the installed Product: ${productName}`,
      );
      getCsvByDisplayName(productName, 'default').then((csv) => {
        odhCsv = csv as Record<string, unknown>;
      });
    });
    getDscComponentVersions().then((versions) => {
      dscVersions = versions;
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
            expect(version).to.contain(
              uiVersion,
              `${productName} version '${version}' should be similar to '${uiVersion}' in About dialog`,
            );
          });
      });

      cy.step(`Verify ${productName} channel in About dialog`);
      getSubscriptionChannelFromCsv(odhCsv as { metadata: { name: string } }).then((channel) => {
        aboutDialog.findChannel().should('contain.text', channel);
      });

      cy.step('Verify admin access level');
      aboutDialog.isAdminAccessLevel();

      aboutDialog.findTable().then(() => {
        Object.entries(dataScienceStackComponentMap).forEach(([componentKey, displayName]) => {
          const versions = dscVersions[componentKey];
          if (!versions) {
            return;
          }
          cy.step(`Verify versions in About dialog's table for component: ${displayName}`);
          aboutDialog.getComponentReleasesText(displayName).then((texts) => {
            const text = texts.join(' ');
            expect(versions.some((v) => text.includes(v))).to.equal(
              true,
              `Version ${versions.join(', ')} not found for component ${displayName}`,
            );
          });
        });
      });
    },
  );
});
