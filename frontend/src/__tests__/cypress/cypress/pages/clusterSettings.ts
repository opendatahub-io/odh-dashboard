import { appChrome } from '#~/__tests__/cypress/cypress/pages/appChrome';

class ClusterSettings {
  visit(wait = true) {
    cy.visitWithLogin('/settings/cluster/general');
    if (wait) {
      this.wait();
    }
  }

  navigate() {
    this.findNavItem().click();
    this.wait();
  }

  private wait() {
    this.findSubmitButton();
    cy.testA11y();
  }

  findNavItem() {
    return appChrome.findNavItem({
      name: 'General settings',
      rootSection: 'Settings',
      subSection: 'Cluster settings',
    });
  }

  findSubmitButton() {
    return cy.findByTestId('submit-cluster-settings');
  }
}

class ModelSergingSettings extends ClusterSettings {
  findSinglePlatformCheckbox() {
    return cy.findByTestId('single-model-serving-platform-enabled-checkbox');
  }

  findSinglePlatformDeploymentModeSelect() {
    return cy.findByTestId('default-deployment-mode-select');
  }

  findAlert() {
    return cy.findByTestId('serving-platform-warning-alert');
  }
}

class PVCSizeSettings extends ClusterSettings {
  findInput() {
    return cy.findByTestId('pvc-size-input');
  }

  findHint() {
    return cy.findByTestId('pvc-size-helper-text');
  }

  findRestoreDefaultsButton() {
    return cy.findByTestId('restore-default-button');
  }
}

class CullterSettings extends ClusterSettings {
  findStopIdleNotebooks() {
    return cy.findByText('Idle workbench timeout', { exact: true });
  }

  findHint() {
    return cy.findByTestId('culler-timeout-helper-text');
  }

  findHoursInput() {
    return cy.findByTestId('hour-input');
  }

  findMinutesInput() {
    return cy.findByTestId('minute-input');
  }

  findUnlimitedOption() {
    return cy.findByTestId('culler-timeout-unlimited');
  }

  findLimitedOption() {
    return cy.findByTestId('culler-timeout-limited');
  }
}

class TelemetrySettings extends ClusterSettings {
  findEnabledCheckbox() {
    return cy.findByTestId('usage-data-checkbox');
  }
}

class NotebookTolerationSettings extends ClusterSettings {
  findNotebookPodTolerationsText() {
    return cy.findByText('Workbench pod tolerations', { exact: true });
  }

  findEnabledCheckbox() {
    return cy.findByTestId('tolerations-enabled-checkbox');
  }

  findKeyInput() {
    return cy.findByTestId('toleration-key-input');
  }

  findKeyError() {
    return cy.findByTestId('toleration-helper-text-error');
  }
}

export const clusterSettings = new ClusterSettings();
export const modelServingSettings = new ModelSergingSettings();
export const pvcSizeSettings = new PVCSizeSettings();
export const cullerSettings = new CullterSettings();
export const telemetrySettings = new TelemetrySettings();
export const notebookTolerationSettings = new NotebookTolerationSettings();
