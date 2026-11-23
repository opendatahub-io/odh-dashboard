import * as yaml from 'js-yaml';
import { createCleanProject, cleanupTestProject } from '../../../utils/projectChecker';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { dataConnectHubConnectionsPage } from '../../../pages/dataConnectHub/connectionsPage';
import { isDataConnectHubBackendAvailable } from '../../../utils/oc_commands/dataConnectHub';
import { ensureAdminOcSession } from '../../../utils/oc_commands/baseCommands';

describe('Data Connect Hub Pages Load E2E', () => {
  const projectName = `dch-e2e-${generateTestUUID()}`;
  let dataConnectHubBackendAvailable = false;
  let testData: Record<string, string>;

  before(() => {
    cy.fixture('e2e/dataConnectHub/testDataConnectHubPagesLoad.yaml', 'utf8').then(
      (yamlContent: string) => {
        testData = yaml.load(yamlContent) as Record<string, string>;
      },
    );
    ensureAdminOcSession();
    isDataConnectHubBackendAvailable().then((backendAvailable) => {
      dataConnectHubBackendAvailable = backendAvailable;
      if (backendAvailable) {
        createCleanProject(projectName);
      }
    });
  });

  after(() => {
    if (dataConnectHubBackendAvailable) {
      cleanupTestProject(projectName);
    }
  });

  it(
    'Loads the connection types and connections pages',
    {
      tags: ['@DataConnectHub', '@DataConnectHubCI', '@Featureflagged'],
      retries: { runMode: 0, openMode: 0 },
    },
    () => {
      cy.step('Load the connection types page');
      dataConnectHubConnectionsPage.visitConnectionTypes(projectName);
      dataConnectHubConnectionsPage.findPageTitle().should('have.text', testData.pageTitle);
      dataConnectHubConnectionsPage.shouldBeOnRoute('connection-types');

      cy.step('Verify the Data Connect Hub navigation item');
      dataConnectHubConnectionsPage
        .findNavItem(testData.navItem, testData.navSection)
        .should('be.visible');

      cy.step('Load the connections page');
      dataConnectHubConnectionsPage.visitConnections(projectName);
      dataConnectHubConnectionsPage.findPageTitle().should('have.text', testData.pageTitle);
      dataConnectHubConnectionsPage.shouldBeOnRoute('connections');
    },
  );

  it(
    'Loads Data Connect Hub tab content',
    {
      tags: ['@DataConnectHub', '@DataConnectHubCI', '@Featureflagged'],
      retries: { runMode: 0, openMode: 0 },
    },
    function verifyDataConnectHubContent() {
      if (!dataConnectHubBackendAvailable) {
        Cypress.log({
          name: 'skip',
          message: 'Data Connect Hub backend is unavailable',
        });
        this.skip();
      }

      cy.step('Load the connection types content');
      dataConnectHubConnectionsPage.visitConnectionTypes(projectName);
      dataConnectHubConnectionsPage
        .findTab('connection-types')
        .should('have.attr', 'aria-selected', 'true');
      dataConnectHubConnectionsPage.findConnectionTypesDescription().should('be.visible');

      cy.step('Load the connections content');
      dataConnectHubConnectionsPage.findTab('connections').click();
      dataConnectHubConnectionsPage.shouldBeOnRoute('connections');
      dataConnectHubConnectionsPage.findConnectionsEmptyState().should('be.visible');
    },
  );
});
