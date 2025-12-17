class GenAiPlayground {
  navigate(projectName: string) {
    cy.visit(`/gen-ai-studio/playground/${projectName}`);
    cy.url().should('include', `/gen-ai-studio/playground/${projectName}`);
  }

  findEmptyState() {
    return cy.findByTestId('empty-state');
  }

  findCreatePlaygroundButton() {
    return cy.findByTestId('empty-state-action-button');
  }

  findConfigurationTable() {
    return cy.findByTestId('chatbot-configuration-table');
  }

  findCreateButtonInDialog() {
    return cy.findByTestId('modal-submit-button');
  }

  findModelToggleButton() {
    return cy.findByTestId('model-selector-toggle');
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
