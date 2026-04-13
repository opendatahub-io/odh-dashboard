import { TableRow } from './components/table';

class McpDeploymentTableRow extends TableRow {
  findServer(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('mcp-deployment-server');
  }

  findName(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('mcp-deployment-name');
  }

  findStatusLabel(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('mcp-deployment-status-label');
  }

  findServiceViewButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('mcp-deployment-service-view');
  }

  findServiceUnavailable(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('mcp-deployment-service-unavailable');
  }

  findCreated(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('mcp-deployment-created');
  }

  findDeleteAction(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findKebabAction('Delete');
  }

  findEditAction(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findKebabAction('Edit');
  }
}

class McpDeploymentDeleteModal {
  find() {
    return cy.findByTestId('delete-mcp-deployment-modal');
  }

  findInput() {
    return this.find().findByTestId('delete-modal-input');
  }

  findSubmitButton() {
    return this.find().findByTestId('delete-modal-confirm-button');
  }

  findCancelButton() {
    return this.find().findByRole('button', { name: /^cancel$/i });
  }

  findErrorAlert() {
    return this.find().findByTestId('delete-modal-error-message-alert');
  }

  shouldBeVisible() {
    return this.find().should('be.visible');
  }

  shouldNotExist() {
    return this.find().should('not.exist');
  }
}

class McpDeploymentsPage {
  visit() {
    cy.visitWithLogin('/ai-hub/mcp-deployments');
    this.wait();
  }

  private wait() {
    // A project must be selected before the table loads (namespace drives the BFF list call).
    cy.findByTestId('project-selector-toggle').should('be.visible').click();
    cy.findByRole('menuitem', { name: 'mcp-servers' }).click();
    cy.findByTestId('mcp-deployments-table').should('be.visible');
    cy.testA11y();
  }

  findTable(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('mcp-deployments-table');
  }

  findEmptyState(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('mcp-deployments-empty-state');
  }

  findSelectProjectState(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('mcp-deployments-select-project');
  }

  findFilterInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('mcp-deployments-filter-input');
  }

  findTableRows(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findTable().findAllByTestId(/^mcp-deployment-row-/);
  }

  /**
   * PatternFly sortable columns expose a button inside the &lt;th&gt;; clicking `columnheader` is unreliable.
   */
  findCreatedSortButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findTable().findByRole('button', { name: /^Created$/i });
  }

  // mod-arch-shared's ApplicationsPage uses data-id — we can't change the third-party component
  findLoadingState(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-id="loading-empty-state"]');
  }

  findLoadingSpinner(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findLoadingState().find('[role="progressbar"]');
  }

  findErrorState(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-id="error-empty-state"]');
  }

  getRow(name: string): McpDeploymentTableRow {
    return new McpDeploymentTableRow(
      () =>
        this.findTable()
          .findByTestId(`mcp-deployment-row-${name}`)
          .closest('tr')
          .should('exist') as unknown as Cypress.Chainable<JQuery<HTMLTableRowElement>>,
    );
  }

  getFirstRow(): McpDeploymentTableRow {
    return new McpDeploymentTableRow(() =>
      this.findTableRows().should('have.length.at.least', 1).first().closest('tr').should('exist'),
    );
  }

  findDeleteModal() {
    return new McpDeploymentDeleteModal();
  }
}

export const mcpDeploymentsPage = new McpDeploymentsPage();

class McpDeployModal {
  findModal(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('mcp-deploy-modal');
  }

  shouldBeOpen(): void {
    this.findModal().should('be.visible');
  }

  shouldNotExist(): void {
    cy.findByTestId('mcp-deploy-modal').should('not.exist');
  }

  findTitle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findModal().find('.pf-v6-c-modal-box__title-text');
  }

  findNameInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findModal().findByTestId('mcp-deploy-name');
  }

  findOciImageInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findModal().findByTestId('mcp-deploy-oci-image-input');
  }

  findProjectSelector(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findModal().findByTestId('mcp-deploy-project-selector');
  }

  findSubmitButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findModal().findByTestId('mcp-deploy-submit-button');
  }

  findCloseButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findModal().findByTestId('mcp-deploy-close-button');
  }

  findResetButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findModal().findByTestId('mcp-deploy-reset-button');
  }

  findSubmitError(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findModal().findByTestId('mcp-deploy-submit-error');
  }

  findLoadError(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findModal().findByTestId('mcp-deploy-load-error');
  }

  findLoadingSpinner(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findModal().find('[role="progressbar"]');
  }
}

class McpServerDetailsPage {
  findDeployButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('mcp-deploy-button');
  }

  findBreadcrumbServerName(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('breadcrumb-server-name');
  }

  // PF6 Button's isLoading spinner is internal to PatternFly -- no data-testid is available
  findDeployButtonSpinner(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findDeployButton().find('[role="progressbar"]');
  }
}

export const mcpDeployModal = new McpDeployModal();
export const mcpServerDetailsPage = new McpServerDetailsPage();
