import { Modal } from '~/__tests__/cypress/cypress/pages/components/Modal';

class ArchiveRunModal extends Modal {
  protected testId;

  constructor(testId = 'archive-run-modal') {
    super('Archive run?');
    this.testId = testId;
  }

  find() {
    return cy.findByTestId(this.testId).parents('div[role="dialog"]');
  }

  findConfirmInput() {
    return this.find().findByTestId('confirm-archive-input');
  }

  findSubmitButton() {
    return this.findFooter().findByRole('button', { name: 'Archive', hidden: true });
  }
}

export const archiveRunModal = new ArchiveRunModal();
export const bulkArchiveRunModal = new ArchiveRunModal('bulk-archive-run-modal');
