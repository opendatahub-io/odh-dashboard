import { Modal } from './components/Modal';
import { TableRow } from './components/table';

class NotebookController {
  visit() {
    cy.visitWithLogin('/notebookController/spawner');
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title');
    cy.testA11y();
  }

  findAppTitle() {
    return cy.findByTestId('app-page-title');
  }

  findAdministrationTab() {
    return cy.findByTestId('admin-tab');
  }

  findSpawnerTab() {
    return cy.findByTestId('spawner-tab');
  }
}

class AdministrationTab {
  shouldHaveManageUsersAlert() {
    cy.findByTestId('manage-users-alert').should(
      'have.text',
      `Custom alert:Manage users in OpenShiftCreate, delete, and manage permissions for ${Cypress.env(
        'ODH_PRODUCT_NAME',
      )} users in OpenShift. Learn more about OpenShift user management`,
    );
    return this;
  }

  findManageUsersAlert() {
    return cy.findByTestId('manage-users-alert');
  }

  findTableHeaderButton(name: string) {
    return this.findTable().find('thead').findByRole('button', { name });
  }

  shouldHaveImpersonateAlert() {
    cy.findByTestId('impersonate-alert').should(
      'have.text',
      'Info alert:This workbench is being created for "regularuser1"Return to administration view',
    );
    return this;
  }

  findReturnToAdminViewButton() {
    return cy.findByTestId('return-admin-view-button');
  }

  shouldHaveNotebookServerForm() {
    cy.findByTestId('notebook-server-form');
    return this;
  }

  findStartServerButton() {
    return cy.findByTestId('start-server-button');
  }

  findImageSelectorRadio(id: string) {
    return cy.findByTestId(['radio', id]);
  }

  findStopAllServersButton() {
    return cy.findByTestId('stop-all-servers-button');
  }

  private findTable() {
    return cy.findByTestId('administration-users-table');
  }

  getRow(name: string) {
    return new AdministrationUsersRow(() =>
      this.findTable().find(`[data-label=name]`).contains(name).parents('tr'),
    );
  }
}

class AdministrationUsersRow extends TableRow {
  shouldHavePrivilege(privilege: string) {
    this.find().find(`[data-label=privilege]`).should('have.text', privilege);
    return this;
  }

  shouldHaveLastActivity(lastActivity: string) {
    this.find().find(`[data-label=lastActivity]`).should('have.text', lastActivity);
    return this;
  }

  findServerStatusButton() {
    return this.find().findByTestId('workbench-button');
  }
}

class StopNotebookModal extends Modal {
  constructor() {
    super('Stop workbench modal Stop workbench');
  }

  findStopNotebookServerButton() {
    return this.find().findByTestId('stop-workbench-button');
  }
}

export const administration = new AdministrationTab();
export const notebookController = new NotebookController();
export const stopNotebookModal = new StopNotebookModal();
