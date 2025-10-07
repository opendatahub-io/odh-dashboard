import {
  elyraRedirect,
  externalRedirect,
  pipelinesSdkRedirect,
} from '#~/__tests__/cypress/cypress/pages/externalRedirect';

describe('External Redirects', () => {
  describe('Pipeline SDK Redirects', () => {
    it('should redirect experiment URLs correctly', () => {
      // Test experiment URL redirect
      externalRedirect.visit('/external/pipelinesSdk/test-namespace/#/experiments/details/123');
      cy.url().should('include', '/develop-train/experiments/test-namespace/123/runs');
    });

    it('should redirect run URLs correctly', () => {
      // Test run URL redirect
      externalRedirect.visit('/external/pipelinesSdk/test-namespace/#/runs/details/456');
      cy.url().should('include', '/develop-train/pipelines/runs/test-namespace/runs/456');
    });

    it('should handle invalid URL format', () => {
      externalRedirect.visit('/external/pipelinesSdk/test-namespace/#/invalid');
      externalRedirect.findErrorState().should('exist');
      pipelinesSdkRedirect.findPipelinesButton().should('exist');
      pipelinesSdkRedirect.findExperimentsButton().should('exist');
    });
  });

  describe('Elyra Redirects', () => {
    it('should redirect run URLs correctly', () => {
      externalRedirect.visit('/external/elyra/test-namespace/runs/123');
      cy.url().should('include', '/develop-train/pipelines/runs/test-namespace/runs/123');
    });

    it('should handle invalid URL format', () => {
      externalRedirect.visit('/external/elyra/test-namespace/invalid');
      externalRedirect.findErrorState().should('exist');
      elyraRedirect.findPipelinesButton().should('exist');
    });
  });

  describe('External Redirect Not Found', () => {
    it('should show not found page for invalid external routes', () => {
      externalRedirect.visit('/external/invalid-path');
      externalRedirect.findErrorState().should('exist');
      externalRedirect.findHomeButton().should('exist');
    });

    it('should allow navigation back to home', () => {
      externalRedirect.visit('/external/invalid-path');
      externalRedirect.findHomeButton().click();
      cy.url().should('include', '/');
    });
  });
});
