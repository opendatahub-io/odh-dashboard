class ChatbotPromptManagementModal {
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

  findLoadButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-load-button');
  }

  findCancelButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-cancel-button');
  }

  findProjectPromptsTab(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('project-prompts-tab');
  }

  findGlobalPromptsTab(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('global-prompts-tab');
  }
}

class ChatbotPromptDrawer {
  findPanel(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-drawer-panel');
  }

  findVersionSelect(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-version-select');
  }

  findTemplate(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-drawer-template');
  }
}

class ChatbotCreatePromptModal {
  find(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-create-modal');
  }

  findNameInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-name-input');
  }

  findCommitMessageInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-commit-message-input');
  }

  findSaveButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-save-button');
  }

  findErrorAlert(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-save-error-alert');
  }

  findNameError(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-name-error');
  }
}

class ChatbotPromptAssistant {
  findTextarea(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('system-instructions-input');
  }

  findEditButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-edit-button');
  }

  findSaveButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-save-to-registry-button');
  }

  findSaveAsButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-save-as-button');
  }

  findNameTitle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-name-title');
  }

  findUnsavedIndicator(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-unsaved-indicator');
  }

  findLoadPromptButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('load-prompt-button');
  }

  findScopeLabel(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-scope-label');
  }

  findVersionToggle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('prompt-version-toggle');
  }

  findVersionItem(version: number): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId(`prompt-version-item-${version}`);
  }
}

export const chatbotPromptModal = new ChatbotPromptManagementModal();
export const chatbotPromptDrawer = new ChatbotPromptDrawer();
export const chatbotCreatePromptModal = new ChatbotCreatePromptModal();
export const chatbotPromptAssistant = new ChatbotPromptAssistant();
