import type { FilterArgs } from '#~/__tests__/cypress/cypress/tests/mocked/pipelines/executions.cy';

class ExecutionPage {
  visit(namespace?: string) {
    cy.visitWithLogin(`/executions${namespace ? `/${namespace}` : ''}`);
  }

  findEntryByLink(name: string) {
    return cy.findByRole('link', { name });
  }

  findText(text: string) {
    cy.contains(text);
  }

  shouldFailToLoadRun() {
    cy.findByTestId('error-icon').should('exist');
    return this;
  }
}

class ExecutionFilter {
  private testId = 'filter-toolbar';

  find() {
    return cy.findByTestId(this.testId);
  }

  findFilterDropdown() {
    return this.find().findByTestId('filter-toolbar-dropdown');
  }

  findSearchFilter() {
    return this.find().findByTestId('filter-toolbar-text-field');
  }

  findSearchFilterItem(item: FilterArgs) {
    return this.findFilterDropdown().findDropdownItem(item);
  }

  findTypeSearchFilterItem(item: string) {
    return this.find()
      .findByTestId('filter-toolbar-text-field')
      .findByRole('button')
      .findSelectOption(item);
  }
}

export const executionPage = new ExecutionPage();
export const executionFilter = new ExecutionFilter();
