class TableToolbar {
  private findToggleButton(id: string) {
    return cy.findByTestId(id).find('.pf-v5-c-dropdown__toggle').click();
  }

  findFilterMenuOption(id: string, name: string) {
    return this.findToggleButton(id).parents().findByRole('menuitem', { name }).click();
  }

  findSearchInput() {
    return cy.findByRole('textbox', { name: 'Search input' });
  }

  findResetButton() {
    return cy.findByRole('button', { name: 'Reset' });
  }
}

export const tableToolbar = new TableToolbar();
