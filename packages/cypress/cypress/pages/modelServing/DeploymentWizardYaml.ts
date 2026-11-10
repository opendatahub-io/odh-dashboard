import { SubComponentBase } from '../components/subComponents/SubComponentBase';
import { DashboardCodeEditor } from '../components/DashboardCodeEditor';

/** The YAML view / form-switching fields of the model deployment wizard. */
export class DeploymentWizardYaml extends SubComponentBase {
  findYAMLViewerToggle(toggle: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findScope().findByRole('button', { name: toggle });
  }

  findYAMLCodeEditor(): DashboardCodeEditor {
    return new DashboardCodeEditor(() => cy.findByTestId('yaml-editor'));
  }

  findYAMLEditorEmptyState(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findScope().findByTestId('yaml-editor-empty-state');
  }

  findManualEditModeButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findScope().findByTestId('manual-edit-mode-button');
  }

  findSwitchToYAMLEditorConfirmButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findScope().findByTestId('switch-to-manual-yaml-editor');
  }

  findYAMLEditFallbackAlert(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findScope().findByTestId('yaml-fallback-alert');
  }

  findYamlErrorsModal(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findScope().findByTestId('yaml-errors-modal');
  }

  findForceContinueToFormButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findScope().findByTestId('force-continue-to-form');
  }

  findUseSavedFormInputsButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findScope().findByTestId('use-saved-form-inputs');
  }

  findCancelSwitchToFormButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findScope().findByTestId('cancel-switch-to-form');
  }
}
