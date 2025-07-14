import { DeleteModal } from '#~/__tests__/cypress/cypress/pages/components/DeleteModal';
import { Modal } from '#~/__tests__/cypress/cypress/pages/components/Modal';

/** Duped to avoid importing code from the app into tests (and breaking webpack) */
const TRUSTYAI_INSTALL_MODAL_TEST_ID = 'trusty-db-config';

export class TrustyAICRState {
  configureModal = new TrustyAICRModal();

  deleteModal = new TrustyAIUninstallModal();

  findError(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('trustyai-service-error');
  }

  findUninstallButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('trustyai-uninstall-button');
  }

  findInstallButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('trustyai-configure-button');
  }
}

class TrustyAICRModal extends Modal {
  constructor() {
    super('Configure TrustyAI service');
  }

  findSubmitButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('modal-submit-button');
  }

  private findField(fieldName: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId(`${TRUSTYAI_INSTALL_MODAL_TEST_ID}-${fieldName}`);
  }

  findExistingRadio(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findField('radio-existing');
  }

  findNewRadio(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findField('radio-new');
  }

  findExistingNameField(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findField('existing-secret');
  }

  findNewKindField(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findField('databaseKind');
  }

  findNewUsernameField(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findField('databaseUsername');
  }

  findNewPasswordField(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findField('databasePassword');
  }

  findNewServiceField(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findField('databaseService');
  }

  findNewPortField(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findField('databasePort');
  }

  findNewDbNameField(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findField('databaseName');
  }

  findNewGenerationField(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findField('databaseGeneration');
  }
}

class TrustyAIUninstallModal extends DeleteModal {
  constructor() {
    super('Warning alert: Uninstall TrustyAI');
  }

  findSubmitButton() {
    return this.findFooter().findByRole('button', { name: 'Uninstall' });
  }
}
