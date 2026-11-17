import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import {
  llmInferenceServiceConfigurations,
  unsupportedStatusAcceptanceModal,
} from '@odh-dashboard/cypress/cypress/pages/modelDeploymentSettings/llmInferenceServiceConfigurations';
import {
  asProductAdminUser,
  asProjectAdminUser,
} from '@odh-dashboard/cypress/cypress/utils/mockUsers';
import { pageNotfound } from '@odh-dashboard/cypress/cypress/pages/pageNotFound';
import {
  llmInferenceServiceConfigsIntercept,
  interceptLlmInferenceServiceConfigPatch,
} from './llmInferenceServiceConfigsUtils';

it('LLM inference service configurations should not be available for non product admins', () => {
  asProjectAdminUser();
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ vLLMDeploymentOnMaaS: true }));
  llmInferenceServiceConfigurations.visit(false);
  pageNotfound.findPage().should('exist');
  llmInferenceServiceConfigurations.findNavItem().should('not.exist');
});

it('LLM inference service configurations tab should not be available when vLLMDeploymentOnMaaS is disabled', () => {
  asProductAdminUser();
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ vLLMDeploymentOnMaaS: false }));
  llmInferenceServiceConfigurations.visit(false);
  // The parent tabbed page still renders (other tabs are visible), but the accelerator
  // tab is hidden. TabRoutePage redirects to the first available tab.
  llmInferenceServiceConfigurations
    .findTabPageTitle()
    .should('contain.text', 'Model deployment settings');
  llmInferenceServiceConfigurations.findTab().should('not.exist');
});

describe('LLM inference service configurations', () => {
  beforeEach(() => {
    asProductAdminUser();
    llmInferenceServiceConfigsIntercept();

    llmInferenceServiceConfigurations.visit();
  });

  it('should render the page with configs from the API', () => {
    llmInferenceServiceConfigurations.findNavItem().should('exist');
    llmInferenceServiceConfigurations.getRowByName('vllm-cuda').find().should('exist');
    llmInferenceServiceConfigurations.getRowByName('vllm-rocm').find().should('exist');
    llmInferenceServiceConfigurations.getRowByName('vllm-cpu').find().should('exist');
    llmInferenceServiceConfigurations.getRowByName('vllm-tpu').find().should('exist');
    llmInferenceServiceConfigurations.getRowByName('vllm-gaudi').find().should('exist');
  });

  it('should show enabled toggle ON for enabled config and OFF for disabled config', () => {
    llmInferenceServiceConfigurations.getRowByName('vllm-cuda').shouldBeEnabled(true);
    llmInferenceServiceConfigurations.getRowByName('vllm-cpu').shouldBeEnabled(false);
  });

  it('should show toggle OFF for unsupported unaccepted config', () => {
    llmInferenceServiceConfigurations.getRowByName('vllm-tpu').shouldBeEnabled(false);
    llmInferenceServiceConfigurations.getRowByName('vllm-tpu').shouldHaveUnsupportedLabel(true);
  });

  it('should disable a config by toggling off', () => {
    interceptLlmInferenceServiceConfigPatch('vllm-cuda');
    llmInferenceServiceConfigurations.getRowByName('vllm-cuda').findEnabledToggle().click();

    cy.wait('@patchConfig').then((interception) => {
      const body = interception.request.body as { op: string; path: string; value: string }[];
      expect(body).to.containSubset([
        { path: '/metadata/annotations/opendatahub.io~1disabled', value: 'true' },
      ]);
    });
  });

  it('should show acceptance modal when toggling on an unsupported unaccepted config', () => {
    unsupportedStatusAcceptanceModal.shouldNotExist();

    llmInferenceServiceConfigurations.getRowByName('vllm-tpu').findEnabledToggle().click();

    unsupportedStatusAcceptanceModal.shouldBeOpen();
    unsupportedStatusAcceptanceModal
      .find()
      .should('contain.text', 'Enable limited-support inference service configuration?');
  });

  it('should dismiss modal without patching when cancel is clicked', () => {
    llmInferenceServiceConfigurations.getRowByName('vllm-tpu').findEnabledToggle().click();
    unsupportedStatusAcceptanceModal.shouldBeOpen();

    unsupportedStatusAcceptanceModal.findCancelButton().click();

    unsupportedStatusAcceptanceModal.shouldNotExist();
  });

  it('should patch config when accept is clicked on unsupported modal', () => {
    interceptLlmInferenceServiceConfigPatch('vllm-tpu');
    llmInferenceServiceConfigurations.getRowByName('vllm-tpu').findEnabledToggle().click();
    unsupportedStatusAcceptanceModal.shouldBeOpen();

    unsupportedStatusAcceptanceModal.findAcceptButton().should('be.disabled');
    unsupportedStatusAcceptanceModal.findAcceptanceCheckbox().click();
    unsupportedStatusAcceptanceModal.findAcceptButton().click();

    cy.wait('@patchConfig').then((interception) => {
      const body = interception.request.body as { op: string; path: string; value: string }[];
      expect(body).to.containSubset([
        {
          path: '/metadata/annotations/opendatahub.io~1unsupported-status-accepted',
          value: 'true',
        },
        { path: '/metadata/annotations/opendatahub.io~1disabled', value: 'false' },
      ]);
    });
    unsupportedStatusAcceptanceModal.shouldNotExist();
  });

  it('should toggle already-accepted unsupported config normally without modal', () => {
    interceptLlmInferenceServiceConfigPatch('vllm-gaudi');
    llmInferenceServiceConfigurations.getRowByName('vllm-gaudi').shouldBeEnabled(false);

    llmInferenceServiceConfigurations.getRowByName('vllm-gaudi').findEnabledToggle().click();

    cy.wait('@patchConfig').then((interception) => {
      const body = interception.request.body as { op: string; path: string; value: string }[];
      expect(body).to.containSubset([
        { path: '/metadata/annotations/opendatahub.io~1disabled', value: 'false' },
      ]);
    });
    unsupportedStatusAcceptanceModal.shouldNotExist();
  });
});
