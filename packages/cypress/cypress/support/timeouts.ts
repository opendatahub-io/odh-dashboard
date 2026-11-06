// Centralized timeout constants
// These can be overridden via environment variables

// Model serving timeouts
export const MODEL_STATUS_TIMEOUT = Number(Cypress.env('MODEL_STATUS_TIMEOUT') ?? 120000);

// AutoML run completion timeout (default 20 minutes)
export const AUTOML_RUN_TIMEOUT = Number(Cypress.env('AUTOML_RUN_TIMEOUT') ?? 1200000);

const readPositiveTimeout = (name: string, defaultValue: number): number => {
  const configuredValue = Cypress.env(name);
  if (
    configuredValue === undefined ||
    configuredValue === null ||
    (typeof configuredValue === 'string' && !configuredValue.trim())
  ) {
    return defaultValue;
  }

  if (typeof configuredValue !== 'string' && typeof configuredValue !== 'number') {
    throw new Error(`${name} must be a string or number of milliseconds.`);
  }

  const timeout = Number(configuredValue);
  if (!Number.isFinite(timeout) || timeout <= 0) {
    throw new Error(`${name} must be a finite, positive number of milliseconds.`);
  }

  return timeout;
};

// AutoRAG optimization completion timeout (default 60 minutes)
export const AUTORAG_COMPLETION_TIMEOUT_MS = readPositiveTimeout(
  'AUTORAG_COMPLETION_TIMEOUT_MS',
  60 * 60 * 1000,
);

// AutoRAG cancellation timeout (default 2 minutes)
export const AUTORAG_CANCELLATION_TIMEOUT_MS = readPositiveTimeout(
  'AUTORAG_CANCELLATION_TIMEOUT_MS',
  2 * 60 * 1000,
);
