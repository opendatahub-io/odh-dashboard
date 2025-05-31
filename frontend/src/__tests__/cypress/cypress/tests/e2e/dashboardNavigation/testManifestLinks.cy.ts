import * as yaml from 'js-yaml';
import { isUrlExcluded } from '#~/__tests__/cypress/cypress/utils/urlExtractor';

/**
 * Type definitions for URL validation results
 */
interface UrlValidationResult {
  url: string;
  status: number;
  error?: string;
}

/**
 * Type definition for the YAML configuration
 */
interface ManifestTestConfig {
  excludedSubstrings?: string[];
}

/**
 * Set of valid HTTP status codes that indicate a successful response
 * 200-204: Success responses
 */
const VALID_STATUS_CODES = new Set([200, 201, 202, 204]);

/**
 * Error code mappings for better error reporting
 */
const ERROR_CODES = {
  [-1]: 'TIMEOUT',
  [-2]: 'REDIRECT_MAX',
  [-3]: 'REDIRECT_INVALID',
  [-4]: 'ABORTED',
  [-5]: 'NETWORK_ERROR',
} as const;

/**
 * Formats the validation result message for logging
 * @param result - The URL validation result
 * @returns Formatted log message
 */
const formatValidationMessage = (result: UrlValidationResult): string => {
  const { url, status, error } = result;
  const isValid = VALID_STATUS_CODES.has(status);

  if (isValid) {
    return `✅ ${url} - Status: ${status}`;
  }

  const statusKey = status as keyof typeof ERROR_CODES;
  const errorType = statusKey in ERROR_CODES ? ERROR_CODES[statusKey] : 'UNKNOWN';
  const baseMessage = `${errorType} ❌ ${url} - Error Code: ${status}`;
  return error ? `${baseMessage} (Details: ${error})` : baseMessage;
};

describe('Verify that all the URLs referenced in the Manifest directory are operational', () => {
  let excludedSubstrings: string[] = [];

  before(() => {
    // Load and parse the YAML configuration
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

  it(
    'Reads the manifest directory, filters out test/sample URLs and validates the remaining URLs',
    { tags: ['@Smoke', '@SmokeSet1', '@ODS-327', '@ODS-492', '@Dashboard', '@RHOAIENG-9235'] },
    () => {
      // Verify that excludedSubstrings is properly initialized
      const manifestsDir = '../../../../manifests';
      cy.log(`Resolved manifests directory: ${manifestsDir}`);

      cy.task<string[]>('extractHttpsUrls', manifestsDir)
        .then((urls) => {
          if (!Array.isArray(urls)) {
            throw new Error('Failed to extract URLs from manifests directory');
          }

          // Filter out Sample/Test URLs in a single pass
          const filteredUrls = urls.filter((url) => url && !isUrlExcluded(url, excludedSubstrings));

          cy.log(
            `Found ${urls.length} total URLs, filtered to ${
              filteredUrls.length
            } URLs.\nValid status codes to check: ${Array.from(VALID_STATUS_CODES).join(
              ', ',
            )}\n\nURLs to verify:\n${filteredUrls.join('\n')}`,
          );

          return cy.task<UrlValidationResult[]>('validateHttpsUrls', filteredUrls);
        })
        .then((results) => {
          if (!Array.isArray(results)) {
            throw new Error('Failed to validate URLs');
          }

          results.forEach((result) => {
            const isValid = VALID_STATUS_CODES.has(result.status);
            const logMessage = formatValidationMessage(result);

            cy.step(logMessage);
            softTrue(
              isValid,
              `URL ${result.url} should return one of the valid status codes (${Array.from(
                VALID_STATUS_CODES,
              ).join(', ')}), but was ${result.status}${
                result.error ? ` - Details: ${result.error}` : ''
              }`,
            );
          });
        });
    },
  );
});
