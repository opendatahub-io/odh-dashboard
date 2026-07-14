import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceConfigK8sResource';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ConfigType, RoutingType } from '@odh-dashboard/llmd-serving/types';
import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/internal/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '@odh-dashboard/internal/__mocks__/mockK8sResourceList';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { LLMInferenceServiceConfigModel } from '@odh-dashboard/cypress/cypress/utils/models';
import { asProductAdminUser } from '@odh-dashboard/cypress/cypress/utils/mockUsers';
import {
  llmdRoutingSettingsPage,
  llmdRoutingCreatePage,
} from '@odh-dashboard/cypress/cypress/pages/llmdRoutingSettings';
import { pageNotfound } from '@odh-dashboard/cypress/cypress/pages/pageNotFound';

const mockPreInstalledScheduler = mockLLMInferenceServiceConfigK8sResource({
  name: 'managed-scheduler',
  displayName: 'Managed scheduler',
  configType: ConfigType.ROUTER,
  routingType: RoutingType.SCHEDULER,
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
  llmdTopologyConfigsEnabled = true,
}: {
  configs?: ReturnType<typeof mockLLMInferenceServiceConfigK8sResource>[];
  llmdTopologyConfigsEnabled?: boolean;
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
  });
  config.spec.dashboardConfig.llmdTopologyConfigs = llmdTopologyConfigsEnabled;
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
      llmdRoutingSettingsPage.findAppTitle().should('contain', 'llm-d routing configurations');
      llmdRoutingSettingsPage.findTable().should('exist');
    });

    it('should show 404 when flag disabled', () => {
      initIntercepts({ llmdTopologyConfigsEnabled: false });
      llmdRoutingSettingsPage.visit(false);
      pageNotfound.findPage().should('exist');
    });
  });

  describe('empty state', () => {
    it('should show empty state when no routing configurations exist', () => {
      initIntercepts({ configs: [] });
      llmdRoutingSettingsPage.visit(false);
      llmdRoutingSettingsPage.findAppTitle().should('contain', 'llm-d routing configurations');
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
      cy.url().should('include', '/add');
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

    it('should show routing type labels', () => {
      llmdRoutingSettingsPage
        .getRow('managed-scheduler-httproute')
        .findRoutingTypeLabel()
        .should('contain.text', 'Scheduler + HTTPRoute');
      llmdRoutingSettingsPage
        .getRow('managed-scheduler')
        .findRoutingTypeLabel()
        .should('contain.text', 'Scheduler');
      llmdRoutingSettingsPage
        .getRow('managed-httproute')
        .findRoutingTypeLabel()
        .should('contain.text', 'HTTPRoute');
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
  });

  describe('create page', () => {
    beforeEach(() => {
      initIntercepts();
      llmdRoutingSettingsPage.visit();
      llmdRoutingSettingsPage.findAddButton().click();
      llmdRoutingCreatePage.findTitle().should('contain', 'Add llm-d routing configuration');
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
