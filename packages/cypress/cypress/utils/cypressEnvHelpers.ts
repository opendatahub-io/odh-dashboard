/**
 * Helpers for reading Cypress runtime env (CY_TEST_CONFIG / cypress.config).
 */

/** `APPLICATIONS_NAMESPACE` from Cypress config (e.g. test-variables.yml). */
export const getApplicationsNamespace = (): string =>
  Cypress.env('APPLICATIONS_NAMESPACE') as string;

/**
 * Reads a Cypress env value as boolean; undefined, null, or empty string yields `fallback`.
 */
export const getBooleanEnv = (name: string, fallback: boolean): boolean => {
  const value = Cypress.env(name);
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  return String(value).toLowerCase() === 'true';
};
