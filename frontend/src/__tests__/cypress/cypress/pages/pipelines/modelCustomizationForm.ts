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
}

class TeacherModelSection {
  findEndpointInput() {
    return cy.findByTestId('teacher-endpoint-input');
  }

  findModelNameInput() {
    return cy.findByTestId('teacher-model-name-input');
  }
}

class JudgeModelSection {
  findEndpointInput() {
    return cy.findByTestId('judge-endpoint-input');
  }

  findModelNameInput() {
    return cy.findByTestId('judge-model-name-input');
  }
}

class TaxonomySection {
  findTaxonomyUrl() {
    return cy.findByTestId('taxonomy-github-url');
  }

  findSshKeyRadio() {
    return cy.findByTestId('ssh-key-radio');
  }

  findUsernameAndTokenRadio() {
    return cy.findByTestId('username-and-token-radio');
  }

  findTaxonomySShKey() {
    return cy.findByTestId('taxonomy-ssh-key');
  }

  findTaxonomyUsername() {
    return cy.findByTestId('taxonomy-username');
  }

  findTaxonomyToken() {
    return cy.findAllByTestId('taxonomy-token');
  }
}

export const modelCustomizationFormGlobal = new ModelCustomizationFormGlobal();
export const teacherModelSection = new TeacherModelSection();
export const judgeModelSection = new JudgeModelSection();
export const taxonomySection = new TaxonomySection();
