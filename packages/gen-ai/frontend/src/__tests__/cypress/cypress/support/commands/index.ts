import '@testing-library/cypress/add-commands';
import './genai';
import './testConfig';

// Add cy.step() command for better test documentation
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Log a test step with auto-numbering
       */
      step: (message: string) => Cypress.Chainable<void>;
    }
  }
}

let stepCounter = 0;

Cypress.Commands.add('step', (message: string) => {
  stepCounter += 1;
  const stepMessage = `Step ${stepCounter}: ${message}`;
  Cypress.log({
    displayName: 'STEP',
    message: stepMessage,
    consoleProps: () => ({
      Step: stepCounter,
      Message: message,
    }),
  });
  cy.log(stepMessage);
});

// Reset step counter before each test
beforeEach(() => {
  stepCounter = 0;
});
