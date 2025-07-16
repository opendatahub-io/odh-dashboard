import { Modal } from '#~/__tests__/cypress/cypress/pages/components/Modal';

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
    return this.find().findByTestId('typeahead-menu-toggle').find('input');
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

  // PVC Storage Option Selection
  findCreateNewPVCRadio() {
    return this.find().findByTestId('create-new-pvc');
  }

  findUseExistingPVCRadio() {
    return this.find().findByTestId('use-existing-pvc');
  }

  // PVC Size Section (for new PVC creation)
  findPVCSizeSection() {
    return this.find().findByTestId('pvc-size');
  }

  // PVC Selection Section (for existing PVC)
  findPVCSelectionSection() {
    return this.find().findByTestId('pvc-selection-section');
  }

  findManualPVCInput() {
    return this.find().findByTestId('manual-pvc-input');
  }

  findUseManualPVCButton() {
    return this.find().findByTestId('use-manual-pvc-button');
  }

  // Model Path Section
  findModelPathSection() {
    return this.find().findByTestId('model-path-section');
  }

  findModelPathInput() {
    return this.find().findByTestId('model-path-input');
  }

  // Alert Messages
  findNoCompatiblePVCsAlert() {
    return this.find().findByTestId('no-compatible-pvcs-alert');
  }

  findCompatiblePVCsFoundMessage() {
    return this.find().findByTestId('compatible-pvcs-found-message');
  }

  findPVCLoadingSpinner() {
    return this.find().findByTestId('pvc-loading-spinner');
  }

  findPVCLoadingErrorAlert() {
    return this.find().findByTestId('pvc-loading-error-alert');
  }

  // Helper methods for testing PVC workflows
  selectCreateNewPVC() {
    this.findCreateNewPVCRadio().click();
    return this;
  }

  selectUseExistingPVC() {
    this.findUseExistingPVCRadio().click();
    return this;
  }

  setModelPath(path: string) {
    this.findModelPathInput().clear().type(path);
    return this;
  }

  // Assertion helpers
  shouldShowCreateNewPVCOption() {
    this.findCreateNewPVCRadio().should('be.visible');
    return this;
  }

  shouldShowUseExistingPVCOption() {
    this.findUseExistingPVCRadio().should('be.visible');
    return this;
  }

  // FIXED: Removed unused 'modelName' parameter and hardcoded the expected text
  shouldShowNoCompatiblePVCsAlert() {
    this.findNoCompatiblePVCsAlert().should(
      'contain.text',
      'No existing storage volumes found that contain arctic-embed-l',
    );
    return this;
  }

  shouldHaveModelPath(path: string) {
    this.findModelPathInput().should('have.value', path);
    return this;
  }

  shouldDisableModelPathInput() {
    this.findModelPathInput().should('be.disabled');
    return this;
  }

  shouldDisableManualPVCInput() {
    this.findManualPVCInput().should('be.disabled');
    return this;
  }

  // SimpleSelect dropdown methods
  findExistingPVCSelect() {
    return this.find().contains('Select from');
  }

  findExistingPVCSelectByText() {
    return this.find().contains('Select from');
  }

  // FIXED: Removed unnecessary waits and console statements - streamlined approach
  clickExistingPVCSelect() {
    this.find()
      .contains('Select from')
      .then(($selectText) => {
        // Try clicking the text directly first
        cy.wrap($selectText).click({ force: true });

        // Check if dropdown opened, if not try parent element
        cy.get(
          '[role="listbox"], [role="menu"], .pf-v6-c-menu__content, .pf-v6-c-select__menu',
        ).then(($dropdown) => {
          if ($dropdown.length === 0) {
            // Try clicking the parent element if direct click didn't work
            cy.wrap($selectText)
              .closest('.pf-v6-c-menu-toggle, button, [role="button"]')
              .click({ force: true });
          }
        });
      });
    return this;
  }

  // FIXED: Removed console statements and unnecessary waits - simplified to essential logic
  selectExistingPVCRobust(pvcName: string) {
    this.find()
      .contains('Select from')
      .then(($element) => {
        // Primary approach: click the element
        cy.wrap($element).click({ force: true });

        cy.get('body').then(() => {
          cy.get(
            '[role="listbox"], [role="menu"], .pf-v6-c-menu__content, .pf-v6-c-select__menu',
          ).then(($dropdown) => {
            if ($dropdown.length > 0) {
              // Dropdown opened successfully
              cy.wrap($dropdown).should('be.visible').contains(pvcName).click();
            } else {
              // Fallback approaches
              cy.wrap($element).parent().click({ force: true });

              cy.get('.pf-v6-c-menu-toggle, [data-testid*="select"], button')
                .contains('Select from')
                .click({ force: true });

              // Final attempt with broader selectors
              cy.get(
                '[role="listbox"], [role="menu"], .pf-v6-c-menu__content, .pf-v6-c-select__menu, [data-popper-placement]',
                { timeout: 5000 },
              )
                .should('be.visible')
                .contains(pvcName)
                .click();
            }
          });
        });
      });

    return this;
  }

  // Main PVC selection method - uses the robust approach
  selectExistingPVC(pvcName: string) {
    return this.selectExistingPVCRobust(pvcName);
  }

  shouldShowPVCLoadingSpinner() {
    this.find().findByTestId('pvc-loading-spinner').should('be.visible');
    return this;
  }

  shouldShowCompatiblePVCs(count: number) {
    this.find()
      .findByTestId('compatible-pvcs-found-message')
      .should('contain.text', `Found ${count} storage volume(s)`);
    this.findExistingPVCSelectByText().should('be.visible');
    this.find().findByTestId('use-manual-pvc-button').should('be.visible');
    return this;
  }

  enterManualPVCName(pvcName: string) {
    this.find().findByTestId('use-manual-pvc-button').click();
    this.findManualPVCInput().clear().type(pvcName);
    return this;
  }

  findBackToCompatibleListButton() {
    return this.find().findByTestId('back-to-compatible-list-button');
  }
}

export const nimDeployModal = new NIMDeployModal();
