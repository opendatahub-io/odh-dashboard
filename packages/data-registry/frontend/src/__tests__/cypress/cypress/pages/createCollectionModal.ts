class CreateCollectionModal {
  findOwnerToggle() {
    return cy.get('button[aria-label="Typeahead menu toggle"]');
  }

  findOwnerOption(owner: string) {
    return cy.contains('li', owner);
  }
}

export const createCollectionModal = new CreateCollectionModal();
