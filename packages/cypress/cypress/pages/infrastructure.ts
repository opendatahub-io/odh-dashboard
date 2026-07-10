import { appChrome } from './appChrome';

class InfrastructurePage {
  visit(wait = true) {
    cy.visitWithLogin('/observe-and-monitor/infrastructure');
    if (wait) {
      this.wait();
    }
  }

  findNavItem() {
    return appChrome.findNavItem({ name: 'Infrastructure', rootSection: 'Observe & monitor' });
  }

  shouldNotFoundPage() {
    return cy.findByTestId('not-found-page').should('exist');
  }

  shouldHavePageTitle() {
    return cy.findByTestId('app-page-title').should('have.text', 'Infrastructure');
  }

  findClusterSection() {
    return cy.findByTestId('infrastructure-cluster-section');
  }

  findTotalAcceleratorsCard() {
    return cy.findByTestId('cluster-card-total-accelerators');
  }

  findComputeUtilizationCard() {
    return cy.findByTestId('cluster-card-compute-utilization');
  }

  findMemoryUtilizationCard() {
    return cy.findByTestId('cluster-card-memory-utilization');
  }

  findRefreshBadge() {
    return cy.findByTestId('infrastructure-refresh-badge');
  }

  findBorrowingLendingSection() {
    return cy.findByTestId('infrastructure-borrowing-lending-section');
  }

  findBorrowingLendingChart() {
    return cy.findByTestId('borrowing-lending-chart-has-data');
  }

  findBorrowingLendingEmptyState() {
    return cy.findByTestId('borrowing-lending-empty-state');
  }

  findCohortSelect() {
    return cy.findByTestId('borrowing-lending-cohort-select');
  }

  findCqNameFilter() {
    return cy.findByTestId('borrowing-lending-cq-filter');
  }

  findCountLabel() {
    return cy.findByTestId('borrowing-lending-count-label');
  }

  private wait() {
    this.shouldHavePageTitle();
    cy.testA11y();
  }
}

export const infrastructurePage = new InfrastructurePage();
