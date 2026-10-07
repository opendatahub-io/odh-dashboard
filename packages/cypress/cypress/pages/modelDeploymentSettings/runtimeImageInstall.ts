// TODO this path is a placeholder while we await the real runtime library details page.
// Changing this route and potentially changing how it mounts/integrates with that page will happen in https://redhat.atlassian.net/browse/RHOAIENG-96641
const placeholderInstallPath =
  '/settings/model-resources-operations/model-deployment-settings/placeholder-runtime-library-details-page/install';

class RuntimeImageInstallPage {
  visitInstallDirectly() {
    cy.visitWithLogin(placeholderInstallPath);
  }

  // To be used after navigating to a details page where the install button is present
  findInstallButton() {
    return cy.findByTestId('runtime-image-install');
  }

  findPageTitle(runtimeImageName: string) {
    return cy.findByRole('heading', { name: `Install ${runtimeImageName}` });
  }

  findNext() {
    return cy.findByTestId('runtime-image-install-next');
  }

  findServingRuntimeRadio() {
    return cy.findByRole('radio', { name: /Serving runtime template/ });
  }

  findAcceleratorRadio() {
    return cy.findByRole('radio', { name: /LLM accelerator configuration/ });
  }

  findUnavailableMessage() {
    return cy.findByText('No runtime image install target extensions are available.');
  }

  findInvalidDataAlert() {
    return cy.findByRole('heading', { name: 'Unable to install this runtime image' });
  }

  findNoResourcesMessage() {
    return cy.findByText('No runtime image install target extensions are available.');
  }

  loadNoResourceRouterState(cancelReturnRoute: string) {
    cy.window().then((win) => {
      win.history.replaceState(
        {
          usr: {
            actionData: {
              runtimeImageId: 'empty-preview',
              runtimeImageName: 'No resources',
              cancelReturnRoute,
              deploymentResources: {},
            },
          },
        },
        '',
        placeholderInstallPath,
      );
      win.location.reload();
    });
  }

  findReturn() {
    return cy.findByRole('link', { name: 'Go back' });
  }
}

export const runtimeImageInstallPage = new RuntimeImageInstallPage();
