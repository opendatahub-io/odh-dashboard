import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServiceConfigK8sResource';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ConfigType, RoutingType, TopologyType } from '@odh-dashboard/llmd-serving/types';
import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { LLMInferenceServiceConfigModel } from '@odh-dashboard/cypress/cypress/utils/models';
import { asProductAdminUser } from '@odh-dashboard/cypress/cypress/utils/mockUsers';
import {
  routingConfigurations,
  llmdRoutingCreatePage,
} from '@odh-dashboard/cypress/cypress/pages/modelDeploymentSettings/routingConfigurations';
import { deleteModal } from '@odh-dashboard/cypress/cypress/pages/components/DeleteModal';

const mockPreInstalledScheduler = mockLLMInferenceServiceConfigK8sResource({
  name: 'managed-scheduler',
  displayName: 'Managed scheduler',
  configType: ConfigType.ROUTER,
  routingType: RoutingType.SCHEDULER,
  supportedTopologies: [TopologyType.SINGLE_NODE],
  preInstalled: true,
});

const mockPreInstalledHttpRoute = mockLLMInferenceServiceConfigK8sResource({
  name: 'managed-httproute',
  displayName: 'Managed HTTPRoute',
  configType: ConfigType.ROUTER,
  routingType: RoutingType.HTTP_ROUTE,
  preInstalled: true,
  disabled: true,
});

const mockPreInstalledCombo = mockLLMInferenceServiceConfigK8sResource({
  name: 'managed-scheduler-httproute',
  displayName: 'Managed scheduler with HTTPRoute',
  configType: ConfigType.ROUTER,
  routingType: RoutingType.SCHEDULER_AND_HTTP_ROUTE,
  supportedTopologies: [TopologyType.SINGLE_NODE, TopologyType.MULTI_NODE],
  preInstalled: true,
});

const mockUserConfig = mockLLMInferenceServiceConfigK8sResource({
  name: 'lab-routing-profile',
  displayName: 'Lab routing profile',
  configType: ConfigType.ROUTER,
  routingType: RoutingType.SCHEDULER_AND_HTTP_ROUTE,
});

const allConfigs = [
  mockPreInstalledCombo,
  mockPreInstalledScheduler,
  mockPreInstalledHttpRoute,
  mockUserConfig,
];

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

describe('LLMD Routing Admin Settings', () => {
  describe('tab visibility', () => {
    it('should show routing configurations tab when flags enabled', () => {
      initIntercepts();
      routingConfigurations.visit();
      routingConfigurations.findTabPageTitle().should('contain.text', 'Model deployment settings');
      routingConfigurations.findTab().should('exist');
      routingConfigurations.findTable().should('exist');
    });

    it('should not show the routing configurations tab when llmdTemplates is disabled', () => {
      initIntercepts({ llmdTemplates: false });
      routingConfigurations.visit(false);
      routingConfigurations.findTabPageTitle().should('contain.text', 'Model deployment settings');
      routingConfigurations.findTab().should('not.exist');
    });
  });

  describe('empty state', () => {
    it('should show empty state when no routing configurations exist', () => {
      initIntercepts({ configs: [] });
      routingConfigurations.visit(false);
      routingConfigurations.findTabPageTitle().should('contain.text', 'Model deployment settings');
      routingConfigurations.findTab().should('exist');
      routingConfigurations.findEmptyState().should('exist');
      routingConfigurations
        .findEmptyState()
        .should('contain.text', 'No llm-d routing configurations');
      routingConfigurations.findEmptyStateAddButton().should('exist');
    });

    it('should navigate to add page from empty state button', () => {
      initIntercepts({ configs: [] });
      routingConfigurations.visit(false);
      routingConfigurations.findEmptyStateAddButton().click();
      cy.url().should(
        'include',
        '/settings/model-resources-operations/model-deployment-settings/routing-configurations/add',
      );
      // The form is a full-page breakout route, not tab content: it must not render
      // beneath the tabbed page title and tab bar, which would give it two headings.
      routingConfigurations.findTabPageTitle().should('not.exist');
      routingConfigurations.findTab().should('not.exist');
      routingConfigurations.findAppTitle().should('have.text', 'Add llm-d routing configuration');
    });
  });

  describe('configurations table', () => {
    beforeEach(() => {
      initIntercepts();
      routingConfigurations.visit();
    });

    it('should list routing configs with correct columns', () => {
      routingConfigurations.getRow('managed-scheduler-httproute').find().should('exist');
      routingConfigurations
        .getRow('managed-scheduler-httproute')
        .find()
        .should('contain.text', 'Managed scheduler with HTTPRoute');

      routingConfigurations.getRow('managed-scheduler').find().should('exist');
      routingConfigurations
        .getRow('managed-scheduler')
        .find()
        .should('contain.text', 'Managed scheduler');

      routingConfigurations.getRow('lab-routing-profile').find().should('exist');
      routingConfigurations
        .getRow('lab-routing-profile')
        .find()
        .should('contain.text', 'Lab routing profile');
    });

    it('should show pre-installed badge on well-known configs', () => {
      routingConfigurations.getRow('managed-scheduler').shouldHavePreInstalledLabel(true);
      routingConfigurations.getRow('lab-routing-profile').shouldHavePreInstalledLabel(false);
    });

    it('should show topology type labels', () => {
      routingConfigurations
        .getRow('managed-scheduler-httproute')
        .findTopologyTypeCell()
        .should('have.text', 'Single node, Multi-node');
      routingConfigurations
        .getRow('managed-scheduler')
        .findTopologyTypeCell()
        .should('have.text', 'Single node');
      // No supported topologies annotation means the config applies to all topologies
      routingConfigurations
        .getRow('managed-httproute')
        .findTopologyTypeCell()
        .should('have.text', 'All');
    });

    it('should toggle enabled state via switch', () => {
      const patchedConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'lab-routing-profile',
        displayName: 'Lab routing profile',
        configType: ConfigType.ROUTER,
        routingType: RoutingType.SCHEDULER_AND_HTTP_ROUTE,
        disabled: true,
      });
      cy.interceptK8s(
        'PATCH',
        {
          model: LLMInferenceServiceConfigModel,
          ns: 'opendatahub',
          name: 'lab-routing-profile',
        },
        patchedConfig,
      ).as('patchConfig');

      routingConfigurations.getRow('lab-routing-profile').findEnabledSwitch().click();
      cy.wait('@patchConfig').then((interception) => {
        const patches: { op: string; path: string; value: string }[] = interception.request.body;
        const disabledPatch = patches.find(
          (p) => p.path === '/metadata/annotations/opendatahub.io~1disabled',
        );
        expect(disabledPatch?.value).to.equal('true');
      });
    });

    it('should hide delete action for pre-installed configs', () => {
      routingConfigurations
        .getRow('managed-scheduler')
        .findKebabAction('Delete', false)
        .should('not.exist');
    });

    it('should show delete action for user-created configs', () => {
      routingConfigurations.getRow('lab-routing-profile').findKebabAction('Delete');
    });

    it('should navigate to edit form when clicking Edit action', () => {
      routingConfigurations.getRow('lab-routing-profile').findKebabAction('Edit').click();
      cy.url().should(
        'include',
        '/settings/model-resources-operations/model-deployment-settings/routing-configurations/edit/lab-routing-profile',
      );
      // The form is a full-page breakout route, not tab content: it must not render
      // beneath the tabbed page title and tab bar, which would give it two headings.
      routingConfigurations.findTabPageTitle().should('not.exist');
      routingConfigurations.findTab().should('not.exist');
      routingConfigurations.findAppTitle().should('have.text', 'Edit Lab routing profile');
    });

    it('should navigate to duplicate form when clicking Duplicate action', () => {
      routingConfigurations.getRow('lab-routing-profile').findKebabAction('Duplicate').click();
      cy.url().should(
        'include',
        '/settings/model-resources-operations/model-deployment-settings/routing-configurations/duplicate/lab-routing-profile',
      );
      // The form is a full-page breakout route, not tab content: it must not render
      // beneath the tabbed page title and tab bar, which would give it two headings.
      routingConfigurations.findTabPageTitle().should('not.exist');
      routingConfigurations.findTab().should('not.exist');
      routingConfigurations
        .findAppTitle()
        .should('have.text', 'Duplicate llm-d routing configuration');
    });
  });

  describe('create page', () => {
    beforeEach(() => {
      initIntercepts();
      routingConfigurations.visit();
      routingConfigurations.findAddButton().click();
      cy.url().should(
        'include',
        '/settings/model-resources-operations/model-deployment-settings/routing-configurations/add',
      );
      // The form is a full-page breakout route, not tab content: it must not render
      // beneath the tabbed page title and tab bar, which would give it two headings.
      routingConfigurations.findTabPageTitle().should('not.exist');
      routingConfigurations.findTab().should('not.exist');
      llmdRoutingCreatePage.findTitle().should('have.text', 'Add llm-d routing configuration');
    });

    it('should show create page with topology type and config source dropdowns', () => {
      llmdRoutingCreatePage.findTopologyTypeSelect().should('exist');
      llmdRoutingCreatePage.findConfigSourceSelect().should('exist');
    });

    it('should have submit button disabled when no topology selected', () => {
      llmdRoutingCreatePage.findSubmitButton().should('be.disabled');
    });

    it('should disable config source until topology is selected', () => {
      llmdRoutingCreatePage.findConfigSourceSelect().should('be.disabled');
    });

    it('should navigate back on cancel', () => {
      llmdRoutingCreatePage.findCancelButton().click();
      routingConfigurations.findTable().should('exist');
    });

    it('should create a routing config', () => {
      cy.interceptK8s(
        'POST',
        { model: LLMInferenceServiceConfigModel, ns: 'opendatahub' },
        mockLLMInferenceServiceConfigK8sResource({ name: 'new-routing' }),
      ).as('createConfig');

      llmdRoutingCreatePage.findDisplayNameInput().type('New routing config');
      llmdRoutingCreatePage.selectTopologyType(TopologyType.SINGLE_NODE);
      // Config source is disabled until a topology type is selected (see the
      // "should disable config source until topology is selected" test above) —
      // wait for it to become enabled before interacting, rather than racing it.
      llmdRoutingCreatePage.findConfigSourceSelect().should('be.enabled');
      llmdRoutingCreatePage.selectConfigSource('editor');
      llmdRoutingCreatePage.getYamlEditor().setValue('metadata:\n  name: placeholder');
      llmdRoutingCreatePage.findSubmitButton().should('be.enabled').click();

      cy.wait('@createConfig').then((interception) => {
        expect(interception.request.body.metadata.annotations).to.include({
          'openshift.io/display-name': 'New routing config',
        });
      });
    });
  });

  describe('CRUD operations', () => {
    beforeEach(() => {
      initIntercepts();
      routingConfigurations.visit();
    });

    it('should edit a routing config', () => {
      cy.interceptK8s(
        'PATCH',
        { model: LLMInferenceServiceConfigModel, ns: 'opendatahub', name: 'lab-routing-profile' },
        mockLLMInferenceServiceConfigK8sResource({ name: 'lab-routing-profile' }),
      ).as('patchConfig');

      routingConfigurations.getRow('lab-routing-profile').findKebabAction('Edit').click();
      llmdRoutingCreatePage.findDisplayNameInput().clear().type('Renamed routing profile');
      // The mock config has no supported-topologies annotation, so no topology is
      // pre-selected — one must be chosen for submit to become enabled.
      llmdRoutingCreatePage.selectTopologyType(TopologyType.SINGLE_NODE);
      llmdRoutingCreatePage.findSubmitButton().should('be.enabled').click();

      cy.wait('@patchConfig').then((interception) => {
        const patches: { op: string; path: string; value: string }[] = interception.request.body;
        const displayNamePatch = patches.find(
          (p) => p.path === '/metadata/annotations/openshift.io~1display-name',
        );
        expect(displayNamePatch?.value).to.equal('Renamed routing profile');
      });
    });

    it('should duplicate a routing config', () => {
      cy.interceptK8s(
        'POST',
        { model: LLMInferenceServiceConfigModel, ns: 'opendatahub' },
        mockLLMInferenceServiceConfigK8sResource({ name: 'lab-routing-profile-copy' }),
      ).as('createConfig');

      routingConfigurations.getRow('lab-routing-profile').findKebabAction('Duplicate').click();
      cy.url().should(
        'include',
        '/settings/model-resources-operations/model-deployment-settings/routing-configurations/duplicate/lab-routing-profile',
      );
      // The mock config has no supported-topologies annotation, so no topology is
      // pre-selected — one must be chosen for submit to become enabled.
      llmdRoutingCreatePage.selectTopologyType(TopologyType.SINGLE_NODE);
      llmdRoutingCreatePage.findSubmitButton().should('be.enabled').click();

      cy.wait('@createConfig').then((interception) => {
        expect(interception.request.body.metadata.annotations).to.include({
          'openshift.io/display-name': 'Copy of Lab routing profile',
        });
      });
    });

    it('should delete a routing config', () => {
      cy.interceptK8s(
        'GET',
        { model: LLMInferenceServiceConfigModel, ns: 'opendatahub', name: 'lab-routing-profile' },
        mockUserConfig,
      ).as('getConfigForDelete');
      cy.interceptK8s(
        'DELETE',
        { model: LLMInferenceServiceConfigModel, ns: 'opendatahub', name: 'lab-routing-profile' },
        mockLLMInferenceServiceConfigK8sResource({ name: 'lab-routing-profile' }),
      ).as('deleteConfig');

      routingConfigurations.getRow('lab-routing-profile').findKebabAction('Delete').click();
      deleteModal.find().should('exist');
      deleteModal.findInput().type('Lab routing profile');
      deleteModal.findSubmitButton().should('be.enabled').click();
      cy.wait('@getConfigForDelete');
      cy.wait('@deleteConfig');

      cy.wsK8s(
        'DELETED',
        LLMInferenceServiceConfigModel,
        mockLLMInferenceServiceConfigK8sResource({ name: 'lab-routing-profile' }),
      );
      routingConfigurations.getRow('lab-routing-profile').find().should('not.exist');
    });
  });
});
