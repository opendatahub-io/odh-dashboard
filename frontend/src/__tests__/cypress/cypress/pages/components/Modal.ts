import { ByRoleOptions } from '@testing-library/react';

export class Modal {
  constructor(private title: ByRoleOptions['name']) {}

  selectModal() {
    return cy.findByRole('dialog', { name: this.title });
  }

  selectCloseButton() {
    return this.selectModal().findByRole('button', { name: 'Close' });
  }

  selectFooter() {
    return this.selectModal().get('footer');
  }
}
