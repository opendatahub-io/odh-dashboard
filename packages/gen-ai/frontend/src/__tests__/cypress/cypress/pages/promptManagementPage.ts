class PromptManagementModal {
  find(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-management-modal');
  }

  findSearchInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-search-input');
  }

  findTable(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-table');
  }

  findTableRow(name: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId(`prompt-table-row-${name}`);
  }

  findEmptyState(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-table-empty-state');
  }

  findErrorState(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-table-error-state');
  }

  findLoading(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-table-loading');
  }

  findLoadButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-load-button');
  }

  findCancelButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-cancel-button');
  }
}

class PromptDrawer {
  findPanel(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-drawer-panel');
  }

  findVersionSelect(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-version-select');
  }

  findTemplate(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-drawer-template');
  }

  findCloseButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-drawer-close');
  }

  findLoading(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-drawer-loading');
  }
}

class CreatePromptModal {
  find(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-create-modal');
  }

  findNameInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-name-input');
  }

  findVersionField(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-version-field');
  }

  findTemplateInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-template-input');
  }

  findCommitMessageInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-commit-message-input');
  }

  findSaveButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-save-button');
  }

  findCancelButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-create-cancel-button');
  }

  findErrorAlert(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-save-error-alert');
  }

  findNameError(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-name-error');
  }
}

class PromptAssistant {
  findTextarea(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('system-instructions-input');
  }

  findEditButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-edit-button');
  }

  findSaveButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-save-to-registry-button');
  }

  findRevertButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-revert-button');
  }

  findResetButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-reset-button');
  }

  findNameTitle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-name-title');
  }

  findVersionLabel(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-version-label');
  }

  findUnsavedIndicator(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-unsaved-indicator');
  }

  findLoadPromptButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('load-prompt-button');
  }

  findPromptInstructionsSection(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-instructions-section');
  }

  findSystemInstructionsSection(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('system-instructions-section');
  }
}

export const promptManagementModal = new PromptManagementModal();
export const promptDrawer = new PromptDrawer();
export const createPromptModal = new CreatePromptModal();
export const promptAssistant = new PromptAssistant();
