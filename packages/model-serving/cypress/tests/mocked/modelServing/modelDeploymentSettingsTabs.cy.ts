import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { asProductAdminUser } from '@odh-dashboard/cypress/cypress/utils/mockUsers';
import {
  LLMInferenceServiceConfigModel,
  TemplateModel,
} from '@odh-dashboard/cypress/cypress/utils/models';

const BASE = '/settings/model-resources-operations/model-deployment-settings';

// Enable every area that gates a tab so all five tabs render.
const initAllTabs = () => {
  asProductAdminUser();
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: { [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' } },
    }),
  );
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableModelServing: false,
      disableKServe: false,
      disableLLMd: false,
      disableCustomServingRuntimes: false,
      llmdTemplates: true,
      vLLMDeploymentOnMaaS: true,
    }),
  );
  // Serving-runtime templates list + llmd config list, so tab content mounts without 500s.
  cy.interceptK8sList({ model: TemplateModel, ns: 'opendatahub' }, mockK8sResourceList([]));
  cy.interceptK8sList(
    { model: LLMInferenceServiceConfigModel, ns: 'opendatahub' },
    mockK8sResourceList([]),
  );
  cy.interceptOdh('GET /api/cluster-settings', {
    userTrackingEnabled: false,
    cullerTimeout: 31536000,
    pvcSize: 20,
    modelServingPlatformEnabled: { kServe: true, LLMd: true },
  });
};

const TABS = [
  { name: 'General settings', path: `${BASE}/general-settings` },
  { name: 'Serving runtime templates', path: `${BASE}/serving-runtime-templates` },
  { name: 'LLM accelerator configurations', path: `${BASE}/llm-accelerator-configurations` },
  { name: 'llm-d topology configurations', path: `${BASE}/topology-configurations` },
  { name: 'llm-d routing configurations', path: `${BASE}/routing-configurations` },
];

describe('Model deployment settings tab navigation', () => {
  beforeEach(() => {
    initAllTabs();
  });

  it('renders all five tabs and updates the URL when each is clicked', () => {
    cy.visitWithLogin(`${BASE}/general-settings`);
    cy.findByTestId('app-tab-page-title').should('contain.text', 'Model deployment settings');

    TABS.forEach((tab) => {
      cy.findByRole('tab', { name: tab.name }).should('exist').click();
      cy.url().should('include', tab.path);
    });
  });

  it('deep-links and reloads to each tab, staying on that tab', () => {
    TABS.forEach((tab) => {
      cy.visitWithLogin(tab.path);
      cy.findByRole('tab', { name: tab.name }).should('have.attr', 'aria-selected', 'true');
      cy.reload();
      cy.findByRole('tab', { name: tab.name }).should('have.attr', 'aria-selected', 'true');
      cy.url().should('include', tab.path);
    });
  });

  it('redirects the bare page shell to the General settings tab', () => {
    cy.visitWithLogin(BASE);
    cy.url().should('include', `${BASE}/general-settings`);
    cy.findByRole('tab', { name: 'General settings' }).should('have.attr', 'aria-selected', 'true');
  });

  it('redirects a gated tab deep-link to the first available tab', () => {
    // Disable the llmd-templates areas so topology/routing/accelerator tabs are gone.
    asProductAdminUser();
    cy.interceptOdh(
      'GET /api/dsc/status',
      mockDscStatus({
        components: { [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' } },
      }),
    );
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        disableKServe: false,
        disableLLMd: false,
        disableCustomServingRuntimes: false,
        llmdTemplates: false,
        vLLMDeploymentOnMaaS: false,
      }),
    );
    cy.interceptOdh('GET /api/cluster-settings', {
      userTrackingEnabled: false,
      cullerTimeout: 31536000,
      pvcSize: 20,
      modelServingPlatformEnabled: { kServe: true, LLMd: true },
    });

    cy.visitWithLogin(`${BASE}/topology-configurations`);
    // Gated tab is not present; TabRoutePage redirects to the first available tab.
    cy.findByRole('tab', { name: 'llm-d topology configurations' }).should('not.exist');
    cy.findByTestId('app-tab-page-title').should('contain.text', 'Model deployment settings');
    cy.url().should('include', `${BASE}/general-settings`);
  });
});
