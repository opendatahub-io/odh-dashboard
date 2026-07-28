import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceConfigK8sResource';
// eslint-disable-next-line import/no-extraneous-dependencies
import { TopologyType } from '@odh-dashboard/llmd-serving/types';
import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/internal/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '@odh-dashboard/internal/__mocks__/mockK8sResourceList';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { LLMInferenceServiceConfigModel } from '@odh-dashboard/cypress/cypress/utils/models';
import { asProductAdminUser } from '@odh-dashboard/cypress/cypress/utils/mockUsers';
import { llmdTopologySettingsPage } from '@odh-dashboard/cypress/cypress/pages/llmdTopologySettings';

const mockPreInstalledConfig = mockLLMInferenceServiceConfigK8sResource({
  name: 'preinstalled-single-node',
  displayName: 'Pre-installed Single Node',
  configType: TopologyType.SINGLE_NODE,
  preInstalled: true,
});

const mockUserConfig = mockLLMInferenceServiceConfigK8sResource({
  name: 'user-multi-node',
  displayName: 'User Multi-node Config',
  configType: TopologyType.MULTI_NODE,
});

const mockDisabledConfig = mockLLMInferenceServiceConfigK8sResource({
  name: 'disabled-config',
  displayName: 'Disabled Config',
  configType: TopologyType.SINGLE_NODE,
  disabled: true,
});

const allConfigs = [mockPreInstalledConfig, mockUserConfig, mockDisabledConfig];

const initIntercepts = ({
  configs = allConfigs,
}: {
  configs?: ReturnType<typeof mockLLMInferenceServiceConfigK8sResource>[];
} = {}) => {
  asProductAdminUser();

  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
      },
    }),
  );

  const config = mockDashboardConfig({
    disableKServe: false,
    disableLLMd: false,
    llmdTemplates: true,
  });
  cy.interceptOdh('GET /api/config', config);
  cy.interceptOdh('GET /api/components', null, []);

  cy.interceptK8sList(
    { model: LLMInferenceServiceConfigModel, ns: 'opendatahub' },
    mockK8sResourceList(configs),
  );
};

describe('LLMD Topology Admin Settings', () => {
  describe('tab visibility', () => {
    it('should show topology configurations tab when flags enabled', () => {
      initIntercepts();
      llmdTopologySettingsPage.visit();
      llmdTopologySettingsPage.findAppTitle().should('contain', 'llm-d topology configurations');
      llmdTopologySettingsPage.findTable().should('exist');
    });
  });

  describe('empty state', () => {
    it('should show empty state when no topology configurations exist', () => {
      initIntercepts({ configs: [] });
      llmdTopologySettingsPage.visit(false);
      llmdTopologySettingsPage.findAppTitle().should('contain', 'llm-d topology configurations');
      llmdTopologySettingsPage.findEmptyState().should('exist');
      llmdTopologySettingsPage
        .findEmptyState()
        .should('contain.text', 'No llm-d topology configurations');
      llmdTopologySettingsPage.findEmptyStateAddButton().should('exist');
      llmdTopologySettingsPage.findEmptyStateDropdownToggle().should('exist');
    });

    it('should navigate to add page from empty state button', () => {
      initIntercepts({ configs: [] });
      llmdTopologySettingsPage.visit(false);
      llmdTopologySettingsPage.findEmptyStateAddButton().click();
      cy.url().should('include', '/add/workload-single-node');
    });

    it('should show dropdown with other topology types in empty state', () => {
      initIntercepts({ configs: [] });
      llmdTopologySettingsPage.visit(false);
      llmdTopologySettingsPage.findEmptyStateDropdownToggle().click();
      llmdTopologySettingsPage
        .findEmptyStateDropdownItem('workload-multi-node-data-parallel')
        .should('exist');
      llmdTopologySettingsPage
        .findEmptyStateDropdownItem('workload-single-node-pd')
        .should('exist');
      llmdTopologySettingsPage
        .findEmptyStateDropdownItem('workload-multi-node-data-parallel-pd')
        .should('exist');
    });
  });

  describe('configurations table', () => {
    beforeEach(() => {
      initIntercepts();
      llmdTopologySettingsPage.visit();
    });

    it('should list topology configs with correct columns', () => {
      llmdTopologySettingsPage.getRow('preinstalled-single-node').find().should('exist');
      llmdTopologySettingsPage
        .getRow('preinstalled-single-node')
        .find()
        .should('contain.text', 'Pre-installed Single Node');

      llmdTopologySettingsPage.getRow('user-multi-node').find().should('exist');
      llmdTopologySettingsPage
        .getRow('user-multi-node')
        .find()
        .should('contain.text', 'User Multi-node Config');

      llmdTopologySettingsPage.getRow('disabled-config').find().should('exist');
    });

    it('should show pre-installed badge on well-known configs', () => {
      llmdTopologySettingsPage.getRow('preinstalled-single-node').shouldHavePreInstalledLabel(true);
      llmdTopologySettingsPage.getRow('user-multi-node').shouldHavePreInstalledLabel(false);
    });

    it('should toggle enabled state via switch', () => {
      const patchedConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'user-multi-node',
        displayName: 'User Multi-node Config',
        configType: TopologyType.MULTI_NODE,
        disabled: true,
      });
      cy.interceptK8s(
        'PATCH',
        {
          model: LLMInferenceServiceConfigModel,
          ns: 'opendatahub',
          name: 'user-multi-node',
        },
        patchedConfig,
      ).as('patchConfig');

      llmdTopologySettingsPage.getRow('user-multi-node').findEnabledSwitch().click();
      cy.wait('@patchConfig');
    });

    it('should hide delete action for pre-installed configs', () => {
      llmdTopologySettingsPage
        .getRow('preinstalled-single-node')
        .findKebabAction('Delete', false)
        .should('not.exist');
    });

    it('should show delete action for user-created configs', () => {
      llmdTopologySettingsPage.getRow('user-multi-node').findKebabAction('Delete');
    });
  });
});
