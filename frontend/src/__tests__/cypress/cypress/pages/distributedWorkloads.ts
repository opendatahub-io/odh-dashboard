import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';

class GlobalDistributedWorkloads {
  visit(wait = true) {
    cy.visit(`/distributedWorkloads`);
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

  findProjectSelect() {
    return cy.findByTestId('project-selector-dropdown');
  }

  selectProjectByName(name: string) {
    this.findProjectSelect().findDropdownItem(name).click();
  }

  findStatusOverviewCard() {
    return cy.findByTestId('dw-status-overview-card');
  }

  private wait() {
    this.shouldHavePageTitle();
    cy.testA11y();
  }
}

export const globalDistributedWorkloads = new GlobalDistributedWorkloads();
