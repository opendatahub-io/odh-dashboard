import { ByRoleOptions } from '@testing-library/react';

export class Modal {
  constructor(private title: ByRoleOptions['name']) {}

  find() {
    return cy.findByRole('dialog', { name: this.title });
  }

  findCloseButton() {
    return this.find().findByRole('button', { name: 'Close' });
  }

  findCancelButton() {
    return this.findFooter().findByRole('button', { name: 'Cancel' });
  }

  findFooter() {
    return this.find().find('footer');
  }
}
