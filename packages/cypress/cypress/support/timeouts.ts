// Centralized timeout constants
// These can be overridden via environment variables

// Model serving timeouts
export const MODEL_STATUS_TIMEOUT = Number(Cypress.env('MODEL_STATUS_TIMEOUT') ?? 120000);

// AutoML run completion timeout (default 20 minutes)
export const AUTOML_RUN_TIMEOUT = Number(Cypress.env('AUTOML_RUN_TIMEOUT') ?? 1200000);

// AutoRAG optimization completion timeout (default 60 minutes)
export const AUTORAG_COMPLETION_TIMEOUT_MS = Number(
  Cypress.env('AUTORAG_COMPLETION_TIMEOUT_MS') ?? 60 * 60 * 1000,
);

// AutoRAG cancellation timeout (default 2 minutes)
export const AUTORAG_CANCELLATION_TIMEOUT_MS = Number(
  Cypress.env('AUTORAG_CANCELLATION_TIMEOUT_MS') ?? 2 * 60 * 1000,
);
