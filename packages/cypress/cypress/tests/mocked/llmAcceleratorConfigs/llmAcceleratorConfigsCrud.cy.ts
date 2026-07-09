import {
  llmAcceleratorConfigsIntercept,
  interceptLlmAcceleratorConfigCreate,
  interceptLlmAcceleratorConfigUpdate,
  interceptLlmAcceleratorConfigDelete,
} from './llmAcceleratorConfigsUtils';
import { llmAcceleratorConfigs } from '../../../pages/llmAcceleratorConfigs';
import { asProductAdminUser } from '../../../utils/mockUsers';
import { deleteModal } from '../../../pages/components/DeleteModal';

describe('LLM accelerator configurations CRUD operations', () => {
  beforeEach(() => {
    asProductAdminUser();
    llmAcceleratorConfigsIntercept();
    llmAcceleratorConfigs.visit();
  });

  describe('Navigation flows', () => {
    it('should navigate to add form when clicking Add button', () => {
      llmAcceleratorConfigs.findAddButton().click();
      cy.url().should(
        'include',
        '/settings/model-resources-operations/llm-accelerator-configs/add',
      );
      llmAcceleratorConfigs.findAppTitle().should('have.text', 'Add LLM accelerator configuration');
    });

    it('should navigate to edit form when clicking Edit action', () => {
      llmAcceleratorConfigs.getRowByName('vllm-cuda').find().findKebabAction('Edit').click();
      cy.url().should(
        'include',
        '/settings/model-resources-operations/llm-accelerator-configs/edit/vllm-cuda',
      );
      llmAcceleratorConfigs.findAppTitle().should('have.text', 'Edit vLLM CUDA Accelerator');
    });

    it('should navigate to duplicate form when clicking Duplicate action', () => {
      llmAcceleratorConfigs.getRowByName('vllm-cuda').find().findKebabAction('Duplicate').click();
      cy.url().should(
        'include',
        '/settings/model-resources-operations/llm-accelerator-configs/duplicate/vllm-cuda',
      );
      llmAcceleratorConfigs
        .findAppTitle()
        .should('have.text', 'Duplicate LLM accelerator configuration');
    });

    it('should reload edit form and preserve inputs', () => {
      llmAcceleratorConfigs.getRowByName('vllm-cuda').find().findKebabAction('Edit').click();
      llmAcceleratorConfigs.findNameInput().should('have.value', 'vLLM CUDA Accelerator');

      cy.reload();

      llmAcceleratorConfigs.findNameInput().should('have.value', 'vLLM CUDA Accelerator');
    });

    it('should reload duplicate form and preserve inputs', () => {
      llmAcceleratorConfigs.getRowByName('vllm-cuda').find().findKebabAction('Duplicate').click();
      llmAcceleratorConfigs.findNameInput().should('have.value', 'Copy of vLLM CUDA Accelerator');

      cy.reload();

      llmAcceleratorConfigs.findNameInput().should('have.value', 'Copy of vLLM CUDA Accelerator');
    });
  });

  describe('API operations', () => {
    it('should create a new config', () => {
      interceptLlmAcceleratorConfigCreate();

      llmAcceleratorConfigs.findAddButton().click();
      llmAcceleratorConfigs.findNameInput().type('New Config');
      llmAcceleratorConfigs.findVersionInput().type('v1.0.0');
      llmAcceleratorConfigs.setYamlEditorContent('metadata:\n  name: placeholder');

      llmAcceleratorConfigs.findSubmitButton().click();

      cy.wait('@createConfig').then((interception) => {
        expect(interception.request.body.metadata).to.include({
          name: 'new-config',
        });
        expect(interception.request.body.metadata.labels).to.include({
          'opendatahub.io/dashboard': 'true',
        });
      });
    });

    it('should update an existing config', () => {
      interceptLlmAcceleratorConfigUpdate('vllm-cuda');

      llmAcceleratorConfigs.getRowByName('vllm-cuda').find().findKebabAction('Edit').click();
      llmAcceleratorConfigs.findNameInput().clear().type('Updated CUDA');
      llmAcceleratorConfigs.findSubmitButton().click();

      cy.wait('@updateConfig').then((interception) => {
        expect(interception.request.body.metadata.annotations).to.include({
          'openshift.io/display-name': 'Updated CUDA',
        });
      });
    });

    it('should delete a config', () => {
      interceptLlmAcceleratorConfigDelete('vllm-cuda');

      llmAcceleratorConfigs.getRowByName('vllm-cuda').find().findKebabAction('Delete').click();
      deleteModal.find().should('exist');
      deleteModal.findInput().type('vLLM CUDA Accelerator');
      deleteModal.findSubmitButton().click();

      cy.wait('@deleteConfig').then((interception) => {
        expect(interception.request.method).to.equal('DELETE');
      });
    });
  });
});
