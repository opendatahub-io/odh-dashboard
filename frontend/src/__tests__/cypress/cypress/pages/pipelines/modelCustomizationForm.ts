class ModelCustomizationFormGlobal {
  visit(projectName: string, empty = false) {
    cy.visitWithLogin(`/modelCustomization/instructlab/${projectName}`);
    if (empty) {
      this.emptyWait();
    } else {
      this.wait();
    }
  }

  invalidVisit() {
    cy.visitWithLogin('/modelCustomization/instructlab');
    this.emptyWait();
  }

  private wait() {
    cy.findByTestId('app-page-title').contains('Instruct fine-tune run');
    cy.testA11y();
  }

  private emptyWait() {
    cy.findByTestId('app-page-title');
    cy.testA11y();
  }

  findSubmitButton() {
    return cy.findByTestId('model-customization-submit-button');
  }

  findProjectDropdown() {
    cy.findByTestId('project-selector-toggle').click();
  }

  findProjectDropdownItem(name: string) {
    cy.findAllByTestId('project-selector-menu').findMenuItem(name).click();
  }

  findEmptyState() {
    return cy.findByTestId('empty-state-title');
  }

  findSimpleRunButton() {
    return cy.findByTestId('simple-run-radio');
  }

  findExpandableSectionButton() {
    return cy.findByTestId('hyperparameters-expandable').findByRole('button', {
      name: 'Customize resource requests and limits',
    });
  }

  findNumericInputPlusButton(name: string) {
    return cy.findByTestId(name).findByRole('button', {
      name: 'Plus',
    });
  }

  findLongNumberInput(name: string) {
    return cy.findByTestId(name);
  }

  findRadioInput(name: string) {
    return cy.findByTestId(name);
  }
}

export const modelCustomizationFormGlobal = new ModelCustomizationFormGlobal();
