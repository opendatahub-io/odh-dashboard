import {
  mcpCatalogSettings,
  mcpManageSourcePage,
} from '~/__tests__/cypress/cypress/pages/mcpCatalogSettings';

const NAMESPACE = 'kubeflow';
const userMock = {
  data: {
    userId: 'user@example.com',
    clusterAdmin: true,
  },
};

const setupMocks = () => {
  cy.intercept('GET', '/model-registry/api/v1/namespaces', {
    data: [{ metadata: { name: NAMESPACE } }],
  });
  cy.intercept('GET', '/model-registry/api/v1/user', userMock);
};

describe('MCP Catalog Settings', () => {
  beforeEach(() => {
    setupMocks();
  });

  it('should display the empty state with title and description', () => {
    mcpCatalogSettings.visit();
    mcpCatalogSettings.shouldBeEmpty();
    mcpCatalogSettings.findEmptyState().should('contain', 'No MCP sources');
    mcpCatalogSettings
      .findEmptyState()
      .should('contain', 'No MCP sources have been configured. Add a source to get started.');
  });

  it('should display the "Add a source" button in empty state', () => {
    mcpCatalogSettings.visit();
    mcpCatalogSettings.findAddSourceButton().should('be.visible');
    mcpCatalogSettings.findAddSourceButton().should('contain', 'Add a source');
  });

  it('should navigate to add-source page when button is clicked', () => {
    mcpCatalogSettings.visit();
    mcpCatalogSettings.findAddSourceButton().click();
    mcpManageSourcePage.findAddSourceTitle();
    mcpManageSourcePage.findAddSourceDescription();
    mcpManageSourcePage.findBreadcrumb().should('exist');
    mcpManageSourcePage.findBreadcrumbAction().should('contain', 'Add a source');
  });
});

describe('MCP Manage Source Page', () => {
  beforeEach(() => {
    setupMocks();
  });

  describe('Add Source Mode', () => {
    it('should display add source page with correct breadcrumb', () => {
      mcpManageSourcePage.visitAddSource();
      mcpManageSourcePage.findAddSourceTitle();
      mcpManageSourcePage.findBreadcrumb().should('exist');
      mcpManageSourcePage.findBreadcrumbAction().should('contain', 'Add a source');
    });

    it('should navigate back to settings from breadcrumb', () => {
      mcpManageSourcePage.visitAddSource();
      mcpManageSourcePage.findBreadcrumb().click({ force: true });
      mcpCatalogSettings.findHeading();
    });
  });

  describe('Manage Source Mode', () => {
    it('should display manage source page with correct breadcrumb', () => {
      mcpManageSourcePage.visitManageSource('test-source-123');
      mcpManageSourcePage.findManageSourceTitle();
      mcpManageSourcePage.findBreadcrumb().should('exist');
      mcpManageSourcePage.findBreadcrumbAction().should('contain', 'Manage source');
    });

    it('should have breadcrumb link pointing to settings page', () => {
      mcpManageSourcePage.visitAddSource();
      mcpManageSourcePage.findBreadcrumb().should('have.attr', 'href', '/mcp-catalog-settings');
    });
  });
});
