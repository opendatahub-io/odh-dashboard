import { appChrome } from '#~/__tests__/cypress/cypress/pages/appChrome';
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

class ModelRegistryTableRow extends TableRow {
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

  findModelVersionName() {
    return this.find().findByTestId('model-version-name');
  }
}

class ModelRegistry {
  landingPage() {
    cy.visitWithLogin('/');
    this.waitLanding();
  }

  visit() {
    cy.visitWithLogin(`/modelRegistry`);
    this.wait();
  }

  navigate() {
    appChrome.findNavItem('Model registry').click();
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title').should('exist');
    cy.findByTestId('app-page-title').contains('Model registry');
    cy.testA11y();
  }

  private waitLanding() {
    cy.findByTestId('home-page').should('be.visible');
  }

  shouldBeEmpty() {
    cy.findByTestId('empty-state-title').should('exist');
    return this;
  }

  findModelRegistryEmptyState() {
    return cy.findByTestId('empty-model-registries-state');
  }

  findModelRegistryEmptyTableState() {
    return cy.findByTestId('dashboard-empty-table-state');
  }

  shouldregisteredModelsEmpty() {
    cy.findByTestId('empty-registered-models').should('exist');
  }

  findViewDetailsButton() {
    return cy.findByTestId('view-details-button');
  }

  findDetailsPopover() {
    return cy.findByTestId('mr-details-popover');
  }

  findHelpContentButton() {
    return cy.findByTestId('model-registry-help-button');
  }

  findHelpContentPopover() {
    return cy.findByTestId('model-registry-help-content');
  }

  shouldmodelVersionsEmpty() {
    cy.findByTestId('empty-model-versions').should('exist');
  }

  shouldArchveModelVersionsEmpty() {
    cy.findByTestId('empty-archive-model-versions').should('exist');
  }

  shouldModelRegistrySelectorExist() {
    cy.findByTestId('model-registry-selector-dropdown').should('exist');
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

  findModelVersionsTable() {
    return cy.findByTestId('model-versions-table');
  }

  findTableRows() {
    return this.findTable().find('tbody tr');
  }

  findModelVersionsTableRows() {
    return this.findModelVersionsTable().find('tbody tr');
  }

  getRow(name: string) {
    return new ModelRegistryTableRow(() =>
      this.findTable().find(`[data-label="Model name"]`).contains(name).parents('tr'),
    );
  }

  getModelVersionRow(name: string) {
    return new ModelRegistryTableRow(() =>
      this.findModelVersionsTable()
        .find(`[data-label="Version name"]`)
        .contains(name)
        .parents('tr'),
    );
  }

  findRegisteredModelTableHeaderButton(name: string) {
    return this.findTable().find('thead').findByRole('button', { name });
  }

  findModelRegistry() {
    return cy.findByTestId('model-registry-selector-dropdown');
  }

  findModelVersionsTableHeaderButton(name: string) {
    return this.findModelVersionsTable().find('thead').findByRole('button', { name });
  }

  findTableSearch() {
    return cy.findByTestId('registered-model-table-search');
  }

  findModelVersionsTableSearch() {
    return cy.findByTestId('model-versions-table-search');
  }

  findModelBreadcrumbItem() {
    return cy.findByTestId('breadcrumb-model');
  }

  findModelVersionsTableKebab() {
    return cy.findByTestId('model-versions-table-kebab-action');
  }

  findModelVersionsHeaderAction() {
    return cy.findByTestId('model-version-action-toggle');
  }

  findModelVersionsTableFilter() {
    return cy.findByTestId('model-versions-table-filter');
  }

  findRegisterModelButton() {
    return cy.findByRole('button', { name: 'Register model' });
  }

  findRegisterNewVersionButton() {
    return cy.findByRole('button', { name: 'Register new version' });
  }

  // Empty state selectors for admin users
  findEmptyStateAdminTitle() {
    return cy.findByText('Create a model registry');
  }

  findEmptyStateAdminDescription() {
    return cy.contains('No model registries are available to users in your organization');
  }

  findEmptyStateAdminInstructions() {
    return cy.contains('Create a model registry from the');
  }

  findEmptyStateAdminSettingsLink() {
    return cy.contains('Model registry settings');
  }

  findEmptyStateAdminButton() {
    return cy.findByRole('link', { name: 'Go to Model registry settings' });
  }

  // Empty state selectors for non-admin users
  findEmptyStateNonAdminTitle() {
    return cy.findByText('Request access to model registries');
  }

  findEmptyStateNonAdminDescription() {
    return cy.findByText(
      'To request a new model registry, or to request permission to access an existing model registry, contact your administrator.',
    );
  }

  findEmptyStateNonAdminHelpButton() {
    return cy.findByRole('button', { name: "Who's my administrator?" });
  }
}

export const modelRegistry = new ModelRegistry();
export const labelModal = new LabelModal();
