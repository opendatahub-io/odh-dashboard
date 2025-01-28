import { mockClusterSettings } from '~/__mocks__/mockClusterSettings';
import { mockDscStatus } from '~/__mocks__/mockDscStatus';
import {
  clusterSettings,
  cullerSettings,
  modelServingSettings,
  notebookTolerationSettings,
  pvcSizeSettings,
  telemetrySettings,
} from '~/__tests__/cypress/cypress/pages/clusterSettings';
import { pageNotfound } from '~/__tests__/cypress/cypress/pages/pageNotFound';
import { be } from '~/__tests__/cypress/cypress/utils/should';
import {
  asProductAdminUser,
  asProjectAdminUser,
} from '~/__tests__/cypress/cypress/utils/mockUsers';
import { StackComponent } from '~/concepts/areas/types';
import { DeploymentMode } from '~/k8sTypes';
import { mockDashboardConfig } from '~/__mocks__';

it('Cluster settings should not be available for non product admins', () => {
  asProjectAdminUser();
  clusterSettings.visit(false);
  pageNotfound.findPage().should('exist');
  clusterSettings.findNavItem().should('not.exist');
});

describe('Cluster Settings', () => {
  beforeEach(() => {
    asProductAdminUser();
  });

  it('Edit cluster settings', () => {
    cy.interceptOdh(
      'GET /api/dsc/status',
      mockDscStatus({
        installedComponents: { [StackComponent.K_SERVE]: true, [StackComponent.MODEL_MESH]: true },
      }),
    );
    cy.interceptOdh('GET /api/cluster-settings', mockClusterSettings({}));
    cy.interceptOdh('PUT /api/cluster-settings', { success: true }).as('clusterSettings');

    clusterSettings.visit();

    // check serving platform field
    modelServingSettings.findSinglePlatformCheckbox().should('be.checked');
    modelServingSettings.findMultiPlatformCheckbox().should('be.checked');
    modelServingSettings.findSubmitButton().should('be.disabled');
    modelServingSettings.findMultiPlatformCheckbox().uncheck();
    modelServingSettings.findAlert().should(be.info);
    modelServingSettings.findSubmitButton().should('be.enabled');
    modelServingSettings.findSinglePlatformCheckbox().uncheck();
    modelServingSettings.findAlert().should(be.warning);
    modelServingSettings.findMultiPlatformCheckbox().check();
    modelServingSettings.findAlert().should(be.info);
    modelServingSettings.findSinglePlatformCheckbox().check();
    modelServingSettings.findAlert().should('not.exist');
    modelServingSettings.findSubmitButton().should('be.disabled');

    // check PVC size field
    pvcSizeSettings.findInput().clear();
    pvcSizeSettings.findInput().type('10');
    pvcSizeSettings.findSubmitButton().should('be.enabled');
    pvcSizeSettings.findInput().clear();
    pvcSizeSettings.findSubmitButton().should('be.disabled');
    pvcSizeSettings.findHint().should(be.error);
    pvcSizeSettings.findRestoreDefaultsButton().click();
    pvcSizeSettings.findHint().should(be.default);

    // // check culler field
    cullerSettings.findLimitedOption().click();
    cullerSettings.findSubmitButton().should('be.enabled');
    cullerSettings.findHoursInput().clear();
    cullerSettings.findSubmitButton().should('be.disabled');
    cullerSettings.findHint().should(be.error);
    cullerSettings.findMinutesInput().type('20');
    cullerSettings.findSubmitButton().should('be.enabled');
    cullerSettings.findHint().should(be.default);
    cullerSettings.findUnlimitedOption().click();
    cullerSettings.findSubmitButton().should('be.disabled');

    // check user tracking field
    telemetrySettings.findEnabledCheckbox().click();
    telemetrySettings.findSubmitButton().should('be.enabled');
    telemetrySettings.findEnabledCheckbox().click();
    telemetrySettings.findSubmitButton().should('be.disabled');

    // check notebook toleration field
    notebookTolerationSettings.findKeyError().should('not.exist');
    notebookTolerationSettings.findKeyInput().clear();
    notebookTolerationSettings.findKeyError().should('exist');
    notebookTolerationSettings.findSubmitButton().should('be.disabled');
    notebookTolerationSettings.findKeyInput().type('NotebooksOnlyChange');
    notebookTolerationSettings.findKeyError().should('not.exist');
    notebookTolerationSettings.findEnabledCheckbox().click();
    notebookTolerationSettings.findSubmitButton().should('be.enabled');

    notebookTolerationSettings.findSubmitButton().click();

    cy.wait('@clusterSettings').then((interception) => {
      expect(interception.request.body).to.eql(
        mockClusterSettings({
          pvcSize: 20,
          cullerTimeout: 31536000,
          notebookTolerationSettings: { enabled: false, key: 'NotebooksOnlyChange' },
        }),
      );
    });
  });

  it('View KServe defaultDeploymentMode', () => {
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        disableKServeRaw: false,
      }),
    );
    cy.interceptOdh(
      'GET /api/dsc/status',
      mockDscStatus({
        components: { kserve: { defaultDeploymentMode: DeploymentMode.RawDeployment } },
        installedComponents: { [StackComponent.K_SERVE]: true, [StackComponent.MODEL_MESH]: true },
      }),
    );
    cy.interceptOdh('GET /api/cluster-settings', mockClusterSettings({}));

    clusterSettings.visit();

    modelServingSettings.findSinglePlatformCheckbox().should('be.checked');
    modelServingSettings.findSinglePlatformDeploymentModeSelect().should('be.visible');
    modelServingSettings.findMultiPlatformCheckbox().should('be.checked');

    modelServingSettings
      .findSinglePlatformDeploymentModeSelect()
      .findSelectOption('Standard (No additional dependencies)')
      .should('have.attr', 'aria-selected', 'true');
    modelServingSettings
      .findSinglePlatformDeploymentModeSelect()
      .findSelectOption('Advanced (Serverless and Service Mesh)')
      .should('have.attr', 'aria-selected', 'false');
  });
});
