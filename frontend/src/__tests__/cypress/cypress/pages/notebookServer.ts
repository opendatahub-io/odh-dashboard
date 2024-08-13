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
}

export const notebookServer = new NotebookServer();
