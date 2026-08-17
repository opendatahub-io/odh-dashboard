import { mockClusterSettings } from '@odh-dashboard/internal/__mocks__/mockClusterSettings';
import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { asProductAdminUser } from '@odh-dashboard/cypress/cypress/utils/mockUsers';
import { be } from '@odh-dashboard/cypress/cypress/utils/should';
import { generalSettingsPage } from '@odh-dashboard/cypress/cypress/pages/modelDeploymentSettings/generalSettings';

const initIntercepts = () => {
  asProductAdminUser();

  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
      },
    }),
  );

  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableModelServing: false,
      disableKServe: false,
      disableLLMd: false,
    }),
  );

  cy.interceptOdh('GET /api/cluster-settings', mockClusterSettings({}));
  cy.interceptOdh('PUT /api/cluster-settings', { success: true }).as('clusterSettings');
};

describe('General Settings tab (model serving settings)', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('Edit model serving settings', () => {
    generalSettingsPage.visit();

    // LLMd and single platform switches should be checked initially
    generalSettingsPage.findEnableLLMdSwitch().should('be.checked');
    generalSettingsPage.findSinglePlatformSwitch().should('be.checked');
    generalSettingsPage.findDistributedInferencing().should('be.checked');
    generalSettingsPage.findSaveButton().should('be.disabled');
    generalSettingsPage.findServingPlatformAlert().should('not.exist');

    // If disable model serving switch is unchecked, submit button should be enabled
    generalSettingsPage.findSinglePlatformSwitch().click({ force: true });
    generalSettingsPage.findSaveButton().should('be.enabled');
    generalSettingsPage.findServingPlatformAlert().should(be.warning);
    // and if disable model serving switch is unchecked, LLMd switch should be unchecked and disabled as well
    generalSettingsPage.findEnableLLMdSwitch().should('not.be.checked');
    generalSettingsPage.findEnableLLMdSwitch().should('be.disabled');
    generalSettingsPage.findDistributedInferencing().should('not.be.checked');
    generalSettingsPage.findDistributedInferencing().should('be.disabled');
    generalSettingsPage.findServingPlatformAlert().should('exist');

    // reenable model serving (automatically enables llmd and distributed inferencing)
    generalSettingsPage.findSinglePlatformSwitch().click({ force: true });

    generalSettingsPage.findEnableLLMdSwitch().should('be.checked');
    generalSettingsPage.findDistributedInferencing().should('not.be.disabled');
    generalSettingsPage.findDistributedInferencing().should('be.checked');

    generalSettingsPage.findServingPlatformAlert().should('not.exist');

    generalSettingsPage.findSaveButton().should('be.disabled');

    // If llmd is disabled the distributed inferencing switch should be unchecked as well
    generalSettingsPage.findEnableLLMdSwitch().click({ force: true });
    generalSettingsPage.findEnableLLMdSwitch().should('not.be.checked');
    generalSettingsPage.findDistributedInferencing().should('not.be.checked');
    generalSettingsPage.findDistributedInferencing().should('be.disabled');
    generalSettingsPage.findDistributedInferencingAlert().should('exist');

    generalSettingsPage.findSaveButton().should('be.enabled');

    // reenable llmd but not distributed inferencing -> submit button should be disabled, back to original state
    generalSettingsPage.findEnableLLMdSwitch().click({ force: true });

    generalSettingsPage.findSaveButton().should('be.disabled');

    // check deployment strategy field
    generalSettingsPage.findRollingUpdateRadio().should('be.checked');
    generalSettingsPage.findSaveButton().should('be.disabled');
    generalSettingsPage.findRecreateRadio().check();
    generalSettingsPage.findSaveButton().should('be.enabled');
    generalSettingsPage.findRollingUpdateRadio().check();
    generalSettingsPage.findSaveButton().should('be.disabled');

    // make an actual change and save it
    generalSettingsPage.findRecreateRadio().check();
    generalSettingsPage.findSaveButton().should('be.enabled').click();

    cy.wait('@clusterSettings').then((interception) => {
      expect(interception.request.body).to.eql(
        mockClusterSettings({
          defaultDeploymentStrategy: 'recreate',
        }),
      );
    });
  });
});
