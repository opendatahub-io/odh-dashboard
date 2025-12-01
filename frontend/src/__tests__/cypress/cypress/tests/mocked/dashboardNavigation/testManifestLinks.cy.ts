import * as yaml from 'js-yaml';
import { isUrlExcluded } from '#~/__tests__/cypress/cypress/utils/urlExtractor';
import {
  formatUrlLocationsByFile,
  formatValidationMessage,
  type UrlLocation,
  type UrlValidationResult,
  type UrlValidationResultWithLocation,
  VALID_STATUS_CODES,
} from '#~/__tests__/cypress/cypress/utils/urlFormatters';
import { getErrorType } from '#~/__tests__/cypress/cypress/utils/urlValidator';

interface ManifestTestConfig {
  excludedSubstrings?: string[];
}

describe('Verify that all the URLs referenced in the Manifest directory are operational', () => {
  let excludedSubstrings: string[] = [];

  before(() => {
    cy.fixture('e2e/dashboardNavigation/testManifestLinks.yaml').then((yamlString) => {
      try {
        const yamlData = yaml.load(yamlString) as ManifestTestConfig;
        excludedSubstrings = yamlData.excludedSubstrings ?? [];
        cy.log(`Loaded ${excludedSubstrings.length} excluded substrings`);
      } catch (error: unknown) {
        cy.log(
          'Error parsing YAML configuration:',
          error instanceof Error ? error.message : String(error),
        );
        excludedSubstrings = [];
      }
    });
  });

  it('Reads the manifest directory, filters out test/sample URLs and validates the remaining URLs', () => {
    const manifestsDir = '../../../../manifests';
    cy.log(`Resolved manifests directory: ${manifestsDir}`);

    cy.task<UrlLocation[]>('extractHttpsUrls', manifestsDir)
      .then((urlLocations) => {
        if (!Array.isArray(urlLocations)) {
          throw new Error('Failed to extract URLs from manifests directory');
        }

        const filteredUrlLocations = urlLocations.filter(
          (urlLocation) => urlLocation.url && !isUrlExcluded(urlLocation.url, excludedSubstrings),
        );

        const filteredUrls = filteredUrlLocations.map((location) => location.url);

        cy.log(
          `Found ${urlLocations.length} total URLs, filtered to ${
            filteredUrlLocations.length
          } URLs.\nValid status codes to check: ${Array.from(VALID_STATUS_CODES).join(
            ', ',
          )}\n\nURLs to verify:\n${formatUrlLocationsByFile(filteredUrlLocations)}`,
        );

        const urlToLocationsMap = new Map<string, UrlLocation[]>();
        filteredUrlLocations.forEach((location) => {
          if (!urlToLocationsMap.has(location.url)) {
            urlToLocationsMap.set(location.url, []);
          }
          const locationsForUrl = urlToLocationsMap.get(location.url);
          if (locationsForUrl) {
            locationsForUrl.push(location);
          }
        });

        return cy.task<UrlValidationResult[]>('validateHttpsUrls', filteredUrls).then((results) => {
          const resultsWithLocation: UrlValidationResultWithLocation[] = results.map((result) => {
            const finalUrlLocations = urlToLocationsMap.get(result.url);
            const location =
              finalUrlLocations && finalUrlLocations.length > 0 ? finalUrlLocations[0] : undefined;

            return {
              ...result,
              location,
            };
          });

          return { resultsWithLocation, urlToLocationsMap };
        });
      })
      .then(({ resultsWithLocation, urlToLocationsMap }) => {
        if (!Array.isArray(resultsWithLocation)) {
          throw new Error('Failed to validate URLs');
        }

        const loggedUrls = new Set<string>();

        resultsWithLocation.forEach((result) => {
          if (loggedUrls.has(result.url)) {
            return;
          }
          loggedUrls.add(result.url);

          const isValid = VALID_STATUS_CODES.has(result.status);
          const logMessage = formatValidationMessage(result, urlToLocationsMap);
          const errorType = getErrorType(result.status, result.error);

          cy.log(logMessage);
          softTrue(
            isValid,
            `URL ${result.url} should return one of the valid status codes (${Array.from(
              VALID_STATUS_CODES,
            ).join(', ')}), but was ${result.status}${
              result.error ? ` - ${errorType}: ${result.error}` : ''
            }`,
          );
        });
      });
  });
});
