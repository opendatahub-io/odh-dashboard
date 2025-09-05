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

// Import commands.ts using ES2015 syntax:
import './commands/common';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Disable Cypress Chrome web security for easier testing
Cypress.on('uncaught:exception', () => {
  // returning false here prevents Cypress from
  // failing the test on uncaught exceptions
  return false;
});

// Add custom global configurations here
beforeEach(() => {
  // Add any global setup that should run before each test
});
