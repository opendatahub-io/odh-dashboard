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
  waitForResource,
  waitForPodReady,
  type PortForwardHandle,
} from '../../../utils/oc_commands/baseCommands';
import {
  enableExternalProviders,
  disableExternalProviders,
  waitForModelInLSD,
  forceDashboardConfigRefresh,
  ensureMCPServerConfigMapEntry,
  removeMCPServerConfigMapEntry,
  deployMCPServer,
  teardownMCPServer,
  registerMCPServerInRegistry,
  removeMCPServerFromRegistry,
} from '../../../utils/oc_commands/genAi';
import { enableMlflowBackend, disableMlflowFeatures } from '../../../utils/oc_commands/mlflow';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { CustomEndpointTestData } from '../../../types';
import { createCleanProject } from '../../../utils/projectChecker';
import { genAiPlayground } from '../../../pages/genAiPlayground';

const ALLOWED_ENDPOINT_HOSTS = ['generativelanguage.googleapis.com'];

describe('Verify MCP in playground using custom endpoint', { testIsolation: false }, () => {
  let testData: CustomEndpointTestData;
  let mcpServerUrl: string;
  let portForwardHandle: PortForwardHandle | null = null;
  /** Tracks whether a registry server was registered so after() can clean it up */
  let registeredRegistryServerName: string | null = null;
  const projectName = `custom-ep-mcp-${generateTestUUID()}`;

  retryableBefore(() => {
    cy.fixture('e2e/genAi/testGenAiSettingsSanity.yaml', 'utf8').then((yamlContent: string) => {
      testData = yaml.load(yamlContent) as CustomEndpointTestData;

      const apiKey = Cypress.env('GEMINI_API_KEY');
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not set in test-variables.yml — cannot run MCP tests');
      }

      cy.step('Enable externalProviders in OdhDashboardConfig');
      enableExternalProviders();

      cy.step(`Create project ${projectName}`);
      createCleanProject(projectName);
      waitForUserProjectAccess(projectName, HTPASSWD_CLUSTER_ADMIN_USER.USERNAME);

      cy.step('Enable MLflow backend');
      enableMlflowBackend();

      cy.step('Log into the application with custom endpoints and MCP enabled');
      cy.visitWithLogin(
        `/?devFeatureFlags=genAiStudio=true,aiAssetCustomEndpoints=true,promptManagement=true,guardrails=true,modelAsService=false`,
        HTPASSWD_CLUSTER_ADMIN_USER,
      );

      cy.step('Force backend to refresh config from cluster');
      forceDashboardConfigRefresh();

      cy.step('Deploy MCP server and register in ConfigMap');
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
    });
  });

  after(() => {
    stopPortForward(portForwardHandle);

    // Always clean up any registry server that was registered during the test run,
    // even if the registry test failed before reaching its own inline cleanup step.
    if (registeredRegistryServerName) {
      cy.step('Clean up registry server (post-test)');
      removeMCPServerFromRegistry(projectName, registeredRegistryServerName);
    }

    cy.step('Clean up MLflow CR');
    disableMlflowFeatures();

    cy.step('Remove MCP server entry from ConfigMap');
    removeMCPServerConfigMapEntry(testData.mcp.configMapName, testData.mcp.serverKey);

    cy.step('Tear down MCP server deployment');
    const mcpCrbName = `${testData.mcp.serverKey}-view-${projectName}`;
    teardownMCPServer(testData.mcp.namespace, mcpCrbName);

    cy.step('Revert externalProviders in OdhDashboardConfig');
    disableExternalProviders();

    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Create custom endpoint and wait for playground to be ready',
    {
      tags: ['@GenAI', '@FeatureFlagged', '@NonConcurrent'],
    },
    () => {
      cy.step('Navigate to AI asset endpoints page');
      genAiPlayground.navigateToAssetsWithGuardrailsAndPromptManagement(projectName);

      cy.step('Force backend to refresh config from cluster');
      forceDashboardConfigRefresh();

      cy.step('Click Create endpoint button from empty state');
      genAiPlayground
        .findEmptyStateCreateEndpointButton({ timeout: 30000 })
        .should('be.visible')
        .click();

      cy.step('Verify Create endpoint modal is open');
      genAiPlayground.findCreateExternalModelModal().should('be.visible');

      cy.step('Fill in Model ID');
      genAiPlayground.findModelIdInput().clear().type(testData.modelId);

      cy.step('Fill in Display name');
      genAiPlayground.findDisplayNameInput().clear().type(testData.displayName);

      cy.step('Fill in Endpoint URL');
      const endpointHost = new URL(testData.endpointUrl).hostname;
      expect(ALLOWED_ENDPOINT_HOSTS).to.include(
        endpointHost,
        `Fixture endpoint host "${endpointHost}" is not in the allowlist — refusing to send API key`,
      );
      genAiPlayground.findEndpointUrlInput().clear().type(testData.endpointUrl);

      cy.step('Fill in API key');
      genAiPlayground.findTokenInput().clear().type(Cypress.env('GEMINI_API_KEY'), { log: false });

      cy.step('Click Verify model button');
      genAiPlayground.findVerifyModelButton().should('be.enabled').click();

      cy.step('Verify model verification succeeds');
      genAiPlayground.findVerifySuccessAlert({ timeout: 30000 }).should('be.visible');

      cy.step('Click Create button to create the endpoint');
      genAiPlayground.findCreateEndpointSubmitButton().should('be.enabled').click();

      cy.step('Verify modal closes and model appears in AI Assets table');
      genAiPlayground.findCreateExternalModelModal().should('not.exist');
      genAiPlayground.findAiModelsTable().should('contain', testData.displayName);

      cy.step('Add endpoint to playground');
      genAiPlayground.findAddToPlaygroundButton().should('be.visible').click();
      genAiPlayground.findConfigurationTable().should('be.visible');
      genAiPlayground.ensureModelCheckboxIsChecked(testData.modelId);
      genAiPlayground.findCreateButtonInDialog().should('be.enabled').click();

      cy.step('Wait for OGX Server to be ready');
      waitForOGXServerReady(projectName);

      cy.step('Wait for playground service to be created');
      waitForResource('service', testData.lsdServiceName, projectName);

      cy.step('Wait for LSD pod to be fully ready');
      waitForPodReady(testData.lsdPodPrefix, testData.lsdPodReadyTimeout, projectName);

      cy.step('Wait for custom model to be registered in LSD');
      waitForModelInLSD(testData.lsdServiceName, testData.modelId, projectName);

      cy.step('Start port-forward for LSD service');
      startPortForward(projectName, testData.lsdServiceName, 8321).then((handle) => {
        portForwardHandle = handle;
      });
    },
  );

  it(
    'Verify Manual Connection — connect to ConfigMap MCP server and query from playground',
    {
      tags: ['@GenAI', '@FeatureFlagged', '@NonConcurrent'],
    },
    () => {
      cy.step('Navigate to playground');
      genAiPlayground.navigateToPlaygroundWithPromptManagementRetry(projectName);

      cy.step(`Select ${testData.displayName} model from dropdown`);
      genAiPlayground.selectModelFromDropdown(testData.displayName);
      genAiPlayground.verifyModelIsSelected(testData.displayName);

      cy.step('Open settings panel and navigate to MCP tab');
      genAiPlayground.openMCPTab();

      cy.step('Verify Manual Connection section is visible');
      genAiPlayground.findMCPManualSection().should('be.visible');
      genAiPlayground.findMCPManualToggle().should('contain.text', 'Manual Connection');

      cy.step(`Select and connect the MCP server`);
      genAiPlayground.findMCPServerRow(mcpServerUrl).should('be.visible');
      genAiPlayground.connectMCPServer(mcpServerUrl);

      cy.step(`Send MCP question and verify response`);
      genAiPlayground.sendAndVerifyMCPResponse(testData.mcp.testQuestion);
    },
  );

  it(
    'Verify MCP Registry — register server, verify Registered section, and query from playground',
    {
      tags: ['@GenAI', '@FeatureFlagged', '@NonConcurrent', '@MCPRegistry'],
    },
    () => {
      const registryServerName = 'io.kubernetes/mcp-server-e2e';
      registeredRegistryServerName = registryServerName;

      cy.step('Register the MCP server in the MLflow MCP Registry');
      registerMCPServerInRegistry(
        projectName,
        registryServerName,
        mcpServerUrl,
        testData.mcp.serverDescription,
      );

      // Fail fast if the BFF cannot reach the MLflow registry — the Registered section
      // will never render and we'd just time out on the DOM assertion.
      cy.step('Verify MLflow registry is accessible via BFF');
      cy.request(`/gen-ai/api/v1/aaa/mcps?namespace=${projectName}`).then((resp) => {
        cy.log(`[DEBUG] /aaa/mcps response: ${JSON.stringify(resp.body?.data)}`);
        const data = resp.body?.data;
        if (!data?.registry_available) {
          throw new Error(
            `MLflow registry is unreachable from the BFF ` +
              `(registry_available=${data?.registry_available}, ` +
              `error: "${data?.registry_error ?? 'unknown'}"). ` +
              `Check the mlflow-ui service connectivity.`,
          );
        }
      });

      cy.step('Navigate to playground with mcpRegistry flag enabled');
      genAiPlayground.navigateToPlaygroundWithMCPRegistry(projectName);

      cy.step('Open settings panel and navigate to MCP tab');
      genAiPlayground.openMCPTab();

      cy.step('Verify Registered section is visible');
      genAiPlayground.findMCPRegisteredSection().should('be.visible');
      genAiPlayground.findMCPRegisteredToggle().should('contain.text', 'Registered');
      genAiPlayground.findMCPRegisteredCountBadge().should('be.visible');

      cy.step('Select and connect the registry MCP server');
      const shortName = registryServerName.split('/').pop() ?? registryServerName;
      genAiPlayground.connectMCPServer(shortName);

      cy.step('Send MCP question and verify response');
      genAiPlayground.sendAndVerifyMCPResponse(testData.mcp.testQuestion);
    },
  );
});
