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
import '@cypress/grep';
import chaiSubset from 'chai-subset';
import '@cypress/code-coverage/support';
import 'cypress-mochawesome-reporter/register';
import 'cypress-plugin-steps';
import './commands';
import { asProjectAdminUser } from '~/__tests__/cypress/cypress/utils/mockUsers';
import { addCommands as webSocketsAddCommands } from './websockets';

// Define a custom type for test options that includes tags.
type TestOptions = {
  tags?: string[];
  [key: string]: unknown;
};

// Define an interface for the test function that supports retries.
interface TestWithRetries extends Mocha.TestFunction {
  retries: (n: number) => void;
}

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  // Extend Cypress globals with a testTags property.
  namespace Cypress {
    interface Cypress {
      testTags: { [key: string]: string[] };
      suiteTestCount: { [key: string]: { total: number; skipped: number } };
      Suite: {
        beforeAll: Array<() => void>;
        afterAll: Array<() => void>;
        tests: Array<{ pending: boolean }>;
      };
    }
  }

  interface Window {
    // Extend the Mocha "it" function to accept our custom TestOptions.
    it: Mocha.TestFunction & {
      (name: string, options: TestOptions, fn?: Mocha.AsyncFunc | Mocha.Func): Mocha.Test;
    };
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

// Initialize global configurations
chai.use(chaiSubset);
webSocketsAddCommands();

// eslint-disable-next-line no-console
console.log('Support file loaded');

// Configure Cypress settings
Cypress.Keyboard.defaults({
  keystrokeDelay: 0,
});

// Initialize tracking objects
Cypress.testTags = {};
Cypress.suiteTestCount = {};

// Test Tags Implementation
(function setupTestTags() {
  const originalIt = window.it;

  // Create a type-safe wrapper for the original it function.
  const wrappedIt = function it(
    name: string,
    options: TestOptions | Mocha.AsyncFunc | Mocha.Func,
    fn?: Mocha.AsyncFunc | Mocha.Func,
  ): Mocha.Test {
    // If called with two arguments and the second is a function, use it directly.
    if (arguments.length === 2 && typeof options === 'function') {
      return originalIt(name, options as Mocha.Func);
    }

    // If options is an object with tags, store them on Cypress.testTags.
    if (typeof options === 'object' && options.tags) {
      Cypress.testTags[name] = options.tags;
    }

    return originalIt(name, options as TestOptions, fn);
  };

  // Copy properties (like .only and .skip) from the original it.
  wrappedIt.only = originalIt.only;
  wrappedIt.skip = originalIt.skip;

  // Handle retries if they exist.
  (wrappedIt as TestWithRetries).retries = (originalIt as TestWithRetries).retries;

  // Replace window.it with our wrapped version,
  // casting it to the proper type to satisfy TypeScript.
  window.it = wrappedIt as Mocha.TestFunction &
    ((name: string, options: TestOptions, fn?: Mocha.AsyncFunc | Mocha.Func) => Mocha.Test);
})();

// Event handlers
Cypress.on('test:before:run', (test) => {
  // eslint-disable-next-line no-console
  console.log(`Running test: ${test.title}`);
});

// Track suites and their tests
Cypress.on('suite:start', (suite) => {
  if (suite.title) {
    Cypress.suiteTestCount[suite.title] = { total: suite.tests.length, skipped: 0 };
  }
});

// Global before hook
before(() => {
  cy.intercept({ resourceType: /xhr|fetch/ }, { log: false });
});

// Enhanced beforeEach with suite-level control
beforeEach(function beforeEachHook(this: Mocha.Context) {
  if (!this.currentTest) {
    return;
  }

  const testTitle = this.currentTest.title;
  const currentSuite = this.currentTest.parent;
  const suiteTitle = currentSuite?.title;
  const testTags = Cypress.testTags[testTitle] ?? [];
  const mappedTestTags = testTags.map((tag: string) => (tag.startsWith('@') ? tag : `@${tag}`));

  const skipTags = Cypress.env('skipTags') ? Cypress.env('skipTags').split(' ') : [];
  const grepTags = Cypress.env('grepTags') ? Cypress.env('grepTags').split(' ') : [];

  // Chain Cypress commands
  cy.task('log', `Test title: ${testTitle}`)
    .then(() => cy.task('log', `Test tags: ${JSON.stringify(mappedTestTags)}`))
    .then(() => cy.task('log', `Skip tags: ${JSON.stringify(skipTags)}`))
    .then(() => cy.task('log', `Grep tags: ${JSON.stringify(grepTags)}`))
    .then(() => {
      // Determine if the test should be skipped.
      const shouldSkip =
        skipTags.length > 0 && skipTags.some((tag: string) => mappedTestTags.includes(tag));
      const shouldRun =
        grepTags.length === 0 ||
        grepTags.some((tag: string) => {
          const plainTag = tag.startsWith('@') ? tag.substring(1) : tag;
          return mappedTestTags.some((t: string) => t === tag || t === `@${plainTag}`);
        });

      if (shouldSkip || !shouldRun) {
        if (suiteTitle && typeof suiteTitle === 'string') {
          Cypress.suiteTestCount[suiteTitle] ??= { skipped: 0, total: 0 };
          Cypress.suiteTestCount[suiteTitle].skipped++;

          const suiteStats = Cypress.suiteTestCount[suiteTitle];
          if (suiteStats.skipped === suiteStats.total) {
            // Empty the hooks arrays
            (currentSuite as unknown as { beforeAll: (() => void)[] }).beforeAll = [];
            (currentSuite as unknown as { afterAll: (() => void)[] }).afterAll = [];
            // Also skip any remaining tests in the suite
            currentSuite.tests = currentSuite.tests.map((test) =>
              Object.assign({}, test, { pending: true }),
            );
          }
        }
        this.skip();
      }
    });

  if (Cypress.env('MOCK')) {
    // Fallback: return 404 for all API requests.
    cy.intercept({ pathname: '/api/**' }, { statusCode: 404 });
    // Default intercepts.
    asProjectAdminUser();
  }
});
