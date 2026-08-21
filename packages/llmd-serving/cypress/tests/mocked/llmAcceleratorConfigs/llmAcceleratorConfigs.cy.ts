import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import {
  llmAcceleratorConfigurations,
  unsupportedStatusAcceptanceModal,
} from '@odh-dashboard/cypress/cypress/pages/modelDeploymentSettings/llmAcceleratorConfigurations';
import {
  asProductAdminUser,
  asProjectAdminUser,
} from '@odh-dashboard/cypress/cypress/utils/mockUsers';
import { pageNotfound } from '@odh-dashboard/cypress/cypress/pages/pageNotFound';
import {
  llmAcceleratorConfigsIntercept,
  interceptLlmAcceleratorConfigPatch,
} from './llmAcceleratorConfigsUtils';

it('LLM accelerator configurations should not be available for non product admins', () => {
  asProjectAdminUser();
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ vLLMDeploymentOnMaaS: true }));
  llmAcceleratorConfigurations.visit(false);
  pageNotfound.findPage().should('exist');
  llmAcceleratorConfigurations.findNavItem().should('not.exist');
});

it('LLM accelerator configurations tab should not be available when vLLMDeploymentOnMaaS is disabled', () => {
  asProductAdminUser();
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ vLLMDeploymentOnMaaS: false }));
  llmAcceleratorConfigurations.visit(false);
  // The parent tabbed page still renders (other tabs are visible), but the accelerator
  // tab is hidden. TabRoutePage redirects to the first available tab.
  llmAcceleratorConfigurations
    .findTabPageTitle()
    .should('contain.text', 'Model deployment settings');
  llmAcceleratorConfigurations.findTab().should('not.exist');
});

describe('LLM accelerator configurations', () => {
  beforeEach(() => {
    asProductAdminUser();
    llmAcceleratorConfigsIntercept();

    llmAcceleratorConfigurations.visit();
  });

  it('should render the page with configs from the API', () => {
    llmAcceleratorConfigurations.findNavItem().should('exist');
    llmAcceleratorConfigurations.getRowByName('vllm-cuda').find().should('exist');
    llmAcceleratorConfigurations.getRowByName('vllm-rocm').find().should('exist');
    llmAcceleratorConfigurations.getRowByName('vllm-cpu').find().should('exist');
    llmAcceleratorConfigurations.getRowByName('vllm-tpu').find().should('exist');
    llmAcceleratorConfigurations.getRowByName('vllm-gaudi').find().should('exist');
  });

  it('should show enabled toggle ON for enabled config and OFF for disabled config', () => {
    llmAcceleratorConfigurations.getRowByName('vllm-cuda').shouldBeEnabled(true);
    llmAcceleratorConfigurations.getRowByName('vllm-cpu').shouldBeEnabled(false);
  });

  it('should show toggle OFF for unsupported unaccepted config', () => {
    llmAcceleratorConfigurations.getRowByName('vllm-tpu').shouldBeEnabled(false);
    llmAcceleratorConfigurations.getRowByName('vllm-tpu').shouldHaveUnsupportedLabel(true);
  });

  it('should disable a config by toggling off', () => {
    interceptLlmAcceleratorConfigPatch('vllm-cuda');
    llmAcceleratorConfigurations.getRowByName('vllm-cuda').findEnabledToggle().click();

    cy.wait('@patchConfig').then((interception) => {
      const body = interception.request.body as { op: string; path: string; value: string }[];
      expect(body).to.containSubset([
        { path: '/metadata/annotations/opendatahub.io~1disabled', value: 'true' },
      ]);
    });
  });

  it('should show acceptance modal when toggling on an unsupported unaccepted config', () => {
    unsupportedStatusAcceptanceModal.shouldNotExist();

    llmAcceleratorConfigurations.getRowByName('vllm-tpu').findEnabledToggle().click();

    unsupportedStatusAcceptanceModal.shouldBeOpen();
    unsupportedStatusAcceptanceModal
      .find()
      .should('contain.text', 'Enable limited-support accelerator configuration?');
  });

  it('should dismiss modal without patching when cancel is clicked', () => {
    llmAcceleratorConfigurations.getRowByName('vllm-tpu').findEnabledToggle().click();
    unsupportedStatusAcceptanceModal.shouldBeOpen();

    unsupportedStatusAcceptanceModal.findCancelButton().click();

    unsupportedStatusAcceptanceModal.shouldNotExist();
  });

  it('should patch config when accept is clicked on unsupported modal', () => {
    interceptLlmAcceleratorConfigPatch('vllm-tpu');
    llmAcceleratorConfigurations.getRowByName('vllm-tpu').findEnabledToggle().click();
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
    interceptLlmAcceleratorConfigPatch('vllm-gaudi');
    llmAcceleratorConfigurations.getRowByName('vllm-gaudi').shouldBeEnabled(false);

    llmAcceleratorConfigurations.getRowByName('vllm-gaudi').findEnabledToggle().click();

    cy.wait('@patchConfig').then((interception) => {
      const body = interception.request.body as { op: string; path: string; value: string }[];
      expect(body).to.containSubset([
        { path: '/metadata/annotations/opendatahub.io~1disabled', value: 'false' },
      ]);
    });
    unsupportedStatusAcceptanceModal.shouldNotExist();
  });
});
