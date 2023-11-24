import { ByRoleOptions } from '@testing-library/react';
import { Modal } from '~/__tests__/cypress/cypress/pages/components/Modal';

export class DeleteModal extends Modal {
  constructor(title: ByRoleOptions['name'] = /Delete.+\?/) {
    super(title);
  }

  selectInput() {
    return this.selectModal().findByLabelText('Delete modal input');
  }

  selectDeleteButton() {
    return this.selectFooter().findByRole('button', { name: /Delete/ });
  }

  selectCancelButton() {
    return this.selectFooter().findByRole('button', { name: 'Cancel' });
  }
}

export const deleteModal = new DeleteModal();
