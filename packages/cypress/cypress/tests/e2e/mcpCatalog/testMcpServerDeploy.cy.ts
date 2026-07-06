import * as yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import { createOpenShiftProject, deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import {
  setupMcpServerDeployResources,
  cleanupMcpServerDeployResources,
  verifyAndWaitForMcpDeployment,
} from '../../../utils/oc_commands/mcpServerDeploy';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import {
  mcpCatalogPage,
  mcpServerDetailsPage,
  mcpDeployModal,
  mcpDeploymentsPage,
} from '../../../pages/mcpCatalog';

describe('MCP Server Deploy from Catalog', () => {
  let testData: Record<string, string>;
  let projectName: string;
  let deploymentName: string;
  let clusterRoleBindingName: string;
  let expectedDeploymentStatus: string;
  let mcpServerId: string;
  const uuid = generateTestUUID();

  retryableBefore(() =>
    cy
      .fixture('e2e/mcpCatalog/testMcpServerDeploy.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as Record<string, string>;
        projectName = `${testData.projectName}-${uuid}`;
        deploymentName = `${testData.deploymentName}-${uuid}`;
        clusterRoleBindingName = `${testData.clusterRoleBindingName}-${uuid}`;
        expectedDeploymentStatus = testData.expectedDeploymentStatus;
        mcpServerId = testData.mcpServerId;
      })
      .then(() => createOpenShiftProject(projectName))
      .then(() =>
        setupMcpServerDeployResources(projectName, {
          serviceAccountName: testData.serviceAccountName,
          clusterRoleBindingName,
          configMapName: testData.configMapName,
        }),
      ),
  );

  after(() => {
    cleanupMcpServerDeployResources(clusterRoleBindingName);
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Deploy an MCP server from the catalog and verify it becomes available',
    { tags: ['@Dashboard', '@McpCatalog', '@Featureflagged'] },
    () => {
      cy.step('Login as admin user with mcpCatalog feature flag enabled');
      cy.visitWithLogin('/?devFeatureFlags=mcpCatalog=true', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to MCP Catalog');
      mcpCatalogPage.navigate();

      cy.step('Verify MCP catalog cards are visible');
      mcpCatalogPage.findMcpCatalogCards().should('have.length.at.least', 1);

      cy.step(`Open the details page for MCP server with ID ${mcpServerId}`);
      mcpCatalogPage.findCardDetailsLink(mcpServerId).should('be.visible').click();

      cy.step('Wait for the Deploy button to appear and click it');
      mcpServerDetailsPage.findDeployButton().should('be.visible');
      mcpServerDetailsPage.clickDeployButtonWithRetry();

      cy.step('Verify deploy modal is open');
      mcpDeployModal.find().should('be.visible');

      cy.step('Enter deployment name');
      mcpDeployModal.findNameInput().clear().type(deploymentName);

      cy.step('Select the target project namespace');
      mcpDeployModal.findProjectSelectorToggle().click();
      mcpDeployModal.findProjectSelectorOption(projectName).click();

      cy.step('Verify OCI image is pre-filled from the catalog');
      mcpDeployModal.findOciImageInput().should('not.have.value', '');

      cy.step('Submit the deployment');
      mcpDeployModal.findSubmitButton().should('be.enabled').click();

      cy.step('Verify redirect to MCP deployments page after deploy');
      mcpDeploymentsPage.findProjectSelectorToggle().should('be.visible');

      cy.step('Select the test project in the deployments page project selector');
      mcpDeploymentsPage.selectProject(projectName);

      cy.step('Wait for deployments table to load');
      mcpDeploymentsPage.findTable().should('exist');

      cy.step('Verify deployment row appears in the deployments list');
      mcpDeploymentsPage.findDeploymentByName(deploymentName).should('exist');

      cy.step('Verify MCPServer CR exists and wait for it to become Available');
      verifyAndWaitForMcpDeployment(projectName, deploymentName);

      cy.step('Reload and verify the deployment status shows Available in the UI');
      cy.reload();
      mcpDeploymentsPage.selectProject(projectName);
      mcpDeploymentsPage.findTable().should('exist');
      mcpDeploymentsPage
        .findDeploymentStatusLabelByName(deploymentName)
        .should('have.text', expectedDeploymentStatus);
    },
  );
});
