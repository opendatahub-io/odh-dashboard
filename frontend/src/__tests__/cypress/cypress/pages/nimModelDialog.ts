import { Modal } from '~/__tests__/cypress/cypress/pages/components/Modal';

class NIMDeployModal extends Modal {
  constructor(private edit = false) {
    super(`${edit ? 'Edit' : 'Deploy'} model with NVIDIA NIM`);
  }

  findSubmitButton() {
    return this.findFooter().findByTestId('modal-submit-button');
  }

  findModelNameInput() {
    return this.find().findByTestId('model-deployment-name-section');
  }

  findNIMToDeploy() {
    return this.find().findByTestId('nim-model-list-selection');
  }
}

export const nimDeployModal = new NIMDeployModal();
