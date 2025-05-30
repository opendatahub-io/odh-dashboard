import { Modal } from '#~/__tests__/cypress/cypress/pages/components/Modal';

class ArchiveModal extends Modal {
  protected testId: string;

  constructor(title: string, testId: string) {
    super(title);
    this.testId = testId;
  }

  find() {
    return cy.findByTestId(this.testId);
  }

  findConfirmInput() {
    return this.find().findByTestId('confirm-archive-input');
  }

  findSubmitButton() {
    return this.findFooter().findByRole('button', { name: 'Archive', hidden: true });
  }
}

export const archiveRunModal = new ArchiveModal('Archive run?', 'archive-run-modal');
export const bulkArchiveRunModal = new ArchiveModal('Archive runs?', 'archive-run-modal');
export const archiveExperimentModal = new ArchiveModal(
  'Archive experiment?',
  'archive-experiment-modal',
);
export const bulkArchiveExperimentModal = new ArchiveModal(
  'Archive experiments?',
  'archive-experiment-modal',
);
