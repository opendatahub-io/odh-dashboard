import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { extractLauncherUrls } from '#~/__tests__/cypress/cypress/utils/urlExtractor';
import { header } from '#~/__tests__/cypress/cypress/pages/components/Header';

describe('Verify the RHOAI Application and Switcher links in the Dashboard Navigation', () => {
  it(
    'Verify the various application tabs and switcher links are operational',
    { tags: ['@Smoke', '@SmokeSet1', '@ODS-771', '@Dashboard', '@NonConcurrent'] },
    () => {
      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      //Click the Application launcher then verify the Application and Switcher URLs
      cy.step('Click the Application Launcher');
      header.findApplicationLauncher().click();

      cy.step('Extract the Application and Switcher URLs');
      extractLauncherUrls().then((urls) => {
        cy.log(`Extracted URLs: ${urls.join(', ')}`);

        cy.step('Verify that each URL is accessible and that a 200 is returned');
        urls.forEach((url) => {
          cy.request(url).then((response) => {
            const { status } = response;
            const logMessage =
              status === 200 ? `✅ ${url} - Status: ${status}` : `❌ ${url} - Status: ${status}`;
            cy.log(logMessage);
            expect(status).to.eq(200);
          });
        });
      });
    },
  );
});
