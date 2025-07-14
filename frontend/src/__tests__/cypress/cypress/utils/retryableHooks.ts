/**
 * Ensures that the provided setup logic in the `before` and 'beforeEach' block is re-executed on test retries.
 * This utility modifies the behavior of Cypress's `beforeEach` hook to conditionally run the setup
 * logic only when necessary (e.g., on test retries after a failure).
 *
 * @param {() => void | Promise<void> | Cypress.Chainable<any>} fn - The setup function to execute.
 */
let setupPerformed = false;

export const retryableBefore = <T>(fn: () => void | Promise<void> | Cypress.Chainable<T>): void => {
  let shouldRun = true;

  beforeEach(function retryableBeforeEach() {
    if (this.currentTest?.isPending() || !shouldRun) {
      return;
    }
    shouldRun = false;
    setupPerformed = true;
    cy.wrap(null).then(fn);
  });

  Cypress.on('test:after:run', (result) => {
    if (result.state === 'failed' && result.currentRetry < result.retries) {
      shouldRun = true;
    }
  });
};

export const retryableBeforeEach = <T>(
  fn: () => void | Promise<void> | Cypress.Chainable<T>,
): void => {
  let shouldRun = true;

  beforeEach(function retryableBeforeEachHook() {
    if (this.currentTest?.isPending() || !shouldRun) {
      return;
    }
    shouldRun = true;
    setupPerformed = true;
    cy.wrap(null).then(fn);
  });

  Cypress.on('test:after:run', (result) => {
    if (result.state === 'failed' && result.currentRetry < result.retries) {
      shouldRun = true;
    }
  });
};

export const wasSetupPerformed = (): boolean => setupPerformed;
