import { Modal } from '~/__tests__/cypress/cypress/pages/components/Modal';

class ModelVersionDeployModal extends Modal {
  constructor() {
    super('Deploy model');
  }

  findProjectSelector() {
    return this.find().findByTestId('deploy-model-project-selector');
  }

  selectProjectByName(name: string) {
    const selector = this.findProjectSelector();
    selector.should('have.attr', 'aria-expanded', 'false');
    selector.click();
    this.find().findByRole('option', { name, timeout: 5000 }).click();
  }
}

export const modelVersionDeployModal = new ModelVersionDeployModal();
