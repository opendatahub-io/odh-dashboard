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

  findNimStorageSizeInput() {
    return cy.get('[data-testid="pvc-size"] input');
  }

  findStorageSizeMinusButton() {
    return this.find().findByTestId('pvc-size').findByRole('button', { name: 'Minus' });
  }

  findStorageSizePlusButton() {
    return this.find().findByTestId('pvc-size').findByRole('button', { name: 'Plus' });
  }

  findNimModelReplicas() {
    return cy.get('[id="model-server-replicas"]');
  }

  findNimModelReplicasMinusButton() {
    return this.find().find('button[aria-label="Minus"]').eq(1);
  }

  findNimModelReplicasPlusButton() {
    return this.find().find('button[aria-label="Plus"]').eq(1);
  }
}

export const nimDeployModal = new NIMDeployModal();
