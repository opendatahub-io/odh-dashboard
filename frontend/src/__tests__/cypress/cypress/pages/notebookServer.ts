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
    return cy.findByTestId('stop-wb-button');
  }

  findStopNotebookServerButton() {
    return cy.findByTestId('stop-workbench-button');
  }

  findAcceleratorProfileSelect() {
    return cy.findByTestId('accelerator-profile-select');
  }

  findHardProfileSelection(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('hardware-profile-select');
  }

  selectProfile(name: string): void {
    this.findHardProfileSelection().click();
    cy.findByRole('option', { name }).click();
  }

  selectPotentiallyDisabledProfile(profileDisplayName: string, profileName?: string): void {
    const dropdown = this.findHardProfileSelection();

    dropdown.then(($el) => {
      if ($el.prop('disabled')) {
        // If disabled, verify it contains the base profile name
        // Use the shorter profileName if provided, otherwise use profileDisplayName
        const nameToCheck = profileName || profileDisplayName;
        cy.wrap($el).contains(nameToCheck).should('exist');
        cy.log(`Dropdown is disabled with value: ${nameToCheck}`);
      } else {
        // If enabled, proceed with selection as before using the full display name
        dropdown.click();
        cy.findByRole('option', { name: profileDisplayName }).click();
      }
    });
  }

  findHardwareProfileSelect() {
    return cy.findByTestId('hardware-profile-select');
  }

  findHardwareProfileSelectOptionValues() {
    return cy.findAllByRole('option').then((options) => {
      const values = [...options].map((option) => option.textContent?.trim());
      return cy.wrap(values);
    });
  }

  findOpenInNewTabButton() {
    return cy.findByRole('button', { name: 'Open in new tab' });
  }

  findSuccessAlert() {
    return cy.findByText('Running', { timeout: 120000 });
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
