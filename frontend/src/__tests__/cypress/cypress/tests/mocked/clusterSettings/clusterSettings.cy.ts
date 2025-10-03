import { mockClusterSettings } from '#~/__mocks__/mockClusterSettings';
import { mockDscStatus } from '#~/__mocks__/mockDscStatus';
import {
  clusterSettings,
  cullerSettings,
  modelServingSettings,
  notebookTolerationSettings,
  pvcSizeSettings,
  telemetrySettings,
} from '#~/__tests__/cypress/cypress/pages/clusterSettings';
import { pageNotfound } from '#~/__tests__/cypress/cypress/pages/pageNotFound';
import { be } from '#~/__tests__/cypress/cypress/utils/should';
import {
  asClusterAdminUser,
  asProjectAdminUser,
} from '#~/__tests__/cypress/cypress/utils/mockUsers';
import { StackComponent } from '#~/concepts/areas/types';
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

  it.only('Edit cluster settings', () => {
    cy.interceptOdh(
      'GET /api/dsc/status',
      mockDscStatus({
        installedComponents: { [StackComponent.K_SERVE]: true, [StackComponent.MODEL_MESH]: true },
      }),
    );
    cy.interceptOdh(
      'GET /api/cluster-settings',
      mockClusterSettings({
        modelServingPlatformEnabled: {
          kServe: true,
          modelMesh: false,
        },
        notebookTolerationSettings: {
          enabled: false,
          key: 'NotebooksOnly',
        },
        userTrackingEnabled: false,
        pvcSize: 20,
        cullerTimeout: 31536000,
      }),
    );
    cy.interceptOdh('PUT /api/cluster-settings', { success: true }).as('clusterSettings');

    clusterSettings.visit();

    // check serving platform field
    modelServingSettings.findSinglePlatformCheckbox().should('be.checked');
    console.log('a22sbb');
    modelServingSettings.findSubmitButton().should('be.disabled');
    console.log('b');
    modelServingSettings.findAlert().should('not.exist');
    console.log('c');
    modelServingSettings.findSinglePlatformCheckbox().uncheck();
    console.log('d');
    modelServingSettings.findSubmitButton().should('be.enabled');
    console.log('e');
    modelServingSettings.findAlert().should(be.warning);
    console.log('f');
    modelServingSettings.findSinglePlatformCheckbox().check();
    console.log('g');
    modelServingSettings.findAlert().should('not.exist');
    console.log('h');
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
          modelServingPlatformEnabled: {
            kServe: true,
            modelMesh: false,
          },
          userTrackingEnabled: false,
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
