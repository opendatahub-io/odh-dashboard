import {
  mockDashboardConfig,
  mockDscStatus,
  mockK8sResourceList,
} from '@odh-dashboard/internal/__mocks__';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockDsciStatus } from '@odh-dashboard/internal/__mocks__/mockDsciStatus';
import { mcpServerDetailsPage } from '../../../pages/mcpDeployments';
import { mcpRegisterModal } from '../../../pages/mcpRegister';
import { toastNotifications } from '../../../pages/components/ToastNotifications';
import { asProductAdminUser } from '../../../utils/mockUsers';
import { mockMcpServerCR } from '../../../utils/mcpDeploymentUtils';
import { ProjectModel } from '../../../utils/models';
import { interceptMlflowStatus } from '../../../utils/mlflowUtils';

const BFF_PREFIX = '/model-registry/api/v1';
const MODEL_REGISTRY_API_VERSION = 'v1';
const MLFLOW_BFF_PREFIX = '/_bff/mlflow/api/v1/mcp-registry';

const TEST_SERVER_ID = 'kubernetes-server-1';
const TEST_SERVER_IMAGE = 'ghcr.io/kubernetes/mcp-server:latest';
const REGISTRY_NAME = 'kubernetes/mcp-server';
const REGISTRY_SERVER_PATH = `${MLFLOW_BFF_PREFIX}/servers/${REGISTRY_NAME}`;
const LOGO_URL = 'https://example.com/kubernetes-icon.svg';
const CATALOG_SOURCE_ID = 'source-1';

const initBaseIntercepts = ({
  mcpRegistry = true,
  mlflowConfigured = true,
}: {
  mcpRegistry?: boolean;
  mlflowConfigured?: boolean;
} = {}) => {
  asProductAdminUser();

  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({ mcpCatalog: true, mcpRegistry, disableModelRegistry: false }),
  );

  cy.interceptOdh('GET /api/dsc/status', mockDscStatus({}));

  cy.interceptOdh('GET /api/dsci/status', mockDsciStatus({}));

  interceptMlflowStatus(mlflowConfigured);

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/user`,
    { path: { apiVersion: MODEL_REGISTRY_API_VERSION } },
    { data: { userId: 'user@example.com', clusterAdmin: true } },
  );

  cy.intercept('GET', `${BFF_PREFIX}/namespaces*`, {
    body: { data: [{ name: 'test-project' }] },
  });

  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([
      mockProjectK8sResource({ k8sName: 'test-project', displayName: 'Test Project' }),
    ]),
  );
};

const initCatalogIntercepts = (serverOverrides: Record<string, unknown> = {}) => {
  cy.intercept('GET', `${BFF_PREFIX}/model_catalog/sources*`, {
    body: {
      data: {
        items: [
          {
            id: CATALOG_SOURCE_ID,
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

  cy.intercept('GET', `${BFF_PREFIX}/mcp_catalog/mcp_servers/${TEST_SERVER_ID}*`, {
    body: {
      data: {
        id: TEST_SERVER_ID,
        name: 'Kubernetes MCP',
        displayName: 'Kubernetes MCP',
        description: 'Control and inspect Kubernetes clusters.',
        deploymentMode: 'local',
        securityIndicators: { verifiedSource: true },
        source_id: CATALOG_SOURCE_ID, // eslint-disable-line camelcase
        toolCount: 0,
        provider: 'Kubernetes',
        artifacts: [{ uri: TEST_SERVER_IMAGE }],
        transports: ['http'],
        version: '1.0.0',
        repositoryUrl: 'https://github.com/kubernetes/mcp-server',
        ...serverOverrides,
      },
    },
  });

  cy.intercept('GET', `${BFF_PREFIX}/mcp_catalog/mcp_servers?*`, {
    body: {
      data: {
        items: [
          {
            id: TEST_SERVER_ID,
            name: 'Kubernetes MCP',
            description: 'Control and inspect Kubernetes clusters.',
            toolCount: 0,
            source_id: CATALOG_SOURCE_ID, // eslint-disable-line camelcase
          },
        ],
        size: 1,
        pageSize: 10,
        nextPageToken: '',
      },
    },
  });

  cy.intercept('GET', `${BFF_PREFIX}/mcp_catalog/mcp_servers/${TEST_SERVER_ID}/tools*`, {
    body: { data: { items: [], size: 0, pageSize: 10, nextPageToken: '' } },
  });

  cy.intercept('GET', `${BFF_PREFIX}/mcp_catalog/mcp_server_available*`, {
    body: { data: { available: true } },
  });

  cy.intercept('GET', `${BFF_PREFIX}/mcp_catalog/mcp_servers/${TEST_SERVER_ID}/mcpserver*`, {
    body: {
      data: mockMcpServerCR({
        spec: {
          source: { type: 'containerImage', containerImage: { ref: TEST_SERVER_IMAGE } },
          config: { port: 8080, path: '/sse' },
        },
      }),
    },
  }).as('getConverter');
};

const visitServerDetails = () => {
  cy.visitWithLogin(`/ai-hub/mcp-servers/catalog/${TEST_SERVER_ID}`);
};

const waitForConverter = () => {
  cy.wait('@getConverter');
};

const openRegisterModal = () => {
  visitServerDetails();
  waitForConverter();
  mcpServerDetailsPage
    .findRegisterButton()
    .should('be.visible')
    .and('not.have.attr', 'aria-disabled', 'true')
    .click();
  mcpRegisterModal.shouldBeOpen();
};

describe('MCP Catalog Register button', () => {
  it('should not render the Register button when MCP_REGISTRY is disabled', () => {
    initBaseIntercepts({ mcpRegistry: false });
    initCatalogIntercepts();
    visitServerDetails();
    mcpServerDetailsPage.findBreadcrumbServerName().should('contain.text', 'Kubernetes MCP');
    mcpServerDetailsPage.findRegisterButton().should('not.exist');
  });

  it('should disable the Register button when MLflow is not configured', () => {
    initBaseIntercepts({ mlflowConfigured: false });
    initCatalogIntercepts();
    visitServerDetails();
    waitForConverter();
    mcpServerDetailsPage
      .findRegisterButton()
      .should('be.visible')
      .and('have.attr', 'aria-disabled', 'true');
  });

  it('should open the modal with prefilled fields when MCP_REGISTRY is enabled', () => {
    initBaseIntercepts();
    initCatalogIntercepts({ logo: LOGO_URL, documentationUrl: 'https://example.com/docs' });
    openRegisterModal();

    mcpRegisterModal.findTitle().should('contain.text', 'Register MCP server');
    mcpRegisterModal.findDisplayNameInput().should('have.value', 'Kubernetes MCP');
    mcpRegisterModal
      .findSourceInput()
      .should('have.value', 'https://github.com/kubernetes/mcp-server');
    mcpRegisterModal.findIconUrlInput(0).should('have.value', LOGO_URL);
    cy.findByTestId('mcp-register-tags-table').should('be.visible');
    cy.findByTestId('mcp-register-tools').should('not.exist');

    const editor = mcpRegisterModal.findServerJsonEditor();
    editor.waitForReady();
    editor.containsText(REGISTRY_NAME);
    editor.containsText('com.redhat/deploy-spec');

    mcpRegisterModal.findSubmitButton().should('be.disabled');
  });

  it('should close the modal without registering anything', () => {
    initBaseIntercepts();
    initCatalogIntercepts();
    cy.intercept('POST', `${REGISTRY_SERVER_PATH}/versions*`).as('createVersion');
    openRegisterModal();

    mcpRegisterModal.findCloseButton().click();
    mcpRegisterModal.shouldNotExist();
    cy.get('@createVersion.all').should('have.length', 0);
  });

  it('should register via create-version then PATCH the display name and icons onto the server', () => {
    initBaseIntercepts();
    initCatalogIntercepts({
      logo: LOGO_URL,
      tools: [
        {
          name: 'list_pods',
          description: 'List pods in a namespace',
          accessType: 'read_only',
          parameters: [{ name: 'namespace', type: 'string', required: true }],
        },
      ],
    });

    cy.intercept('POST', `${REGISTRY_SERVER_PATH}/versions*`, {
      // eslint-disable-next-line camelcase
      body: { data: { name: REGISTRY_NAME, version: '1.0.0', server_json: {}, status: 'draft' } },
    }).as('createVersion');
    cy.intercept('PATCH', `${REGISTRY_SERVER_PATH}*`, {
      body: {
        // eslint-disable-next-line camelcase
        data: { name: REGISTRY_NAME, display_name: 'Kubernetes MCP', icons: [{ src: LOGO_URL }] },
      },
    }).as('updateServer');

    openRegisterModal();
    mcpRegisterModal.selectProject('Test Project');
    mcpRegisterModal.findSubmitButton().should('not.be.disabled');
    mcpRegisterModal.findSubmitButton().click();

    cy.wait('@createVersion').then((interception) => {
      expect(interception.request.url).to.include('workspace=test-project');
      const body = interception.request.body.data || interception.request.body;
      expect(body.status).to.equal('draft');
      expect(body.tools).to.deep.equal([
        {
          name: 'list_pods',
          description: 'List pods in a namespace',
          // eslint-disable-next-line camelcase
          input_schema: {
            type: 'object',
            properties: { namespace: { type: 'string' } },
            required: ['namespace'],
          },
        },
      ]);
      expect(body.server_json.name).to.equal(REGISTRY_NAME);
      expect(body.server_json).to.not.have.property('icons');
    });

    cy.wait('@updateServer').then((interception) => {
      const body = interception.request.body.data || interception.request.body;
      expect(body).to.deep.equal({
        // eslint-disable-next-line camelcase
        display_name: 'Kubernetes MCP',
        icons: [{ src: LOGO_URL }],
      });
    });

    toastNotifications.findToastNotification(0).should('contain.text', REGISTRY_NAME);
    mcpRegisterModal.shouldNotExist();

    cy.url().should('include', '/ai-hub/mcp-servers/registry/kubernetes%2Fmcp-server');
    cy.url().should('include', 'version=1.0.0');
    cy.url().should('include', 'workspace=test-project');
  });

  it('should send the edited display name in the metadata PATCH, not the stale default', () => {
    initBaseIntercepts();
    initCatalogIntercepts();

    cy.intercept('POST', `${REGISTRY_SERVER_PATH}/versions*`, {
      // eslint-disable-next-line camelcase
      body: { data: { name: REGISTRY_NAME, version: '1.0.0', server_json: {}, status: 'draft' } },
    }).as('createVersion');
    cy.intercept('PATCH', `${REGISTRY_SERVER_PATH}*`, {
      body: { data: { name: REGISTRY_NAME } },
    }).as('updateServer');

    openRegisterModal();
    mcpRegisterModal.selectProject('Test Project');
    mcpRegisterModal.findDisplayNameInput().clear().type('My Custom Label');
    mcpRegisterModal.findSubmitButton().should('not.be.disabled').click();

    cy.wait('@updateServer').then((interception) => {
      const body = interception.request.body.data || interception.request.body;
      expect(body.display_name).to.equal('My Custom Label');
    });
  });

  it('should update icon rows when added, themed, and removed, and PATCH the final icons', () => {
    initBaseIntercepts();
    initCatalogIntercepts();

    cy.intercept('POST', `${REGISTRY_SERVER_PATH}/versions*`, {
      // eslint-disable-next-line camelcase
      body: { data: { name: REGISTRY_NAME, version: '1.0.0', server_json: {}, status: 'draft' } },
    }).as('createVersion');
    cy.intercept('PATCH', `${REGISTRY_SERVER_PATH}*`, {
      body: { data: { name: REGISTRY_NAME } },
    }).as('updateServer');

    openRegisterModal();

    const lightUrl = 'https://example.com/light-icon.svg';
    const darkUrl = 'https://example.com/dark-icon.svg';

    mcpRegisterModal.findAddIconButton().click();
    mcpRegisterModal.findIconUrlInput(0).type(lightUrl);
    mcpRegisterModal.selectIconTheme(0, 'light');

    mcpRegisterModal.findAddIconButton().click();
    mcpRegisterModal.findIconUrlInput(1).type(darkUrl);
    mcpRegisterModal.selectIconTheme(1, 'dark');

    mcpRegisterModal.findLightIconPreview().find('img').should('have.attr', 'src', lightUrl);
    mcpRegisterModal.findDarkIconPreview().find('img').should('have.attr', 'src', darkUrl);

    mcpRegisterModal.findIconRemoveButton(0).click();
    mcpRegisterModal.findIconUrlInput(0).should('have.value', darkUrl);

    mcpRegisterModal.findAddIconButton().click();

    mcpRegisterModal.selectProject('Test Project');
    mcpRegisterModal.findSubmitButton().should('not.be.disabled');
    mcpRegisterModal.findSubmitButton().click();

    cy.wait('@createVersion').then((interception) => {
      const body = interception.request.body.data || interception.request.body;
      expect(body.server_json).to.not.have.property('icons');
    });
    cy.wait('@updateServer').then((interception) => {
      const body = interception.request.body.data || interception.request.body;
      expect(body.icons).to.deep.equal([{ src: darkUrl, theme: 'dark' }]);
    });
  });

  it('should surface create-version errors in the modal', () => {
    initBaseIntercepts();
    initCatalogIntercepts();

    cy.intercept('POST', `${REGISTRY_SERVER_PATH}/versions*`, {
      statusCode: 409,
      body: { error: { code: 'conflict', message: 'version already exists' } },
    }).as('createVersion');

    openRegisterModal();
    mcpRegisterModal.selectProject('Test Project');
    mcpRegisterModal.findSubmitButton().should('not.be.disabled');
    mcpRegisterModal.findSubmitButton().click();

    cy.wait('@createVersion');

    mcpRegisterModal.findSubmitError().should('be.visible');
    mcpRegisterModal.shouldBeOpen();
  });
});
