// Centralized timeout constants
// These can be overridden via environment variables

// Model serving timeouts
export const MODEL_STATUS_TIMEOUT = Number(Cypress.env('MODEL_STATUS_TIMEOUT') ?? 120000);

// AutoML run completion timeout (default 5 minutes)
export const AUTOML_RUN_TIMEOUT = Number(Cypress.env('AUTOML_RUN_TIMEOUT') ?? 300000);
