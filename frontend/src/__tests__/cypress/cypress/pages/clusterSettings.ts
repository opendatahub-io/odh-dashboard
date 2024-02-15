import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';

class ClusterSettings {
  visit() {
    cy.visitWithLogin('/clusterSettings');
    this.wait();
  }

  navigate() {
    appChrome.findNavItem('Cluster settings', 'Settings').click();
    this.wait();
  }

  private wait() {
    this.findSubmitButton();
    cy.testA11y();
  }

  findSubmitButton() {
    return cy.get('[data-id="submit-cluster-settings"]');
  }
}

class ModelSergingSettings extends ClusterSettings {
  findSinglePlatformCheckbox() {
    return cy.get('[data-id="single-model-serving-platform-enabled-checkbox"]');
  }

  findMultiPlatformCheckbox() {
    return cy.get('[data-id="multi-model-serving-platform-enabled-checkbox"]');
  }

  findAlert() {
    return cy.get('[data-id="serving-platform-warning-alert"]');
  }
}

class PVCSizeSettings extends ClusterSettings {
  findInput() {
    return cy.get('[data-id="pvc-size-input"]');
  }

  findHint() {
    return cy.get('[data-id="pvc-size-helper-text"]');
  }

  findRestoreDefaultsButton() {
    return cy.get('[data-id="restore-default-button"]');
  }
}

class CullterSettings extends ClusterSettings {
  findHint() {
    return cy.get('[data-id="culler-timeout-helper-text"]');
  }

  findHoursInput() {
    return cy.get('[data-id="hour-input"]');
  }

  findMinutesInput() {
    return cy.get('[data-id="minute-input"]');
  }

  findUnlimitedOption() {
    return cy.get('[data-id="culler-timeout-unlimited"]');
  }

  findLimitedOption() {
    return cy.get('[data-id="culler-timeout-limited"]');
  }
}

class TelemetrySettings extends ClusterSettings {
  findEnabledCheckbox() {
    return cy.get('[data-id="usage-data-checkbox"]');
  }
}

class NotebookTolerationSettings extends ClusterSettings {
  findEnabledCheckbox() {
    return cy.get('[data-id=tolerations-enabled-checkbox]');
  }

  findKeyInput() {
    return cy.get('[data-id="toleration-key-input"]');
  }

  findKeyError() {
    return cy.get('[data-id="toleration-helper-text-error"]');
  }
}

export const clusterSettings = new ClusterSettings();
export const modelServingSettings = new ModelSergingSettings();
export const pvcSizeSettings = new PVCSizeSettings();
export const cullerSettings = new CullterSettings();
export const telemetrySettings = new TelemetrySettings();
export const notebookTolerationSettings = new NotebookTolerationSettings();
