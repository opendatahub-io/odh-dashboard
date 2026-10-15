import * as yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import {
  deleteOpenShiftProject,
  waitForUserProjectAccess,
} from '../../../utils/oc_commands/project';
import { waitForOGXServerReady } from '../../../utils/oc_commands/ogxServer';
import {
  startPortForward,
  stopPortForward,
  waitForPodReady,
  waitForResource,
  type PortForwardHandle,
} from '../../../utils/oc_commands/baseCommands';
import {
  createGenAiPromptViaAPI,
  deleteGenAiPromptViaAPI,
  deployMCPServer,
  disableExternalProviders,
  enableExternalProviders,
  ensureMCPServerConfigMapEntry,
  forceDashboardConfigRefresh,
  removeMCPServerConfigMapEntry,
  teardownMCPServer,
  waitForModelInLSD,
} from '../../../utils/oc_commands/genAi';
import { disableMlflowFeatures, enableMlflowBackend } from '../../../utils/oc_commands/mlflow';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { CustomEndpointTestData } from '../../../types';
import {
  verifyAgentDeploymentResponsesAPI,
  waitForAgentDeploymentReady,
} from '../../../utils/agentDeployments';
import { createCleanProject } from '../../../utils/projectChecker';
import { genAiPlayground } from '../../../pages/genAiPlayground';

const ALLOWED_ENDPOINT_HOSTS = ['generativelanguage.googleapis.com'];

describe('Verify agent deployments using a custom endpoint', { testIsolation: false }, () => {
  let testData: CustomEndpointTestData;
  let mcpServerUrl: string;
  let portForwardHandle: PortForwardHandle | null = null;
  const projectName = `gen-ai-agent-e2e-${generateTestUUID()}`;
  const deploymentName = 'e2e-agent-deployment-1';

  retryableBefore(() => {
    if (portForwardHandle) {
      stopPortForward(portForwardHandle).then(() => {
        portForwardHandle = null;
      });
    }

    cy.fixture('e2e/genAi/testGenAiAgents.yaml', 'utf8').then((yamlContent: string) => {
      testData = yaml.load(yamlContent) as CustomEndpointTestData;

      if (!Cypress.env('GEMINI_API_KEY')) {
        throw new Error(
          'GEMINI_API_KEY is not set in test-variables.yml — cannot run agent deployment tests',
        );
      }

      cy.step('Enable external providers in OdhDashboardConfig');
      enableExternalProviders();

      cy.step(`Create project ${projectName}`);
      createCleanProject(projectName);
      waitForUserProjectAccess(projectName, HTPASSWD_CLUSTER_ADMIN_USER.USERNAME);

      cy.step('Enable MLflow backend for prompt management');
      enableMlflowBackend();

      cy.step('Log into the application with agent deployment features enabled');
      cy.visitWithLogin(
        '/?devFeatureFlags=genAiStudio=true,aiAssetCustomEndpoints=true,promptManagement=true,agentConfigManagement=true,genAiAgentDeployment=true,modelAsService=false',
        HTPASSWD_CLUSTER_ADMIN_USER,
      );

      cy.step('Force backend to refresh config from cluster');
      forceDashboardConfigRefresh();

      cy.step('Create the prompt used by the agent');
      createGenAiPromptViaAPI(
        projectName,
        testData.prompt.name,
        testData.prompt.template,
        testData.prompt.commitMessage,
      )
        .its('status')
        .should('be.oneOf', [200, 201]);

      cy.step('Deploy the MCP server used by the agent');
      const mcpCrbName = `${testData.mcp.serverKey}-view-${projectName}`;
      deployMCPServer(testData.mcp.namespace, testData.mcp.image, mcpCrbName).then((mcpUrl) => {
        mcpServerUrl = mcpUrl;
        ensureMCPServerConfigMapEntry(testData.mcp.configMapName, testData.mcp.serverKey, {
          url: mcpUrl,
          transport: 'streamable-http',
          description: testData.mcp.serverDescription,
          logo: '',
        });
        forceDashboardConfigRefresh();
      });

      cy.step('Create the Gemini custom endpoint');
      genAiPlayground.navigateToAssetsWithAgentDeployments(projectName);
      genAiPlayground
        .findEmptyStateCreateEndpointButton({ timeout: 30000 })
        .should('be.visible')
        .click();
      genAiPlayground.findCreateExternalModelModal().should('be.visible');
      genAiPlayground.findModelIdInput().clear().type(testData.modelId);
      genAiPlayground.findDisplayNameInput().clear().type(testData.displayName);

      const endpointHost = new URL(testData.endpointUrl).hostname;
      expect(ALLOWED_ENDPOINT_HOSTS).to.include(
        endpointHost,
        `Fixture endpoint host "${endpointHost}" is not in the allowlist — refusing to send API key`,
      );
      genAiPlayground.findEndpointUrlInput().clear().type(testData.endpointUrl);
      genAiPlayground.findTokenInput().clear().type(Cypress.env('GEMINI_API_KEY'), { log: false });
      genAiPlayground.findVerifyModelButton().should('be.enabled').click();
      genAiPlayground.findVerifySuccessAlert({ timeout: 30000 }).should('be.visible');
      genAiPlayground.findCreateEndpointSubmitButton().should('be.enabled').click();
      genAiPlayground.findCreateExternalModelModal().should('not.exist');

      cy.step('Create the playground with the Gemini endpoint and wait for OGX');
      genAiPlayground.findCreatePlaygroundButton({ timeout: 30000 }).should('be.visible').click();
      genAiPlayground.findConfigurationTable().should('be.visible');
      genAiPlayground.ensureModelCheckboxIsChecked(testData.modelId);
      genAiPlayground.findCreateButtonInDialog().should('be.enabled').click();
      waitForOGXServerReady(projectName);
      waitForResource('service', testData.lsdServiceName, projectName);
      waitForPodReady(testData.lsdPodPrefix, testData.lsdPodReadyTimeout, projectName);
      waitForModelInLSD(testData.lsdServiceName, testData.modelId, projectName);
      startPortForward(projectName, testData.lsdServiceName, 8321).then((handle) => {
        portForwardHandle = handle;
      });
    });
  });

  after(() => {
    stopPortForward(portForwardHandle);

    cy.step('Delete the prompt from MLflow');
    deleteGenAiPromptViaAPI(projectName, testData.prompt.name);

    cy.step('Clean up MLflow features');
    disableMlflowFeatures();

    cy.step('Remove MCP server entry from ConfigMap');
    removeMCPServerConfigMapEntry(testData.mcp.configMapName, testData.mcp.serverKey);

    cy.step('Tear down MCP server deployment');
    const mcpCrbName = `${testData.mcp.serverKey}-view-${projectName}`;
    teardownMCPServer(testData.mcp.namespace, mcpCrbName);

    cy.step('Revert external providers in OdhDashboardConfig');
    disableExternalProviders();

    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'saves and loads an agent with a Gemini endpoint, prompt, and MCP server',
    {
      tags: ['@GenAI', '@FeatureFlagged', '@GenAiAgent', '@NonConcurrent'],
    },
    () => {
      cy.step('Open the playground with agent deployment features enabled');
      genAiPlayground.navigateToPlaygroundWithAgentDeployments(projectName);
      genAiPlayground.selectModelFromDropdown(testData.displayName);
      genAiPlayground.verifyModelIsSelected(testData.displayName);

      cy.step('Load the saved prompt into the agent configuration');
      genAiPlayground.ensureSettingsPanelOpen();
      genAiPlayground.findSettingsPromptTab().should('be.visible').click();
      genAiPlayground.findLoadPromptButton().should('be.visible').click();
      genAiPlayground.findPromptManagementModal().should('exist');
      genAiPlayground.findPromptTableRow(testData.prompt.name).should('be.visible').click();
      genAiPlayground.findPromptLoadConfirmButton().should('be.enabled').click();
      genAiPlayground.findPromptNameTitle().should('contain', testData.prompt.name);

      cy.step('Connect the MCP server for the agent');
      genAiPlayground.openMCPTab();
      genAiPlayground.findMCPServerRow(mcpServerUrl).should('be.visible');
      genAiPlayground.connectMCPServer(mcpServerUrl);

      cy.step('Save the complete configuration as an agent');
      genAiPlayground.findSettingsPanelSaveAsButton().should('be.visible').click();
      genAiPlayground.findSaveAgentProfileModal().should('be.visible');
      genAiPlayground.findSaveAgentNameInput().clear().type(testData.agent.name);
      genAiPlayground.findSaveAgentDescriptionInput().clear().type(testData.agent.description);
      genAiPlayground.findSaveAgentSubmitButton().should('be.enabled').click();
      genAiPlayground.findSaveAgentProfileModal().should('not.exist');
      genAiPlayground.findAgentNameTitle().should('contain', testData.agent.name);

      cy.step('Load the saved agent and verify its configuration is restored');
      genAiPlayground.navigateToPlaygroundWithAgentDeployments(projectName);
      genAiPlayground.ensureSettingsPanelOpen();
      genAiPlayground.loadAgentByName(testData.agent.name);
      genAiPlayground.findAgentNameTitle().should('contain', testData.agent.name);
      genAiPlayground.verifyModelIsSelected(testData.displayName);
      genAiPlayground.openMCPTab();
      genAiPlayground.findMCPServerCheckbox(mcpServerUrl).should('be.checked');
      genAiPlayground.findSettingsPromptTab().should('be.visible').click();
      genAiPlayground.findPromptNameTitle().should('contain', testData.prompt.name);
    },
  );

  it(
    'deploys the saved agent and preserves its configuration snapshot',
    {
      tags: ['@GenAI', '@FeatureFlagged', '@GenAiAgent', '@NonConcurrent'],
    },
    () => {
      cy.step('Load the saved agent for deployment');
      genAiPlayground.navigateToPlaygroundWithAgentDeployments(projectName);
      genAiPlayground.ensureSettingsPanelOpen();
      genAiPlayground.loadAgentByName(testData.agent.name);

      cy.step('Open the deployment modal from the saved agent');
      genAiPlayground.findHeaderKebabMenuToggle().should('be.visible').click();
      genAiPlayground.findDeployAgentMenuItem().should('be.visible').click();
      genAiPlayground.findDeployAgentModal().should('be.visible');
      genAiPlayground.findDeployAgentNameInput().clear().type(deploymentName);
      genAiPlayground.findDeployAgentSubmitButton().should('be.enabled').click();

      cy.step('Wait for the Gen AI BFF to report the deployment ready');
      genAiPlayground.findDeployAgentModal().should('not.exist');
      waitForAgentDeploymentReady(projectName, deploymentName).then((deployment) =>
        cy
          .wrap(deployment.name)
          .as('agentDeploymentResourceName')
          .step('Send a request to the deployed agent Responses API')
          .then(() =>
            verifyAgentDeploymentResponsesAPI(
              `${deployment.routeUrl.replace(/\/$/, '')}/v1/responses`,
              testData.testMessage,
            ),
          ),
      );

      cy.step('Verify the deployed snapshot preserves the agent configuration');
      genAiPlayground.navigateToPlaygroundWithAgentDeployments(projectName);
      genAiPlayground.ensureSettingsPanelOpen();
      genAiPlayground.loadAgentByName(testData.agent.name);
      genAiPlayground.findHeaderKebabMenuToggle().should('be.visible').click();
      cy.get<string>('@agentDeploymentResourceName').then((deploymentResourceName) => {
        genAiPlayground
          .findAgentDeploymentMenuItem(deploymentResourceName)
          .should('be.visible')
          .click();
      });
      genAiPlayground.findAgentDeploymentsModal().should('be.visible');
      genAiPlayground
        .findAgentConfigurationCard()
        .should('contain', testData.displayName)
        .and('contain', testData.prompt.name)
        .and('contain', testData.mcp.serverKey);

      cy.step('Delete the deployment');
      genAiPlayground.findDeleteAgentDeploymentButton().should('be.visible').click();
      genAiPlayground.findDeleteAgentDeploymentModal().should('be.visible');
      genAiPlayground.findDeleteModalInput().type(deploymentName);
      genAiPlayground.findDeleteAgentDeploymentConfirmButton().should('be.enabled').click();
      genAiPlayground.findAgentDeploymentsModal().should('not.exist');

      cy.step('Delete the saved agent from AI Assets');
      genAiPlayground.navigateToAssetsWithAgentDeployments(projectName);
      genAiPlayground.findAgentsTab().should('be.visible').click();
      genAiPlayground.findAgentRowByName(testData.agent.name).should('be.visible');
      genAiPlayground.findAgentKebabByName(testData.agent.name).click();
      genAiPlayground.findDeleteAgentDropdownItem().should('be.visible').click();
      genAiPlayground.findDeleteAgentModal().should('be.visible');
      genAiPlayground.findDeleteAgentConfirmButton().should('be.enabled').click();

      cy.step('Verify the saved agent is no longer visible in AI Assets');
      genAiPlayground.findDeleteAgentModal().should('not.exist');
      genAiPlayground.findAgentProfilesEmptyState().should('be.visible');
    },
  );
});
