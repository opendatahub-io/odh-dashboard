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
import { deleteModal } from '@odh-dashboard/cypress/cypress/pages/components/DeleteModal';

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
  llmdTemplates = true,
}: {
  configs?: ReturnType<typeof mockLLMInferenceServiceConfigK8sResource>[];
  llmdTemplates?: boolean;
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
    llmdTemplates,
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

    it('should not show the topology configurations tab when llmdTemplates is disabled', () => {
      initIntercepts({ llmdTemplates: false });
      topologyConfigurations.visit(false);
      // The parent tabbed page still renders; the topology tab is gated off.
      topologyConfigurations.findTabPageTitle().should('contain.text', 'Model deployment settings');
      topologyConfigurations.findTab().should('not.exist');
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

    it('should return to the topology list on cancel from edit', () => {
      topologyConfigurations.getRow('user-multi-node').findKebabAction('Edit').click();
      cy.url().should('include', '/topology-configurations/edit/user-multi-node');
      topologyConfigurations.findCancelButton().click();
      cy.url().should(
        'include',
        '/settings/model-resources-operations/model-deployment-settings/topology-configurations',
      );
      topologyConfigurations.findTable().should('exist');
    });
  });

  describe('CRUD operations', () => {
    it('should create a topology config', () => {
      initIntercepts({ configs: [] });
      cy.interceptK8s(
        'POST',
        { model: LLMInferenceServiceConfigModel, ns: 'opendatahub' },
        mockLLMInferenceServiceConfigK8sResource({ name: 'new-topology' }),
      ).as('createConfig');

      topologyConfigurations.visit(false);
      topologyConfigurations.findEmptyStateAddButton().click();
      topologyConfigurations.findAppTitle().should('have.text', 'Add Single node configuration');

      topologyConfigurations.findDisplayNameInput().type('New topology');
      // The YAML editor only mounts once a configuration source is chosen
      // (showEditor gates on configSource === 'editor' in create mode).
      topologyConfigurations.selectConfigSource('editor');
      topologyConfigurations.getYamlEditor().setValue('metadata:\n  name: placeholder');
      topologyConfigurations.findSubmitButton().should('be.enabled').click();

      cy.wait('@createConfig').then((interception) => {
        expect(interception.request.body.metadata.annotations).to.include({
          'openshift.io/display-name': 'New topology',
        });
      });
    });

    it('should edit a topology config', () => {
      initIntercepts();
      cy.interceptK8s(
        'PATCH',
        { model: LLMInferenceServiceConfigModel, ns: 'opendatahub', name: 'user-multi-node' },
        mockLLMInferenceServiceConfigK8sResource({ name: 'user-multi-node' }),
      ).as('patchConfig');

      topologyConfigurations.visit();
      topologyConfigurations.getRow('user-multi-node').findKebabAction('Edit').click();
      topologyConfigurations.findDisplayNameInput().clear().type('Renamed multinode');
      topologyConfigurations.findSubmitButton().should('be.enabled').click();

      cy.wait('@patchConfig').then((interception) => {
        const patches: { op: string; path: string; value: string }[] = interception.request.body;
        const displayNamePatch = patches.find(
          (p) => p.path === '/metadata/annotations/openshift.io~1display-name',
        );
        expect(displayNamePatch?.value).to.equal('Renamed multinode');
      });
    });

    it('should duplicate a topology config', () => {
      initIntercepts();
      cy.interceptK8s(
        'POST',
        { model: LLMInferenceServiceConfigModel, ns: 'opendatahub' },
        mockLLMInferenceServiceConfigK8sResource({ name: 'user-multi-node-copy' }),
      ).as('createConfig');

      topologyConfigurations.visit();
      topologyConfigurations.getRow('user-multi-node').findKebabAction('Duplicate').click();
      cy.url().should(
        'include',
        '/settings/model-resources-operations/model-deployment-settings/topology-configurations/duplicate/user-multi-node',
      );
      topologyConfigurations.findSubmitButton().should('be.enabled').click();

      cy.wait('@createConfig').then((interception) => {
        expect(interception.request.body.metadata.annotations).to.include({
          'openshift.io/display-name': 'Copy of User Multi-node Config',
        });
      });
    });

    it('should delete a topology config', () => {
      initIntercepts();
      cy.interceptK8s(
        'DELETE',
        { model: LLMInferenceServiceConfigModel, ns: 'opendatahub', name: 'user-multi-node' },
        mockLLMInferenceServiceConfigK8sResource({ name: 'user-multi-node' }),
      ).as('deleteConfig');

      topologyConfigurations.visit();
      topologyConfigurations.getRow('user-multi-node').findKebabAction('Delete').click();
      deleteModal.find().should('exist');
      deleteModal.findInput().type('User Multi-node Config');
      deleteModal.findSubmitButton().should('be.enabled').click();
      cy.wait('@deleteConfig');

      cy.wsK8s(
        'DELETED',
        LLMInferenceServiceConfigModel,
        mockLLMInferenceServiceConfigK8sResource({ name: 'user-multi-node' }),
      );
      topologyConfigurations.getRow('user-multi-node').find().should('not.exist');
    });
  });
});
