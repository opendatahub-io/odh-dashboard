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
    cy.findByTestId('deploy-model-project-selector-search').fill(name);
    cy.findByTestId('deploy-model-project-selector-menuList')
      .contains('button', name)
      .should('be.visible')
      .click();
  }

  findGoToProjectPageLink() {
    return cy.findByTestId('go-to-project-page-link');
  }
}

export const modelVersionDeployModal = new ModelVersionDeployModal();
