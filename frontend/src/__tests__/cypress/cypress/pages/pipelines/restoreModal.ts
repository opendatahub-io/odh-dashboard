import { Modal } from '#~/__tests__/cypress/cypress/pages/components/Modal';

class RestoreModal extends Modal {
  protected testId;

  protected submitName;

  constructor(title: string, testId: string, name?: string) {
    super(title);
    this.testId = testId;
    this.submitName = name;
  }

  find() {
    return cy.findByTestId(this.testId);
  }

  findAlertMessage() {
    return cy.findByTestId('single-restoring-alert-message');
  }

  findSubmitButton() {
    return this.findFooter().findByRole('button', {
      name: this.submitName || 'Restore',
      hidden: true,
    });
  }

  findCancelButton() {
    return this.findFooter().findByRole('button', {
      name: 'Cancel',
      hidden: true,
    });
  }

  findRetryButton() {
    return this.findFooter().findByRole('button', {
      name: 'Retry',
      hidden: true,
    });
  }

  findErrorMessage() {
    return this.find().findByTestId('error-message-alert');
  }
}

export const restoreRunModal = new RestoreModal('Restore run?', 'restore-run-modal');
export const bulkRestoreRunModal = new RestoreModal('Restore runs?', 'restore-run-modal');
export const bulkRestoreRunWithArchivedExperimentModal = new RestoreModal(
  'Restore runs?',
  'restore-run-modal',
  'Restore runs and experiments',
);
export const restoreRunWithArchivedExperimentModal = new RestoreModal(
  'Restore runs?',
  'restore-run-modal',
  'Restore run and experiment',
);
export const restoreExperimentModal = new RestoreModal(
  'Restore experiment?',
  'restore-experiment-modal',
);
export const bulkRestoreExperimentModal = new RestoreModal(
  'Restore experiments?',
  'restore-experiment-modal',
);
