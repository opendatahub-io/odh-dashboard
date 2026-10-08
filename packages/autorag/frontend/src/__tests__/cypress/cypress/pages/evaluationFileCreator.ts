import { Modal } from './components/Modal';

class EvaluationFileCreator extends Modal {
  constructor() {
    super('Create an evaluation source');
  }

  findQuestionInput() {
    return this.find().findByTestId('eval-question');
  }

  findAnswerInput() {
    return this.find().findByTestId('eval-answer');
  }

  findSelectDocumentsButton() {
    return this.find().findByTestId('eval-select-documents');
  }

  findAddButton() {
    return this.find().findByTestId('eval-add-row');
  }

  findEntriesTable() {
    return this.find().findByTestId('eval-entries-table');
  }

  findSubmitButton() {
    return this.find().findByTestId('eval-create-submit');
  }

  findCancelButton() {
    return this.find().findByTestId('eval-create-cancel');
  }

  findEmptyState() {
    return this.findEntriesTable().contains('No questions or answers');
  }

  findTableRow(question: string) {
    return this.findEntriesTable().contains('tr', question);
  }

  findKebabAction(question: string, action: string) {
    return this.findTableRow(question).findKebabAction(action);
  }

  clickKebabAction(question: string, action: string) {
    this.findKebabAction(question, action).then(($action) => {
      // Clicking an action removes or re-renders the menu immediately, so Cypress's
      // normal click command can report that the subject detached after the click.
      $action[0].click();
    });
  }
}

class FileExplorer {
  findAddKnowledgeFilesButton() {
    return cy.findByTestId('add-knowledge-files-button');
  }

  find() {
    return cy.findByTestId('file-explorer-table');
  }

  // When multiple file explorer instances are open at once (e.g. document selector
  // layered over the main configure page), the most recently opened one is last in the DOM.
  findLast() {
    return cy.findAllByTestId('file-explorer-table').last();
  }

  findSearch() {
    return cy.findByTestId('file-explorer-search');
  }

  findFolder(folderName: string) {
    return this.find().findByRole('button', { name: folderName });
  }

  findRow(rowText: string) {
    return this.find().contains('td', rowText);
  }

  findLastRowCheckbox(rowText: string) {
    return this.findLast().contains('tr', rowText).find('input[type="checkbox"]');
  }

  findSelectButton() {
    return cy.findByTestId('file-explorer-select-btn');
  }

  findLastSelectButton() {
    return cy.findAllByTestId('file-explorer-select-btn').last();
  }

  navigateIntoFolder(folderName: string) {
    this.findFolder(folderName).click();
    return this;
  }
}

class AutoragConfigurePage {
  selectMaaSSecret(secretName: string) {
    const selectorTestId = 'maas-secret-selector';
    cy.findByTestId(selectorTestId).click();
    cy.findByTestId(selectorTestId).find('input').type(secretName);
    cy.findByRole('option', { name: new RegExp(`^${secretName}$`, 'i') })
      .should('be.visible')
      .click();
    cy.findByTestId(selectorTestId).find('input').should('have.value', secretName);
  }

  selectStorageSecret(secretName: string) {
    const selectorTestId = 'aws-secret-selector';
    cy.findByTestId(selectorTestId).click();
    cy.findByTestId(selectorTestId).find('input').type(secretName);
    cy.findByRole('option', { name: new RegExp(`^${secretName}$`, 'i') })
      .should('be.visible')
      .click();
    cy.findByTestId(selectorTestId).find('input').should('have.value', secretName);
  }
}

class EvaluationFileSelector {
  find() {
    return cy.findByTestId('evaluation-file-selector');
  }

  findFileInput() {
    return this.find().find('input[readonly]');
  }

  findClearButton() {
    return this.find().findByRole('button', { name: 'Clear file' });
  }

  findActionsButton() {
    return this.find().findByTestId('evaluation-file-actions');
  }

  findCreateDatasetMenuItem() {
    return this.find().findByRole('menuitem', { name: 'Create new evaluation dataset' });
  }

  findFileActionButton() {
    return this.find().findByRole('button', { name: /^(Add file|Replace file)$/ });
  }
}

export const evaluationFileCreator = new EvaluationFileCreator();
export const evaluationFileSelector = new EvaluationFileSelector();
export const fileExplorer = new FileExplorer();
export const autoragConfigurePage = new AutoragConfigurePage();
