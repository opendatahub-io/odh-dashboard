import { Contextual } from '#~/__tests__/cypress/cypress/pages/components/Contextual';
import { AcceleratorProfileSection } from '#~/__tests__/cypress/cypress/pages/components/subComponents/AcceleratorProfileSection';

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

  findEmptyErrorState() {
    return cy.findByTestId('error-empty-state-body');
  }
}

class TeacherModelSection {
  find() {
    return cy.findByTestId('fine-tune-section-teacher-model');
  }

  findEndpointInput() {
    return this.find().findByTestId('teacher-endpoint-input');
  }

  findModelNameInput() {
    return this.find().findByTestId('teacher-model-name-input');
  }

  findTokenInput() {
    return this.find().findByTestId('teacher-token-input');
  }

  findPrivateRadioButton() {
    return this.find().findByTestId('teacher-section-authenticated-endpoint-radio');
  }
}

class JudgeModelSection {
  find() {
    return cy.findByTestId('fine-tune-section-judge-model');
  }

  findEndpointInput() {
    return this.find().findByTestId('judge-endpoint-input');
  }

  findModelNameInput() {
    return this.find().findByTestId('judge-model-name-input');
  }
}

class TaxonomySection {
  find() {
    return cy.findByTestId('fine-tune-section-taxonomy-details');
  }

  findTaxonomyUrl() {
    return this.find().findByTestId('taxonomy-github-url');
  }

  findSshKeyRadio() {
    return this.find().findByTestId('ssh-key-radio');
  }

  findUsernameAndTokenRadio() {
    return this.find().findByTestId('username-and-token-radio');
  }

  findTaxonomySSHText() {
    return this.find().findByTestId('taxonomy-ssh-key');
  }

  findTaxonomyUsername() {
    return this.find().findByTestId('taxonomy-username');
  }

  findTaxonomyToken() {
    return this.find().findAllByTestId('taxonomy-token');
  }

  getSSHUpload() {
    return new SSHFileUpload(() => this.find().findByTestId('fine-tune-sshupload'));
  }
}

class HardwareSection {
  find() {
    return cy.findByTestId('fine-tune-section-training-hardware');
  }

  private findHardwareProfileSelect() {
    return this.find().findByTestId('hardware-profile-select');
  }

  selectProfile(name: string): void {
    this.findHardwareProfileSelect().click();
    cy.findByRole('option', { name }).click();
  }

  findTrainingNodePlusButton() {
    return this.find()
      .findByTestId('training-node')
      .findByRole('button', { name: 'Plus', hidden: true });
  }

  findCustomizeButton() {
    return this.find().findByTestId('hardware-profile-customize').findByRole('button', {
      name: 'Customize resource requests and limits',
    });
  }

  findCustomizeForm() {
    return this.find().findByTestId('hardware-profile-customize-form');
  }

  findCPUFieldInput() {
    return this.findCustomizeForm().findByTestId('cpu-requests-input').findByLabelText('Input');
  }
}

class ModelCustomizationAcceleratorProfileSection extends AcceleratorProfileSection {
  find() {
    return cy.findByTestId('fine-tune-section-training-hardware');
  }
}

class BaseModelSection {
  find() {
    return cy.findByTestId('fine-tune-section-base-model');
  }

  findModelName() {
    return this.find().findByTestId('base-model-name');
  }

  findModelRegistry() {
    return this.find().findByTestId('base-registry-name');
  }

  findModelVersion() {
    return this.find().findByTestId('base-model-version');
  }

  findModelURI() {
    return this.find()
      .findByTestId('base-model-uri')
      .find('[data-testid="inline-edit-text-content"]');
  }

  findEditInlineTextInput() {
    return this.find().findByTestId('edit-inline-text-input');
  }

  findEditInlineTextButton() {
    return this.find().findByTestId('edit-inline-text-button');
  }

  findEditInlineTextSaveButton() {
    return this.find().findByTestId('edit-inline-text-save-button');
  }

  findEditInlineTextCancelButton() {
    return this.find().findByTestId('edit-inline-text-cancel-button');
  }

  editInlineText(text: string) {
    this.findEditInlineTextButton().click();
    this.findEditInlineTextInput().type(text);
    this.findEditInlineTextSaveButton().click();
  }

  clearInlineText() {
    this.findEditInlineTextButton().click();
    this.findEditInlineTextInput().clear();
    this.findEditInlineTextSaveButton().click();
  }
}

class HyperparameterSection {
  find() {
    return cy.findByTestId('fine-tune-section-hyperparameters');
  }

  findExpandableSectionButton() {
    return this.find().findByTestId('hyperparameters-expandable').findByRole('button');
  }

  findLongNumberInput(name: string) {
    return this.find().findByTestId(name);
  }

  findRadioInput(name: string) {
    return this.find().findByTestId(name);
  }
}
class SSHFileUpload extends Contextual<HTMLElement> {
  findTaxonomySShKey() {
    return this.find().find('[data-testid="taxonomy-ssh-key"] input[type="file"]');
  }

  uploadSSHFile(filePath: string) {
    this.findTaxonomySShKey().selectFile([filePath], { force: true });
  }

  findSSHFileUploadHelptext() {
    return this.find().findByTestId('ssh-key-helpText');
  }
}

class DataScienceProjectSection {
  findProjectName() {
    return cy.findByTestId('project-name');
  }
}

class PipelineSection {
  findPipelineName() {
    return cy.findByTestId('pipeline-name');
  }

  findPipelineVersion() {
    return cy.findByTestId('pipeline-version');
  }
}

export const modelCustomizationFormGlobal = new ModelCustomizationFormGlobal();
export const teacherModelSection = new TeacherModelSection();
export const baseModelSection = new BaseModelSection();
export const judgeModelSection = new JudgeModelSection();
export const taxonomySection = new TaxonomySection();
export const hardwareSection = new HardwareSection();
export const acceleratorProfileSectionModelCustomization =
  new ModelCustomizationAcceleratorProfileSection();
export const dataScienceProjectSection = new DataScienceProjectSection();
export const pipelineSection = new PipelineSection();
export const hyperparameterSection = new HyperparameterSection();
