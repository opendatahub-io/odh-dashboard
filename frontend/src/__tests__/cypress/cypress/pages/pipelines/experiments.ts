/* eslint-disable camelcase */

class ExperimentsTabs {
  visit(namespace?: string, tab?: string) {
    cy.visitWithLogin(
      `/pipelines/experiments${namespace ? `/${namespace}` : ''}${tab ? `/${tab}` : ''}`,
    );
    this.wait();
  }

  private wait() {
    cy.findByTestId('experiments-global-tabs');
    cy.testA11y();
  }

  findActiveTab() {
    return cy.findByTestId('experiments-active-tab');
  }

  findArchivedTab() {
    return cy.findByTestId('experiments-archived-tab');
  }

  findActiveEmptyState() {
    return cy.findByTestId('global-no-active-experiments');
  }

  findArchivedEmptyState() {
    return cy.findByTestId('global-no-archived-experiments');
  }
}

export const experimentsTabs = new ExperimentsTabs();
