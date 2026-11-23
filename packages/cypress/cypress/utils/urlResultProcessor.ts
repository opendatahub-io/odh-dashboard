/**
 * URL validation result processor utilities
 *
 * Handles categorization, logging, and assertion of URL validation results
 * for manifest link validation tests
 */

import { getErrorType, VALID_STATUS_CODES } from './urlValidatorShared';
import {
  formatValidationMessage,
  type UrlLocation,
  type UrlValidationResultWithLocation,
} from './urlFormatters';

// Global Cypress soft assertion function from support/e2e.ts
declare const softTrue: (condition: boolean, message?: string) => void;

interface CategorizedResults {
  successResults: UrlValidationResultWithLocation[];
  transientErrors: UrlValidationResultWithLocation[];
  blockedErrors: UrlValidationResultWithLocation[];
  permanentErrors: UrlValidationResultWithLocation[];
}

/**
 * Categorize URL validation results into success, transient errors, bot-blocked errors, and permanent errors
 */
export const categorizeValidationResults = (
  results: UrlValidationResultWithLocation[],
): CategorizedResults => {
  const successResults: UrlValidationResultWithLocation[] = [];
  const transientErrors: UrlValidationResultWithLocation[] = [];
  const blockedErrors: UrlValidationResultWithLocation[] = [];
  const permanentErrors: UrlValidationResultWithLocation[] = [];

  results.forEach((result) => {
    const category = getErrorType(result.status, result.error, result.url);
    if (category === 'valid') {
      successResults.push(result);
    } else if (category === 'transient') {
      transientErrors.push(result);
    } else if (category === 'blocked') {
      blockedErrors.push(result);
    } else {
      permanentErrors.push(result);
    }
  });

  return { successResults, transientErrors, blockedErrors, permanentErrors };
};

/**
 * Log categorized URL validation results with proper formatting and context
 */
export const logValidationResults = (
  categorized: CategorizedResults,
  urlToLocationsMap: Map<string, UrlLocation[]>,
): void => {
  const { successResults, transientErrors, blockedErrors, permanentErrors } = categorized;

  // Log results summary
  cy.step(
    `\n📊 Validation Summary:\n` +
      `  ✅ Successful: ${successResults.length}\n` +
      `  ⚠️  Transient Errors (warnings): ${transientErrors.length}\n` +
      `  ⚠️  Bot-Blocked (unverifiable from CI): ${blockedErrors.length}\n` +
      `  ❌ Permanent Errors (failures): ${permanentErrors.length}\n`,
  );

  // Log successful URLs
  successResults.forEach((result) => {
    const logMessage = formatValidationMessage(result, urlToLocationsMap);
    cy.step(logMessage);
  });

  // Log transient errors as warnings (not failures)
  transientErrors.forEach((result) => {
    const errorType = getErrorType(result.status, result.error, result.url);
    cy.step(
      `⚠️  WARNING (transient error): ${result.url} - ${errorType}: ${result.status}${
        result.error ? ` (${result.error})` : ''
      }`,
    );
  });

  // Log bot-blocked URLs as warnings (not failures) — the CDN/WAF in front of
  // these domains rejects non-browser clients, so a 403 is not a broken link.
  blockedErrors.forEach((result) => {
    const logMessage = formatValidationMessage(result, urlToLocationsMap);
    cy.step(logMessage);
  });

  // Log permanent errors (will be asserted separately)
  permanentErrors.forEach((result) => {
    const logMessage = formatValidationMessage(result, urlToLocationsMap);
    cy.step(logMessage);
  });
};

/**
 * Assert permanent errors using soft assertions
 * This allows the test to collect all failures before failing
 */
export const assertPermanentErrors = (permanentErrors: UrlValidationResultWithLocation[]): void => {
  permanentErrors.forEach((result) => {
    const errorType = getErrorType(result.status, result.error, result.url);

    // Use soft assertion for permanent errors only
    softTrue(
      false,
      `URL ${result.url} has a permanent error (${errorType}): ${result.status}${
        result.error ? ` - ${result.error}` : ''
      }. ` +
        `Valid status codes: ${Array.from(VALID_STATUS_CODES).join(', ')}. ` +
        `This is NOT a transient error (429, 502, 503, 504) and indicates a broken link.`,
    );
  });
};

/**
 * Log final summary message based on validation results
 */
export const logFinalSummary = (categorized: CategorizedResults, totalResults: number): void => {
  const { transientErrors, blockedErrors, permanentErrors } = categorized;

  // Note about transient errors if any
  if (transientErrors.length > 0) {
    cy.step(
      `\nℹ️  Note: ${transientErrors.length} URL(s) had transient errors (rate limiting, temporary outages). ` +
        `These are treated as warnings and do not fail the test. ` +
        `The URLs may work if retried later.`,
    );
  }

  // Note about bot-blocked URLs if any
  if (blockedErrors.length > 0) {
    cy.step(
      `\nℹ️  Note: ${blockedErrors.length} URL(s) are behind bot protection (WAF) that rejects non-browser ` +
        `clients, so they cannot be verified from CI. These are treated as warnings and do not fail the test. ` +
        `The links work in real browsers.`,
    );
  }

  // Success message if no permanent errors
  if (permanentErrors.length === 0) {
    cy.step(
      `\n✅ All ${totalResults} URLs are reachable, have only transient errors, or are bot-blocked (unverifiable from CI).`,
    );
  }
};

/**
 * Process and validate URL validation results
 * Main entry point that handles categorization, logging, and assertions
 */
export const processAndValidateResults = (
  results: UrlValidationResultWithLocation[],
  urlToLocationsMap: Map<string, UrlLocation[]>,
): void => {
  // Categorize results
  const categorized = categorizeValidationResults(results);

  // Log all results with proper formatting
  logValidationResults(categorized, urlToLocationsMap);

  // Assert permanent errors (soft assertions)
  assertPermanentErrors(categorized.permanentErrors);

  // Log final summary
  logFinalSummary(categorized, results.length);

  // Flush soft assertions here (in the test body) so Cypress retries work.
  // The global after() hook in support/e2e.ts is a fallback for other tests.
  if (categorized.permanentErrors.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const softAssert = require('soft-assert');
    softAssert.softAssertAll();
  }
};
