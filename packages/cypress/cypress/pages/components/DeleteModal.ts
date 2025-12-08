import type { ByRoleOptions } from '@testing-library/dom';
import { Modal } from './Modal';

export class DeleteModal extends Modal {
  constructor(title: ByRoleOptions['name'] = /Delete.+\?/) {
    super(title);
  }

  findInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByLabelText('Delete modal input');
  }

  findSubmitButton(options?: ByRoleOptions | undefined): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findFooter().findByRole('button', { name: /Delete/, hidden: true, ...options });
  }
}

export const deleteModal = new DeleteModal();
