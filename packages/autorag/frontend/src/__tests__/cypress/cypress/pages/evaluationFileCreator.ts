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

  findCreateButton() {
    return cy.findByTestId('evaluation-create-button');
  }

  findS3BrowseButton() {
    return this.find().findByRole('button', { name: /S3/i });
  }
}

export const evaluationFileCreator = new EvaluationFileCreator();
export const evaluationFileSelector = new EvaluationFileSelector();
