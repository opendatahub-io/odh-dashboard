import { FilterArgs } from '~/__tests__/cypress/cypress/tests/mocked/pipelines/executions.cy';

class ExecutionPage {
  visit(namespace?: string) {
    cy.visitWithLogin(`/executions${namespace ? `/${namespace}` : ''}`);
  }
}

class ExecutionFilter {
  private testId = 'filter-toolbar';

  find() {
    return cy.findByTestId(this.testId);
  }

  findEntriesPerPage() {
    return cy.get('#table-pagination-top-toggle');
  }

  findNextPage() {
    return cy.get('[aria-label="Go to next page"]').first();
  }

  findPreviousPage() {
    return cy.get('[aria-label="Go to previous page"]').first();
  }

  findFilterDropdown() {
    return this.find().findByTestId('filter-toolbar-dropdown');
  }

  typeSearchFilter(query: string) {
    return this.find().findByTestId('filter-toolbar-text-field').type(query);
  }

  clearSearchFilter() {
    return this.find().findByTestId('filter-toolbar-text-field').type('{selectAll}{backspace}');
  }

  findSearchFilterItem(item: FilterArgs) {
    return this.findFilterDropdown().findDropdownItem(item).click();
  }

  findTypeSearchFilterItem(item: string) {
    return this.find().findByTestId('filter-toolbar-text-field').findDropdownItem(item).click();
  }
}

export const executionPage = new ExecutionPage();
export const executionFilter = new ExecutionFilter();
