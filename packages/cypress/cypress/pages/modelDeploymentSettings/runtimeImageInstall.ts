import { DashboardCodeEditor } from '../components/DashboardCodeEditor';

const runtimeImageLibraryPath =
  '/settings/model-resources-operations/model-deployment-settings/serving-runtime-catalog';

const getInstallPath = (runtimeId: string): string =>
  `${runtimeImageLibraryPath}/${encodeURIComponent(runtimeId)}/install`;

class RuntimeImageInstallPage {
  visitInstallDirectly(runtimeId: string) {
    cy.visitWithLogin(getInstallPath(runtimeId));
  }

  // To be used after navigating to a details page where the install button is present
  findInstallButton() {
    return cy.findByTestId('runtime-image-install');
  }

  findPageTitle() {
    return cy.findByRole('heading', { name: 'Create runtime' });
  }

  findLibraryBreadcrumb() {
    return cy.findByRole('link', { name: 'Runtime library' });
  }

  findRuntimeDetailsBreadcrumb(runtimeImageName: string) {
    return cy.findByRole('link', { name: runtimeImageName });
  }

  findNext() {
    return cy.findByTestId('runtime-image-install-next');
  }

  findServingRuntimeRadio() {
    return cy.findByTestId('install-target-servingRuntimeTemplate');
  }

  findServingRuntimeEditor() {
    return new DashboardCodeEditor(() => cy.findByTestId('dashboard-code-editor'));
  }

  findServingRuntimeProtocol() {
    return cy.findByTestId('custom-serving-api-protocol-selection');
  }

  findServingRuntimeModelTypes() {
    return cy.findByTestId('custom-serving-model-type-selection');
  }

  findCreate() {
    return cy.findByTestId('create-button');
  }

  findBack() {
    return cy.findByRole('button', { name: 'Back' });
  }

  findAcceleratorRadio() {
    return cy.findByTestId('install-target-llmInferenceServiceConfig');
  }

  findUnavailableMessage() {
    return cy.findByText('No runtime image install target extensions are available.');
  }

  findInvalidDataAlert() {
    return cy.findByRole('heading', { name: 'Unable to install this runtime image' });
  }

  findNoResourcesMessage() {
    return cy.findByText('This runtime image does not support any available install target');
  }

  findSingleTargetAlert() {
    return cy.findByTestId('runtime-image-single-target-alert');
  }

  findCancel() {
    return cy.findByRole('button', { name: 'Cancel' });
  }

  loadActionDataRouterState<T extends { runtimeImageId: string }>(actionData: T) {
    cy.window().then((win) => {
      win.history.replaceState(
        { usr: { actionData } },
        '',
        getInstallPath(actionData.runtimeImageId),
      );
      win.location.reload();
    });
  }

  loadNoResourceRouterState(cancelReturnRoute: string) {
    this.loadActionDataRouterState({
      runtimeImageId: 'empty-preview',
      runtimeImageName: 'No resources',
      cancelReturnRoute,
      libraryReturnRoute: runtimeImageLibraryPath,
      deploymentResources: {},
    });
  }

  findReturn() {
    return cy.findByRole('link', { name: 'Go back' });
  }
}

export const runtimeImageInstallPage = new RuntimeImageInstallPage();
