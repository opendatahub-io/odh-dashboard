import * as yaml from 'js-yaml';
import { ensureAdminOcSession } from '../../../utils/oc_commands/baseCommands';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { createCleanProject } from '../../../utils/projectChecker';
import {
  deleteDataRegistryBrowseAsset,
  seedDataRegistryBrowseAsset,
} from '../../../utils/api/dataRegistry';
import { generateTestUUID } from '../../../utils/uuidGenerator';

const testProjectName = `data-registry-collection-e2e-${generateTestUUID()}`;

describe('Data Registry - Collection Details', () => {
  let testData: Record<string, string>;
  let projectCreated = false;
  let browseAssetCreated = false;

  before(() => {
    return ensureAdminOcSession()
      .then(() => cy.fixture('e2e/dataRegistry/testDataRegistry.yaml', 'utf8'))
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as Record<string, string>;
        testData.project = testProjectName;
      })
      .then(() => {
        cy.step(`Create Data Registry project/${testProjectName}`);
        return createCleanProject(testProjectName).then(() => {
          projectCreated = true;
        });
      })
      .then(() =>
        seedDataRegistryBrowseAsset(testData.project, testData.collection, testData.asset),
      )
      .then((created) => {
        browseAssetCreated = created;
      });
  });

  after(() => {
    if (!browseAssetCreated && !projectCreated) {
      return;
    }
    return ensureAdminOcSession()
      .then(() =>
        browseAssetCreated
          ? deleteDataRegistryBrowseAsset(testData.project, testData.collection, testData.asset)
          : undefined,
      )
      .then(() => {
        if (!projectCreated) {
          return;
        }
        cy.step(`Delete Data Registry project/${testProjectName}`);
        return deleteOpenShiftProject(testProjectName, {
          wait: false,
          ignoreNotFound: true,
        });
      });
  });

  beforeEach(() => {
    cy.visit('/');
    cy.get('[data-testid="app-launcher"]').click();
    cy.get('[data-testid="nav-item-ai-hub"]').click();
    cy.get('[data-testid="nav-item-data"]').click();

    // Select project
    cy.get('[data-testid="project-selector"]').click();
    cy.get(`[data-testid="project-option-${testData.project}"]`).click();
  });

  it('should display collection detail page', () => {
    // Navigate to collection detail from breadcrumb on asset detail page
    cy.get('[data-testid="registry-table"]').find('a').contains(testData.asset).click();

    cy.get('[data-testid="app-page-breadcrumb"]').find('a').contains(testData.collection).click();

    // Verify collection detail page loaded
    cy.get('[data-testid="app-page-title"]').should('contain', testData.collection);
    cy.get('[data-testid="collection-type-badge"]').should('contain', 'Collection');
    cy.get('[data-testid="collection-description"]').should('exist');
  });

  it('should display collection details card with correct information', () => {
    // Navigate directly to collection detail
    cy.visit(`/ai-hub/data/browse/collections/${testData.project}/${testData.collection}`);

    // Verify collection details card
    cy.get('[data-testid="collection-details-card"]').should('exist');
    cy.get('[data-testid="collection-detail-description-list"]').should('exist');

    // Verify structured/unstructured counts
    cy.get('[data-testid="collection-structured-count"]').should('exist');
    cy.get('[data-testid="collection-unstructured-count"]').should('exist');

    // Verify owner
    cy.get('[data-testid="collection-owner"]').should('exist');

    // Verify created timestamp
    cy.get('[data-testid="collection-created-at"]').should('exist');
  });

  it('should display data assets table', () => {
    cy.visit(`/ai-hub/data/browse/collections/${testData.project}/${testData.collection}`);

    // Verify data assets card
    cy.get('[data-testid="data-assets-card"]').should('exist');
    cy.get('[data-testid="collection-assets-table"]').should('exist');

    // Verify table has headers
    cy.get('[data-testid="collection-assets-table"]')
      .find('th')
      .should('contain', 'Name')
      .and('contain', 'Type')
      .and('contain', 'Format');
  });

  it('should navigate to asset detail from collection assets table', () => {
    cy.visit(`/ai-hub/data/browse/collections/${testData.project}/${testData.collection}`);

    // Click on an asset name
    cy.get('[data-testid="collection-assets-table"]').find('a').contains(testData.asset).click();

    // Verify navigated to asset detail page
    cy.url().should('include', `/tables/${testData.project}/${testData.collection}/`);
    cy.get('[data-testid="asset-type-badge"]').should('contain', 'Data asset');
  });

  it('should show delete collection disabled when collection has assets', () => {
    cy.visit(`/ai-hub/data/browse/collections/${testData.project}/${testData.collection}`);

    // Open actions menu
    cy.get('[data-testid="collection-actions-toggle"]').click();

    // Verify delete is disabled
    cy.get('[data-testid="collection-action-delete"]').should('have.attr', 'aria-disabled', 'true');
  });

  it('should open register data modal', () => {
    cy.visit(`/ai-hub/data/browse/collections/${testData.project}/${testData.collection}`);

    // Open actions menu
    cy.get('[data-testid="collection-actions-toggle"]').click();

    // Click register data
    cy.get('[data-testid="collection-action-register-data"]').click();

    // Verify modal opened
    cy.get('[data-testid="register-data-modal"]').should('be.visible');
  });

  it('should open manage collections modal with all collections', () => {
    cy.visit(`/ai-hub/data/browse/collections/${testData.project}/${testData.collection}`);

    // Open actions menu
    cy.get('[data-testid="collection-actions-toggle"]').click();

    // Click manage collections
    cy.get('[data-testid="collection-action-manage-collections"]').click();

    // Verify modal opened
    cy.get('[data-testid="manage-collections-modal"]').should('be.visible');

    // Verify all collections are listed, not just current one
    cy.get('[data-testid="collections-table"]')
      .find('tbody tr')
      .should('have.length.greaterThan', 1);
  });

  it('should navigate to collection detail from manage collections modal', () => {
    cy.visit('/ai-hub/data/browse');

    // Select project
    cy.get('[data-testid="project-selector"]').click();
    cy.get(`[data-testid="project-option-${testData.project}"]`).click();

    // Open manage collections
    cy.get('[data-testid="registry-kebab"]').click();
    cy.get('[data-testid="manage-collections-action"]').click();

    // Click on a collection name
    cy.get('[data-testid="collections-table"]').find('a').contains(testData.collection).click();

    // Verify navigated to collection detail
    cy.url().should('include', `/collections/${testData.project}/${testData.collection}`);
    cy.get('[data-testid="collection-type-badge"]').should('contain', 'Collection');
  });

  it('should show trash icon for delete in manage collections', () => {
    cy.visit('/ai-hub/data/browse');

    // Select project
    cy.get('[data-testid="project-selector"]').click();
    cy.get(`[data-testid="project-option-${testData.project}"]`).click();

    // Open manage collections
    cy.get('[data-testid="registry-kebab"]').click();
    cy.get('[data-testid="manage-collections-action"]').click();

    // Verify trash icon buttons exist
    cy.get('[data-testid^="collection-delete-"]').should('exist');
  });
});
