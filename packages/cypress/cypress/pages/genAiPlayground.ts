class GenAiPlayground {
  navigate(projectName: string) {
    cy.visit(`/gen-ai-studio/playground/${projectName}`);
    cy.url().should('include', `/gen-ai-studio/playground/${projectName}`);
  }

  findEmptyState() {
    return cy.findByTestId('empty-state');
  }

  findCreatePlaygroundEmptyState() {
    return cy.findByTestId('create-playground-empty-state');
  }

  /**
   * Poll until the "Create your playground" empty state appears.
   * The AAA models endpoint may take time to reflect a newly deployed model,
   * so we reload the page until the correct empty state is rendered.
   */
  waitForCreatePlaygroundEmptyState(
    projectName: string,
    { maxAttempts = 12, pollIntervalMs = 10000 } = {},
  ) {
    const check = (attempt = 1): void => {
      cy.log(`Attempt ${attempt}/${maxAttempts} - Waiting for models to be available...`);
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="create-playground-empty-state"]').length > 0) {
          cy.log('Models available — "Create your playground" state found.');
          return;
        }
        if (attempt >= maxAttempts) {
          throw new Error(
            `"Create your playground" empty state not found after ${maxAttempts} attempts. ` +
              'The deployed model may not have been registered as an AI asset endpoint.',
          );
        }
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(pollIntervalMs);
        this.navigate(projectName);
        check(attempt + 1);
      });
    };
    check();
  }

  findCreatePlaygroundButton() {
    return this.findCreatePlaygroundEmptyState().findByTestId('empty-state-action-button');
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
