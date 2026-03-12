import * as yaml from 'js-yaml';
import { isUrlExcluded } from '../../../utils/urlExtractor';
import {
  formatUrlLocationsByFile,
  formatValidationMessage,
  type UrlLocation,
  type UrlValidationResult,
  type UrlValidationResultWithLocation,
  VALID_STATUS_CODES,
} from '../../../utils/urlFormatters';
import { getErrorType } from '../../../utils/urlValidator';

interface ManifestTestConfig {
  excludedSubstrings?: string[];
}

describe('[Automation Bug: RHOAIENG-52642] Verify that all the URLs referenced in the Manifest directory are operational', () => {
  let excludedSubstrings: string[] = [];

  before(() => {
    cy.fixture('e2e/dashboardNavigation/testManifestLinks.yaml').then((yamlString) => {
      try {
        const yamlData = yaml.load(yamlString) as ManifestTestConfig;
        excludedSubstrings = yamlData.excludedSubstrings ?? [];
        cy.step(`Loaded ${excludedSubstrings.length} excluded substrings`);
      } catch (error: unknown) {
        cy.step(
          `Error parsing YAML configuration: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        excludedSubstrings = [];
      }
    });
  });

  it(
    'Reads the manifest directory, filters out test/sample URLs and validates the remaining URLs',
    {
      tags: [
        '@Smoke',
        '@SmokeSet1',
        '@ODS-327',
        '@ODS-492',
        '@Dashboard',
        '@RHOAIENG-9235',
        '@Maintain',
      ],
    },
    () => {
      const manifestsDir = '../../manifests';
      cy.step(`Resolved manifests directory: ${manifestsDir}`);

      cy.task<UrlLocation[]>('extractHttpsUrls', manifestsDir)
        .then((urlLocations) => {
          if (!Array.isArray(urlLocations)) {
            throw new Error('Failed to extract URLs from manifests directory');
          }

          const filteredUrlLocations = urlLocations.filter(
            (urlLocation) => urlLocation.url && !isUrlExcluded(urlLocation.url, excludedSubstrings),
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

          const uniqueUrls = [...urlToLocationsMap.keys()];

          cy.step(
            `Found ${urlLocations.length} total URLs, filtered to ${
              filteredUrlLocations.length
            } locations (${
              uniqueUrls.length
            } unique URLs).\nValid status codes to check: ${Array.from(VALID_STATUS_CODES).join(
              ', ',
            )}\n\nURLs to verify:\n${formatUrlLocationsByFile(filteredUrlLocations)}`,
          );

          return cy.task<UrlValidationResult[]>('validateHttpsUrls', uniqueUrls).then((results) => {
            const resultsWithLocation: UrlValidationResultWithLocation[] = results.map((result) => {
              const finalUrlLocations = urlToLocationsMap.get(result.url);
              const location =
                finalUrlLocations && finalUrlLocations.length > 0
                  ? finalUrlLocations[0]
                  : undefined;

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

          resultsWithLocation.forEach((result) => {
            const isValid = VALID_STATUS_CODES.has(result.status);
            const logMessage = formatValidationMessage(result, urlToLocationsMap);
            const errorType = getErrorType(result.status, result.error);

            cy.step(logMessage);
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
    },
  );
});
