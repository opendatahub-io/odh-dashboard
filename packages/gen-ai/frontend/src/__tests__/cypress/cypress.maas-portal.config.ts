import { defineConfig } from 'cypress';
import config from './cypress.config';

// Portal-only routes cannot be exercised by the standalone Gen AI app or RHOAI.
// Reuse the Gen AI support commands and preprocessor against the portal dev server.
export default defineConfig({
  ...config,
  e2e: {
    ...config.e2e,
    baseUrl: process.env.BASE_URL || 'http://localhost:4020',
    specPattern: 'cypress/tests/maas-portal/**/*.cy.ts',
  },
});
