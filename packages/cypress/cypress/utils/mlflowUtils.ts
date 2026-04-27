export const MLFLOW_BFF_STATUS_URL = '/_bff/mlflow/api/v1/status';

export const interceptMlflowStatus = (configured = true): void => {
  cy.intercept('GET', MLFLOW_BFF_STATUS_URL, { body: { configured } }).as('mlflowStatus');
};
