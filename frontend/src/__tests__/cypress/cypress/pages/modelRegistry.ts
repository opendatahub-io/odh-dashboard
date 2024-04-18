import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';
import { TableRow } from './components/table';
import { Modal } from './components/Modal';

class LabelModal extends Modal {
  constructor() {
    super('Labels');
  }

  findModalSearchInput() {
    return cy.findByTestId('label-modal-search');
  }

  findCloseModal() {
    return cy.findByTestId('close-modal');
  }

  shouldContainsModalLabels(labels: string[]) {
    cy.findByTestId('modal-label-group').within(() => labels.map((label) => cy.contains(label)));
    return this;
  }
}

class RegisteredModelTableRow extends TableRow {
  findName() {
    return this.find().findByTestId('model-name');
  }

  findDescription() {
    return this.find().findByTestId('description');
  }

  findOwner() {
    return this.find().findByTestId('registered-model-owner');
  }

  findLabelPopoverText() {
    return this.find().findByTestId('popover-label-text');
  }

  findLabelModalText() {
    return this.find().findByTestId('modal-label-text');
  }

  shouldContainsPopoverLabels(labels: string[]) {
    cy.findByTestId('popover-label-group').within(() => labels.map((label) => cy.contains(label)));
    return this;
  }
}

class ModelRegistry {
  landingPage() {
    cy.visit('/');
    this.waitLanding();
  }

  visit() {
    cy.visit(`/modelRegistry`);
    this.wait();
  }

  navigate() {
    appChrome.findNavItem('Model Registry').click();
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title').should('exist');
    cy.testA11y();
  }

  private waitLanding() {
    cy.findByTestId('enabled-application').should('be.visible');
  }

  shouldBeEmpty() {
    cy.findByTestId('empty-state-title').should('exist');
    return this;
  }

  shouldregisteredModelsEmpty() {
    cy.findByTestId('empty-model-registry').should('exist');
  }

  shouldModelRegistrySelectorExist() {
    cy.get('#model-registry-selector-dropdown').should('exist');
  }

  shouldtableToolbarExist() {
    cy.findByTestId('registered-models-table-toolbar').should('exist');
  }

  tabEnabled() {
    appChrome.findNavItem('Model Registry').should('exist');
    return this;
  }

  tabDisabled() {
    appChrome.findNavItem('Model Registry').should('not.exist');
    return this;
  }

  findTable() {
    return cy.findByTestId('registered-model-table');
  }

  findTableRows() {
    return this.findTable().find('tbody tr');
  }

  getRow(name: string) {
    return new RegisteredModelTableRow(() =>
      this.findTable().find(`[data-label="Model name"]`).contains(name).parents('tr'),
    );
  }

  findRegisteredModelTableHeaderButton(name: string) {
    return this.findTable().find('thead').findByRole('button', { name });
  }

  findTableSearch() {
    return cy.findByTestId('registered-model-table-search');
  }
}

export const modelRegistry = new ModelRegistry();
export const labelModal = new LabelModal();
