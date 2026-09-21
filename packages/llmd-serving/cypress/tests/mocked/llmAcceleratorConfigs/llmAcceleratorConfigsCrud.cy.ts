import { llmAcceleratorConfigurations } from '@odh-dashboard/cypress/cypress/pages/modelDeploymentSettings/llmAcceleratorConfigurations';
import { asProductAdminUser } from '@odh-dashboard/cypress/cypress/utils/mockUsers';
import { deleteModal } from '@odh-dashboard/cypress/cypress/pages/components/DeleteModal';
import {
  llmAcceleratorConfigsIntercept,
  interceptLlmAcceleratorConfigCreate,
  interceptLlmAcceleratorConfigUpdate,
  interceptLlmAcceleratorConfigDelete,
} from './llmAcceleratorConfigsUtils';

describe('LLM accelerator configurations CRUD operations', () => {
  beforeEach(() => {
    asProductAdminUser();
    llmAcceleratorConfigsIntercept();
    llmAcceleratorConfigurations.visit();
  });

  describe('Navigation flows', () => {
    it('should navigate to add form when clicking Add button', () => {
      llmAcceleratorConfigurations.findAddButton().click();
      cy.url().should(
        'include',
        '/settings/model-resources-operations/model-deployment-settings/llm-accelerator-configurations/add',
      );
      llmAcceleratorConfigurations
        .findAppTitle()
        .should('have.text', 'Add LLM accelerator configuration');
      // The form is a full-page breakout route, not tab content: it must not render
      // beneath the tabbed page title and tab bar, which would give it two headings.
      llmAcceleratorConfigurations.findTabPageTitle().should('not.exist');
      llmAcceleratorConfigurations.findTab().should('not.exist');
    });

    it('should navigate to edit form when clicking Edit action', () => {
      llmAcceleratorConfigurations.getRowByName('vllm-cuda').find().findKebabAction('Edit').click();
      cy.url().should(
        'include',
        '/settings/model-resources-operations/model-deployment-settings/llm-accelerator-configurations/edit/vllm-cuda',
      );
      llmAcceleratorConfigurations.findAppTitle().should('have.text', 'Edit vLLM CUDA Accelerator');
    });

    it('should navigate to duplicate form when clicking Duplicate action', () => {
      llmAcceleratorConfigurations
        .getRowByName('vllm-cuda')
        .find()
        .findKebabAction('Duplicate')
        .click();
      cy.url().should(
        'include',
        '/settings/model-resources-operations/model-deployment-settings/llm-accelerator-configurations/duplicate/vllm-cuda',
      );
      llmAcceleratorConfigurations
        .findAppTitle()
        .should('have.text', 'Duplicate LLM accelerator configuration');
    });

    it('should reload edit form and preserve inputs', () => {
      llmAcceleratorConfigurations.getRowByName('vllm-cuda').find().findKebabAction('Edit').click();
      llmAcceleratorConfigurations.findNameInput().should('have.value', 'vLLM CUDA Accelerator');

      cy.reload();

      llmAcceleratorConfigurations.findNameInput().should('have.value', 'vLLM CUDA Accelerator');
    });

    it('should reload duplicate form and preserve inputs', () => {
      llmAcceleratorConfigurations
        .getRowByName('vllm-cuda')
        .find()
        .findKebabAction('Duplicate')
        .click();
      llmAcceleratorConfigurations
        .findNameInput()
        .should('have.value', 'Copy of vLLM CUDA Accelerator');

      cy.reload();

      llmAcceleratorConfigurations
        .findNameInput()
        .should('have.value', 'Copy of vLLM CUDA Accelerator');
    });

    it('should return to the accelerator list on cancel from add', () => {
      llmAcceleratorConfigurations.findAddButton().click();
      cy.url().should(
        'include',
        '/settings/model-resources-operations/model-deployment-settings/llm-accelerator-configurations/add',
      );
      llmAcceleratorConfigurations.findCancelButton().click();
      cy.url().should(
        'include',
        '/settings/model-resources-operations/model-deployment-settings/llm-accelerator-configurations',
      );
      llmAcceleratorConfigurations.getRowByName('vllm-cuda').find().should('exist');
    });
  });

  describe('API operations', () => {
    it('should create a new config', () => {
      interceptLlmAcceleratorConfigCreate();

      llmAcceleratorConfigurations.findAddButton().click();
      llmAcceleratorConfigurations.findNameInput().type('New Config');
      llmAcceleratorConfigurations.findVersionInput().type('v1.0.0');
      llmAcceleratorConfigurations.findYAMLCodeEditor().setValue('metadata:\n  name: placeholder');

      llmAcceleratorConfigurations.findSubmitButton().click();

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

      llmAcceleratorConfigurations.getRowByName('vllm-cuda').find().findKebabAction('Edit').click();
      llmAcceleratorConfigurations.findNameInput().clear().type('Updated CUDA');
      llmAcceleratorConfigurations.findSubmitButton().click();

      cy.wait('@updateConfig').then((interception) => {
        expect(interception.request.body.metadata.annotations).to.include({
          'openshift.io/display-name': 'Updated CUDA',
        });
      });
    });

    it('should delete a config', () => {
      interceptLlmAcceleratorConfigDelete('vllm-cuda');

      llmAcceleratorConfigurations
        .getRowByName('vllm-cuda')
        .find()
        .findKebabAction('Delete')
        .click();
      deleteModal.find().should('exist');
      deleteModal.findInput().type('vLLM CUDA Accelerator');
      deleteModal.findSubmitButton().click();

      cy.wait('@deleteConfig').then((interception) => {
        expect(interception.request.method).to.equal('DELETE');
      });
    });
  });
});
