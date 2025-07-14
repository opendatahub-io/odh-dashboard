import type { ByRoleOptions } from '@testing-library/react';
import { Modal } from '#~/__tests__/cypress/cypress/pages/components/Modal';

export class MigrationModal extends Modal {
  constructor(title: ByRoleOptions['name'] = /Migrate hardware profile/) {
    super(title);
  }

  findSubmitButton(options?: ByRoleOptions | undefined): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findFooter().findByRole('button', { name: /Migrate/, hidden: true, ...options });
  }
}

export const migrationModal = new MigrationModal();
