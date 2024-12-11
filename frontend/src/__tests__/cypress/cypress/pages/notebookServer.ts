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

  findMinimalPythonImage() {
    return cy.get(
      '[data-testid="radio jupyter-minimal-notebook"], [data-testid="radio s2i-minimal-notebook"]',
    );
  }

  findPythonVersionsButton() {
    return cy.get('button[aria-controls*="expandable-section-content"]').contains('Versions');
  }

  findPythonVersion20241() {
    return cy.get(
      'input[data-id="jupyter-minimal-notebook:2024.1"], input[data-id="s2i-minimal-notebook:2024.1"]',
    );
  }
}

export const notebookServer = new NotebookServer();
