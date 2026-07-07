const GEN_AI_DEV_FLAG = 'devFeatureFlags=genAiStudio=true,modelAsService=false';
const GEN_AI_CUSTOM_ENDPOINTS_FLAG =
  'devFeatureFlags=genAiStudio=true,aiAssetCustomEndpoints=true,modelAsService=false';
const GEN_AI_CUSTOM_ENDPOINTS_PROMPT_FLAG =
  'devFeatureFlags=genAiStudio=true,aiAssetCustomEndpoints=true,promptManagement=true,modelAsService=false';

class GenAiPlayground {
  navigate(projectName: string) {
    cy.visit(`/gen-ai-studio/playground/${projectName}?${GEN_AI_DEV_FLAG}`);
    cy.url().should('include', `/gen-ai-studio/playground/${projectName}`);
  }

  navigateToAssets(projectName: string) {
    cy.visit(`/gen-ai-studio/assets/${projectName}?${GEN_AI_DEV_FLAG}`);
    cy.url().should('include', `/gen-ai-studio/assets/${projectName}`);
  }

  navigateToAssetsWithCustomEndpoints(projectName: string) {
    cy.visit(`/gen-ai-studio/assets/${projectName}?${GEN_AI_CUSTOM_ENDPOINTS_FLAG}`);
    cy.url().should('include', `/gen-ai-studio/assets/${projectName}`);
  }

  navigateWithCustomEndpoints(projectName: string) {
    cy.visit(`/gen-ai-studio/playground/${projectName}?${GEN_AI_CUSTOM_ENDPOINTS_FLAG}`);
    cy.url().should('include', `/gen-ai-studio/playground/${projectName}`);
  }

  navigateToPlaygroundWithRetry(projectName: string) {
    const playgroundUrl = `/gen-ai-studio/playground/${projectName}?${GEN_AI_CUSTOM_ENDPOINTS_FLAG}`;
    cy.visit(playgroundUrl);
    cy.findByTestId('chatbot-model-selector-toggle', { timeout: 120000 }).should('be.visible');
  }

  navigateToAssetsWithPromptManagement(projectName: string) {
    cy.visit(`/gen-ai-studio/assets/${projectName}?${GEN_AI_CUSTOM_ENDPOINTS_PROMPT_FLAG}`);
    cy.url().should('include', `/gen-ai-studio/assets/${projectName}`);
  }

  navigateToPlaygroundWithPromptManagement(projectName: string) {
    cy.visit(`/gen-ai-studio/playground/${projectName}?${GEN_AI_CUSTOM_ENDPOINTS_PROMPT_FLAG}`);
    cy.url().should('include', `/gen-ai-studio/playground/${projectName}`);
  }

  navigateToPlaygroundWithPromptManagementRetry(projectName: string) {
    const playgroundUrl = `/gen-ai-studio/playground/${projectName}?${GEN_AI_CUSTOM_ENDPOINTS_PROMPT_FLAG}`;
    cy.visit(playgroundUrl);
    cy.findByTestId('chatbot-model-selector-toggle', { timeout: 120000 }).should('be.visible');
  }

  findEmptyState() {
    return cy.findByTestId('empty-state');
  }

  findAddToPlaygroundButton() {
    return cy.findByTestId('ai-models-table').contains('button', 'Add to playground');
  }

  findGoToPlaygroundLink(options?: { timeout?: number }) {
    return cy.findByTestId('go-to-playground-link', options);
  }

  findConfigurationTable() {
    return cy.findByTestId('chatbot-configuration-table');
  }

  findCreateButtonInDialog() {
    return cy.findByTestId('modal-submit-button');
  }

  findModelToggleButton() {
    return cy.findByTestId('chatbot-model-selector-toggle');
  }

  findMessageInput() {
    return cy.findByTestId('chatbot-message-bar');
  }

  findUserMessage() {
    return cy.findByTestId('chatbot-message-user');
  }

  findAssistantMessage(options?: { timeout?: number }) {
    return cy.findByTestId('chatbot-message-bot', options);
  }

  sendMessage(message: string) {
    this.findMessageInput().should('be.visible').and('be.enabled').clear().type(message);
    this.findMessageInput().type('{enter}');
    this.findMessageInput().should('have.value', '');
  }

  ensureModelCheckboxIsChecked(modelName: string) {
    const sanitizedModelName = modelName.replace(/[^a-zA-Z0-9-]/g, '');
    cy.findByTestId(`${sanitizedModelName}-checkbox`)
      .find('input[type="checkbox"]')
      .then(($checkbox) => {
        if (!$checkbox.is(':checked')) {
          cy.wrap($checkbox).click();
        }
      });
    cy.findByTestId(`${sanitizedModelName}-checkbox`)
      .find('input[type="checkbox"]')
      .should('be.checked');
  }

  selectModelFromDropdown(modelName: string) {
    this.findModelToggleButton().click();
    cy.get('[role="menuitem"]').contains(modelName).click();
  }

  verifyModelIsSelected(modelName: string) {
    this.findModelToggleButton().should('contain', modelName);
  }

  // Custom endpoint methods
  findCreateEndpointButton() {
    return cy.findByTestId('create-endpoint-button');
  }

  findEmptyStateCreateEndpointButton() {
    return cy.findByTestId('empty-state-secondary-action-button');
  }

  findCreateExternalModelModal() {
    return cy.findByTestId('create-external-model-modal');
  }

  findModelIdInput() {
    return cy.findByTestId('create-external-model-id-input');
  }

  findDisplayNameInput() {
    return cy.findByTestId('create-external-model-display-name-input');
  }

  findEndpointUrlInput() {
    return cy.findByTestId('create-external-model-url-input');
  }

  findTokenInput() {
    return cy.findByTestId('create-external-model-token-input');
  }

  findVerifyModelButton() {
    return cy.findByTestId('create-external-model-verify-button');
  }

  findVerifySuccessAlert(options?: { timeout?: number }) {
    return cy.findByTestId('create-external-model-verify-success-alert', options);
  }

  findCreateEndpointSubmitButton() {
    return cy.findByTestId('create-external-model-submit-button');
  }

  findAiModelsTable() {
    return cy.findByTestId('ai-models-table');
  }

  findModelActionsKebab(modelName: string) {
    return this.findAiModelsTable()
      .find('tr')
      .contains(modelName)
      .parents('tr')
      .findByTestId('model-actions-kebab');
  }

  findRemoveAssetAction() {
    return cy.findByTestId('remove-asset-action');
  }

  findDeleteModelModal() {
    return cy.findByTestId('delete-model-modal');
  }

  findDeleteModelConfirmButton() {
    return cy.findByTestId('delete-model-modal').findByRole('button', { name: /^delete$/i });
  }

  findTryInPlaygroundButton() {
    return cy.findByTestId('try-playground-button');
  }

  // Settings panel methods
  findSettingsButton() {
    return cy.findByTestId('settings-button');
  }

  findSettingsPromptTab() {
    return cy.findByTestId('chatbot-settings-page-tab-prompt');
  }

  // Prompt management methods (within the playground settings panel)
  findSystemInstructionsInput() {
    return cy.findByTestId('system-instructions-input');
  }

  findPromptSaveToRegistryButton() {
    return cy.findByTestId('prompt-save-to-registry-button');
  }

  findPromptNameInput() {
    return cy.findByTestId('prompt-name-input');
  }

  findPromptTemplateInput() {
    return cy.findByTestId('prompt-template-input');
  }

  findPromptCommitMessageInput() {
    return cy.findByTestId('prompt-commit-message-input');
  }

  findPromptSaveButton() {
    return cy.findByTestId('prompt-save-button');
  }

  findPromptCreateModal() {
    return cy.findByTestId('prompt-create-modal');
  }

  findPromptManagementModal() {
    return cy.findByTestId('prompt-management-modal');
  }

  findLoadPromptButton() {
    return cy.findByTestId('load-prompt-button');
  }

  findPromptTableRow(promptName: string) {
    return cy.findByTestId(`prompt-table-row-${promptName}`);
  }

  findPromptLoadConfirmButton() {
    return cy.findByTestId('prompt-load-button');
  }

  findPromptNameTitle() {
    return cy.findByTestId('prompt-name-title');
  }
}

export const genAiPlayground = new GenAiPlayground();
