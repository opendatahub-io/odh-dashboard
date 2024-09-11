import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';
import type { RefreshIntervalTitle } from '~/concepts/metrics/types';
import { SearchSelector } from '~/__tests__/cypress/cypress/pages/components/subComponents/SearchSelector';

class GlobalDistributedWorkloads {
  projectDropdown = new SearchSelector('project-selector');

  visit(wait = true) {
    cy.visitWithLogin(`/distributedWorkloads`);
    if (wait) {
      this.wait();
    }
  }

  findNavItem() {
    return appChrome.findNavItem('Distributed Workload Metrics');
  }

  shouldNotFoundPage() {
    return cy.findByTestId('not-found-page').should('exist');
  }

  navigate() {
    this.findNavItem().click();
    this.wait();
  }

  shouldHavePageTitle() {
    return cy.findByTestId('app-page-title').should('have.text', 'Distributed Workload Metrics');
  }

  findRefreshIntervalSelectToggle() {
    return cy.get('#metrics-toolbar-refresh-interval-select-toggle');
  }

  selectRefreshInterval(interval: RefreshIntervalTitle) {
    this.findRefreshIntervalSelectToggle().findSelectOption(interval).click();
  }

  shouldHaveRefreshInterval(interval: RefreshIntervalTitle) {
    this.findRefreshIntervalSelectToggle().should('contain.text', interval);
  }

  findStatusOverviewCard() {
    return cy.findByTestId('dw-status-overview-card');
  }

  findWorkloadResourceMetricsTable() {
    return cy.findByTestId('workload-resource-metrics-table');
  }

  private wait() {
    this.shouldHavePageTitle();
    cy.testA11y();
  }
}

export const globalDistributedWorkloads = new GlobalDistributedWorkloads();
