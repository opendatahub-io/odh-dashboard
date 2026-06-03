/**
 * Page objects for Registered Model and Model Version Details pages.
 * ModelVersionDetails extends RegisteredModelDetails, scoping selectors to the version details card.
 */

class RegisteredModelDetails {
  findPropertiesExpandableSection() {
    return cy.findByTestId('properties-expandable-section').first();
  }

  findPropertiesTable() {
    return this.findPropertiesExpandableSection().findByTestId('properties-table');
  }

  findAddPropertyButton() {
    return this.findPropertiesExpandableSection().findByTestId('add-property-button');
  }

  findPropertyKeyInput() {
    return this.findPropertiesExpandableSection().findByTestId('add-property-key-input');
  }

  findPropertyValueInput() {
    return this.findPropertiesExpandableSection().findByTestId('add-property-value-input');
  }

  findSavePropertyButton() {
    return this.findPropertiesExpandableSection().findByTestId('save-edit-button-property');
  }

  findDiscardPropertyButton() {
    return this.findPropertiesExpandableSection().findByTestId('discard-edit-button-property');
  }

  // PF v6 ExpandableSection does not support data-testid on the internal toggle button;
  // querying by aria-expanded is the most stable alternative available.
  findPropertiesToggleButton() {
    return this.findPropertiesExpandableSection().find('button[aria-expanded]').first();
  }

  ensurePropertiesExpanded() {
    this.findPropertiesToggleButton()
      .scrollIntoView()
      .then(($btn) => {
        if ($btn.attr('aria-expanded') === 'false') {
          cy.wrap($btn).click();
        }
      });
    this.findPropertiesToggleButton().should('have.attr', 'aria-expanded', 'true');
    // Wait for the "Add property" button to be visible after expansion animation completes
    // This is more reliable than waiting for the table, which is conditionally rendered
    this.findAddPropertyButton().should('be.visible');
  }

  findExpandPropertiesButton() {
    return this.findPropertiesExpandableSection().findByTestId('expand-control-button');
  }

  addCustomProperty(key: string, value: string) {
    this.findAddPropertyButton().click();
    this.findPropertyKeyInput().type(key);
    this.findPropertyValueInput().type(value);
    this.findSavePropertyButton().click();
  }

  shouldHaveCustomProperty(key: string, value: string) {
    // Wait for the expandable section to contain a visible table
    // The table is conditionally rendered only when properties exist
    this.findPropertiesExpandableSection().within(() => {
      // Step 1: Wait for table to exist and be visible
      cy.findByTestId('properties-table', { timeout: 10000 }).should('be.visible');

      // Step 2: Wait for table body rows to exist (structure is rendered)
      cy.findByTestId('properties-table').find('tbody tr').should('have.length.at.least', 1);

      // Step 3: Wait for the first table cell to be visible (ensures CSS rendering complete)
      cy.findByTestId('properties-table').find('tbody tr td').first().should('be.visible');

      // Step 4: Wait for property data to load from database and be visible in the table
      // Use a custom retry mechanism that accounts for DB-to-UI propagation delays
      // This is critical for CI environments where DB queries may be slower
      cy.findByTestId('properties-table')
        .find('tbody')
        .should(($tbody) => {
          // Get all text content from the table body
          const tableText = $tbody.text();
          // Assert both key and value are present and visible in the table
          // Cypress will retry this assertion until it passes or times out
          expect(tableText).to.include(key);
          expect(tableText).to.include(value);
        });

      // Step 5: Double-check that the specific elements containing key and value are visible
      // This ensures the content isn't just in the DOM but actually rendered and visible
      cy.findByTestId('properties-table')
        .find('tbody')
        .contains(key, { timeout: 10000 })
        .should('be.visible');
      cy.findByTestId('properties-table')
        .find('tbody')
        .contains(value, { timeout: 10000 })
        .should('be.visible');
    });
    return this;
  }

  findLabel(labelText: string) {
    return cy.findByTestId('label').contains(labelText);
  }

  findLabelGroup() {
    return cy.findByTestId('popover-label-group');
  }

  findModalLabelGroup() {
    return cy.findByTestId('modal-label-group');
  }

  shouldHaveLabel(labelText: string) {
    cy.contains(labelText).should('be.visible');
    return this;
  }
}

class ModelVersionDetails extends RegisteredModelDetails {
  findVersionDetailsCard() {
    return cy.findByTestId('version-details-card');
  }

  findPropertiesExpandableSection() {
    return this.findVersionDetailsCard().findByTestId('properties-expandable-section');
  }
}

export const registeredModelDetails = new RegisteredModelDetails();
export const modelVersionDetails = new ModelVersionDetails();
