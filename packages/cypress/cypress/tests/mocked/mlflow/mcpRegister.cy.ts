import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockDsciStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDsciStatus';
import { mockMcpServerCR } from '@odh-dashboard/model-registry/mocks/mockMcpDeployment';
import { toastNotifications } from '../../../pages/components/ToastNotifications';
import { mcpRegisterModal, mcpRegisterPage } from '../../../pages/mcpRegister';
import { asProductAdminUser } from '../../../utils/mockUsers';
import { interceptMlflowStatus } from '../../../utils/mlflowUtils';
import { ProjectModel } from '../../../utils/models';

const BFF_PREFIX = '/model-registry/api/v1';
const MLFLOW_BFF_PREFIX = '/_bff/mlflow/api/v1';
const MODEL_REGISTRY_API_VERSION = 'v1';
const TEST_SERVER_ID = 'kubernetes-server-1';
const TEST_PROJECT = 'test-project';
const TEST_REGISTRY_NAME = 'kubernetes/mcp-server';

const catalogServer = {
  id: TEST_SERVER_ID,
  name: TEST_REGISTRY_NAME,
  displayName: 'Kubernetes MCP',
  toolCount: 1,
  repositoryUrl: 'https://github.com/kubernetes/mcp-server',
  // eslint-disable-next-line camelcase -- catalog wire key
  source_id: 'sample',
  serverJson: {
    name: TEST_REGISTRY_NAME,
    version: '1.0.0',
  },
};

const catalogTools = {
  items: [
    {
      serverId: TEST_SERVER_ID,
      tool: {
        name: 'list_pods',
        description: 'A test tool',
        accessType: 'read_only',
        parameters: [],
      },
    },
  ],
  size: 1,
  pageSize: 25,
  nextPageToken: '',
};

const initRegisterIntercepts = ({
  mcpRegistryEnabled = true,
  mlflowConfigured = true,
}: {
  mcpRegistryEnabled?: boolean;
  mlflowConfigured?: boolean;
} = {}) => {
  asProductAdminUser();

  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      mcpCatalog: true,
      mcpRegistry: mcpRegistryEnabled,
      disableModelRegistry: false,
    }),
  );

  cy.interceptOdh('GET /api/dsc/status', mockDscStatus({}));
  cy.interceptOdh('GET /api/dsci/status', mockDsciStatus({}));

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/user`,
    { path: { apiVersion: MODEL_REGISTRY_API_VERSION } },
    { data: { userId: 'user@example.com', clusterAdmin: true } },
  );

  cy.intercept('GET', `${BFF_PREFIX}/namespaces*`, {
    body: { data: [{ name: TEST_PROJECT }] },
  });

  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([
      mockProjectK8sResource({ k8sName: TEST_PROJECT, displayName: 'Test Project' }),
    ]),
  );

  interceptMlflowStatus(mlflowConfigured);

  cy.intercept('GET', `${BFF_PREFIX}/model_catalog/sources*`, {
    body: {
      data: {
        items: [
          {
            id: 'source-1',
            name: 'Community',
            labels: ['community'],
            status: 'available',
            enabled: true,
          },
        ],
        size: 1,
        pageSize: 10,
        nextPageToken: '',
      },
    },
  });

  cy.intercept('GET', `${BFF_PREFIX}/model_catalog/labels*`, {
    body: {
      data: {
        items: [{ name: 'community', displayName: 'Community', description: 'Community servers' }],
        size: 1,
        pageSize: 10,
        nextPageToken: '',
      },
    },
  });

  cy.intercept('GET', `${BFF_PREFIX}/mcp_catalog/mcp_servers_filter_options*`, {
    body: {
      data: {
        deploymentModes: ['local'],
        providers: ['Kubernetes'],
        transports: ['http'],
        tags: ['kubernetes'],
      },
    },
  });

  cy.intercept(
    {
      method: 'GET',
      url: new RegExp(`${BFF_PREFIX}/mcp_catalog/mcp_servers/${TEST_SERVER_ID}(\\?|$)`),
    },
    { body: { data: catalogServer } },
  );

  cy.intercept('GET', `${BFF_PREFIX}/mcp_catalog/mcp_servers/${TEST_SERVER_ID}/tools*`, {
    body: { data: catalogTools },
  });

  cy.intercept('GET', `${BFF_PREFIX}/mcp_catalog/mcp_servers/${TEST_SERVER_ID}/mcpserver*`, {
    body: { data: mockMcpServerCR() },
  });

  cy.intercept('GET', `${MLFLOW_BFF_PREFIX}/mcp-catalog/servers/${TEST_SERVER_ID}/tools*`, {
    body: { data: catalogTools },
  });

  cy.intercept('GET', `${MLFLOW_BFF_PREFIX}/mcp-catalog/servers/${TEST_SERVER_ID}/mcpserver*`, {
    body: { data: mockMcpServerCR() },
  });
};

describe('MCP Register from Catalog', () => {
  it('should hide the register button when the MCP Registry area is disabled', () => {
    initRegisterIntercepts({ mcpRegistryEnabled: false });

    mcpRegisterPage.visit(TEST_SERVER_ID);

    mcpRegisterPage.findBreadcrumbServerName().should('contain.text', 'Kubernetes MCP');
    mcpRegisterPage.findRegisterButton().should('not.exist');
  });

  it('should show a disabled register button when MLflow is not configured', () => {
    initRegisterIntercepts({ mlflowConfigured: false });

    mcpRegisterPage.visit(TEST_SERVER_ID);

    mcpRegisterPage
      .findRegisterButton()
      .should('be.visible')
      .and('have.attr', 'aria-disabled', 'true')
      .trigger('mouseenter');

    mcpRegisterPage.findTooltip().should('contain.text', 'MLflow is not available on this cluster');
  });

  it('should open the register modal with catalog data and keep Register disabled until a project is selected', () => {
    initRegisterIntercepts();

    mcpRegisterPage.visit(TEST_SERVER_ID);

    mcpRegisterPage
      .findRegisterButton()
      .should('be.visible')
      .and('not.have.attr', 'aria-disabled', 'true')
      .click();

    mcpRegisterModal.shouldBeOpen();
    mcpRegisterModal.findTitle().should('contain.text', 'Register MCP server');
    mcpRegisterModal.findDisplayName().should('have.value', 'Kubernetes MCP');
    mcpRegisterModal.findSource().should('have.value', 'https://github.com/kubernetes/mcp-server');
    mcpRegisterModal.findTagKey().should('have.value', 'catalog.source.id');
    mcpRegisterModal.findTagValue().should('have.value', 'sample');
    mcpRegisterModal.findSubmitButton().should('be.disabled');
  });

  it('should register the server, toast success, and navigate to the registry details page', () => {
    initRegisterIntercepts();

    cy.intercept('POST', `${MLFLOW_BFF_PREFIX}/mcp-registry/register*`, (req) => {
      expect(req.url).to.include(`workspace=${encodeURIComponent(TEST_PROJECT)}`);
      const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      expect(payload).to.include({ name: TEST_REGISTRY_NAME });
      expect(payload.server_json).to.include({ name: TEST_REGISTRY_NAME, version: '1.0.0' });
      req.reply({
        statusCode: 201,
        body: {
          data: {
            version: {
              name: TEST_REGISTRY_NAME,
              version: '1.0.0',
            },
          },
        },
      });
    }).as('registerMcpServer');

    mcpRegisterPage.visit(TEST_SERVER_ID);

    mcpRegisterPage
      .findRegisterButton()
      .should('be.visible')
      .and('not.have.attr', 'aria-disabled', 'true')
      .click();
    mcpRegisterModal.shouldBeOpen();
    mcpRegisterModal.selectProject('Test Project');
    mcpRegisterModal.findSubmitButton().should('not.be.disabled').click();
    mcpRegisterModal.waitForRegister();

    toastNotifications
      .findToastNotification(0)
      .should('contain.text', `Registered as ${TEST_REGISTRY_NAME} v1.0.0`);
    mcpRegisterPage.shouldBeOnRegistryDetails('kubernetes%2Fmcp-server', TEST_PROJECT);
  });
});
