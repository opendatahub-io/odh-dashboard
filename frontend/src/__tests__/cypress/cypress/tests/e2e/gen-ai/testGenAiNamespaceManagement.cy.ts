import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import {
  verifyOpenShiftProjectExists,
  deleteOpenShiftProject,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/project';
import { checkInferenceServiceState } from '#~/__tests__/cypress/cypress/utils/oc_commands/modelServing';
import { checkLlamaStackDistributionReady } from '#~/__tests__/cypress/cypress/utils/oc_commands/llamaStackDistribution';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';
import {
  projectDetails,
  projectListPage,
  createProjectModal,
} from '#~/__tests__/cypress/cypress/pages/projects';
import {
  connectionsPage,
  addConnectionModal,
} from '#~/__tests__/cypress/cypress/pages/connections';
import {
  modelServingGlobal,
  modelServingSection,
  modelServingWizard,
} from '#~/__tests__/cypress/cypress/pages/modelServing';
import { genAiPlayground } from '#~/__tests__/cypress/cypress/pages/genAiPlayground';

const waitForResource = (
  resourceType: string,
  resourceName: string,
  namespace: string,
  maxAttempts = 30,
): Cypress.Chainable<Cypress.Exec> => {
  let attempts = 0;

  const check = (): Cypress.Chainable<Cypress.Exec> => {
    attempts++;
    return cy
      .exec(`oc get ${resourceType} ${resourceName} -n ${namespace}`, { failOnNonZeroExit: false })
      .then((result) => {
        if (result.code === 0) {
          cy.log(`✅ ${resourceType} ${resourceName} exists`);
          return cy.wrap(result);
        }

        if (attempts >= maxAttempts) {
          throw new Error(
            `${resourceType} ${resourceName} not found after ${maxAttempts} attempts`,
          );
        }

        cy.log(`⏳ Waiting for ${resourceType} ${resourceName} (attempt ${attempts})`);
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        return cy.wait(2000).then(() => check());
      });
  };

  return check();
};

describe('Verify Gen AI Namespace - Creation and Connection', () => {
  let projectName: string;
  const uuid = generateTestUUID();

  retryableBefore(() => {
    projectName = `gen-ai-test-${uuid}`;

    if (!projectName) {
      throw new Error('Project name is undefined or empty');
    }

    return verifyOpenShiftProjectExists(projectName).then((exists: boolean) => {
      if (exists) {
        return deleteOpenShiftProject(projectName);
      }
      return cy.wrap(null);
    });
  });

  after(() => {
    if (projectName) {
      deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
    }
  });

  it(
    'Create namespace and add URI connection for Gen AI model',
    {
      tags: ['@Sanity', '@SanitySet1', '@GenAI', '@Namespace', '@Connection'],
    },
    () => {
      // Ignore module federation loading errors (for clusters without Gen AI modules deployed)
      Cypress.on('uncaught:exception', (err) => {
        // Ignore SyntaxError from missing federated modules
        if (
          err.message.includes('expected expression') ||
          err.message.includes('Unexpected token')
        ) {
          return false;
        }
        return true;
      });

      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
      projectListPage.navigate();

      cy.step('Open Create Project modal');
      createProjectModal.shouldBeOpen(false);
      projectListPage.findCreateProjectButton().click();

      cy.step(`Create project: ${projectName}`);
      createProjectModal.k8sNameDescription.findDisplayNameInput().type(projectName);
      createProjectModal.k8sNameDescription
        .findDescriptionInput()
        .type('Gen AI Test Project for model connections');
      createProjectModal.findSubmitButton().click();

      cy.step(`Verify that the project ${projectName} has been created`);
      cy.url().should('include', `/projects/${projectName}`);
      projectDetails.verifyProjectName(projectName);

      cy.step('Set LlamaStack to Managed');
      cy.exec(
        `oc patch datasciencecluster default-dsc --type=merge -p '{"spec":{"components": {"llamastackoperator":{"managementState":"Managed"}}}}'`,
      );

      cy.step('Enable Gen AI Studio and Model as Service');
      cy.exec(
        `oc patch odhdashboardconfig odh-dashboard-config -n redhat-ods-applications --type merge -p '{"spec":{"dashboardConfig":{"genAiStudio":true, "modelAsService":true}}}'`,
      );

      cy.step('Navigate to Connections tab');
      projectDetails.findSectionTab('connections').click();

      cy.step('Click Create Connection button');
      connectionsPage.findCreateConnectionButton().click();

      cy.step('Create URI connection for Gen AI model');
      addConnectionModal.findConnectionTypeDropdown().click();
      cy.findByText('URI - v1').click();
      addConnectionModal.findConnectionNameInput().type('llama-3.2-1b-instruct');
      addConnectionModal
        .findConnectionDescriptionInput()
        .type('URI connection for Llama 3.2 1B Instruct model');
      cy.findByTestId('field URI').type(
        'oci://quay.io/redhat-ai-services/modelcar-catalog:llama-3.2-1b-instruct',
      );
      addConnectionModal.findCreateButton().click();

      cy.step('Verify connection was created successfully');
      connectionsPage.getConnectionRow('llama-3.2-1b-instruct').find().should('exist');

      cy.step('Navigate to Model Serving tab');
      projectDetails.findSectionTab('model-server').click();

      cy.step('Click Deploy Model button');
      modelServingGlobal.selectSingleServingModelButtonIfExists();
      modelServingGlobal.findDeployModelButton().click();

      cy.step('Configure model source with existing connection');
      modelServingWizard.findModelLocationSelect().should('be.visible').should('not.be.disabled');
      modelServingWizard.findModelLocationSelectOption('Existing connection').click();
      modelServingWizard.findExistingConnectionSelect().should('be.visible');
      modelServingWizard
        .findExistingConnectionValue()
        .should('be.visible')
        .should('have.value', 'llama-3.2-1b-instruct');
      modelServingWizard.findModelTypeSelect().should('be.visible').should('not.be.disabled');
      modelServingWizard.findModelTypeSelectOption('Generative AI model (Example, LLM)').click();
      modelServingWizard.findNextButton().click();

      cy.step('Configure model deployment details');
      modelServingWizard.findModelDeploymentNameInput().clear().type('llama-3.2-1b-instruct');

      cy.step('Select hardware profile');
      cy.findByTestId('hardware-profile-select').click();
      cy.findByRole('option', {
        name: (content) => content.includes('gpu-profile'),
      }).click();
      modelServingWizard.findNextButton().click();

      cy.step('Enable AI asset endpoint');
      modelServingWizard.findSaveAiAssetCheckbox().click();

      cy.step('Enable external route');
      modelServingWizard.findExternalRouteCheckbox().click();

      cy.step('Add serving runtime arguments');
      modelServingWizard.findRuntimeArgsCheckbox().should('exist').click();
      modelServingWizard.findRuntimeArgsTextBox().type(
        `--dtype=half
--gpu-memory-utilization=0.95
--enable-auto-tool-choice
--tool-call-parser=llama3_json
--chat-template=/opt/app-root/template/tool_chat_template_llama3.2_json.jinja`,
      );
      modelServingWizard.findNextButton().click();

      cy.step('Deploy model');
      cy.findByRole('button', { name: /Deploy model/i })
        .should('be.enabled')
        .click();

      cy.step('Wait for redirect after model deployment submission');
      cy.url().should('include', `/projects/${projectName}`);
      modelServingSection.findModelServerDeployedName('llama-3.2-1b-instruct');

      cy.step('Verify model deployment was created and started');
      waitForResource('inferenceService', 'llama-32-1b-instruct', projectName);
      checkInferenceServiceState('llama-32-1b-instruct', projectName, { checkReady: true });

      cy.step('Navigate to Gen AI Playground');
      cy.visit(`/gen-ai-studio/playground/${projectName}`);
      cy.url().should('include', `/gen-ai-studio/playground/${projectName}`);

      cy.step('Click Create playground button');
      cy.findByTestId('empty-state').should('exist');
      cy.findByRole('button', { name: 'Create playground' }).should('be.visible').click();

      cy.step('Wait for Configure playground modal to open');
      cy.findByRole('dialog', { name: /Configure playground/i }).should('be.visible');

      cy.step('Verify model is selected in the configuration table');
      cy.findByTestId('chatbot-configuration-table').should('exist');
      cy.findByTestId('chatbot-configuration-table')
        .find('tbody tr')
        .contains('llama-3.2-1b-instruct')
        .parents('tr')
        .within(() => {
          cy.get('input[type="checkbox"]').should('be.checked');
        });

      cy.step('Click Create button in the modal');
      cy.findByRole('dialog', { name: /Configure playground/i })
        .findByRole('button', { name: /^Create$/i })
        .should('be.enabled')
        .click();

      cy.step('Wait for llama-stack-config ConfigMap to be created');
      waitForResource('configmap', 'llama-stack-config', projectName);

      cy.step('Wait for LlamaStackDistribution to be ready');
      checkLlamaStackDistributionReady(projectName);

      cy.step('Navigate to playground URL');
      cy.visit(`/gen-ai-studio/playground/${projectName}`);
      cy.url().should('include', `/gen-ai-studio/playground/${projectName}`);

      cy.step('Ensure llama-3.2-1b-instruct model is selected');
      // Check if our model is in any visible button text (handles prefixes like vllm-inference-1/llama-3.2-1b-instruct)
      cy.get('body').then(($body) => {
        const hasOurModel = $body.find('button:visible').text().includes('llama-3.2-1b-instruct');

        if (!hasOurModel) {
          cy.log('Model not auto-selected, selecting manually');
          // Find the Model dropdown in the right panel (Model details section)
          cy.get('[data-ouia-component-type="PF6/MenuToggle"]').filter(':visible').first().click();
          // Select our model (cy.contains does substring match, so prefix doesn't matter)
          cy.contains('llama-3.2-1b-instruct').should('be.visible').click();
        } else {
          cy.log('Model already selected (possibly with prefix like vllm-inference-1/)');
        }
      });

      // Verify the model is now selected (regex handles any prefix)
      cy.findByRole('button', {
        name: /llama-3\.2-1b-instruct/i,
      }).should('be.visible');

      cy.step('Send a test message to the chatbot');
      const testQuestion = 'Where is New York?';
      genAiPlayground.findAllBotMessages().should('have.length', 1);

      cy.step('Verify message input is ready');
      genAiPlayground.findMessageInput().should('be.enabled').and('be.visible');
      genAiPlayground.sendMessage(testQuestion);

      cy.step('Verify user message appears in chat');
      cy.get('.pf-chatbot__message--user').should('exist').and('contain', testQuestion);

      cy.step('Wait for chatbot to generate response');
      genAiPlayground.findAllBotMessages().should('have.length.at.least', 2, { timeout: 60000 });

      cy.step('Wait for loading to complete');
      genAiPlayground
        .findBotMessageContent()
        .should('be.visible')
        .invoke('text')
        .should('not.contain', 'loading message');

      cy.step('Wait for chatbot response content to complete streaming');
      genAiPlayground
        .findBotMessageContent()
        .invoke('text')
        .should((text) => {
          const cleanText = text.trim().toLowerCase();
          expect(cleanText).to.have.length.greaterThan(20);
          expect(cleanText).to.not.contain('loading');
        });

      cy.step('Verify chatbot response contains United States or America');
      genAiPlayground
        .findBotMessageContent()
        .invoke('text')
        .then((text) => {
          const cleanText = text.trim();
          const lowerText = cleanText.toLowerCase();
          cy.log(`Chatbot response: ${cleanText}`);
          expect(lowerText).to.satisfy(
            (txt: string) => txt.includes('united states') || txt.includes('america'),
            'Response should mention United States or America',
          );
        });
    },
  );
});
