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

import '@odh-dashboard/internal/types';
import { TOUR_SEEN_STORAGE_KEY } from '@odh-dashboard/internal/concepts/whatsNew/const';
import '@cypress/grep';
import chaiSubset from 'chai-subset';
import '@cypress/code-coverage/support';
import 'cypress-mochawesome-reporter/register';
import 'cypress-plugin-steps';
import { type ModuleFederationConfig, getModuleFederationURL } from '@odh-dashboard/app-config';
import './commands';
import '../utils/moduleFederationMock';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockDsciStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDsciStatus';
import { addCommands as webSocketsAddCommands } from './websockets';
import {
  createTestTagFilter,
  installTestTagFilter,
  mapTestTags,
  type TestOptions,
} from './testTags';
import { asProjectAdminUser } from '../utils/mockUsers';
import { maskSensitiveInfo } from '../utils/maskSensitiveInfo';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const softAssert = require('soft-assert');

// ============================
// Type Definitions
// ============================

// Create type definition for soft-assert
export interface SoftAssert {
  softAssert: (actual: unknown, expected: unknown, message?: string) => void;
  softAssertAll: () => void;
  softTrue: (condition: boolean, msg?: string) => void;
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
    describe: Mocha.SuiteFunction;
    context: Mocha.SuiteFunction;
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
let testTimeoutTimer: ReturnType<typeof setTimeout> | null = null;

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

// Suppress the "What's New" auto-launch modal in all Cypress tests
Cypress.on('window:before:load', (win) => {
  win.localStorage.setItem(TOUR_SEEN_STORAGE_KEY, JSON.stringify(true));
});

// Disable polling in mock tests by injecting window globals before app code runs
if (Cypress.env('MOCK')) {
  Cypress.on('window:before:load', (win) => {
    Object.assign(win, {
      POLL_INTERVAL: 999999,
      FAST_POLL_INTERVAL: 999999,
      WS_HOSTNAME: 'localhost:9002',
    });
  });
}

// Uncaught exceptions handler
Cypress.on('uncaught:exception', (err) => {
  // Handle ChunkLoadError - ignore these errors as they are usually due to code splitting issues during development
  if (err.name === 'ChunkLoadError') {
    // eslint-disable-next-line no-console
    console.warn('ChunkLoadError caught and ignored:', err.message);
    return false;
  }

  // Ignore 'Unexpected token <' errors from webpack-dev-server fallback in E2E tests
  if (err.message.includes("Unexpected token '<'")) {
    return false;
  }

  // Ignore 'Unexpected token :' / '?' / 'expected expression' parser errors from cross-origin scripts
  if (
    err.message.includes("Unexpected token ':'") ||
    err.message.includes("Unexpected token '?'") ||
    err.message.includes('expected expression')
  ) {
    return false;
  }

  // Ignore Monaco editor 'Canceled' errors thrown during editor disposal/cleanup
  if (err.message === 'Canceled' || err.name === 'Canceled') {
    return false;
  }

  if (err.message.includes('ResizeObserver loop completed with undelivered notifications')) {
    return false;
  }

  // TODO: RHOAIENG-65075 - postMessage null error from model-registry/MaaS iframe teardown
  if (err.message.includes('Cannot read properties of null')) {
    return false;
  }

  // Ignore pipeline secret conflicts surfaced as uncaught exceptions during setup
  if (err.message.includes('secrets "ds-pipeline-config" already exists')) {
    return false;
  }

  // Ignore SSR-like 'window is not defined' errors during page transitions
  if (err.message.includes('window is not defined')) {
    return false;
  }

  // Let all other errors (including timeout errors) fail the test as expected
  return true;
});

// Configure grep filtering
const grepTags = Cypress.env('grepTags') ? Cypress.env('grepTags').split(' ') : [];
const skipTags = Cypress.env('skipTags') ? Cypress.env('skipTags').split(' ') : [];
const { grepIncludedTags, shouldSkipTest } = createTestTagFilter(grepTags, skipTags);

// eslint-disable-next-line no-console
console.log(`Support file loaded. \nwatchForFileChanges: ${Cypress.config('watchForFileChanges')}`);

installTestTagFilter(window, shouldSkipTest, (test, tags) => {
  Cypress.testTags[test.fullTitle()] = tags;
});

// ============================
// Event Handlers
// ============================

// Print Cypress 'step', 'exec' and 'log' commands to terminal
let stepCounter: number;
let commandStack: string[] = [];

beforeEach(() => {
  stepCounter = 0;
  commandStack = [];
});

Cypress.on('command:start', function handleCommandStart(command) {
  commandStack.push(command.name);
});

Cypress.on('command:end', function handleCommandEnd() {
  commandStack.pop();
});

Cypress.on('command:enqueued', (command) => {
  const arg = typeof command.args[0] === 'string' ? command.args[0] : '';
  const maskedArg = maskSensitiveInfo(arg);

  if (command.name === 'step') {
    if (commandStack.length === 0) {
      stepCounter++;
      cy.task('log', `[STEP ${stepCounter}] ${maskedArg}`);
    } else {
      cy.task('log', maskedArg);
    }
  } else if (command.name === 'exec') {
    cy.task('log', `[EXEC] ${maskedArg}`);
  } else if (command.name === 'log') {
    cy.task('log', maskedArg);
  }
});

// ============================
// Test Hooks
// ============================

// Global before hook
before(function setupGlobalIntercepts() {
  cy.intercept({ resourceType: /xhr|fetch/ }, { log: false });

  if (timeoutSeconds) {
    cy.task('log', `Setting tests timeout to: ${timeoutSeconds} seconds`);
  }
});

// Root-level before hook to skip suite if no tests match grep tags or if all tests should be skipped
before(function checkGrepTags() {
  if (grepIncludedTags.length > 0) {
    // Collect all test tags
    const allTestTags = Object.values(Cypress.testTags).flat();
    const hasMatchingTest = grepIncludedTags.some((tag: string) => {
      const plainTag = tag.startsWith('@') ? tag.substring(1) : tag;
      return allTestTags.some((t: string) => t === tag || t === `@${plainTag}`);
    });
    if (!hasMatchingTest) {
      this.skip();
    }
  }

  // Check if all tests should be skipped based on skip tags
  if (skipTags.length > 0 && Object.keys(Cypress.testTags).length > 0) {
    const allTestsShouldBeSkipped = Object.values(Cypress.testTags).every((testTags) =>
      skipTags.some((tag: string) => mapTestTags(testTags).includes(tag)),
    );
    if (allTestsShouldBeSkipped) {
      this.skip();
    }
  }
});

// Enhanced beforeEach with suite-level control
beforeEach(function beforeEachHook(this: Mocha.Context) {
  if (!this.currentTest) {
    return;
  }

  if (testTimeoutTimer) {
    clearTimeout(testTimeoutTimer);
    testTimeoutTimer = null;
  }
  if (timeoutSeconds) {
    cy.task('log', `Starting ${timeoutSeconds}s timeout for: ${this.currentTest.title}`);
    testTimeoutTimer = setTimeout(() => {
      throw new Error(`Test exceeded ${timeoutSeconds}s timeout`);
    }, Number(timeoutSeconds) * 1000);
  }

  const testTitle = this.currentTest.title;
  const currentSuite = this.currentTest.parent;
  const suiteTitle = currentSuite?.title;

  // If the entire suite is marked as skipped, skip this test immediately
  if (suiteTitle && Cypress.skippedSuites.has(suiteTitle)) {
    this.skip();
  }

  const testTags = Cypress.testTags[this.currentTest.fullTitle()] ?? [];
  const mappedTestTags = mapTestTags(testTags);

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

    // Return 404 for all module federation requests.
    cy.intercept({ pathname: '/_mf/**' }, { statusCode: 404 });

    // For each module federation config, intercept the request and forward it to the module federation server.
    Cypress.env('mfConfigs')?.forEach(({ backend, name }: ModuleFederationConfig) => {
      if (backend != null) {
        const mfPathPrefix = `/_mf/${name}`;
        cy.intercept(
          {
            pathname: `${mfPathPrefix}/**`,
            method: 'GET',
          },
          async (req) => {
            // Extract the remainder of the URL after the module federation prefix
            const originalPath = req.url;
            // Escape regex special characters in mfPathPrefix
            const escapedPrefix = mfPathPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const remainder = originalPath.replace(new RegExp(`^.*${escapedPrefix}`), '');

            // Construct the forwarded URL
            const baseUrl = getModuleFederationURL(backend).local;
            const forwardedUrl = `${baseUrl}${remainder}`;

            try {
              // Use fetch as opposed to req.continue or cy.request to avoid ECONNREFUSED errors.
              const response = await fetch(forwardedUrl);
              req.reply({
                statusCode: response.status,
                body: await response.text(),
              });
            } catch (error) {
              req.reply({
                statusCode: 404,
                statusText: 'Module federation request failed',
              });
            }
          },
        );
      }
    });

    // Default intercepts.
    cy.interceptOdh('GET /api/dsci/status', mockDsciStatus({}));
    cy.interceptOdh('GET /api/dsc/status', mockDscStatus({}));
    asProjectAdminUser();
  }
});

// Handle skipped suites in afterEach hook
afterEach(function afterEachHook(this: Mocha.Context) {
  if (testTimeoutTimer) {
    clearTimeout(testTimeoutTimer);
    testTimeoutTimer = null;
  }

  if (!this.currentTest) {
    return;
  }

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
  } else {
    // If the test wasn't skipped, mark that tests were executed
    Cypress.testsExecuted = true;
  }
});

// Handle soft assertions in after hook
after(() => {
  // Always run softAssertAll() if any tests were executed
  if (Cypress.testsExecuted) {
    softAssert.softAssertAll();
  } else {
    cy.task('log', 'No tests were executed. Skipping soft assertions.');
  }
});
