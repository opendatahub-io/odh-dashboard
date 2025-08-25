// Centralized timeout constants
// These can be overridden via environment variables

// Model serving timeouts
export const MODEL_STATUS_TIMEOUT = Number(Cypress.env('MODEL_STATUS_TIMEOUT') ?? 120000);
