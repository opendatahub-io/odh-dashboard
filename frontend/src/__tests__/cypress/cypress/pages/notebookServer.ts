enum EnvVarItemType {
  KEY = 'key',
  VALUE = 'value',
  SECRET_TOGGLE = 'is-secret',
  SHOW_PASSWORD_TOGGLE = 'show-password',
}

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

  findEnvVarAdd() {
    return cy.findByTestId('add-env-var');
  }

  private findEnvVarGroupItem(groupIndex: number, type: EnvVarItemType) {
    return cy.findByTestId(`environment-variable-row-${groupIndex}-0-${type}`);
  }

  findEnvVarKey(groupIndex: number) {
    return this.findEnvVarGroupItem(groupIndex, EnvVarItemType.KEY);
  }

  findEnvVarValue(groupIndex: number) {
    return this.findEnvVarGroupItem(groupIndex, EnvVarItemType.VALUE);
  }

  findEnvVarIsSecretCheckbox(groupIndex: number) {
    return this.findEnvVarGroupItem(groupIndex, EnvVarItemType.SECRET_TOGGLE);
  }

  findEnvVarSecretEyeToggle(groupIndex: number) {
    return this.findEnvVarGroupItem(groupIndex, EnvVarItemType.SHOW_PASSWORD_TOGGLE);
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
    return cy.findByTestId('expand-logs');
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
      .closest('.pf-v6-c-expandable-section')
      .find('span.pf-v6-c-button__text');
  }

  findNotebookVersion(version: string) {
    return cy.get(`[data-id="${version}"]`);
  }
}

export const notebookServer = new NotebookServer();
