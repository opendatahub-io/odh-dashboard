/**
 * Ensures that the provided setup logic in the `before` block is re-executed on test retries.
 * This utility modifies the behavior of Cypress's `beforeEach` hook to conditionally run the setup
 * logic only when necessary (e.g., on test retries after a failure).
 *
 * @param {() => void | Promise<void> | Cypress.Chainable<any>} fn - The setup function to execute.
 */
export const retryableBefore = <T>(fn: () => void | Promise<void> | Cypress.Chainable<T>): void => {
  let shouldRun = true;

  beforeEach(function retryableBeforeEach() {
    if (this.currentTest?.isPending() || !shouldRun) return;
    shouldRun = false;
    cy.wrap(null).then(fn);
  });

  Cypress.on('test:after:run', (result) => {
    if (result.state === 'failed' && result.currentRetry < result.retries) {
      shouldRun = true;
    }
  });
};
