describe('Data Registry - Collection Details', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.get('[data-testid="app-launcher"]').click();
    cy.get('[data-testid="nav-item-ai-hub"]').click();
    cy.get('[data-testid="nav-item-data"]').click();

    // Select project
    cy.get('[data-testid="project-selector"]').click();
    cy.get('[data-testid="project-option-demo-user-1"]').click();
  });

  it('should display collection detail page', () => {
    // Navigate to collection detail from breadcrumb on asset detail page
    cy.get('[data-testid="registry-table"]').find('a').contains('test-connection-details').click();

    cy.get('[data-testid="app-page-breadcrumb"]').find('a').contains('default').click();

    // Verify collection detail page loaded
    cy.get('[data-testid="app-page-title"]').should('contain', 'default');
    cy.get('[data-testid="collection-type-badge"]').should('contain', 'Collection');
    cy.get('[data-testid="collection-description"]').should('exist');
  });

  it('should display collection details card with correct information', () => {
    // Navigate directly to collection detail
    cy.visit('/ai-hub/data/browse/collections/demo-user-1/default');

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
    cy.visit('/ai-hub/data/browse/collections/demo-user-1/default');

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
    cy.visit('/ai-hub/data/browse/collections/demo-user-1/default');

    // Click on an asset name
    cy.get('[data-testid="collection-assets-table"]').find('a').first().click();

    // Verify navigated to asset detail page
    cy.url().should('include', '/tables/demo-user-1/default/');
    cy.get('[data-testid="asset-type-badge"]').should('contain', 'Data asset');
  });

  it('should show delete collection disabled when collection has assets', () => {
    cy.visit('/ai-hub/data/browse/collections/demo-user-1/default');

    // Open actions menu
    cy.get('[data-testid="collection-actions-toggle"]').click();

    // Verify delete is disabled
    cy.get('[data-testid="collection-action-delete"]').should('be.disabled');
  });

  it('should open register data modal', () => {
    cy.visit('/ai-hub/data/browse/collections/demo-user-1/default');

    // Open actions menu
    cy.get('[data-testid="collection-actions-toggle"]').click();

    // Click register data
    cy.get('[data-testid="collection-action-register-data"]').click();

    // Verify modal opened
    cy.get('[data-testid="register-data-modal"]').should('be.visible');
  });

  it('should open manage collections modal with all collections', () => {
    cy.visit('/ai-hub/data/browse/collections/demo-user-1/default');

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
    cy.get('[data-testid="project-option-demo-user-1"]').click();

    // Open manage collections
    cy.get('[data-testid="registry-kebab"]').click();
    cy.get('[data-testid="manage-collections-action"]').click();

    // Click on a collection name
    cy.get('[data-testid="collections-table"]').find('a').contains('default').click();

    // Verify navigated to collection detail
    cy.url().should('include', '/collections/demo-user-1/default');
    cy.get('[data-testid="collection-type-badge"]').should('contain', 'Collection');
  });

  it('should show trash icon for delete in manage collections', () => {
    cy.visit('/ai-hub/data/browse');

    // Select project
    cy.get('[data-testid="project-selector"]').click();
    cy.get('[data-testid="project-option-demo-user-1"]').click();

    // Open manage collections
    cy.get('[data-testid="registry-kebab"]').click();
    cy.get('[data-testid="manage-collections-action"]').click();

    // Verify trash icon buttons exist
    cy.get('[data-testid^="collection-delete-"]').should('exist');
  });
});
