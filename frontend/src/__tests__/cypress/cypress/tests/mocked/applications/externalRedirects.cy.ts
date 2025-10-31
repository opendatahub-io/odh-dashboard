import {
  catalogModelRedirect,
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

  describe('Catalog Model Redirects', () => {
    it('should redirect catalog model URLs correctly', () => {
      // Test catalog model URL redirect with 2 parameters
      externalRedirect.visit('/external/catalog/redhat_ai_validated_models/DeepSeek-R1-model');
      cy.url().should('include', '/ai-hub/catalog/redhat_ai_validated_models/DeepSeek-R1-model');
    });

    it('should handle model names with additional path segments', () => {
      // Test model names that might contain slashes
      externalRedirect.visit('/external/catalog/my-source/org/model/version');
      cy.url().should('include', '/ai-hub/catalog/my-source/org/model/version');
    });

    it('should handle invalid catalog URL format - missing parameters', () => {
      externalRedirect.visit('/external/catalog/only-source-id');
      externalRedirect.findErrorState().should('exist');
      catalogModelRedirect.findModelCatalogButton().should('exist');
    });

    it('should handle invalid catalog URL format - empty path', () => {
      externalRedirect.visit('/external/catalog/');
      externalRedirect.findErrorState().should('exist');
      catalogModelRedirect.findModelCatalogButton().should('exist');
    });

    it('should allow navigation to model catalog on error', () => {
      externalRedirect.visit('/external/catalog/invalid');
      catalogModelRedirect.findModelCatalogButton().click();
      cy.url().should('include', '/ai-hub/catalog');
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
