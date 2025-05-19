import * as yaml from 'js-yaml';
import { isUrlExcluded } from '~/__tests__/cypress/cypress/utils/urlExtractor';
import { retryableBefore } from '~/__tests__/cypress/cypress/utils/retryableHooks';

describe('Verify that all the URLs referenced in the Manifest directory are operational', () => {
  let excludedSubstrings: string[];

  // Setup: Load test data
  retryableBefore(() => {
    cy.fixture('e2e/dashboardNavigation/testManifestLinks.yaml', 'utf8').then((yamlString) => {
      const yamlData = yaml.load(yamlString) as { excludedSubstrings: string[] };
      excludedSubstrings = yamlData.excludedSubstrings;
    });
  });

  it(
    'Reads the manifest directory, filters out test/sample URLs and validates the remaining URLs',
    { tags: ['@Smoke', '@SmokeSet1', '@ODS-327', '@ODS-492', '@Dashboard', '@NonConcurrent'] },
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
        const results: Array<{ url: string; status: number }> = [];

        filteredUrls.forEach((url) => {
          const makeRequest = (retryCount = 0) => {
            cy.request({
              url,
              failOnStatusCode: false,
            }).then((response) => {
              const { status } = response;

              // We were getting a 429 sometimes, so we're retrying
              if (status === 429 && retryCount < 3) {
                cy.log(
                  `⚠️ Rate limited (429) for ${url}, waiting 5 seconds before retry ${
                    retryCount + 1
                  }/3`,
                );
                // We need to wait here to respect rate limiting
                // eslint-disable-next-line cypress/no-unnecessary-waiting
                cy.wait(5000).then(() => {
                  makeRequest(retryCount + 1);
                });
                return;
              }

              // Define valid status codes
              const validStatusCodes = [200, 201, 202, 204, 301, 302, 307, 308];
              const isSuccess = validStatusCodes.includes(status);
              const logMessage = isSuccess
                ? `✅ ${url} - Status: ${status}`
                : `❌ ${url} - Status: ${status}`;
              cy.log(logMessage);
              results.push({ url, status });
            });
          };

          makeRequest();
        });

        // Wait for all requests to complete
        cy.wrap(null).then(() => {
          results.forEach(({ url, status }) => {
            const validStatusCodes = [200, 201, 202, 204, 301, 302, 307, 308];
            expect(validStatusCodes).to.include(
              status,
              `URL ${url} should return one of the valid status codes: ${validStatusCodes.join(
                ', ',
              )}`,
            );
          });
        });
      });
    },
  );
});
