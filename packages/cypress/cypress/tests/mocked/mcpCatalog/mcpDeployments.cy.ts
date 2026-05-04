import {
  mockDashboardConfig,
  mockDscStatus,
  mockK8sResourceList,
  mockProjectK8sResource,
} from '@odh-dashboard/internal/__mocks__';
import { mockDsciStatus } from '@odh-dashboard/internal/__mocks__/mockDsciStatus';
import type { McpDeployment } from '@odh-dashboard/model-registry/types/mcpDeploymentTypes';
import {
  mcpDeploymentsPage,
  mcpDeployModal,
  mcpServerDetailsPage,
} from '../../../pages/mcpDeployments';
import { appChrome } from '../../../pages/appChrome';
import { tabRoutePage } from '../../../pages/tabRoutePage';
import { asProductAdminUser } from '../../../utils/mockUsers';
import {
  mockRunningDeployment,
  mockAllDeployments,
  mockDeploymentListResponse,
  mockMcpDeployment,
  mockMcpServerCR,
} from '../../../utils/mcpDeploymentUtils';
import {
  ProjectModel,
  ServingRuntimeModel,
  InferenceServiceModel,
  SecretModel,
  TemplateModel,
} from '../../../utils/models';

const BFF_PREFIX = '/model-registry/api/v1';
const MCP_DEPLOYMENTS_API = `${BFF_PREFIX}/mcp_deployments`;
const MCP_DEPLOYMENTS_URL = '/ai-hub/mcp-servers/deployments';
const MODEL_REGISTRY_API_VERSION = 'v1';

const initBaseIntercepts = () => {
  asProductAdminUser();

  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({ mcpCatalog: true, disableModelRegistry: false }),
  );

  cy.interceptOdh('GET /api/dsc/status', mockDscStatus({}));

  cy.interceptOdh('GET /api/dsci/status', mockDsciStatus({}));

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

const initIntercepts = ({
  deployments = mockAllDeployments(),
}: { deployments?: McpDeployment[] } = {}) => {
  initBaseIntercepts();

  cy.intercept('GET', `${MCP_DEPLOYMENTS_API}*`, {
    body: mockDeploymentListResponse(deployments),
  }).as('getMcpDeployments');
};

const visitDeployments = () => {
  cy.visitWithLogin(`${MCP_DEPLOYMENTS_URL}/test-project`);
};

const withNewestCreationTime = (deployments: McpDeployment[]): McpDeployment =>
  deployments.reduce((newest, d) =>
    new Date(d.creationTimestamp) > new Date(newest.creationTimestamp) ? d : newest,
  );

describe('MCP Deployments', () => {
  it('should display row data, status labels, and service availability', () => {
    initIntercepts();
    visitDeployments();
    mcpDeploymentsPage.findTable().should('be.visible');
    mcpDeploymentsPage.findTableRows().should('have.length', 3);

    const runningRow = mcpDeploymentsPage.getRow('kubernetes-mcp');
    runningRow.findServer().should('contain.text', 'Kubernetes');
    runningRow.findName().should('contain.text', 'Kubernetes MCP');
    runningRow.findStatusLabel().should('contain.text', 'Available');
    runningRow.findServiceViewButton().should('exist');

    const pendingRow = mcpDeploymentsPage.getRow('github-mcp');
    pendingRow.findServer().should('contain.text', 'GitHub');
    pendingRow.findStatusLabel().should('contain.text', 'Pending');
    pendingRow.findServiceUnavailable().should('exist').and('have.text', '\u2013');
    pendingRow.findServiceViewButton().should('not.exist');

    const failedRow = mcpDeploymentsPage.getRow('slack-mcp');
    failedRow.findStatusLabel().should('contain.text', 'Unavailable');
    failedRow.findServiceUnavailable().should('exist').and('have.text', '\u2013');
    failedRow.findServiceViewButton().should('not.exist');
  });

  it('should default-sort rows by Created with newest first', () => {
    const deployments: McpDeployment[] = [
      mockMcpDeployment({
        name: 'jan-mcp',
        uid: 'uid-jan',
        creationTimestamp: '2026-01-15T08:00:00Z',
        displayName: 'January MCP',
        serverName: 'January',
      }),
      mockMcpDeployment({
        name: 'jun-mcp',
        uid: 'uid-jun',
        creationTimestamp: '2026-06-20T14:00:00Z',
        displayName: 'June MCP',
        serverName: 'June',
      }),
      mockMcpDeployment({
        name: 'mar-mcp',
        uid: 'uid-mar',
        creationTimestamp: '2026-03-05T09:00:00Z',
        displayName: 'March MCP',
        serverName: 'March',
      }),
      mockMcpDeployment({
        name: 'feb-mcp',
        uid: 'uid-feb',
        creationTimestamp: '2026-02-28T11:30:00Z',
        displayName: 'February MCP',
        serverName: 'February',
      }),
    ];
    const expectedFirst = withNewestCreationTime(deployments);
    const expectedNameInTable = expectedFirst.displayName ?? expectedFirst.name;
    // Return items in non-chronological order so the test proves the UI sorts by Created.
    initIntercepts({
      deployments: [deployments[0], deployments[2], deployments[1], deployments[3]],
    });
    visitDeployments();
    mcpDeploymentsPage.findTable().should('be.visible');
    mcpDeploymentsPage.findTableRows().should('have.length', 4);
    // `test:cypress-ci:coverage:nobuild` serves prebuilt `public-cypress`; bundles may default-sort
    // by Server/Name. PatternFly applies sort via a *button* in the th — `columnheader` clicks often
    // do not toggle. Click the Created sort control until the newest row (`jun-mcp`) is first.
    const newestRowTestId = 'mcp-deployment-row-jun-mcp';
    const maxCreatedSortClicks = 12;
    const clickCreatedUntilNewestFirst = (n: number): Cypress.Chainable =>
      mcpDeploymentsPage
        .findTableRows()
        .first()
        .then(($row) => {
          if ($row.attr('data-testid') === newestRowTestId) {
            return cy.wrap(null);
          }
          if (n >= maxCreatedSortClicks) {
            const got = $row.attr('data-testid') ?? '(missing)';
            throw new Error(`Expected ${newestRowTestId} first after Created sort; got ${got}`);
          }
          return mcpDeploymentsPage
            .findCreatedSortButton()
            .scrollIntoView()
            .click({ force: true })
            .then(() => clickCreatedUntilNewestFirst(n + 1));
        });
    cy.wrap(null).then(() => clickCreatedUntilNewestFirst(0));
    mcpDeploymentsPage.getFirstRow().findName().should('contain.text', expectedNameInTable);
  });

  it('should show Edit and Delete actions in kebab menu', () => {
    initIntercepts();
    visitDeployments();

    const row = mcpDeploymentsPage.getRow('kubernetes-mcp');
    row.findKebab().click();
    row.findEditAction();
    row.findDeleteAction();
  });

  it('should show empty state when no deployments exist', () => {
    initIntercepts({ deployments: [] });
    visitDeployments();
    mcpDeploymentsPage
      .findEmptyState()
      .should('be.visible')
      .and('contain.text', 'No MCP server deployments');
  });

  it('should show loading state while deployments are being fetched', () => {
    initBaseIntercepts();
    cy.intercept('GET', `${MCP_DEPLOYMENTS_API}*`, (req) => {
      req.reply({ delay: 60000, body: { data: { items: [], size: 0 } } });
    }).as('getMcpDeployments');

    visitDeployments();

    mcpDeploymentsPage.findLoadingState().should('exist');
    mcpDeploymentsPage.findLoadingSpinner().should('exist');
  });

  it('should show error state when deployments fail to load', () => {
    initBaseIntercepts();
    cy.intercept('GET', `${MCP_DEPLOYMENTS_API}*`, {
      statusCode: 500,
      body: { error: 'Internal Server Error' },
    }).as('getMcpDeployments');

    visitDeployments();

    cy.wait('@getMcpDeployments');
    mcpDeploymentsPage
      .findErrorState()
      .should('exist')
      .and('contain.text', 'Error loading components');
  });

  it('should filter deployments by name and show empty state for no match', () => {
    initIntercepts();
    visitDeployments();
    mcpDeploymentsPage.findTable().should('be.visible');

    mcpDeploymentsPage.findFilterInput().type('kubernetes');
    mcpDeploymentsPage.findTableRows().should('have.length', 1);
    mcpDeploymentsPage.getRow('kubernetes-mcp').findName().should('contain.text', 'Kubernetes MCP');

    mcpDeploymentsPage.findFilterInput().clear().type('nonexistent-xyz');
    mcpDeploymentsPage.findTableRows().should('have.length', 0);
  });

  it('should open edit modal with existing deployment data', () => {
    initIntercepts();
    visitDeployments();

    const row = mcpDeploymentsPage.getRow('kubernetes-mcp');
    row.findKebab().click();
    row.findEditAction().click();

    mcpDeployModal.shouldBeOpen();
    mcpDeployModal.findTitle().should('contain.text', 'Edit MCP server deployment');
    mcpDeployModal.findNameInput().should('have.value', 'Kubernetes MCP');
    mcpDeployModal.findOciImageInput().should('have.value', 'quay.io/mcp-servers/kubernetes:1.0.0');
    mcpDeployModal.findProjectSelector().should('have.value', 'test-project');
    mcpDeployModal.findSubmitButton().should('contain.text', 'Save');
  });

  it('should close edit modal without saving', () => {
    initIntercepts();
    visitDeployments();

    cy.intercept('PATCH', `${MCP_DEPLOYMENTS_API}/*`).as('updateDeployment');

    const row = mcpDeploymentsPage.getRow('kubernetes-mcp');
    row.findKebab().click();
    row.findEditAction().click();

    mcpDeployModal.shouldBeOpen();
    mcpDeployModal.findCloseButton().click();
    mcpDeployModal.shouldNotExist();

    cy.get('@updateDeployment.all').should('have.length', 0);
  });

  it('should save edit modal and close on success', () => {
    initIntercepts();
    visitDeployments();

    cy.intercept('PATCH', `${MCP_DEPLOYMENTS_API}/*`, {
      body: { data: mockRunningDeployment() },
    }).as('updateDeployment');

    const row = mcpDeploymentsPage.getRow('kubernetes-mcp');
    row.findKebab().click();
    row.findEditAction().click();

    mcpDeployModal.shouldBeOpen();
    mcpDeployModal.findSubmitButton().click();
    cy.wait('@updateDeployment');
    mcpDeployModal.shouldNotExist();
  });
});

const TEST_SERVER_ID = 'kubernetes-server-1';
const TEST_SERVER_IMAGE = 'ghcr.io/kubernetes/mcp-server:latest';

const initDeployIntercepts = ({
  crdAvailable = true,
  artifacts = [{ uri: TEST_SERVER_IMAGE }],
}: { crdAvailable?: boolean; artifacts?: { uri: string }[] } = {}) => {
  initBaseIntercepts();

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

  cy.intercept('GET', `${BFF_PREFIX}/mcp_catalog/mcp_servers/${TEST_SERVER_ID}*`, {
    body: {
      data: {
        id: TEST_SERVER_ID,
        name: 'Kubernetes MCP',
        description: 'Control and inspect Kubernetes clusters.',
        deploymentMode: 'local',
        securityIndicators: { verifiedSource: true },
        source_id: 'source-1', // eslint-disable-line camelcase
        toolCount: 0,
        provider: 'Kubernetes',
        artifacts,
        transports: ['http'],
        version: '1.0.0',
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
            source_id: 'source-1', // eslint-disable-line camelcase
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
    body: { data: { available: crdAvailable } },
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

describe('MCP Deploy from Catalog', () => {
  describe('Deploy button visibility', () => {
    it('should show disabled deploy button when CRD is not available', () => {
      initDeployIntercepts({ crdAvailable: false });

      cy.visitWithLogin(`/ai-hub/mcp-servers/catalog/${TEST_SERVER_ID}`);

      mcpServerDetailsPage
        .findDeployButton()
        .should('be.visible')
        .and('have.attr', 'aria-disabled', 'true');
    });

    it('should not show deploy button when server has no artifacts', () => {
      initDeployIntercepts({ artifacts: [] });

      cy.visitWithLogin(`/ai-hub/mcp-servers/catalog/${TEST_SERVER_ID}`);

      mcpServerDetailsPage.findBreadcrumbServerName().should('contain.text', 'Kubernetes MCP');
      mcpServerDetailsPage.findDeployButton().should('not.exist');
    });

    it('should show loading spinner on deploy button while availability is being checked', () => {
      initDeployIntercepts();
      cy.intercept('GET', `${BFF_PREFIX}/mcp_catalog/mcp_server_available*`, (req) => {
        req.reply({ delay: 60000, body: { data: { available: true } } });
      });

      cy.visitWithLogin(`/ai-hub/mcp-servers/catalog/${TEST_SERVER_ID}`);

      mcpServerDetailsPage.findDeployButton().should('be.visible');
      mcpServerDetailsPage.findDeployButtonSpinner().should('exist');
    });
  });

  it('should open deploy modal with pre-filled data from server details', () => {
    initDeployIntercepts();

    cy.visitWithLogin(`/ai-hub/mcp-servers/catalog/${TEST_SERVER_ID}`);

    mcpServerDetailsPage.findDeployButton().should('be.visible').and('not.be.disabled');
    mcpServerDetailsPage.findDeployButton().click();

    cy.wait('@getConverter');
    mcpDeployModal.shouldBeOpen();
    mcpDeployModal.findTitle().should('contain.text', 'Deploy MCP server');
    mcpDeployModal.findOciImageInput().should('have.value', TEST_SERVER_IMAGE);
    mcpDeployModal.findSubmitButton().should('contain.text', 'Deploy');
    mcpDeployModal.findSubmitButton().should('be.disabled');
  });

  it('should close deploy modal without creating a deployment', () => {
    initDeployIntercepts();

    cy.intercept('POST', `${MCP_DEPLOYMENTS_API}*`).as('createDeployment');

    cy.visitWithLogin(`/ai-hub/mcp-servers/catalog/${TEST_SERVER_ID}`);

    mcpServerDetailsPage.findDeployButton().click();
    cy.wait('@getConverter');
    mcpDeployModal.shouldBeOpen();
    mcpDeployModal.findCloseButton().click();
    mcpDeployModal.shouldNotExist();

    cy.get('@createDeployment.all').should('have.length', 0);
  });

  it('should show loading spinner in deploy modal while converter loads', () => {
    initDeployIntercepts();
    cy.intercept(
      'GET',
      `${BFF_PREFIX}/mcp_catalog/mcp_servers/${TEST_SERVER_ID}/mcpserver*`,
      (req) => {
        req.reply({ delay: 60000, body: { data: {} } });
      },
    ).as('getConverterSlow');

    cy.visitWithLogin(`/ai-hub/mcp-servers/catalog/${TEST_SERVER_ID}`);
    mcpServerDetailsPage.findDeployButton().click();

    mcpDeployModal.shouldBeOpen();
    mcpDeployModal.findLoadingSpinner().should('exist');
  });

  it('should show error alert in deploy modal when converter fails', () => {
    initDeployIntercepts();
    cy.intercept('GET', `${BFF_PREFIX}/mcp_catalog/mcp_servers/${TEST_SERVER_ID}/mcpserver*`, {
      statusCode: 500,
      body: { error: 'Server configuration unavailable' },
    }).as('getConverterError');

    cy.visitWithLogin(`/ai-hub/mcp-servers/catalog/${TEST_SERVER_ID}`);
    mcpServerDetailsPage.findDeployButton().click();

    cy.wait('@getConverterError');
    mcpDeployModal.shouldBeOpen();
    mcpDeployModal
      .findLoadError()
      .should('be.visible')
      .and('contain.text', 'Failed to load MCP server configuration');
  });

  it('should enable deploy button when a valid name is entered', () => {
    initDeployIntercepts();

    cy.intercept('POST', `${MCP_DEPLOYMENTS_API}*`, {
      body: { data: mockRunningDeployment() },
    }).as('createDeployment');

    cy.visitWithLogin(`/ai-hub/mcp-servers/catalog/${TEST_SERVER_ID}`);
    mcpServerDetailsPage.findDeployButton().click();
    cy.wait('@getConverter');
    mcpDeployModal.shouldBeOpen();
    mcpDeployModal.findSubmitButton().should('be.disabled');

    mcpDeployModal.findNameInput().type('My Server');
    mcpDeployModal.selectProject('Test Project');
    mcpDeployModal.findSubmitButton().should('not.be.disabled');
    mcpDeployModal.findSubmitButton().click();

    cy.wait('@createDeployment').then((interception) => {
      const body = interception.request.body.data || interception.request.body;
      expect(body).to.have.property('name', 'my-server');
      expect(body).to.have.property('displayName', 'My Server');
    });
  });

  it('should auto-generate a valid K8s name for dash-only display name input', () => {
    initDeployIntercepts();

    cy.intercept('POST', `${MCP_DEPLOYMENTS_API}*`, {
      body: { data: mockRunningDeployment() },
    }).as('createDeployment');

    cy.visitWithLogin(`/ai-hub/mcp-servers/catalog/${TEST_SERVER_ID}`);
    mcpServerDetailsPage.findDeployButton().click();
    cy.wait('@getConverter');
    mcpDeployModal.shouldBeOpen();

    mcpDeployModal.findNameInput().type('----');
    mcpDeployModal.selectProject('Test Project');
    mcpDeployModal.findResourceNameHelperText().should('contain.text', 'The resource name will be');
    mcpDeployModal.findSubmitButton().should('not.be.disabled');
    mcpDeployModal.findSubmitButton().click();

    cy.wait('@createDeployment').then((interception) => {
      const body = interception.request.body.data || interception.request.body;
      expect(body.name).to.match(/^gen-[a-z0-9]+$/);
      expect(body.name).to.not.equal('----');
    });
  });
});

describe('MCP Deployments Project Persistence', () => {
  it('should persist project selection from MCP deployments to model serving via preferredProject', () => {
    initBaseIntercepts();

    cy.intercept('GET', `${MCP_DEPLOYMENTS_API}*`, {
      body: mockDeploymentListResponse(mockAllDeployments()),
    }).as('getMcpDeployments');

    // Model serving needs these K8s resources after the redirect lands on a valid namespace
    cy.interceptK8sList({ model: ServingRuntimeModel, ns: undefined }, mockK8sResourceList([]));
    cy.interceptK8sList(
      { model: ServingRuntimeModel, ns: 'test-project' },
      mockK8sResourceList([]),
    );
    cy.interceptK8sList({ model: InferenceServiceModel, ns: undefined }, mockK8sResourceList([]));
    cy.interceptK8sList(
      { model: InferenceServiceModel, ns: 'test-project' },
      mockK8sResourceList([]),
    );
    cy.interceptK8sList(TemplateModel, mockK8sResourceList([]));
    cy.interceptK8sList(SecretModel, mockK8sResourceList([]));
    cy.interceptOdh('GET /api/connection-types', []);

    // Visit MCP deployments with test-project — this sets preferredProject via the bridge
    cy.visitWithLogin(`${MCP_DEPLOYMENTS_URL}/test-project`);
    mcpDeploymentsPage.findTable().should('be.visible');

    // Navigate to model serving via the nav sidebar (SPA navigation preserves preferredProject)
    appChrome.findNavItem({ name: 'Models', rootSection: 'AI hub' }).click();

    // Click the Deployments tab (Models nav lands on the catalog tab by default)
    tabRoutePage.findTab('deployments').click();

    // Model serving's CoreLoader should redirect to the preferred project
    cy.location('pathname').should('eq', '/ai-hub/models/deployments/test-project');
  });

  it('should show select-project state when no project is in the URL and no preferred project', () => {
    initBaseIntercepts();

    cy.visitWithLogin(MCP_DEPLOYMENTS_URL);
    mcpDeploymentsPage.findSelectProjectState().should('be.visible');
  });

  it('should show project-not-found state for invalid namespace', () => {
    initBaseIntercepts();

    cy.visitWithLogin(`${MCP_DEPLOYMENTS_URL}/nonexistent-project`);
    cy.findByTestId('mcp-deployments-invalid-project')
      .should('be.visible')
      .and('contain.text', 'nonexistent-project');
  });
});
