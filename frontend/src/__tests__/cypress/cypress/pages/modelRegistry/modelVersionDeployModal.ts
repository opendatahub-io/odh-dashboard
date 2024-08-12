import { Modal } from '~/__tests__/cypress/cypress/pages/components/Modal';

class ModelVersionDeployModal extends Modal {
  constructor() {
    super('Deploy model');
  }

  findProjectSelector() {
    return cy.findByTestId('deploy-model-project-selector');
  }

  selectProjectByName(name: string) {
    this.findProjectSelector().findDropdownItem(name).click();
  }
}

export const modelVersionDeployModal = new ModelVersionDeployModal();
