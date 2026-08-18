import { appChrome } from './appChrome';

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

class GlobalProjectSettingsPage extends ClusterSettings {
  findSection() {
    return cy.findByTestId('global-project-settings');
  }

  findSelectorToggle() {
    return cy.findByTestId('project-selector-toggle');
  }

  selectProject(name: string) {
    this.findSelectorToggle().click();
    cy.findByTestId('project-selector-menuList').contains(name).click();
  }

  selectNone() {
    this.selectProject('None');
  }
}

export const clusterSettings = new ClusterSettings();
export const pvcSizeSettings = new PVCSizeSettings();
export const cullerSettings = new CullterSettings();
export const telemetrySettings = new TelemetrySettings();
export const globalProjectSettings = new GlobalProjectSettingsPage();
