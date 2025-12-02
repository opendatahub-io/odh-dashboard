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
import '~/__tests__/cypress/cypress/support/commands';
import { addCommands as addWebsocketCommands } from '~/__tests__/cypress/cypress/support/websockets';

// Add websocket commands
addWebsocketCommands();

// Extend Cypress types to support tags
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface TestConfigOverrides {
      tags?: string[];
    }
  }
}

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Disable Cypress Chrome web security for easier testing
Cypress.on('uncaught:exception', () => {
  // returning false here prevents Cypress from
  // failing the test on uncaught exceptions
  return false;
});

// Setup global configuration
Cypress.Keyboard.defaults({
  keystrokeDelay: 0,
});
