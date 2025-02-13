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
// @ts-expect-error: Types are not available for this third-party library
/// <reference path="../../../../types.ts" />

// Import modules and configure plugins
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

console.log('Support file loaded');

// Configure Cypress settings
Cypress.Keyboard.defaults({
  keystrokeDelay: 0,
});

// Test Tags Implementation
(function setupTestTags() {
  const originalIt = window.it;
  window.Cypress.testTags = {};

  window.it = function(name, options, fn) {
    if (arguments.length === 2 && typeof options === 'function') {
      return originalIt(name, options);
    }
    
    if (options && options.tags) {
      window.Cypress.testTags[name] = options.tags;
    }
    
    return originalIt(name, options, fn);
  };
})();

// Event handlers
Cypress.on('test:before:run', (test) => {
  console.log(`Running test: ${test.title}`);
});

// Global hooks
before(() => {
  // Disable Cypress's default behavior of logging all XMLHttpRequests and fetches
  cy.intercept({ resourceType: /xhr|fetch/ }, { log: false });
});

beforeEach(function() {
  // Tag-based test filtering logic
  const processTestTags = () => {
    const skipTags = Cypress.env('skipTags') ? Cypress.env('skipTags').split(' ') : [];
    const grepTags = Cypress.env('grepTags') ? Cypress.env('grepTags').split(' ') : [];
    const testTitle = this.currentTest.title;
    
    // Get and normalize test tags
    let testTags = Cypress.testTags[testTitle] || [];
    testTags = testTags.map(tag => tag.startsWith('@') ? tag : `@${tag}`);
    
    // Log test information
    cy.task('log', `Test title: ${testTitle}`);
    cy.task('log', `Test tags: ${JSON.stringify(testTags)}`);
    cy.task('log', `Skip tags: ${JSON.stringify(skipTags)}`);
    cy.task('log', `Grep tags: ${JSON.stringify(grepTags)}`);
    
    // Determine if test should be skipped
    const shouldSkip = skipTags.length > 0 && skipTags.some(tag => testTags.includes(tag));
    const shouldRun = grepTags.length === 0 || grepTags.some(tag => {
      const plainTag = tag.startsWith('@') ? tag.substring(1) : tag;
      return testTags.some(t => t === tag || t === `@${plainTag}`);
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
