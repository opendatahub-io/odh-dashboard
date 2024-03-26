import { Modal } from '~/__tests__/cypress/cypress/pages/components/Modal';

class RestoreModal extends Modal {
  protected testId;

  constructor(title: string, testId: string) {
    super(title);
    this.testId = testId;
  }

  find() {
    return cy.findByTestId(this.testId).parents('div[role="dialog"]');
  }

  findSubmitButton() {
    return this.findFooter().findByRole('button', { name: 'Restore', hidden: true });
  }
}

export const restoreRunModal = new RestoreModal('Restore run?', 'restore-run-modal');
export const bulkRestoreRunModal = new RestoreModal('Restore runs?', 'restore-run-modal');
export const restoreExperimentModal = new RestoreModal(
  'Restore experiment?',
  'restore-experiment-modal',
);
export const bulkRestoreExperimentModal = new RestoreModal(
  'Restore experiments?',
  'restore-experiment-modal',
);
