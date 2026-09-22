class ManageSourcePage {
  findAddSourceTitle() {
    return cy.findByTestId('app-page-title').contains('Add a source');
  }

  findNameInput() {
    return cy.findByTestId('source-name-input');
  }

  findSourceTypeHuggingFace() {
    return cy.findByTestId('source-type-huggingface');
  }

  findCredentialsSection() {
    return cy.findByTestId('credentials-section');
  }

  findOrganizationInput() {
    return cy.findByTestId('organization-input');
  }

  findAccessTokenInput() {
    return cy.findByTestId('access-token-input');
  }

  findValidateButton() {
    return cy.findByRole('button', { name: 'Validate' });
  }

  findShowAccessTokenButton() {
    return cy.findByRole('button', { name: 'Show access token' });
  }

  findHideAccessTokenButton() {
    return cy.findByRole('button', { name: 'Hide access token' });
  }

  findClearAccessTokenButton() {
    return cy.findByRole('button', { name: 'Clear' });
  }

  findValidationSuccessAlert() {
    return this.findCredentialsSection().find('.pf-v6-c-alert.pf-m-success');
  }

  findClearAccessTokenModal() {
    return cy.findByTestId('clear-access-token-modal');
  }

  findClearAccessTokenModalCancelButton() {
    return this.findClearAccessTokenModal().findByRole('button', { name: 'Cancel' });
  }

  findModelVisibilitySection() {
    return cy.findByTestId('model-visibility-section');
  }

  findModelVisibilityToggleButton() {
    return this.findModelVisibilitySection().find('button').first();
  }

  findAllowedModelsInput() {
    return cy.findByTestId('allowed-models-input');
  }

  findPreviewPanel() {
    return cy.findByTestId('preview-panel');
  }

  findPreviewPanelHeaderButton() {
    return this.findPreviewPanel().findByTestId('preview-button-header');
  }

  findPreviewPanelBodyButton() {
    return this.findPreviewPanel().findByTestId('preview-button-panel');
  }

  findPreviewIncludedTab() {
    return this.findPreviewPanel().findByRole('tab', { name: 'Models included' });
  }

  findPreviewModelRow(modelName: string) {
    return this.findPreviewPanel().contains('li', modelName);
  }

  findPreviewGatedAccessWarningIcon(modelName: string) {
    return this.findPreviewModelRow(modelName).findByLabelText('Gated access warning');
  }

  findEnableSourceCheckbox() {
    return cy.findByTestId('enable-source-checkbox');
  }

  findSubmitButton() {
    return cy.findByTestId('submit-button');
  }
}

export const manageSourcePage = new ManageSourcePage();
