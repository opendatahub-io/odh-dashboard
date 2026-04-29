class ModelsTabRow {
  private findFn: () => Cypress.Chainable<JQuery<HTMLTableRowElement>>;

  constructor(findFn: () => Cypress.Chainable<JQuery<HTMLTableRowElement>>) {
    this.findFn = findFn;
  }

  find(): Cypress.Chainable<JQuery<HTMLTableRowElement>> {
    return this.findFn();
  }

  findSourceLabel(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('[data-label="Source"]');
  }

  findEndpointCell(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('[data-label="Endpoints"]');
  }

  findModelTypeCell(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('[data-label="Model type"]');
  }

  findUseCaseCell(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('[data-label="Use case"]');
  }

  findStatusCell(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('[data-label="Status"]');
  }

  findPlaygroundCell(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('[data-label="Playground"]');
  }

  findKebabMenu(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('model-actions-kebab');
  }
}

class ModelsTabPage {
  findTable(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('ai-models-table');
  }

  findTableRows(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findTable().find('tr:has(td)');
  }

  getRow(modelName: string): ModelsTabRow {
    return new ModelsTabRow(() =>
      this.findTable().find('tr:has(td)').contains(modelName).parents('tr'),
    );
  }

  openEndpointModal(modelName: string): void {
    this.getRow(modelName).findEndpointCell().findByTestId('endpoint-view-button').click();
  }

  findWarningAlert(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('models-tab-warning-alert');
  }

  findEmptyState(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('empty-state');
  }
}

class DeleteModelModal {
  find(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('delete-model-modal');
  }

  shouldBeVisible(): void {
    this.find().should('be.visible');
  }

  shouldNotExist(): void {
    this.find().should('not.exist');
  }

  findRemoveButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByRole('button', { name: /^remove$/i });
  }

  findCancelButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByRole('button', { name: /cancel/i });
  }

  findRemovingButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByRole('button', { name: /removing/i });
  }

  findTitle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByRole('heading', { name: /remove asset/i });
  }

  // PF6 inline Alert does not have role="alert" — uses CSS class selector
  findDangerAlert(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('.pf-v6-c-alert.pf-m-danger');
  }
}

class KebabMenu {
  find(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByRole('menu');
  }

  shouldBeVisible(): void {
    this.find().should('be.visible');
  }

  shouldNotExist(): void {
    this.find().should('not.exist');
  }

  findRemoveAssetItem(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByRole('menuitem', { name: /remove asset/i });
  }
}

class EndpointModalPage {
  findModal(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[role="dialog"]');
  }

  findSubscriptionSelect(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('endpoint-modal-subscription-select');
  }

  findGenerateButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('endpoint-modal-generate-api-key');
  }

  findApiKeyInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('endpoint-modal-api-key-input');
  }

  findApiKeyToggle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('endpoint-modal-api-key-toggle');
  }

  findCloseButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('endpoint-modal-close');
  }
}

export const modelsTabPage = new ModelsTabPage();
export const deleteModelModal = new DeleteModelModal();
export const kebabMenu = new KebabMenu();
export const endpointModalPage = new EndpointModalPage();
