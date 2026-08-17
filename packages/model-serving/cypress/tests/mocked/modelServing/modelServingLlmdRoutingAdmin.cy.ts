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
  llmdRoutingSettingsPage,
  llmdRoutingCreatePage,
} from '@odh-dashboard/cypress/cypress/pages/llmdRoutingSettings';

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

describe('LLMD Routing Admin Settings', () => {
  describe('tab visibility', () => {
    it('should show routing configurations tab when flags enabled', () => {
      initIntercepts();
      llmdRoutingSettingsPage.visit();
      llmdRoutingSettingsPage
        .findTabPageTitle()
        .should('contain.text', 'Model deployment settings');
      llmdRoutingSettingsPage.findTab().should('exist');
      llmdRoutingSettingsPage.findTable().should('exist');
    });
  });

  describe('empty state', () => {
    it('should show empty state when no routing configurations exist', () => {
      initIntercepts({ configs: [] });
      llmdRoutingSettingsPage.visit(false);
      llmdRoutingSettingsPage
        .findTabPageTitle()
        .should('contain.text', 'Model deployment settings');
      llmdRoutingSettingsPage.findTab().should('exist');
      llmdRoutingSettingsPage.findEmptyState().should('exist');
      llmdRoutingSettingsPage
        .findEmptyState()
        .should('contain.text', 'No llm-d routing configurations');
      llmdRoutingSettingsPage.findEmptyStateAddButton().should('exist');
    });

    it('should navigate to add page from empty state button', () => {
      initIntercepts({ configs: [] });
      llmdRoutingSettingsPage.visit(false);
      llmdRoutingSettingsPage.findEmptyStateAddButton().click();
      cy.url().should(
        'include',
        '/settings/model-resources-operations/model-deployment-settings/routing-configurations/add',
      );
      // The form is a full-page breakout route, not tab content: it must not render
      // beneath the tabbed page title and tab bar, which would give it two headings.
      llmdRoutingSettingsPage.findTabPageTitle().should('not.exist');
      llmdRoutingSettingsPage.findTab().should('not.exist');
      llmdRoutingSettingsPage.findAppTitle().should('have.text', 'Add llm-d routing configuration');
    });
  });

  describe('configurations table', () => {
    beforeEach(() => {
      initIntercepts();
      llmdRoutingSettingsPage.visit();
    });

    it('should list routing configs with correct columns', () => {
      llmdRoutingSettingsPage.getRow('managed-scheduler-httproute').find().should('exist');
      llmdRoutingSettingsPage
        .getRow('managed-scheduler-httproute')
        .find()
        .should('contain.text', 'Managed scheduler with HTTPRoute');

      llmdRoutingSettingsPage.getRow('managed-scheduler').find().should('exist');
      llmdRoutingSettingsPage
        .getRow('managed-scheduler')
        .find()
        .should('contain.text', 'Managed scheduler');

      llmdRoutingSettingsPage.getRow('lab-routing-profile').find().should('exist');
      llmdRoutingSettingsPage
        .getRow('lab-routing-profile')
        .find()
        .should('contain.text', 'Lab routing profile');
    });

    it('should show pre-installed badge on well-known configs', () => {
      llmdRoutingSettingsPage.getRow('managed-scheduler').shouldHavePreInstalledLabel(true);
      llmdRoutingSettingsPage.getRow('lab-routing-profile').shouldHavePreInstalledLabel(false);
    });

    it('should show topology type labels', () => {
      llmdRoutingSettingsPage
        .getRow('managed-scheduler-httproute')
        .findTopologyTypeCell()
        .should('have.text', 'Single node, Multi-node');
      llmdRoutingSettingsPage
        .getRow('managed-scheduler')
        .findTopologyTypeCell()
        .should('have.text', 'Single node');
      // No supported topologies annotation means the config applies to all topologies
      llmdRoutingSettingsPage
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

      llmdRoutingSettingsPage.getRow('lab-routing-profile').findEnabledSwitch().click();
      cy.wait('@patchConfig').then((interception) => {
        const patches: { op: string; path: string; value: string }[] = interception.request.body;
        const disabledPatch = patches.find(
          (p) => p.path === '/metadata/annotations/opendatahub.io~1disabled',
        );
        expect(disabledPatch?.value).to.equal('true');
      });
    });

    it('should hide delete action for pre-installed configs', () => {
      llmdRoutingSettingsPage
        .getRow('managed-scheduler')
        .findKebabAction('Delete', false)
        .should('not.exist');
    });

    it('should show delete action for user-created configs', () => {
      llmdRoutingSettingsPage.getRow('lab-routing-profile').findKebabAction('Delete');
    });

    it('should navigate to edit form when clicking Edit action', () => {
      llmdRoutingSettingsPage.getRow('lab-routing-profile').findKebabAction('Edit').click();
      cy.url().should(
        'include',
        '/settings/model-resources-operations/model-deployment-settings/routing-configurations/edit/lab-routing-profile',
      );
      // The form is a full-page breakout route, not tab content: it must not render
      // beneath the tabbed page title and tab bar, which would give it two headings.
      llmdRoutingSettingsPage.findTabPageTitle().should('not.exist');
      llmdRoutingSettingsPage.findTab().should('not.exist');
      llmdRoutingSettingsPage.findAppTitle().should('have.text', 'Edit Lab routing profile');
    });

    it('should navigate to duplicate form when clicking Duplicate action', () => {
      llmdRoutingSettingsPage.getRow('lab-routing-profile').findKebabAction('Duplicate').click();
      cy.url().should(
        'include',
        '/settings/model-resources-operations/model-deployment-settings/routing-configurations/duplicate/lab-routing-profile',
      );
      // The form is a full-page breakout route, not tab content: it must not render
      // beneath the tabbed page title and tab bar, which would give it two headings.
      llmdRoutingSettingsPage.findTabPageTitle().should('not.exist');
      llmdRoutingSettingsPage.findTab().should('not.exist');
      llmdRoutingSettingsPage
        .findAppTitle()
        .should('have.text', 'Duplicate llm-d routing configuration');
    });
  });

  describe('create page', () => {
    beforeEach(() => {
      initIntercepts();
      llmdRoutingSettingsPage.visit();
      llmdRoutingSettingsPage.findAddButton().click();
      cy.url().should(
        'include',
        '/settings/model-resources-operations/model-deployment-settings/routing-configurations/add',
      );
      // The form is a full-page breakout route, not tab content: it must not render
      // beneath the tabbed page title and tab bar, which would give it two headings.
      llmdRoutingSettingsPage.findTabPageTitle().should('not.exist');
      llmdRoutingSettingsPage.findTab().should('not.exist');
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
      llmdRoutingSettingsPage.findTable().should('exist');
    });
  });
});
