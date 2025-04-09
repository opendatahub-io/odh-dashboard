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
import { mockDscStatus } from '~/__mocks__/mockDscStatus';
import { addCommands as webSocketsAddCommands } from './websockets';

// Define a custom type for test options that includes tags.
type TestOptions = {
  tags?: string[];
  [key: string]: unknown;
};

const softAssert = require('soft-assert');
(global as any).softAssert = softAssert;

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
      skippedSuites: Set<string>;
      testsExecuted: boolean; // Added flag to track if any tests were executed
    }
  }

  interface Window {
    // Extend the Mocha "it" function to accept our custom TestOptions.
    it: Mocha.TestFunction & {
      (name: string, options: TestOptions, fn?: Mocha.AsyncFunc | Mocha.Func): Mocha.Test;
    };
  }

  const softAssert: {
    softAssert: (actual: any, expected: any, msg?: string) => void;
    softAssertAll: () => void;
    softTrue: (condition: boolean, msg?: string) => void;
  };
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
Cypress.skippedSuites = new Set<string>();
Cypress.testsExecuted = false; // Initialize the flag to track test execution

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

// Function to check if a test should be skipped based on tags
function shouldSkipTest(testTags: string[]): boolean {
  const mappedTestTags = testTags.map((tag: string) => (tag.startsWith('@') ? tag : `@${tag}`));
  const skipTags = Cypress.env('skipTags') ? Cypress.env('skipTags').split(' ') : [];
  const grepTags = Cypress.env('grepTags') ? Cypress.env('grepTags').split(' ') : [];

  const shouldSkip =
    skipTags.length > 0 && skipTags.some((tag: string) => mappedTestTags.includes(tag));
  const shouldRun =
    grepTags.length === 0 ||
    grepTags.some((tag: string) => {
      const plainTag = tag.startsWith('@') ? tag.substring(1) : tag;
      return mappedTestTags.some((t: string) => t === tag || t === `@${plainTag}`);
    });

  return shouldSkip || !shouldRun;
}

// Event handlers
Cypress.on('test:before:run', (test) => {
  // Set the flag to indicate a test is running
  Cypress.testsExecuted = true;

  // eslint-disable-next-line no-console
  console.log(`Running test: ${test.title}`);
});

// Track suites and their tests
Cypress.on('suite:start', (suite) => {
  if (suite.title) {
    Cypress.suiteTestCount[suite.title] = { total: suite.tests.length, skipped: 0 };
  }
});

// This hook runs at the start of each suite to check if all tests should be skipped
Cypress.on('suite:start', (suite) => {
  if (!suite.title || Cypress.skippedSuites.has(suite.title)) {
    return;
  }

  // Check if all tests in the suite should be skipped
  const allTestsShouldBeSkipped = suite.tests.every((test: { title: string }) => {
    const testTags = Cypress.testTags[test.title] || [];
    return shouldSkipTest(testTags);
  });

  if (allTestsShouldBeSkipped && suite.tests.length > 0) {
    // Mark this suite as completely skipped
    Cypress.skippedSuites.add(suite.title);

    // Skip all tests in the suite
    suite.tests.forEach((test: { pending: boolean }) => {
      test.pending = true;
    });

    // Clear out before/after hooks to prevent them from running
    if (suite._beforeAll) suite._beforeAll = [];
    if (suite._afterAll) suite._afterAll = [];
    if (suite._beforeEach) suite._beforeEach = [];
    if (suite._afterEach) suite._afterEach = [];

    cy.log(`Skipping entire suite: ${suite.title} as all tests are tagged for skipping`);
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

  // If the entire suite is marked as skipped, skip this test immediately
  if (suiteTitle && Cypress.skippedSuites.has(suiteTitle)) {
    this.skip();
    return;
  }

  const testTags = Cypress.testTags[testTitle] ?? [];
  const mappedTestTags = testTags.map((tag: string) => (tag.startsWith('@') ? tag : `@${tag}`));

  const skipTags = Cypress.env('skipTags') ? Cypress.env('skipTags').split(' ') : [];
  const grepTags = Cypress.env('grepTags') ? Cypress.env('grepTags').split(' ') : [];

  // Chain Cypress commands
  cy.task('log', `Test title: ${testTitle}`)
    .then(() =>
      mappedTestTags.length > 0
        ? cy.task('log', `Test tags: ${JSON.stringify(mappedTestTags)}`)
        : undefined,
    )
    .then(() =>
      skipTags.length > 0 ? cy.task('log', `Skip tags: ${JSON.stringify(skipTags)}`) : undefined,
    )
    .then(() =>
      grepTags.length > 0 ? cy.task('log', `Grep tags: ${JSON.stringify(grepTags)}`) : undefined,
    )
    .then(() => {
      // Determine if the test should be skipped
      if (shouldSkipTest(testTags)) {
        if (suiteTitle && typeof suiteTitle === 'string') {
          Cypress.suiteTestCount[suiteTitle] ??= { skipped: 0, total: 0 };
          Cypress.suiteTestCount[suiteTitle].skipped++;

          // If all tests in the suite are now skipped, mark the suite as skipped
          const suiteStats = Cypress.suiteTestCount[suiteTitle];
          if (suiteStats.skipped === suiteStats.total && suiteStats.total > 0) {
            Cypress.skippedSuites.add(suiteTitle);
            cy.log(`All tests in suite "${suiteTitle}" are now skipped. Hooks will be skipped.`);
          }
        }
        this.skip();
      }
    });

  if (Cypress.env('MOCK')) {
    // Fallback: return 404 for all API requests.
    cy.intercept({ pathname: '/api/**' }, { statusCode: 404 });
    // Default intercepts.
    cy.interceptOdh('GET /api/dsc/status', mockDscStatus({}));
    asProjectAdminUser();
  }
});

// Use a pattern that properly skips afterAll hooks for skipped suites
afterEach(function afterEachHook(this: Mocha.Context) {
  if (!this.currentTest) return;

  const suiteTitle = this.currentTest.parent?.title;
  if (suiteTitle && Cypress.skippedSuites.has(suiteTitle)) {
    // If we're in a skipped suite, don't execute any more hooks for this suite
    if (this.currentTest.parent) {
      // Clear all remaining hooks
      this.currentTest.parent.afterAll(() => {}); // Clear after-all hooks
      this.currentTest.parent.afterEach(() => {}); // Clear after-each hooks
    }
  }
});

after(() => {
  // Always run softAssertAll() if any tests were executed
  cy.task('log', 'Checking if any tests were executed...').then(() => {
    if (Cypress.testsExecuted) {
      cy.task('log', 'Tests were executed. Running soft assertions...').then(() => {
        softAssert.softAssertAll();
      });
    } else {
      cy.task('log', 'No tests were executed. Skipping soft assertions.');
    }
  });
});
