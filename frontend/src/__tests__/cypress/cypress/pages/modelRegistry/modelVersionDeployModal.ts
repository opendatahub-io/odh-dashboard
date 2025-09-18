import { Modal } from '#~/__tests__/cypress/cypress/pages/components/Modal';

class ModelVersionDeployModal extends Modal {
  constructor() {
    super('Deploy model');
  }

  private findProjectSelector() {
    return this.find().findByTestId('deploy-model-project-selector-toggle');
  }

  selectProjectByName(name: string) {
    this.findProjectSelector().click();
    // Wait for the project selector menu to be visible and populated
    cy.findByTestId('deploy-model-project-selector-menuList').should('be.visible');
    cy.findByTestId('deploy-model-project-selector-search').fill(name);
    // Wait for the specific project option to be available before clicking
    // Try both button and option selectors to handle different UI implementations
    cy.findByTestId('deploy-model-project-selector-menuList').within(() => {
      cy.get('button, [role="option"]')
        .contains(name)
        .should('be.visible')
        .click();
    });
  }
}

export const modelVersionDeployModal = new ModelVersionDeployModal();
