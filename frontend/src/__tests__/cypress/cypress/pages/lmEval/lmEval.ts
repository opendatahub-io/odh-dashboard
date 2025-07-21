class LMEvalFormPage {
  visit(namespace: string, skipA11y = false) {
    cy.visitWithLogin(`/modelEvaluations/${namespace}/evaluate`);
    this.wait(skipA11y);
  }

  private wait(skipA11y = false) {
    cy.findByTestId('lmEvaluationForm').should('be.visible');
    // Wait for the form to be fully loaded
    cy.findByLabelText('Model options menu', { timeout: 15000 }).should('exist');
    if (!skipA11y) {
      cy.testA11y();
    }
  }

  // Page verification methods
  shouldHaveCorrectUrl(namespace: string) {
    cy.url().should('include', `/modelEvaluations/${namespace}/evaluate`);
    return this;
  }

  shouldHavePageTitle(title: string) {
    cy.findByTestId('app-page-title').should('contain.text', title);
    return this;
  }

  shouldHavePageDescription() {
    cy.contains('Configure details for your model evaluation run.').should('be.visible');
    return this;
  }

  shouldHaveFormSections() {
    cy.findByTestId('model-name-form-group').should('be.visible');
    cy.findByTestId('evaluation-name-form-group').should('be.visible');
    cy.findByTestId('tasks-form-group').should('be.visible');
    cy.findByTestId('model-type-form-group').should('be.visible');
    return this;
  }

  // Element finders
  findModelNameDropdown() {
    return cy.findByLabelText('Model options menu');
  }

  findEvaluationNameInput() {
    return cy.findByTestId('lm-eval-name');
  }

  findSubmitButton() {
    return cy.findByTestId('lm-evaluation-submit-button');
  }

  findCancelButton() {
    return cy.findByTestId('lm-evaluation-cancel-button');
  }

  findModelArgumentName() {
    return cy.findByTestId('model-argument-name-value');
  }

  findModelArgumentUrl() {
    return cy.findByTestId('model-argument-url-value');
  }

  findTokenizerUrlInput() {
    return cy.findByTestId('tokenizer-url-input');
  }

  findTasksFormGroup() {
    return cy.findByTestId('tasks-form-group');
  }

  findModelTypeDropdown() {
    return cy.findByLabelText('Options menu');
  }

  private findSecuritySection() {
    return cy.findByTestId('lm-eval-security-section');
  }

  findAvailableOnlineTrueRadio() {
    return cy.findByLabelText('True', { selector: '#allow-online-true-radio' });
  }

  findAvailableOnlineFalseRadio() {
    return cy.findByLabelText('False', { selector: '#allow-online-false-radio' });
  }

  findTrustRemoteCodeTrueRadio() {
    return cy.findByLabelText('True', { selector: '#trust-remote-code-true-radio' });
  }

  findTrustRemoteCodeFalseRadio() {
    return cy.findByLabelText('False', { selector: '#trust-remote-code-false-radio' });
  }

  // Model arguments methods
  shouldHaveModelArgumentName(expectedName: string) {
    this.findModelArgumentName().should('have.text', expectedName);
    return this;
  }

  shouldHaveModelArgumentUrl(expectedUrl: string) {
    this.findModelArgumentUrl().should('have.text', expectedUrl);
    return this;
  }

  shouldHaveEmptyModelArguments() {
    this.findModelArgumentName().should('have.text', '-');
    this.findModelArgumentUrl().should('have.text', '-');
    return this;
  }

  // Model selection method
  selectModelFromDropdown(modelName: string) {
    this.findModelNameDropdown().click();

    // Wait for dropdown to be visible and handle potential timing issues
    cy.get('[role="listbox"]').should('be.visible');

    // Wait for the specific model option to be available before clicking
    cy.findByText(modelName).should('be.visible').click();

    // Wait for dropdown to close and form state to update
    cy.get('[role="listbox"]').should('not.exist');

    // Wait for model arguments to be populated (required for form validation)
    this.findModelArgumentName().should('not.have.text', '-');
    this.findModelArgumentUrl().should('not.have.text', '-');

    return this;
  }

  trySelectModelFromDropdown(modelName: string) {
    this.findModelNameDropdown().click();

    // Check if the model option exists in the dropdown
    cy.get('[role="option"]').then(($options) => {
      const modelExists = $options
        .toArray()
        .some((option) => option.textContent?.includes(modelName));

      if (modelExists) {
        cy.findByText(modelName).click();
        cy.log(`Successfully selected model: ${modelName}`);
      } else {
        // Close dropdown by pressing Escape
        cy.get('body').type('{esc}');
        cy.log(`Model "${modelName}" not found in dropdown`);
      }
    });
    return this;
  }

  // Form input methods
  typeEvaluationName(name: string) {
    this.findEvaluationNameInput().clear().type(name);
    return this;
  }

  shouldHaveEvaluationName(name: string) {
    this.findEvaluationNameInput().should('have.value', name);
    return this;
  }

  typeTokenizerUrl(url: string) {
    this.findTokenizerUrlInput().clear().type(url);
    return this;
  }

  // Task selection methods
  selectTasks(taskNames: string[]) {
    cy.findByTestId('tasks-form-group').find('button').first().click();
    cy.get('[role="listbox"]').should('be.visible');
    taskNames.forEach((taskName) => {
      cy.get('[role="listbox"]').find('[role="option"]').contains(taskName).click();
    });
    cy.get('body').type('{esc}');
    return this;
  }

  // Model type selection methods
  selectModelType(modelType: string) {
    cy.findByTestId('model-type-form-group').find('button').first().click();

    // Wait for dropdown to be visible and handle potential timing issues
    cy.get('[role="listbox"]').should('be.visible');

    // Wait for the specific option to be available before clicking
    cy.get('[role="listbox"]')
      .find('[role="option"]')
      .contains(modelType)
      .should('be.visible')
      .click();

    // Wait for dropdown to close
    cy.get('[role="listbox"]').should('not.exist');

    return this;
  }

  // Button state methods
  shouldHaveEnabledButtons() {
    this.findSubmitButton().should('exist');
    this.findCancelButton().should('exist');
    return this;
  }

  shouldHaveSubmitButtonDisabled() {
    this.findSubmitButton().should('be.disabled');
    return this;
  }

  checkSubmitButtonState() {
    this.findSubmitButton().then(($button) => {
      const isDisabled = $button.prop('disabled');
      if (isDisabled) {
        cy.log('Submit button is disabled');
      } else {
        cy.log('Submit button is enabled');
      }
    });
    return this;
  }

  shouldHaveEnabledInputs() {
    this.findEvaluationNameInput().should('be.visible').and('not.be.disabled');
    this.findModelNameDropdown().should('exist').and('not.be.disabled');
    cy.findByLabelText('Options menu').should('exist').and('not.be.disabled');
    return this;
  }

  // Security settings methods
  setAvailableOnline(value: boolean) {
    if (value) {
      this.findAvailableOnlineTrueRadio().click();
    } else {
      this.findAvailableOnlineFalseRadio().click();
    }
    return this;
  }

  setTrustRemoteCode(value: boolean) {
    if (value) {
      this.findTrustRemoteCodeTrueRadio().click();
    } else {
      this.findTrustRemoteCodeFalseRadio().click();
    }
    return this;
  }

  shouldHaveAvailableOnlineSelected(value: boolean) {
    if (value) {
      this.findAvailableOnlineTrueRadio().should('be.checked');
      this.findAvailableOnlineFalseRadio().should('not.be.checked');
    } else {
      this.findAvailableOnlineFalseRadio().should('be.checked');
      this.findAvailableOnlineTrueRadio().should('not.be.checked');
    }
    return this;
  }

  shouldHaveTrustRemoteCodeSelected(value: boolean) {
    if (value) {
      this.findTrustRemoteCodeTrueRadio().should('be.checked');
      this.findTrustRemoteCodeFalseRadio().should('not.be.checked');
    } else {
      this.findTrustRemoteCodeFalseRadio().should('be.checked');
      this.findTrustRemoteCodeTrueRadio().should('not.be.checked');
    }
    return this;
  }

  shouldHaveSecuritySectionVisible() {
    this.findSecuritySection().should('be.visible');
    this.findSecuritySection().within(() => {
      cy.contains('label', 'Available online').should('be.visible');
      cy.contains('label', 'Trust remote code').should('be.visible');
    });
    return this;
  }

  shouldHaveSecurityRadioButtonsEnabled() {
    this.findAvailableOnlineTrueRadio().should('not.be.disabled');
    this.findAvailableOnlineFalseRadio().should('not.be.disabled');
    this.findTrustRemoteCodeTrueRadio().should('not.be.disabled');
    this.findTrustRemoteCodeFalseRadio().should('not.be.disabled');
    return this;
  }

  // Navigation methods
  clickCancelButton() {
    this.findCancelButton().click();
    return this;
  }

  clickSubmitButton() {
    this.findSubmitButton().click();
    return this;
  }

  shouldNavigateToModelEvaluationsHome() {
    cy.url().should('include', '/modelEvaluations');
    cy.url().should('not.include', '/evaluate');
    return this;
  }
}

export const lmEvalFormPage = new LMEvalFormPage();
