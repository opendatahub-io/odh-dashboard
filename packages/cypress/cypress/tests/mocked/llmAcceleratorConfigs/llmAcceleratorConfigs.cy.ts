import {
  llmAcceleratorConfigsIntercept,
  interceptLlmAcceleratorConfigPatch,
} from './llmAcceleratorConfigsUtils';
import {
  llmAcceleratorConfigs,
  unsupportedStatusAcceptanceModal,
} from '../../../pages/llmAcceleratorConfigs';
import { asProductAdminUser, asProjectAdminUser } from '../../../utils/mockUsers';
import { pageNotfound } from '../../../pages/pageNotFound';

it('LLM accelerator configurations should not be available for non product admins', () => {
  asProjectAdminUser();
  llmAcceleratorConfigs.visit(false);
  pageNotfound.findPage().should('exist');
  llmAcceleratorConfigs.findNavItem().should('not.exist');
});

describe('LLM accelerator configurations', () => {
  beforeEach(() => {
    asProductAdminUser();
    llmAcceleratorConfigsIntercept();

    llmAcceleratorConfigs.visit();
  });

  it('should render the page with configs from the API', () => {
    llmAcceleratorConfigs.findNavItem().should('exist');
    llmAcceleratorConfigs.getRowByName('vllm-cuda').find().should('exist');
    llmAcceleratorConfigs.getRowByName('vllm-rocm').find().should('exist');
    llmAcceleratorConfigs.getRowByName('vllm-cpu').find().should('exist');
    llmAcceleratorConfigs.getRowByName('vllm-tpu').find().should('exist');
    llmAcceleratorConfigs.getRowByName('vllm-gaudi').find().should('exist');
  });

  it('should show enabled toggle ON for enabled config and OFF for disabled config', () => {
    llmAcceleratorConfigs.getRowByName('vllm-cuda').shouldBeEnabled(true);
    llmAcceleratorConfigs.getRowByName('vllm-cpu').shouldBeEnabled(false);
  });

  it('should show toggle OFF for unsupported unaccepted config', () => {
    llmAcceleratorConfigs.getRowByName('vllm-tpu').shouldBeEnabled(false);
    llmAcceleratorConfigs.getRowByName('vllm-tpu').shouldHaveUnsupportedLabel(true);
  });

  it('should disable a config by toggling off', () => {
    interceptLlmAcceleratorConfigPatch('vllm-cuda');
    llmAcceleratorConfigs.getRowByName('vllm-cuda').findEnabledToggle().click();

    cy.wait('@patchConfig').then((interception) => {
      const body = interception.request.body as { op: string; path: string; value: string }[];
      expect(body).to.containSubset([
        { path: '/metadata/annotations/opendatahub.io~1disabled', value: 'true' },
      ]);
    });
  });

  it('should show acceptance modal when toggling on an unsupported unaccepted config', () => {
    unsupportedStatusAcceptanceModal.shouldNotExist();

    llmAcceleratorConfigs.getRowByName('vllm-tpu').findEnabledToggle().click();

    unsupportedStatusAcceptanceModal.shouldBeOpen();
    unsupportedStatusAcceptanceModal
      .find()
      .should('contain.text', 'Enable limited-support accelerator configuration?');
  });

  it('should dismiss modal without patching when cancel is clicked', () => {
    llmAcceleratorConfigs.getRowByName('vllm-tpu').findEnabledToggle().click();
    unsupportedStatusAcceptanceModal.shouldBeOpen();

    unsupportedStatusAcceptanceModal.findCancelButton().click();

    unsupportedStatusAcceptanceModal.shouldNotExist();
  });

  it('should patch config when accept is clicked on unsupported modal', () => {
    interceptLlmAcceleratorConfigPatch('vllm-tpu');
    llmAcceleratorConfigs.getRowByName('vllm-tpu').findEnabledToggle().click();
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
    llmAcceleratorConfigs.getRowByName('vllm-gaudi').shouldBeEnabled(false);

    llmAcceleratorConfigs.getRowByName('vllm-gaudi').findEnabledToggle().click();

    cy.wait('@patchConfig').then((interception) => {
      const body = interception.request.body as { op: string; path: string; value: string }[];
      expect(body).to.containSubset([
        { path: '/metadata/annotations/opendatahub.io~1disabled', value: 'false' },
      ]);
    });
    unsupportedStatusAcceptanceModal.shouldNotExist();
  });
});
