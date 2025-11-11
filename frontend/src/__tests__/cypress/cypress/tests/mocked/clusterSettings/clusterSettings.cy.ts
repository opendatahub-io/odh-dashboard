import { mockClusterSettings } from '#~/__mocks__/mockClusterSettings';
import { mockDscStatus } from '#~/__mocks__/mockDscStatus';
import {
  clusterSettings,
  cullerSettings,
  modelServingSettings,
  pvcSizeSettings,
  telemetrySettings,
  modelDeploymentSettings,
} from '#~/__tests__/cypress/cypress/pages/clusterSettings';
import { pageNotfound } from '#~/__tests__/cypress/cypress/pages/pageNotFound';
import { be } from '#~/__tests__/cypress/cypress/utils/should';
import {
  asClusterAdminUser,
  asProjectAdminUser,
} from '#~/__tests__/cypress/cypress/utils/mockUsers';
import { DataScienceStackComponent } from '#~/concepts/areas/types';
import { mockK8sResourceList } from '#~/__mocks__';
import { DataScienceClusterModel } from '#~/__tests__/cypress/cypress/utils/models';
import { mockDsc } from '#~/__mocks__/mockDsc';

it('Cluster settings should not be available for non product admins', () => {
  asProjectAdminUser();
  clusterSettings.visit(false);
  pageNotfound.findPage().should('exist');
  clusterSettings.findNavItem().should('not.exist');
});

describe('Cluster Settings', () => {
  beforeEach(() => {
    asClusterAdminUser();
    cy.interceptK8sList({ model: DataScienceClusterModel }, mockK8sResourceList([mockDsc({})]));
  });

  it('Edit cluster settings', () => {
    cy.interceptOdh(
      'GET /api/dsc/status',
      mockDscStatus({
        components: {
          [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
        },
      }),
    );
    cy.interceptOdh('GET /api/cluster-settings', mockClusterSettings({}));
    cy.interceptOdh('PUT /api/cluster-settings', { success: true }).as('clusterSettings');

    clusterSettings.visit();

    // check serving platform field
    modelServingSettings.findSinglePlatformCheckbox().should('be.checked');
    modelServingSettings.findSubmitButton().should('be.disabled');
    modelServingSettings.findAlert().should('not.exist');
    modelServingSettings.findSinglePlatformCheckbox().uncheck();
    modelServingSettings.findSubmitButton().should('be.enabled');
    modelServingSettings.findAlert().should(be.warning);
    modelServingSettings.findSinglePlatformCheckbox().check();
    modelServingSettings.findAlert().should('not.exist');
    modelServingSettings.findSubmitButton().should('be.disabled');

    // check model deployment options field
    modelDeploymentSettings.findDistributedInferencing().should('not.be.checked');
    modelDeploymentSettings.findAlert().should('exist');
    modelDeploymentSettings.findSubmitButton().should('be.disabled');
    modelDeploymentSettings.findDistributedInferencing().click({ force: true });
    modelDeploymentSettings.findSubmitButton().should('be.enabled');
    modelDeploymentSettings.findAlert().should('not.exist');
    modelDeploymentSettings.findDistributedInferencing().click({ force: true });
    modelDeploymentSettings.findSubmitButton().should('be.disabled');

    modelDeploymentSettings.findRollingUpdateRadio().should('be.checked');
    modelDeploymentSettings.findSubmitButton().should('be.disabled');
    modelDeploymentSettings.findRecreateRadio().check();
    modelDeploymentSettings.findSubmitButton().should('be.enabled');
    modelDeploymentSettings.findRollingUpdateRadio().check();
    modelDeploymentSettings.findSubmitButton().should('be.disabled');

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

    // Enable tracking before submitting so there's a change to save
    telemetrySettings.findEnabledCheckbox().click();
    telemetrySettings.findSubmitButton().should('be.enabled');
    telemetrySettings.findSubmitButton().click();

    cy.wait('@clusterSettings').then((interception) => {
      expect(interception.request.body).to.eql(
        mockClusterSettings({
          pvcSize: 20,
          cullerTimeout: 31536000,
          userTrackingEnabled: true,
        }),
      );
    });
  });

  it('redirect from v2 to v3 route', () => {
    cy.visitWithLogin('/clusterSettings');
    cy.findByTestId('app-page-title').contains('General settings');
    cy.url().should('include', '/settings/cluster/general');
  });
});
