import { mockClusterSettings } from '@odh-dashboard/internal/__mocks__/mockClusterSettings';
import { mockDscStatus } from '@odh-dashboard/internal/__mocks__/mockDscStatus';
import { DataScienceStackComponent } from '@odh-dashboard/internal/concepts/areas/types';
import { mockK8sResourceList } from '@odh-dashboard/internal/__mocks__';
import { mockDsc } from '@odh-dashboard/internal/__mocks__/mockDsc';
import {
  clusterSettings,
  cullerSettings,
  modelServingSettings,
  pvcSizeSettings,
  telemetrySettings,
  modelDeploymentSettings,
} from '../../../pages/clusterSettings';
import { pageNotfound } from '../../../pages/pageNotFound';
import { be } from '../../../utils/should';
import { asClusterAdminUser, asProjectAdminUser } from '../../../utils/mockUsers';
import { DataScienceClusterModel } from '../../../utils/models';

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
    // LLMd and single platform checkbox should be checked initially
    modelServingSettings.findEnableLLMdSwitch().should('be.checked');
    modelServingSettings.findSinglePlatformSwitch().should('be.checked');
    modelDeploymentSettings.findDistributedInferencing().should('be.checked');
    modelServingSettings.findSubmitButton().should('be.disabled');
    modelServingSettings.findAlert().should('not.exist');

    // If disable model serving checkbox is unchecked, submit button should be enabled
    modelServingSettings.findSinglePlatformSwitch().click({ force: true });
    modelServingSettings.findSubmitButton().should('be.enabled');
    modelServingSettings.findAlert().should(be.warning);
    // and if disable model serving checkbox is unchecked, LLMd checkboxes should be unchecked and disabled as well
    modelServingSettings.findEnableLLMdSwitch().should('not.be.checked');
    modelServingSettings.findEnableLLMdSwitch().should('be.disabled');
    modelDeploymentSettings.findDistributedInferencing().should('not.be.checked');
    modelDeploymentSettings.findDistributedInferencing().should('be.disabled');
    modelServingSettings.findAlert().should('exist');

    // reenable model serving and llmd
    modelServingSettings.findSinglePlatformSwitch().click({ force: true });
    modelServingSettings.findEnableLLMdSwitch().should('not.be.disabled');
    // if llmd is unchecked, distributed inferencing should still be disabled
    modelDeploymentSettings.findDistributedInferencing().should('be.disabled');

    // enable llmd -> automatically enables distributed inferencing
    modelServingSettings.findEnableLLMdSwitch().click({ force: true });
    modelServingSettings.findEnableLLMdSwitch().should('be.checked');
    modelDeploymentSettings.findDistributedInferencing().should('not.be.disabled');
    modelDeploymentSettings.findDistributedInferencing().should('be.checked');

    modelServingSettings.findAlert().should('not.exist');

    modelServingSettings.findSubmitButton().should('be.disabled');

    // If llmd is disabled the distributed inferencing checkbox should be unchecked as well
    modelServingSettings.findEnableLLMdSwitch().click({ force: true });
    modelServingSettings.findEnableLLMdSwitch().should('not.be.checked');
    modelDeploymentSettings.findDistributedInferencing().should('not.be.checked');
    modelDeploymentSettings.findDistributedInferencing().should('be.disabled');
    modelDeploymentSettings.findAlert().should('exist');

    modelDeploymentSettings.findSubmitButton().should('be.enabled');

    // reenable llmd but not distributed inferencing -> submit button should be disabled, back to original state
    modelServingSettings.findEnableLLMdSwitch().click({ force: true });

    modelDeploymentSettings.findSubmitButton().should('be.disabled');

    // check model deployment options field
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
