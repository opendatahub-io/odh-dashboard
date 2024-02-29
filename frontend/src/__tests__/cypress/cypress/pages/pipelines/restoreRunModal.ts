import { Modal } from '~/__tests__/cypress/cypress/pages/components/Modal';

class RestoreRunModal extends Modal {
  protected testId;

  constructor(testId = 'restore-run-modal') {
    super('Restore run?');
    this.testId = testId;
  }

  find() {
    return cy.findByTestId(this.testId).parents('div[role="dialog"]');
  }

  findSubmitButton() {
    return this.findFooter().findByRole('button', { name: 'Restore', hidden: true });
  }
}

export const restoreRunModal = new RestoreRunModal();
export const bulkRestoreRunModal = new RestoreRunModal('bulk-restore-run-modal');
