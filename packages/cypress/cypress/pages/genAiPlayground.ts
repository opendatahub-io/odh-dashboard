class GenAiPlayground {
  navigate(projectName: string) {
    cy.visit(`/gen-ai-studio/playground/${projectName}`);
    cy.url().should('include', `/gen-ai-studio/playground/${projectName}`);
  }

  navigateToAssets(projectName: string) {
    cy.visit(`/gen-ai-studio/assets/${projectName}`);
    cy.url().should('include', `/gen-ai-studio/assets/${projectName}`);
    this.waitForAssetsPageLoad();
  }

  private waitForAssetsPageLoad() {
    // Wait for page title to appear
    cy.findByTestId('page-title', { timeout: 15000 })
      .should('be.visible')
      .should('contain.text', 'AI asset endpoints');
    // Wait for project selector to finish loading
    // This is critical - the Gen AI module can't render without a loaded project context
    cy.findByTestId('project-selector-toggle', { timeout: 30000 })
      .should('not.be.disabled')
      .should('not.contain', 'Loading');
    // Wait for Gen AI module content to load - either table, empty state, or loading spinner
    // Using longer timeout for module federation to load
    cy.findByRole('tabpanel', { timeout: 30000 }).should('be.visible');
  }

  findPageTitle() {
    return cy.findByRole('heading', { name: /Playground/i });
  }

  findEmptyState() {
    return cy.findByTestId('empty-state');
  }

  findModelsTable() {
    return cy.findByTestId('ai-models-table', { timeout: 30000 });
  }

  findAddToPlaygroundButton() {
    // First ensure the table is visible, then find the button
    this.findModelsTable().should('be.visible');
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

  sendMessage(message: string) {
    // Type the message into the input field
    this.findMessageInput().should('be.visible').and('be.enabled').clear().type(message);
    // Press Enter to send the message
    this.findMessageInput().type('{enter}');
    // Verify message was cleared after sending (indicates successful send)
    this.findMessageInput().should('have.value', '');
  }

  ensureModelCheckboxIsChecked(modelName: string) {
    // Sanitize model name for testid: remove all characters except alphanumeric and hyphens
    const sanitizedModelName = modelName.replace(/[^a-zA-Z0-9-]/g, '');
    // Find the checkbox input within the td with the testid
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
    // Open the model selector dropdown
    this.findModelToggleButton().click();
    // Find the dropdown item by text content that contains the model name
    // The model might have a dynamic prefix like "vllm-inference-1/llama-3.2-1b-instruct"
    // We search for list items with testid starting with "model-option-" and containing the model name
    cy.get('[role="menuitem"]').contains(modelName).click();
  }

  verifyModelIsSelected(modelName: string) {
    // Verify the model name is visible in the toggle button (could be with prefix)
    this.findModelToggleButton().should('contain', modelName);
  }
}

export const genAiPlayground = new GenAiPlayground();
