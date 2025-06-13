import { Modal } from '#~/__tests__/cypress/cypress/pages/components/Modal';

class NIMDeployModal extends Modal {
  constructor(private edit = false) {
    super(`${edit ? 'Edit' : 'Deploy'} model with NVIDIA NIM`);
  }

  findSubmitButton() {
    return this.findFooter().findByTestId('modal-submit-button');
  }

  findCancelButton() {
    return this.findFooter().findByTestId('modal-cancel-button');
  }

  findModelNameInput() {
    return this.find().findByTestId('model-deployment-name-section');
  }

  findNIMToDeploy() {
    return this.find().findByTestId('typeahead-menu-toggle').find('input');
  }

  findNimStorageSizeInput() {
    return cy.get('[data-testid="pvc-size"] input');
  }

  findNimStorageSizeUnitSelect() {
    return this.find().findByTestId('pvc-size').findByTestId('value-unit-select');
  }

  findStorageSizeMinusButton() {
    return this.find().findByTestId('pvc-size').findByRole('button', { name: 'Minus' });
  }

  findStorageSizePlusButton() {
    return this.find().findByTestId('pvc-size').findByRole('button', { name: 'Plus' });
  }

  findNimModelReplicas() {
    return cy.get('[data-testid="model-server-replicas"] input');
  }

  findMinReplicasInput() {
    return this.find().findByTestId('min-replicas').find('input');
  }

  findMaxReplicasInput() {
    return this.find().findByTestId('max-replicas').find('input');
  }

  findMinReplicasPlusButton() {
    return this.find().findByTestId('min-replicas').findByRole('button', { name: 'Plus' });
  }

  findMinReplicasMinusButton() {
    return this.find().findByTestId('min-replicas').findByRole('button', { name: 'Minus' });
  }

  findMaxReplicasPlusButton() {
    return this.find().findByTestId('max-replicas').findByRole('button', { name: 'Plus' });
  }

  findMaxReplicasMinusButton() {
    return this.find().findByTestId('max-replicas').findByRole('button', { name: 'Minus' });
  }

  shouldDisplayError(msg: string): void {
    this.find().should('contain.text', msg);
  }

  findAuthenticationSection() {
    return this.find().findByTestId('auth-section');
  }

  findModelRouteCheckbox() {
    return this.find().findByTestId('alt-form-checkbox-route');
  }

  findAuthenticationCheckbox() {
    return this.find().findByTestId('alt-form-checkbox-auth');
  }

  findExternalRouteError() {
    return this.find().findByTestId('external-route-no-token-alert');
  }

  findServiceAccountNameInput() {
    return this.find().findByTestId('service-account-form-name');
  }
}

export const nimDeployModal = new NIMDeployModal();
