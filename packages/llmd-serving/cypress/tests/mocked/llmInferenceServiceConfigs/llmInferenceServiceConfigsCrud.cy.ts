import { llmInferenceServiceConfigurations } from '@odh-dashboard/cypress/cypress/pages/modelDeploymentSettings/llmInferenceServiceConfigurations';
import { asProductAdminUser } from '@odh-dashboard/cypress/cypress/utils/mockUsers';
import { deleteModal } from '@odh-dashboard/cypress/cypress/pages/components/DeleteModal';
import {
  llmInferenceServiceConfigsIntercept,
  interceptLlmInferenceServiceConfigCreate,
  interceptLlmInferenceServiceConfigUpdate,
  interceptLlmInferenceServiceConfigDelete,
} from './llmInferenceServiceConfigsUtils';

describe('LLM inference service configurations CRUD operations', () => {
  beforeEach(() => {
    asProductAdminUser();
    llmInferenceServiceConfigsIntercept();
    llmInferenceServiceConfigurations.visit();
  });

  describe('Navigation flows', () => {
    it('should navigate to add form when clicking Add button', () => {
      llmInferenceServiceConfigurations.findAddButton().click();
      cy.url().should(
        'include',
        '/settings/model-resources-operations/model-deployment-settings/llm-inference-service-configurations/add',
      );
      llmInferenceServiceConfigurations
        .findAppTitle()
        .should('have.text', 'Add LLM inference service configuration');
      // The form is a full-page breakout route, not tab content: it must not render
      // beneath the tabbed page title and tab bar, which would give it two headings.
      llmInferenceServiceConfigurations.findTabPageTitle().should('not.exist');
      llmInferenceServiceConfigurations.findTab().should('not.exist');
    });

    it('should navigate to edit form when clicking Edit action', () => {
      llmInferenceServiceConfigurations
        .getRowByName('vllm-cuda')
        .find()
        .findKebabAction('Edit')
        .click();
      cy.url().should(
        'include',
        '/settings/model-resources-operations/model-deployment-settings/llm-inference-service-configurations/edit/vllm-cuda',
      );
      llmInferenceServiceConfigurations
        .findAppTitle()
        .should('have.text', 'Edit vLLM CUDA Accelerator');
    });

    it('should navigate to duplicate form when clicking Duplicate action', () => {
      llmInferenceServiceConfigurations
        .getRowByName('vllm-cuda')
        .find()
        .findKebabAction('Duplicate')
        .click();
      cy.url().should(
        'include',
        '/settings/model-resources-operations/model-deployment-settings/llm-inference-service-configurations/duplicate/vllm-cuda',
      );
      llmInferenceServiceConfigurations
        .findAppTitle()
        .should('have.text', 'Duplicate LLM inference service configuration');
    });

    it('should reload edit form and preserve inputs', () => {
      llmInferenceServiceConfigurations
        .getRowByName('vllm-cuda')
        .find()
        .findKebabAction('Edit')
        .click();
      llmInferenceServiceConfigurations
        .findNameInput()
        .should('have.value', 'vLLM CUDA Accelerator');

      cy.reload();

      llmInferenceServiceConfigurations
        .findNameInput()
        .should('have.value', 'vLLM CUDA Accelerator');
    });

    it('should reload duplicate form and preserve inputs', () => {
      llmInferenceServiceConfigurations
        .getRowByName('vllm-cuda')
        .find()
        .findKebabAction('Duplicate')
        .click();
      llmInferenceServiceConfigurations
        .findNameInput()
        .should('have.value', 'Copy of vLLM CUDA Accelerator');

      cy.reload();

      llmInferenceServiceConfigurations
        .findNameInput()
        .should('have.value', 'Copy of vLLM CUDA Accelerator');
    });

    it('should return to the inference service list on cancel from add', () => {
      llmInferenceServiceConfigurations.findAddButton().click();
      cy.url().should(
        'include',
        '/settings/model-resources-operations/model-deployment-settings/llm-inference-service-configurations/add',
      );
      llmInferenceServiceConfigurations.findCancelButton().click();
      cy.url().should(
        'include',
        '/settings/model-resources-operations/model-deployment-settings/llm-inference-service-configurations',
      );
      llmInferenceServiceConfigurations.getRowByName('vllm-cuda').find().should('exist');
    });
  });

  describe('API operations', () => {
    it('should create a new config', () => {
      interceptLlmInferenceServiceConfigCreate();

      llmInferenceServiceConfigurations.findAddButton().click();
      llmInferenceServiceConfigurations.findNameInput().type('New Config');
      llmInferenceServiceConfigurations.findVersionInput().type('v1.0.0');
      llmInferenceServiceConfigurations
        .findYAMLCodeEditor()
        .setValue('metadata:\n  name: placeholder');

      llmInferenceServiceConfigurations.findSubmitButton().click();

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
      interceptLlmInferenceServiceConfigUpdate('vllm-cuda');

      llmInferenceServiceConfigurations
        .getRowByName('vllm-cuda')
        .find()
        .findKebabAction('Edit')
        .click();
      llmInferenceServiceConfigurations.findNameInput().clear().type('Updated CUDA');
      llmInferenceServiceConfigurations.findSubmitButton().click();

      cy.wait('@updateConfig').then((interception) => {
        expect(interception.request.body.metadata.annotations).to.include({
          'openshift.io/display-name': 'Updated CUDA',
        });
      });
    });

    it('should delete a config', () => {
      interceptLlmInferenceServiceConfigDelete('vllm-cuda');

      llmInferenceServiceConfigurations
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
