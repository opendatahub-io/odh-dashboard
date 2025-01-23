import * as yaml from 'js-yaml';
import { isUrlExcluded } from '~/__tests__/cypress/cypress/utils/urlExtractor';

describe('[Known Bug: RHOAIENG-9235] Verify that all the URLs referenced in the Manifest directory are operational', () => {
  let excludedSubstrings: string[];

  // Setup: Load test data
  before(() => {
    cy.fixture('e2e/dashboardNavigation/testManifestLinks.yaml', 'utf8').then((yamlString) => {
      const yamlData = yaml.load(yamlString) as { excludedSubstrings: string[] };
      excludedSubstrings = yamlData.excludedSubstrings;
    });
  });

  it(
    'Reads the manifest directory, filters out test/sample URLs and validates the remaining URLs',
    { tags: ['@Smoke', '@SmokeSet1', '@ODS-327', '@ODS-492', '@Dashboard', '@Bug'] },
    () => {
      const manifestsDir = '../../../../manifests';
      cy.log(`Resolved manifests directory: ${manifestsDir}`);

      // Extract URLs from the manifests directory using the registered task
      cy.task<string[]>('extractHttpsUrls', manifestsDir).then((urls) => {
        // Filter out Sample/Test URLs
        const filteredUrls = urls.filter((url) => !isUrlExcluded(url, excludedSubstrings));

        // Log filtered URLs for debugging
        filteredUrls.forEach((url) => {
          cy.log(url);
        });

        // Verify that each remaining URL is accessible and returns a 200 status code
        cy.step(
          'Verify that each filtered URL is accessible and that a 200 is returned - currently failing due to issues linked RHOAIENG-9235',
        );
        filteredUrls.forEach((url) => {
          cy.request(url).then((response) => {
            const { status } = response;
            const logMessage =
              status === 200 ? `✅ ${url} - Status: ${status}` : `❌ ${url} - Status: ${status}`;
            cy.log(logMessage);
            expect(status).to.eq(200); // Assert that the response status is 200
          });
        });
      });
    },
  );
});
