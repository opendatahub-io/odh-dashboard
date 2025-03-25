class ModelCustomizationFormGlobal {
  visit(projectName: string, empty = false) {
    const state = {
      modelRegistryName: 'test-registry',
      modelRegistryDisplayName: 'Test Registry',
      registeredModelId: 'model-123',
      registeredModelName: 'test-model',
      modelVersionId: 'version-123',
      inputModelLocationUri: 'test-uri',
      outputModelRegistryApiUrl: 'test-api-url',
    };

    cy.visit('/', {
      onBeforeLoad(win) {
        win.history.pushState(state, '', `/modelCustomization/fine-tune/${projectName}`);
      },
    });

    if (empty) {
      this.emptyWait();
    } else {
      this.wait();
    }
  }

  findErrorMessage() {
    return cy.findByTestId('pipeline-error-message');
  }

  invalidVisit() {
    cy.visitWithLogin('/modelCustomization/fine-tune');
    this.emptyWait();
  }

  private wait() {
    cy.findByTestId('app-page-title').contains('Start a LAB-tuning run');
    cy.testA11y();
  }

  private emptyWait() {
    cy.findByTestId('app-page-title');
    cy.testA11y();
  }

  findSubmitButton() {
    return cy.findByTestId('model-customization-submit-button');
  }

  findCancelButton() {
    return cy.findByTestId('model-customization-cancel-button');
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
    return cy.findByTestId('hyperparameters-expandable').findByRole('button');
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

class HardwareSection {
  private findHardwareProfileSelect() {
    return cy.findByTestId('hardware-profile-select');
  }

  selectProfile(name: string): void {
    this.findHardwareProfileSelect().click();
    cy.findByRole('option', { name }).click();
  }

  findTrainingNodePlusButton() {
    return cy.findByTestId('training-node').findByRole('button', { name: 'Plus', hidden: true });
  }
}

class BaseModelSection {
  findEditInlineTextInput() {
    return cy.findByTestId('edit-inline-text-input');
  }

  findEditInlineTextButton() {
    return cy.findByTestId('edit-inline-text-button');
  }

  findEditInlineTextSaveButton() {
    return cy.findByTestId('edit-inline-text-save-button');
  }

  findEditInlineTextCancelButton() {
    return cy.findByTestId('edit-inline-text-cancel-button');
  }

  editInlineText(text: string) {
    this.findEditInlineTextButton().click();
    this.findEditInlineTextInput().type(text);
    this.findEditInlineTextSaveButton().click();
  }
}

export const modelCustomizationFormGlobal = new ModelCustomizationFormGlobal();
export const teacherModelSection = new TeacherModelSection();
export const baseModelSection = new BaseModelSection();
export const judgeModelSection = new JudgeModelSection();
export const taxonomySection = new TaxonomySection();
export const hardwareSection = new HardwareSection();
