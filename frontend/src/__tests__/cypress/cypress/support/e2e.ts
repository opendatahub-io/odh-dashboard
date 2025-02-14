// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

import '~/types';
import registerCypressGrep from '@cypress/grep';
import chaiSubset from 'chai-subset';
import '@cypress/code-coverage/support';
import 'cypress-mochawesome-reporter/register';
import 'cypress-plugin-steps';
import './commands';
import { asProjectAdminUser } from '~/__tests__/cypress/cypress/utils/mockUsers';
import { addCommands as webSocketsAddCommands } from './websockets';

// Initialize global configurations
registerCypressGrep();
chai.use(chaiSubset);
webSocketsAddCommands();

// eslint-disable-next-line no-console
console.log('Support file loaded');

// Configure Cypress settings
Cypress.Keyboard.defaults({
  keystrokeDelay: 0,
});

// Define more specific types for test functions and options
type TestOptions = {
  tags?: string[];
  [key: string]: unknown;
};

// Add custom properties to Cypress
declare global {
  interface Window {
    it: Mocha.TestFunction & {
      (name: string, options: TestOptions, fn?: Mocha.AsyncFunc | Mocha.Func): Mocha.Test;
    };
  }
}

// Add testTags to Cypress
Cypress.testTags = {};

// Test Tags Implementation
(function setupTestTags() {
  const originalIt = window.it;

  // Type-safe wrapper for the original it function (to assign properties to it)
  const wrappedIt = function it(
    name: string,
    options: TestOptions | Mocha.AsyncFunc | Mocha.Func,
    fn?: Mocha.AsyncFunc | Mocha.Func,
  ): Mocha.Test {
    if (arguments.length === 2 && typeof options === 'function') {
      return originalIt(name, options as Mocha.Func);
    }

    if (typeof options === 'object' && options.tags) {
      Cypress.testTags[name] = options.tags;
    }

    return originalIt(name, options as unknown, fn);
  };

  // Copy over the properties from the original it
  wrappedIt.only = originalIt.only;
  wrappedIt.skip = originalIt.skip;

  // Handle retries if it exists
  if ('retries' in originalIt) {
    (wrappedIt as unknown).retries = (originalIt as unknown).retries;
  }

  // Replace window.it with our wrapped version
  window.it = wrappedIt as unknown;
})();

// Event handlers
Cypress.on('test:before:run', (test) => {
  // eslint-disable-next-line no-console
  console.log(`Running test: ${test.title}`);
});

// Global hooks
before(() => {
  // Disable Cypress's default behavior of logging all XMLHttpRequests and fetches
  cy.intercept({ resourceType: /xhr|fetch/ }, { log: false });
});

beforeEach(function beforeEachHook() {
  // Tag-based test filtering logic
  const processTestTags = () => {
    const skipTags = Cypress.env('skipTags') ? Cypress.env('skipTags').split(' ') : [];
    const grepTags = Cypress.env('grepTags') ? Cypress.env('grepTags').split(' ') : [];

    // Handle case where this.currentTest might be undefined
    if (!this.currentTest) {
      cy.task('log', 'Warning: currentTest is undefined');
      return;
    }

    const testTitle = this.currentTest.title;

    // Get and normalize test tags
    let testTags = Cypress.testTags[testTitle] || [];
    testTags = testTags.map((tag: string) => (tag.startsWith('@') ? tag : `@${tag}`));

    // Log test information
    cy.task('log', `Test title: ${testTitle}`);
    cy.task('log', `Test tags: ${JSON.stringify(testTags)}`);
    cy.task('log', `Skip tags: ${JSON.stringify(skipTags)}`);
    cy.task('log', `Grep tags: ${JSON.stringify(grepTags)}`);

    // Determine if test should be skipped
    const shouldSkip =
      skipTags.length > 0 && skipTags.some((tag: string) => testTags.includes(tag));
    const shouldRun =
      grepTags.length === 0 ||
      grepTags.some((tag: string) => {
        const plainTag = tag.startsWith('@') ? tag.substring(1) : tag;
        return testTags.some((t: string) => t === tag || t === `@${plainTag}`);
      });

    if (shouldSkip) {
      cy.task('log', `Skipping test due to skipTags: ${testTitle}`);
      this.skip();
    } else if (!shouldRun) {
      cy.task('log', `Skipping test due to grepTags: ${testTitle}`);
      this.skip();
    } else {
      cy.task('log', `Running test: ${testTitle}`);
    }
  };

  processTestTags();

  // Setup mocks if needed
  if (Cypress.env('MOCK')) {
    // Fallback: return 404 for all api requests
    cy.intercept({ pathname: '/api/**' }, { statusCode: 404 });
    // Default intercepts
    asProjectAdminUser();
  }
});
