/**
 * URL validation result processor utilities
 *
 * Handles categorization, logging, and assertion of URL validation results
 * for manifest link validation tests
 */

import { categorizeUrlValidationResult, getErrorType, VALID_STATUS_CODES } from './urlValidator';
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
  permanentErrors: UrlValidationResultWithLocation[];
}

/**
 * Categorize URL validation results into success, transient errors, and permanent errors
 */
export const categorizeValidationResults = (
  results: UrlValidationResultWithLocation[],
): CategorizedResults => {
  const successResults: UrlValidationResultWithLocation[] = [];
  const transientErrors: UrlValidationResultWithLocation[] = [];
  const permanentErrors: UrlValidationResultWithLocation[] = [];

  results.forEach((result) => {
    const category = categorizeUrlValidationResult(result);
    if (category === 'success') {
      successResults.push(result);
    } else if (category === 'transient') {
      transientErrors.push(result);
    } else {
      permanentErrors.push(result);
    }
  });

  return { successResults, transientErrors, permanentErrors };
};

/**
 * Log categorized URL validation results with proper formatting and context
 */
export const logValidationResults = (
  categorized: CategorizedResults,
  urlToLocationsMap: Map<string, UrlLocation[]>,
): void => {
  const { successResults, transientErrors, permanentErrors } = categorized;

  // Log results summary
  cy.step(
    `\n📊 Validation Summary:\n` +
      `  ✅ Successful: ${successResults.length}\n` +
      `  ⚠️  Transient Errors (warnings): ${transientErrors.length}\n` +
      `  ❌ Permanent Errors (failures): ${permanentErrors.length}\n`,
  );

  // Log successful URLs
  successResults.forEach((result) => {
    const logMessage = formatValidationMessage(result, urlToLocationsMap);
    cy.step(logMessage);
  });

  // Log transient errors as warnings (not failures)
  transientErrors.forEach((result) => {
    const errorType = getErrorType(result.status, result.error);
    cy.step(
      `⚠️  WARNING (transient error): ${result.url} - ${errorType}: ${result.status}${
        result.error ? ` (${result.error})` : ''
      }`,
    );
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
    const errorType = getErrorType(result.status, result.error);

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
  const { transientErrors, permanentErrors } = categorized;

  // Note about transient errors if any
  if (transientErrors.length > 0) {
    cy.step(
      `\nℹ️  Note: ${transientErrors.length} URL(s) had transient errors (rate limiting, temporary outages). ` +
        `These are treated as warnings and do not fail the test. ` +
        `The URLs may work if retried later.`,
    );
  }

  // Success message if no permanent errors
  if (permanentErrors.length === 0) {
    cy.step(`\n✅ All ${totalResults} URLs are either reachable or have only transient errors.`);
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
};
