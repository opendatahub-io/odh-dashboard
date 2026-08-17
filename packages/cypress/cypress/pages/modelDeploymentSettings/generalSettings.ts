import { appChrome } from '../appChrome';

class GeneralSettingsPage {
  visit(wait = true) {
    cy.visitWithLogin(
      '/settings/model-resources-operations/model-deployment-settings/general-settings',
    );
    if (wait) {
      this.wait();
    }
  }

  navigate() {
    this.findNavItem().click();
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-tab-page-title');
    this.findSaveButton();
    cy.testA11y();
  }

  findNavItem() {
    return appChrome.findNavItem({
      name: 'Model deployment settings',
      rootSection: 'Settings',
      subSection: 'Model resources and operations',
    });
  }

  findTabPageTitle() {
    return cy.findByTestId('app-tab-page-title');
  }

  findSaveButton() {
    return cy.findByTestId('save-general-settings');
  }

  findSinglePlatformSwitch() {
    return cy.findByTestId('single-model-serving-platform-enabled-switch');
  }

  findEnableLLMdSwitch() {
    return cy.findByTestId('enable-llmd-switch');
  }

  findSinglePlatformDeploymentModeSelect() {
    return cy.findByTestId('default-deployment-mode-select');
  }

  findServingPlatformAlert() {
    return cy.findByTestId('serving-platform-warning-alert');
  }

  findDistributedInferencing() {
    return cy.findByTestId('use-distributed-llm-default-switch');
  }

  findDistributedInferencingAlert() {
    return cy.findByText(
      'To use distributed inferencing, you must configure the inferencing gateway on your cluster.',
    );
  }

  findRollingUpdateRadio() {
    return cy.findByTestId('deployment-strategy-rolling');
  }

  findRecreateRadio() {
    return cy.findByTestId('deployment-strategy-recreate');
  }
}

export const generalSettingsPage = new GeneralSettingsPage();
