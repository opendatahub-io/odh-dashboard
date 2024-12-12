class NotebookServer {
  visit() {
    cy.visitWithLogin('/notebookController/spawner');
    this.wait();
  }

  private wait() {
    this.findAppTitle();
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

  findStartServerButton() {
    return cy.findByTestId('start-server-button');
  }

  findCancelStartServerButton() {
    return cy.findByTestId('cancel-start-server-button');
  }

  findEventlog() {
    return cy.findByTestId('expand-logs').findByRole('button');
  }

  findStopServerButton() {
    return cy.findByTestId('stop-nb-button');
  }

  findStopNotebookServerButton() {
    return cy.findByTestId('stop-nb-server-button');
  }

  findAcceleratorProfileSelect() {
    return cy.findByTestId('accelerator-profile-select');
  }

  findOpenInNewTabButton() {
    return cy.findByRole('button', { name: 'Open in new tab' });
  }

  findSuccessAlert() {
    return cy.findByText('Success', { timeout: 120000 });
  }

  findNotebookImage(notebook: string) {
    return cy.get(`[data-testid="radio ${notebook}"]`);
  }

  findVersionsDropdown(version: string) {
    return cy
      .get(`[data-id="${version}"]`)
      .closest('.pf-v5-c-expandable-section')
      .find('span.pf-v5-c-expandable-section__toggle-text');
  }

  findNotebookVersion(version: string) {
    return cy.get(`[data-id="${version}"]`);
  }
}

export const notebookServer = new NotebookServer();
