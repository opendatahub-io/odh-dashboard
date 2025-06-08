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

import '#~/types';
import '@cypress/grep';
import chaiSubset from 'chai-subset';
import '@cypress/code-coverage/support';
import 'cypress-mochawesome-reporter/register';
import 'cypress-plugin-steps';
import './commands';
import { asProjectAdminUser } from '#~/__tests__/cypress/cypress/utils/mockUsers';
import { mockDscStatus } from '#~/__mocks__/mockDscStatus';
import { addCommands as webSocketsAddCommands } from './websockets';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const softAssert = require('soft-assert');

// ============================
// Type Definitions
// ============================

// Define a custom type for test options that includes tags.
type TestOptions = {
  tags?: string[];
  [key: string]: unknown;
};

// Create type definition for soft-assert
export interface SoftAssert {
  softAssert: (actual: unknown, expected: unknown, message?: string) => void;
  softAssertAll: () => void;
  softTrue: (condition: boolean, msg?: string) => void;
}

// Define an interface for the test function that supports retries.
interface TestWithRetries extends Mocha.TestFunction {
  retries: (n: number) => void;
}

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace globalThis {
    let softAssert: SoftAssert | unknown;
    function softTrue(condition: boolean, message?: string): void;
  }

  // Extend Cypress globals with custom properties
  namespace Cypress {
    interface Cypress {
      testTags: { [key: string]: string[] };
      suiteTestCount: { [key: string]: { total: number; skipped: number } };
      skippedSuites: Set<string>;
      testsExecuted: boolean; // Flag to track if any tests were executed
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

// ============================
// Global Initialization
// ============================

// Initialize tracking objects
Cypress.testTags = {};
Cypress.suiteTestCount = {};
Cypress.skippedSuites = new Set<string>();
Cypress.testsExecuted = false;

// Get global tests timeout from --env argument
const timeoutSeconds = Cypress.env('CY_TEST_TIMEOUT_SECONDS');

// Configure global settings
chai.use(chaiSubset);
webSocketsAddCommands();

// Initialize soft assert globally
(globalThis as unknown as { softAssert: SoftAssert }).softAssert = softAssert;
(globalThis as unknown as { softTrue: (condition: boolean, message?: string) => void }).softTrue =
  function namedSoftTrue(condition: boolean, message?: string) {
    (globalThis as unknown as { softAssert: SoftAssert }).softAssert.softTrue(condition, message);
  };

// Configure Cypress settings
Cypress.Keyboard.defaults({
  keystrokeDelay: 0,
});

// Configure grep filtering
const grepTags = Cypress.env('grepTags') ? Cypress.env('grepTags').split(' ') : [];
if (grepTags.length > 0) {
  Cypress.env('grepFilterSpecs', true);
  Cypress.env('grepOmitFiltered', true);
  Cypress.env('grepFilterHooks', true);
}

// eslint-disable-next-line no-console
console.log(`Support file loaded. \nwatchForFileChanges: ${Cypress.config('watchForFileChanges')}`);

// ============================
// Test Tags Implementation
// ============================

function setupTestTags() {
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
}

// Initialize test tags
setupTestTags();

// ============================
// Test Filtering Functions
// ============================

/**
 * Determines if a test should be skipped based on its tags and environment variables
 * @param testTags Array of tags for a test
 * @returns Boolean indicating if the test should be skipped
 */
function shouldSkipTest(testTags: string[]): boolean {
  const mappedTestTags = testTags.map((tag: string) => (tag.startsWith('@') ? tag : `@${tag}`));
  const skipTags = Cypress.env('skipTags') ? Cypress.env('skipTags').split(' ') : [];
  const grepTags = Cypress.env('grepTags') ? Cypress.env('grepTags').split(' ') : [];

  // If skip tags are provided and the test has any of them, skip it
  const shouldSkip =
    skipTags.length > 0 && skipTags.some((tag: string) => mappedTestTags.includes(tag));

  // If grep tags are provided, the test must match at least one of them
  // If no grep tags are provided, run all tests
  const shouldRun =
    grepTags.length === 0 ||
    grepTags.some((tag: string) => {
      const plainTag = tag.startsWith('@') ? tag.substring(1) : tag;
      return mappedTestTags.some((t: string) => t === tag || t === `@${plainTag}`);
    });

  // If we have grep tags but no tests match them, we should skip all tests
  if (grepTags.length > 0 && !shouldRun) {
    return true;
  }

  return shouldSkip || !shouldRun;
}

/**
 * Marks a suite as skipped by emptying its hooks and updating tracking data
 * @param suite The Mocha suite to skip
 */
function markSuiteAsSkipped(suite: Mocha.Suite) {
  // Mark this suite as completely skipped
  if (suite.title) {
    Cypress.skippedSuites.add(suite.title);
  }

  // Skip all tests in the suite
  suite.tests.forEach((test: { pending: boolean }) => {
    // Create a copy of the test object with the pending property set to true
    Object.assign(test, { ...test, pending: true });
  });

  // Empty all hooks
  const emptyArray: unknown[] = [];
  const hooks = ['_beforeAll', '_afterAll', '_beforeEach', '_afterEach'];

  hooks.forEach((hookName) => {
    if (hookName in suite) {
      Object.defineProperty(suite, hookName, { value: [...emptyArray] });
    }
  });

  if (suite.title) {
    cy.log(`Skipping entire suite: ${suite.title} as all tests are tagged for skipping`);
  }
}

// ============================
// Event Handlers
// ============================

// Print Cypress 'step', 'exec' and 'log' commands to terminal
let stepCounter: number;
let allTestsPending = false;

beforeEach(() => {
  stepCounter = 0;
});

// Track test execution
Cypress.on('test:before:run', (test) => {
  // Set the flag to indicate a test is running
  Cypress.testsExecuted = true;
  // eslint-disable-next-line no-console
  console.log(`Running test: ${test.title}`);
});

// Track suites and their tests
Cypress.on('suite:start', (suite) => {
  // Initialize suite tracking data
  if (suite.title) {
    Cypress.suiteTestCount[suite.title] = { total: suite.tests.length, skipped: 0 };
  }

  // Check if all tests in the suite are pending
  allTestsPending = suite.tests.every((test: { pending: boolean }) => test.pending);
});

Cypress.on('command:enqueued', (command) => {
  // Skip all commands if grep tags are active and all tests are pending
  const grepTags = Cypress.env('grepTags') ? Cypress.env('grepTags').split(' ') : [];
  if (grepTags.length > 0 && allTestsPending) {
    return;
  }

  if (command.name === 'step') {
    stepCounter++;
    cy.task('log', `[STEP ${stepCounter}] ${command.args[0]}`);
  } else if (command.name === 'exec') {
    cy.task('log', `[EXEC] ${command.args[0]}`);
  } else if (command.name === 'log') {
    cy.task('log', `${command.args[0]}`);
  }
});

// ============================
// Test Hooks
// ============================

// Global before hook
before(function () {
  // Check if all tests in this suite are pending
  if (this.test?.parent?.tests.every((t: Mocha.Test) => t.pending)) {
    cy.log('Skipping setup as all tests are pending');
    return;
  }

  cy.intercept({ resourceType: /xhr|fetch/ }, { log: false });

  if (timeoutSeconds) {
    cy.task('log', `Setting tests timeout to: ${timeoutSeconds} seconds`);
  }
});

// Root-level before hook to skip suite if no tests match grep tags
before(function () {
  if (grepTags.length > 0) {
    // Collect all test tags
    const allTestTags = Object.values(Cypress.testTags).flat();
    const hasMatchingTest = grepTags.some((tag: string) => {
      const plainTag = tag.startsWith('@') ? tag.substring(1) : tag;
      return allTestTags.some((t: string) => t === tag || t === `@${plainTag}`);
    });
    if (!hasMatchingTest) {
      this.skip();
    }
  }
});

// Enhanced beforeEach with suite-level control
beforeEach(function beforeEachHook(this: Mocha.Context) {
  if (!this.currentTest) {
    return;
  }

  if (timeoutSeconds) {
    this._testTimeoutTimer = setTimeout(() => {
      throw new Error(`Test exceeded ${timeoutSeconds}s`);
    }, Number(timeoutSeconds) * 1000);
  }

  const testTitle = this.currentTest.title;
  const currentSuite = this.currentTest.parent;
  const suiteTitle = currentSuite?.title;

  // If the entire suite is marked as skipped, skip this test immediately
  if (suiteTitle && Cypress.skippedSuites.has(suiteTitle)) {
    this.skip();
  }

  const testTags = Cypress.testTags[testTitle] ?? [];
  const mappedTestTags = testTags.map((tag: string) => (tag.startsWith('@') ? tag : `@${tag}`));

  const skipTags = Cypress.env('skipTags') ? Cypress.env('skipTags').split(' ') : [];
  const grepTags = Cypress.env('grepTags') ? Cypress.env('grepTags').split(' ') : [];

  // Skip test early if grep tags don't match
  if (grepTags.length > 0) {
    const shouldRun = grepTags.some((tag: string) => {
      const plainTag = tag.startsWith('@') ? tag.substring(1) : tag;
      return mappedTestTags.some((t: string) => t === tag || t === `@${plainTag}`);
    });
    if (!shouldRun) {
      this.skip();
    }
  }

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

  // Set up mocks if the MOCK environment variable is set
  if (Cypress.env('MOCK')) {
    // Fallback: return 404 for all API requests.
    cy.intercept({ pathname: '/api/**' }, { statusCode: 404 });
    // Default intercepts.
    cy.interceptOdh('GET /api/dsc/status', mockDscStatus({}));
    asProjectAdminUser();
  }
});

// Handle skipped suites in afterEach hook
afterEach(function afterEachHook(this: Mocha.Context) {
  if (!this.currentTest) return;

  const suiteTitle = this.currentTest.parent?.title;
  if (suiteTitle && Cypress.skippedSuites.has(suiteTitle)) {
    // If we're in a skipped suite, don't execute any more hooks for this suite
    if (this.currentTest.parent) {
      // Create no-op functions that return a value to avoid empty function warnings
      const noOpFunction = (): null => null;

      // Clear all remaining hooks with properly returning functions
      this.currentTest.parent.afterAll(noOpFunction);
      this.currentTest.parent.afterEach(noOpFunction);
    }
  }
});

// Global after hook
after(function () {
  // Check if all tests in this suite are pending
  if (this.test?.parent?.tests.every((t: Mocha.Test) => t.pending)) {
    cy.log('Skipping cleanup as all tests are pending');
    return;
  }

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
