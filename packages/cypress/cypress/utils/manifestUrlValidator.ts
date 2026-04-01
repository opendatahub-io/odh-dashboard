/**
 * Manifest URL validation utilities
 *
 * High-level functions for validating URLs in manifest files
 * Used by E2E tests to validate manifest links
 */

import { isUrlExcluded } from './urlExtractor';
import {
  formatUrlLocationsByFile,
  type UrlLocation,
  type UrlValidationResult,
  type UrlValidationResultWithLocation,
} from './urlFormatters';
import {
  validateUrlFormat,
  TRANSIENT_ERROR_CODES,
  PERMANENT_ERROR_CODES,
  VALID_STATUS_CODES,
} from './urlValidator';
import { processAndValidateResults } from './urlResultProcessor';

interface UrlExtractionResult {
  urlLocations: UrlLocation[];
  filteredUrlLocations: UrlLocation[];
  uniqueUrls: string[];
}

interface FormatError {
  url: string;
  error: string;
  locations: UrlLocation[];
}

/**
 * Extract and filter URLs from manifest directory
 */
const extractAndFilterUrls = (
  manifestsDir: string,
  excludedSubstrings: string[],
): Cypress.Chainable<UrlExtractionResult> => {
  return cy.task<UrlLocation[]>('extractHttpsUrls', manifestsDir).then((urlLocations) => {
    // Validate payload shape
    if (!Array.isArray(urlLocations)) {
      throw new Error('Failed to extract URLs from manifests directory');
    }
    // Runtime validation - task could return wrong shape despite types
    /* eslint-disable @typescript-eslint/no-unnecessary-condition */
    if (
      urlLocations.length > 0 &&
      !urlLocations.every(
        (loc) =>
          typeof loc === 'object' &&
          loc !== null &&
          typeof loc.url === 'string' &&
          loc.url.length > 0 &&
          typeof loc.file === 'string' &&
          loc.file.length > 0 &&
          typeof loc.line === 'number',
      )
    ) {
      throw new Error('Invalid URL location format from extractor task');
    }
    /* eslint-enable @typescript-eslint/no-unnecessary-condition */

    const filteredUrlLocations = urlLocations.filter(
      (urlLocation) => urlLocation.url && !isUrlExcluded(urlLocation.url, excludedSubstrings),
    );

    const uniqueUrls = [...new Set(filteredUrlLocations.map((loc) => loc.url))];

    return { urlLocations, filteredUrlLocations, uniqueUrls };
  });
};

/**
 * Build URL to locations mapping for result correlation
 */
const buildUrlToLocationsMap = (
  filteredUrlLocations: UrlLocation[],
): Map<string, UrlLocation[]> => {
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

  return urlToLocationsMap;
};

/**
 * Validate URL formats and collect errors
 */
const validateUrlFormats = (
  uniqueUrls: string[],
  urlToLocationsMap: Map<string, UrlLocation[]>,
): FormatError[] => {
  const formatErrors: FormatError[] = [];

  uniqueUrls.forEach((url) => {
    const formatResult = validateUrlFormat(url);
    if (!formatResult.valid) {
      const locations = urlToLocationsMap.get(url) || [];
      formatErrors.push({
        url,
        error: formatResult.error || 'Unknown format error',
        locations,
      });
    }
  });

  return formatErrors;
};

/**
 * Report format validation errors
 */
const reportFormatErrors = (formatErrors: FormatError[]): void => {
  cy.step(`❌ Found ${formatErrors.length} URLs with format errors:`);
  formatErrors.forEach(({ url, error, locations }) => {
    const locationInfo = locations
      .map((loc) => `${loc.file.split('/').pop() || loc.file}:${loc.line}`)
      .join(', ');
    cy.step(`  ❌ ${url} [${locationInfo}] - ${error}`);
  });
  throw new Error(`${formatErrors.length} URL(s) have format errors. See logs for details.`);
};

/**
 * Validate manifest URL formats (no network requests)
 * Fast validation that checks for HTTPS, localhost, malformed URLs, etc.
 */
export const validateManifestUrlFormats = (
  manifestsDir: string,
  excludedSubstrings: string[],
): Cypress.Chainable<void> => {
  cy.step(`Validating URL formats in: ${manifestsDir}`);

  return (
    extractAndFilterUrls(manifestsDir, excludedSubstrings)
      .then(({ urlLocations, filteredUrlLocations, uniqueUrls }): void => {
        cy.step(
          `Found ${urlLocations.length} total URLs, filtered to ${filteredUrlLocations.length} locations (${uniqueUrls.length} unique URLs)`,
        );

        // Build URL to locations map for efficient lookup
        const urlToLocationsMap = buildUrlToLocationsMap(filteredUrlLocations);

        // Validate formats
        const formatErrors = validateUrlFormats(uniqueUrls, urlToLocationsMap);

        // Report errors if any
        if (formatErrors.length > 0) {
          reportFormatErrors(formatErrors);
        }

        cy.step(`✅ All ${uniqueUrls.length} URLs have valid format`);
      })
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      .then(() => {}) as unknown as Cypress.Chainable<void>
  );
};

/**
 * Validate manifest URL reachability (with network requests)
 * Tolerates transient errors (429, 502, 503, 504) and only fails on permanent errors
 */
export const validateManifestUrlReachability = (
  manifestsDir: string,
  excludedSubstrings: string[],
): Cypress.Chainable<void> => {
  cy.step(`Validating URL reachability in: ${manifestsDir}`);

  return (
    extractAndFilterUrls(manifestsDir, excludedSubstrings)
      .then(({ urlLocations, filteredUrlLocations, uniqueUrls }) => {
        const urlToLocationsMap = buildUrlToLocationsMap(filteredUrlLocations);

        cy.step(
          `Found ${urlLocations.length} total URLs, filtered to ${
            filteredUrlLocations.length
          } locations (${uniqueUrls.length} unique URLs).\n\nValid status codes: ${Array.from(
            VALID_STATUS_CODES,
          ).join(', ')}\nTransient errors (warnings only): ${Array.from(TRANSIENT_ERROR_CODES).join(
            ', ',
          )}\nPermanent errors (failures): ${Array.from(PERMANENT_ERROR_CODES).join(
            ', ',
          )}\n\nURLs to verify:\n${formatUrlLocationsByFile(filteredUrlLocations)}`,
        );

        return cy.task<UrlValidationResult[]>('validateHttpsUrls', uniqueUrls).then((results) => {
          // Validate results payload immediately - task could return wrong shape despite types
          if (!Array.isArray(results)) {
            throw new Error('validateHttpsUrls task did not return an array');
          }
          /* eslint-disable @typescript-eslint/no-unnecessary-condition */
          if (
            results.length > 0 &&
            !results.every(
              (r) =>
                typeof r === 'object' &&
                r !== null &&
                typeof r.url === 'string' &&
                typeof r.status === 'number',
            )
          ) {
            throw new Error('Invalid validation result format from validateHttpsUrls task');
          }
          /* eslint-enable @typescript-eslint/no-unnecessary-condition */

          const resultsWithLocation: UrlValidationResultWithLocation[] = results.map((result) => {
            // Use originalUrl for location lookup (in case of redirects), fall back to url
            const finalUrlLocations =
              urlToLocationsMap.get(result.originalUrl || result.url) ||
              urlToLocationsMap.get(result.url);
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
      .then(({ resultsWithLocation, urlToLocationsMap }): void => {
        // Process and validate all results (categorize, log, assert)
        processAndValidateResults(resultsWithLocation, urlToLocationsMap);
      })
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      .then(() => {}) as unknown as Cypress.Chainable<void>
  );
};
