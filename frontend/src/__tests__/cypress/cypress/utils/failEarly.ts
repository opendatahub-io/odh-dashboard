const getRunTypeRetries = () => {
  const retryConfig = Cypress.config('retries');
  let configuredRetries = 0;
  if (typeof retryConfig === 'number' && Number.isInteger(retryConfig)) {
    configuredRetries = retryConfig;
  }
  if (typeof retryConfig === 'object' && retryConfig !== null) {
    if (
      retryConfig.runMode &&
      Number.isInteger(retryConfig.runMode) &&
      !Cypress.config('isInteractive')
    ) {
      configuredRetries = retryConfig.runMode as number;
    }
    if (
      retryConfig.openMode &&
      Number.isInteger(retryConfig.openMode) &&
      Cypress.config('isInteractive')
    ) {
      configuredRetries = retryConfig.openMode as number;
    }
  }
  return configuredRetries;
};

export const failEarly = (): void => {
  const failedTest: Record<string, string | undefined> = {};
  beforeEach(() => {
    const specName = Cypress.spec.name;
    if (failedTest[specName]) {
      cy.log(
        `Spec has failed. You will see an error emitted from beforeEach, but only need to fix failing tests.`,
      );
    }
    cy.wrap(failedTest[specName]).should('be.undefined');
  });
  afterEach(function handleFailedTest() {
    const retryCount = Cypress.currentRetry;
    const specName = Cypress.spec.name;
    if (
      this.currentTest?.state === 'failed' &&
      Number.isInteger(retryCount) &&
      getRunTypeRetries() <= retryCount
    ) {
      failedTest[
        specName
      ] = `Previous test, "${this.currentTest.title}", failed. This spec will be aborted.`;
    }
  });
};
