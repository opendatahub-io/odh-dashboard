import {
  mcpCatalogSettings,
  mcpManageSourcePage,
} from '~/__tests__/cypress/cypress/pages/mcpCatalogSettings';
import {
  mockMcpCatalogSourceConfigList,
  mockMcpCatalogSourceConfig,
} from '~/__mocks__/mockMcpCatalogSourceConfigList';
import { McpCatalogSourceType } from '~/app/mcpServerCatalogTypes';

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
    cy.intercept('GET', '**/settings/mcp_catalog/source_configs*', {
      data: { catalogs: [] },
    });
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
      mcpManageSourcePage
        .findBreadcrumb()
        .should('have.attr', 'href', '/settings/mcp-resources/mcp-catalog');
    });
  });
});

describe('MCP Catalog Source Configs Table', () => {
  beforeEach(() => {
    setupMocks();
  });

  describe('Table rendering', () => {
    it('should display the table with sources when data exists', () => {
      const mockData = mockMcpCatalogSourceConfigList();
      cy.intercept('GET', '**/settings/mcp_catalog/source_configs*', {
        data: mockData,
      });

      mcpCatalogSettings.visit();
      mcpCatalogSettings.shouldHaveRows();
      mcpCatalogSettings.findRows().should('have.length', 3);
    });

    it('should display source names and types', () => {
      const mockData = mockMcpCatalogSourceConfigList();
      cy.intercept('GET', '**/settings/mcp_catalog/source_configs*', {
        data: mockData,
      });

      mcpCatalogSettings.visit();
      mcpCatalogSettings.getRow('Sample MCP source 1').find().should('exist');
      mcpCatalogSettings.getRow('MCP Source 2').find().should('exist');
      mcpCatalogSettings.getRow('Sample MCP source 4').find().should('exist');
    });

    it('should show YAML file as the source type label', () => {
      const mockData = mockMcpCatalogSourceConfigList({
        catalogs: [
          mockMcpCatalogSourceConfig({
            id: 'yaml-source',
            name: 'YAML Source',
            type: McpCatalogSourceType.YAML,
            isDefault: false,
          }),
        ],
      });
      cy.intercept('GET', '**/settings/mcp_catalog/source_configs*', {
        data: mockData,
      });

      mcpCatalogSettings.visit();
      mcpCatalogSettings.getRow('YAML Source').find().should('contain', 'YAML file');
    });

    it('should NOT show kebab menu for default sources', () => {
      const mockData = mockMcpCatalogSourceConfigList({
        catalogs: [
          mockMcpCatalogSourceConfig({
            id: 'default-source',
            name: 'Default Source',
            isDefault: true,
          }),
        ],
      });
      cy.intercept('GET', '**/settings/mcp_catalog/source_configs*', {
        data: mockData,
      });

      mcpCatalogSettings.visit();
      const row = mcpCatalogSettings.getRow('Default Source');
      row.find().within(() => {
        cy.get('[data-testid*="source-actions"]').should('not.exist');
      });
    });

    it('should show kebab menu for non-default sources', () => {
      const mockData = mockMcpCatalogSourceConfigList({
        catalogs: [
          mockMcpCatalogSourceConfig({
            id: 'custom-source',
            name: 'Custom Source',
            isDefault: false,
          }),
        ],
      });
      cy.intercept('GET', '**/settings/mcp_catalog/source_configs*', {
        data: mockData,
      });

      mcpCatalogSettings.visit();
      const row = mcpCatalogSettings.getRow('Custom Source');
      row.findKebab().should('exist');
    });
  });

  describe('Sort functionality', () => {
    it('should have sortable source name column header', () => {
      const mockData = mockMcpCatalogSourceConfigList({
        catalogs: [
          mockMcpCatalogSourceConfig({ id: 'c', name: 'Charlie', isDefault: false }),
          mockMcpCatalogSourceConfig({ id: 'a', name: 'Alpha', isDefault: false }),
        ],
      });
      cy.intercept('GET', '**/settings/mcp_catalog/source_configs*', {
        data: mockData,
      });

      mcpCatalogSettings.visit();
      mcpCatalogSettings
        .findTable()
        .find('thead th')
        .contains('Source name')
        .parents('th')
        .should('have.attr', 'aria-sort');
    });
  });

  describe('Delete functionality', () => {
    it('should open delete modal when clicking Delete source from kebab menu', () => {
      const mockData = mockMcpCatalogSourceConfigList({
        catalogs: [
          mockMcpCatalogSourceConfig({
            id: 'deletable-source',
            name: 'Deletable Source',
            isDefault: false,
          }),
        ],
      });
      cy.intercept('GET', '**/settings/mcp_catalog/source_configs*', {
        data: mockData,
      });

      mcpCatalogSettings.visit();
      const row = mcpCatalogSettings.getRow('Deletable Source');
      row.findKebab().click();
      cy.findByRole('menuitem', { name: /delete source/i }).click();

      cy.findByTestId('mcp-delete-source-modal').should('exist');
    });

    it('should close delete modal when cancel is clicked', () => {
      const mockData = mockMcpCatalogSourceConfigList({
        catalogs: [
          mockMcpCatalogSourceConfig({
            id: 'deletable-source',
            name: 'Deletable Source',
            isDefault: false,
          }),
        ],
      });
      cy.intercept('GET', '**/settings/mcp_catalog/source_configs*', {
        data: mockData,
      });

      mcpCatalogSettings.visit();
      const row = mcpCatalogSettings.getRow('Deletable Source');
      row.findKebab().click();
      cy.findByRole('menuitem', { name: /delete source/i }).click();

      cy.findByTestId('mcp-delete-source-modal').should('exist');
      cy.findByRole('button', { name: /cancel/i }).click();
      cy.findByTestId('mcp-delete-source-modal').should('not.exist');
    });
  });

  describe('Error status', () => {
    it('should display error status for source with error', () => {
      const mockData = mockMcpCatalogSourceConfigList({
        catalogs: [
          mockMcpCatalogSourceConfig({
            id: 'error-source',
            name: 'Error Source',
            isDefault: false,
            enabled: true,
          }),
        ],
      });
      cy.intercept('GET', '**/settings/mcp_catalog/source_configs*', {
        data: mockData,
      });
      cy.intercept('GET', '**/model_catalog/sources*', {
        data: {
          items: [
            {
              id: 'error-source',
              status: 'error',
              error: 'Connection failed',
              name: 'Error Source',
              enabled: true,
            },
          ],
          size: 1,
          pageSize: 10,
          nextPageToken: '',
        },
      });

      mcpCatalogSettings.visit();
      const row = mcpCatalogSettings.getRow('Error Source');
      row.find().should('contain', 'Failed');
    });
  });
});
