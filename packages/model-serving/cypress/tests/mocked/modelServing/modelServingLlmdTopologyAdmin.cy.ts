import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServiceConfigK8sResource';
// eslint-disable-next-line import/no-extraneous-dependencies
import { TopologyType } from '@odh-dashboard/llmd-serving/types';
import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { LLMInferenceServiceConfigModel } from '@odh-dashboard/cypress/cypress/utils/models';
import { asProductAdminUser } from '@odh-dashboard/cypress/cypress/utils/mockUsers';
import { topologyConfigurations } from '@odh-dashboard/cypress/cypress/pages/modelDeploymentSettings/topologyConfigurations';

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
      topologyConfigurations.visit();
      topologyConfigurations.findTabPageTitle().should('contain.text', 'Model deployment settings');
      topologyConfigurations.findTab().should('exist');
      topologyConfigurations.findTable().should('exist');
    });
  });

  describe('empty state', () => {
    it('should show empty state when no topology configurations exist', () => {
      initIntercepts({ configs: [] });
      topologyConfigurations.visit(false);
      topologyConfigurations.findTabPageTitle().should('contain.text', 'Model deployment settings');
      topologyConfigurations.findTab().should('exist');
      topologyConfigurations.findEmptyState().should('exist');
      topologyConfigurations
        .findEmptyState()
        .should('contain.text', 'No llm-d topology configurations');
      topologyConfigurations.findEmptyStateAddButton().should('exist');
      topologyConfigurations.findEmptyStateDropdownToggle().should('exist');
    });

    it('should navigate to add page from empty state button', () => {
      initIntercepts({ configs: [] });
      topologyConfigurations.visit(false);
      topologyConfigurations.findEmptyStateAddButton().click();
      cy.url().should(
        'include',
        '/settings/model-resources-operations/model-deployment-settings/topology-configurations/add/workload-single-node',
      );
      // The form actually mounted (URL + missing tab chrome alone don't prove it).
      topologyConfigurations.findAppTitle().should('have.text', 'Add Single node configuration');
      // The form is a full-page breakout route, not tab content: it must not render
      // beneath the tabbed page title and tab bar, which would give it two headings.
      topologyConfigurations.findTabPageTitle().should('not.exist');
      topologyConfigurations.findTab().should('not.exist');
    });

    it('should show dropdown with other topology types in empty state', () => {
      initIntercepts({ configs: [] });
      topologyConfigurations.visit(false);
      topologyConfigurations.findEmptyStateDropdownToggle().click();
      topologyConfigurations
        .findEmptyStateDropdownItem('workload-multi-node-data-parallel')
        .should('exist');
      topologyConfigurations.findEmptyStateDropdownItem('workload-single-node-pd').should('exist');
      topologyConfigurations
        .findEmptyStateDropdownItem('workload-multi-node-data-parallel-pd')
        .should('exist');
    });
  });

  describe('configurations table', () => {
    beforeEach(() => {
      initIntercepts();
      topologyConfigurations.visit();
    });

    it('should list topology configs with correct columns', () => {
      topologyConfigurations.getRow('preinstalled-single-node').find().should('exist');
      topologyConfigurations
        .getRow('preinstalled-single-node')
        .find()
        .should('contain.text', 'Pre-installed Single Node');

      topologyConfigurations.getRow('user-multi-node').find().should('exist');
      topologyConfigurations
        .getRow('user-multi-node')
        .find()
        .should('contain.text', 'User Multi-node Config');

      topologyConfigurations.getRow('disabled-config').find().should('exist');
    });

    it('should show pre-installed badge on well-known configs', () => {
      topologyConfigurations.getRow('preinstalled-single-node').shouldHavePreInstalledLabel(true);
      topologyConfigurations.getRow('user-multi-node').shouldHavePreInstalledLabel(false);
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

      topologyConfigurations.getRow('user-multi-node').findEnabledSwitch().click();
      cy.wait('@patchConfig');
    });

    it('should hide delete action for pre-installed configs', () => {
      topologyConfigurations
        .getRow('preinstalled-single-node')
        .findKebabAction('Delete', false)
        .should('not.exist');
    });

    it('should show delete action for user-created configs', () => {
      topologyConfigurations.getRow('user-multi-node').findKebabAction('Delete');
    });

    it('should navigate to edit form as a full-page breakout route', () => {
      topologyConfigurations.getRow('user-multi-node').findKebabAction('Edit').click();
      cy.url().should(
        'include',
        '/settings/model-resources-operations/model-deployment-settings/topology-configurations/edit/user-multi-node',
      );
      // The form actually mounted (URL + missing tab chrome alone don't prove it).
      topologyConfigurations.findAppTitle().should('have.text', 'Edit User Multi-node Config');
      // The form is a full-page breakout route, not tab content: it must not render
      // beneath the tabbed page title and tab bar, which would give it two headings.
      topologyConfigurations.findTabPageTitle().should('not.exist');
      topologyConfigurations.findTab().should('not.exist');
    });

    it('should navigate to duplicate form as a full-page breakout route', () => {
      topologyConfigurations.getRow('user-multi-node').findKebabAction('Duplicate').click();
      cy.url().should(
        'include',
        '/settings/model-resources-operations/model-deployment-settings/topology-configurations/duplicate/user-multi-node',
      );
      // The form actually mounted (URL + missing tab chrome alone don't prove it).
      topologyConfigurations
        .findAppTitle()
        .should('have.text', 'Duplicate llm-d topology configuration');
      // The form is a full-page breakout route, not tab content: it must not render
      // beneath the tabbed page title and tab bar, which would give it two headings.
      topologyConfigurations.findTabPageTitle().should('not.exist');
      topologyConfigurations.findTab().should('not.exist');
    });
  });
});
