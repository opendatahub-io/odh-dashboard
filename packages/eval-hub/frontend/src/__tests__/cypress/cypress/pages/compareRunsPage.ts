type CompareRunsPageParams = {
  runs?: string[];
  experiments?: string[];
  names?: string[];
};

class CompareRunsPage {
  visit(namespace: string, params?: CompareRunsPageParams) {
    const search = new URLSearchParams();
    if (params?.runs) {
      search.set('runs', JSON.stringify(params.runs));
    }
    if (params?.experiments) {
      search.set('experiments', JSON.stringify(params.experiments));
    }
    if (params?.names) {
      search.set('names', JSON.stringify(params.names));
    }
    const queryStr = search.toString();
    cy.visit(`/evaluation/${namespace}/compare-runs${queryStr ? `?${queryStr}` : ''}`);
    this.waitForLoad();
  }

  private waitForLoad() {
    cy.findByTestId('app-page-title').should('exist');
    cy.testA11y();
  }

  findTitle() {
    return cy.findByTestId('app-page-title');
  }

  findEmptyStateMessage() {
    return cy.contains('Provide at least two runs and experiments to compare.');
  }
}

export const compareRunsPage = new CompareRunsPage();
